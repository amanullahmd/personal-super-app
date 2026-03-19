import { FastifyRequest, FastifyReply } from 'fastify';
import { AiService } from './ai.service';
import { MemoryService } from './memory.service';
import { paginationSchema } from '../../shared/utils/pagination';

const aiService = new AiService();
const memoryService = new MemoryService();

export class AiController {
  // --- Chat ---
  async chat(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const result = await aiService.chat(userId, request.body as any);
    return reply.send(result);
  }

  // --- Conversations ---
  async getConversations(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const pagination = paginationSchema.parse(query);
    const conversations = await aiService.getConversations(userId, pagination);
    return reply.send(conversations);
  }

  async getConversation(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const conversation = await aiService.getConversation(userId, id);
    return reply.send(conversation);
  }

  async deleteConversation(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const result = await aiService.deleteConversation(userId, id);
    return reply.send(result);
  }

  // --- Voice (placeholder for speech-to-text processing) ---
  async voiceChat(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { transcript, conversationId, moduleContext } = request.body as any;

    if (!transcript) {
      return reply.status(400).send({ error: 'Transcript is required' });
    }

    const result = await aiService.chat(userId, {
      conversationId,
      message: transcript,
      moduleContext,
    });

    return reply.send({
      ...result,
      inputType: 'voice',
    });
  }

  // --- Insights ---
  async getInsights(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const insights = await aiService.getInsights(userId);
    return reply.send(insights);
  }

  // --- AI Profile ---
  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const profile = await aiService.getProfile(userId);
    return reply.send(profile || {});
  }

  async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const profile = await aiService.updateProfile(userId, request.body as any);
    return reply.send(profile);
  }

  // --- Memories ---
  async getMemories(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const pagination = paginationSchema.parse(query);
    const memories = await memoryService.getAll(userId, {
      ...pagination,
      category: query.category,
    });
    return reply.send(memories);
  }

  async createMemory(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const memory = await memoryService.create(userId, request.body as any);
    return reply.status(201).send(memory);
  }

  async searchMemories(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const memories = await memoryService.searchByContent(userId, query.q || '', parseInt(query.limit) || 10);
    return reply.send(memories);
  }

  async deleteMemory(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const result = await memoryService.delete(userId, id);
    return reply.send(result);
  }
}
