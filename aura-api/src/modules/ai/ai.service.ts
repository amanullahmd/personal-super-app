import OpenAI from 'openai';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { NotFoundError, AppError } from '../../shared/utils/errors';
import { ContextBuilder } from './context.builder';
import { MemoryService } from './memory.service';
import { paginate, paginatedResponse, PaginationParams } from '../../shared/utils/pagination';

export class AiService {
  private contextBuilder = new ContextBuilder();
  private memoryService = new MemoryService();

  // --- Conversations ---
  async createConversation(userId: string, data: {
    title?: string;
    moduleContext?: string;
  }) {
    return prisma.aiConversation.create({
      data: {
        userId,
        title: data.title || 'New Conversation',
        moduleContext: data.moduleContext,
      },
    });
  }

  async getConversations(userId: string, params: PaginationParams) {
    const where = { userId };

    const [data, total] = await Promise.all([
      prisma.aiConversation.findMany({
        where,
        ...paginate(params),
        orderBy: { startedAt: 'desc' },
        include: {
          _count: { select: { messages: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { content: true, createdAt: true },
          },
        },
      }),
      prisma.aiConversation.count({ where }),
    ]);

    return paginatedResponse(data, total, params);
  }

  async getConversation(userId: string, id: string) {
    const conversation = await prisma.aiConversation.findFirst({
      where: { id, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!conversation) throw new NotFoundError('Conversation');
    return conversation;
  }

  async deleteConversation(userId: string, id: string) {
    const conversation = await prisma.aiConversation.findFirst({ where: { id, userId } });
    if (!conversation) throw new NotFoundError('Conversation');
    await prisma.aiConversation.delete({ where: { id } });
    return { message: 'Conversation deleted' };
  }

  // --- Chat ---
  async chat(userId: string, data: {
    conversationId?: string;
    message: string;
    moduleContext?: string;
    imageBase64?: string;   // optional — triggers vision model
    imageMimeType?: string; // e.g. 'image/jpeg'
  }) {
    // Get or create conversation
    let conversationId = data.conversationId;
    if (!conversationId) {
      const title = data.imageBase64
        ? `📷 ${data.message || 'Image analysis'}`.substring(0, 100)
        : data.message.substring(0, 100);
      const conversation = await this.createConversation(userId, {
        title,
        moduleContext: data.moduleContext,
      });
      conversationId = conversation.id;
    } else {
      const exists = await prisma.aiConversation.findFirst({
        where: { id: conversationId, userId },
      });
      if (!exists) throw new NotFoundError('Conversation');
    }

    // Save user message (store [image] prefix if image was sent)
    const storedUserContent = data.imageBase64
      ? `[image attached] ${data.message || 'Analyze this image'}`.trim()
      : data.message;

    await prisma.aiMessage.create({
      data: { conversationId, role: 'user', content: storedUserContent },
    });

    // Build context
    const context = await this.contextBuilder.build(userId, {
      conversationId,
      moduleContext: data.moduleContext,
      currentMessage: data.message || 'Analyze this image',
      maxHistoryMessages: 20,
    });

    // Call LLM (with or without image)
    const response = await this.callLLM(
      context,
      data.message || 'Please analyze this image and describe what you see. Relate it to my health or wellness if relevant.',
      data.imageBase64,
      data.imageMimeType,
    );

    // Save assistant message
    const assistantMessage = await prisma.aiMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: response.content,
        tokensUsed: response.tokensUsed,
        modelUsed: response.model,
      },
    });

    this.extractMemories(userId, data.message || '', response.content).catch(() => {});

    return { conversationId, message: assistantMessage };
  }

  private async callLLM(
    context: any,
    userMessage: string,
    imageBase64?: string,
    imageMimeType?: string,
  ): Promise<{ content: string; tokensUsed: number; model: string }> {
    if (!env.ai.openaiApiKey) {
      return {
        content: `I received your message: "${userMessage}". However, the AI service is not configured yet. Please set OPENAI_API_KEY in the environment variables.`,
        tokensUsed: 0,
        model: 'fallback',
      };
    }

    try {
      const openai = new OpenAI({ apiKey: env.ai.openaiApiKey });

      // Build system prompt
      let systemContent = context.systemPrompt;
      if (context.recentMemories?.length > 0) {
        systemContent += `\n\nRelevant user memories:\n${context.recentMemories.map((m: any) => `- ${m.content}`).join('\n')}`;
      }
      if (context.moduleContext) {
        systemContent += `\n\nCurrent module data: ${JSON.stringify(context.moduleContext)}`;
      }

      // Build history messages
      const historyMessages: OpenAI.Chat.ChatCompletionMessageParam[] =
        (context.conversationHistory || []).map((m: any) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      // Build the current user message — with image if provided
      let currentUserMessage: OpenAI.Chat.ChatCompletionMessageParam;
      if (imageBase64) {
        const mimeType = imageMimeType || 'image/jpeg';
        currentUserMessage = {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'high' },
            },
            { type: 'text', text: userMessage },
          ],
        };
      } else {
        currentUserMessage = { role: 'user', content: userMessage };
      }

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemContent },
        ...historyMessages,
        currentUserMessage,
      ];

      // Use gpt-4o for vision (supports images), otherwise use configured model
      const model = imageBase64 ? 'gpt-4o' : env.ai.llmModel;

      const completion = await openai.chat.completions.create({
        model,
        temperature: env.ai.llmTemperature,
        max_tokens: 2048,
        messages,
      });

      const choice = completion.choices[0];
      return {
        content: choice.message.content || 'I apologize, I could not generate a response.',
        tokensUsed: (completion.usage?.prompt_tokens || 0) + (completion.usage?.completion_tokens || 0),
        model: completion.model,
      };
    } catch (error: any) {
      throw new AppError(`AI service error: ${error.message}`, 503);
    }
  }

  private async extractMemories(userId: string, userMessage: string, assistantResponse: string) {
    // Simple heuristic: if the user shares personal information, store it
    const personalPatterns = [
      /(?:my name is|i'm called|call me)\s+(\w+)/i,
      /(?:i (?:like|love|enjoy|prefer))\s+(.+)/i,
      /(?:i'm allergic to|i can't eat)\s+(.+)/i,
      /(?:my goal is|i want to)\s+(.+)/i,
    ];

    for (const pattern of personalPatterns) {
      const match = userMessage.match(pattern);
      if (match) {
        await this.memoryService.create(userId, {
          content: userMessage,
          sourceType: 'conversation',
          category: 'personal_fact',
          importanceScore: 0.7,
        });
        break; // Only store one memory per message
      }
    }
  }

  // --- AI User Profile ---
  async getProfile(userId: string) {
    return prisma.aiUserProfile.findUnique({ where: { userId } });
  }

  async updateProfile(userId: string, data: {
    personalitySummary?: string;
    communicationStyle?: string;
    goalsSummary?: string;
    knownPreferences?: any;
    healthContext?: any;
    professionalContext?: any;
  }) {
    return prisma.aiUserProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
        communicationStyle: (data.communicationStyle as any) || 'casual',
      },
      update: {
        ...data,
        communicationStyle: data.communicationStyle as any,
      },
    });
  }

  // --- Insights ---
  async getInsights(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [habitCompletions, moodLogs, workouts, sleepLogs] = await Promise.all([
      prisma.habitCompletion.count({
        where: { userId, completedAt: { gte: sevenDaysAgo } },
      }),
      prisma.moodLog.findMany({
        where: { userId, loggedAt: { gte: sevenDaysAgo } },
        select: { moodScore: true, loggedAt: true },
      }),
      prisma.workout.count({
        where: { userId, completedAt: { gte: sevenDaysAgo } },
      }),
      prisma.sleepLog.findMany({
        where: { userId, sleepStart: { gte: sevenDaysAgo } },
        select: { durationMinutes: true, qualityScore: true },
      }),
    ]);

    const avgMood = moodLogs.length > 0
      ? moodLogs.reduce((sum, l) => sum + l.moodScore, 0) / moodLogs.length
      : null;

    const avgSleep = sleepLogs.length > 0
      ? sleepLogs.reduce((sum, l) => sum + l.durationMinutes, 0) / sleepLogs.length / 60
      : null;

    const insights: string[] = [];

    if (avgMood !== null) {
      if (avgMood >= 4) insights.push('Your mood has been great this week! Keep up the positive momentum.');
      else if (avgMood <= 2) insights.push('Your mood has been lower than usual. Consider journaling or a meditation session.');
    }

    if (workouts >= 5) {
      insights.push('Excellent workout consistency this week!');
    } else if (workouts <= 1) {
      insights.push('Try to fit in a few more workouts this week for better energy and mood.');
    }

    if (avgSleep !== null && avgSleep < 7) {
      insights.push(`You're averaging ${avgSleep.toFixed(1)} hours of sleep. Aim for 7-9 hours for optimal health.`);
    }

    return {
      period: '7 days',
      stats: {
        habitCompletions,
        workouts,
        moodEntries: moodLogs.length,
        avgMood: avgMood ? Math.round(avgMood * 10) / 10 : null,
        avgSleepHours: avgSleep ? Math.round(avgSleep * 10) / 10 : null,
      },
      insights,
    };
  }
}
