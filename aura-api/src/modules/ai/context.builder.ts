import { prisma } from '../../config/database';
import { MemoryService } from './memory.service';

interface ContextWindow {
  systemPrompt: string;
  userProfile: any;
  recentMemories: any[];
  moduleContext: any;
  conversationHistory: any[];
}

export class ContextBuilder {
  private memoryService = new MemoryService();

  async build(userId: string, options: {
    conversationId?: string;
    moduleContext?: string;
    currentMessage?: string;
    maxHistoryMessages?: number;
  } = {}): Promise<ContextWindow> {
    const maxHistory = options.maxHistoryMessages || 20;

    const [userProfile, aiProfile, memories, conversationHistory, comprehensiveData] =
      await Promise.all([
        this.getUserContext(userId),
        this.getAiProfile(userId),
        options.currentMessage
          ? this.memoryService.getRelevantMemories(userId, options.currentMessage, 5)
          : [],
        options.conversationId
          ? this.getConversationHistory(options.conversationId, maxHistory)
          : [],
        // Always fetch comprehensive user data so AI can answer any question
        this.getComprehensiveUserData(userId),
      ]);

    // If a specific module context was requested, also fetch that focused data
    const moduleData = options.moduleContext
      ? await this.getModuleData(userId, options.moduleContext)
      : null;

    const systemPrompt = this.buildSystemPrompt(
      userProfile,
      aiProfile,
      comprehensiveData,
      options.moduleContext,
    );

    return {
      systemPrompt,
      userProfile: {
        name: userProfile?.fullName,
        timezone: userProfile?.timezone,
        locale: userProfile?.locale,
        subscriptionTier: userProfile?.subscriptionTier,
      },
      recentMemories: memories,
      moduleContext: moduleData,
      conversationHistory,
    };
  }

  // ---------------------------------------------------------------------------
  // Comprehensive real-data fetch — scoped strictly to this userId
  // ---------------------------------------------------------------------------
  private async getComprehensiveUserData(userId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 86400000);

    const [
      todayHealthLogs,
      lastSleep,
      sevenDaySleepLogs,
      activeHabits,
      todayHabitCompletions,
      weekHabitCompletions,
      todayTasks,
      overdueTasks,
      todayMealLogs,
      recentMoods,
      recentWorkouts,
      financialAccounts,
      recentTransactions,
    ] = await Promise.all([
      // Health: today's logs
      prisma.healthLog.findMany({
        where: { userId, loggedAt: { gte: todayStart, lt: todayEnd } },
        select: { metricType: true, value: true, unit: true },
        orderBy: { loggedAt: 'desc' },
        take: 20,
      }),

      // Sleep: last night
      prisma.sleepLog.findFirst({
        where: { userId },
        orderBy: { sleepStart: 'desc' },
        select: {
          durationMinutes: true,
          qualityScore: true,
          sleepStart: true,
          deepSleepMinutes: true,
          remSleepMinutes: true,
        },
      }),

      // Sleep: last 7 nights
      prisma.sleepLog.findMany({
        where: { userId, sleepStart: { gte: sevenDaysAgo } },
        select: { durationMinutes: true, qualityScore: true, sleepStart: true },
        orderBy: { sleepStart: 'desc' },
      }),

      // Habits: active ones
      prisma.habit.findMany({
        where: { userId, isActive: true },
        select: { id: true, name: true, frequency: true, streakCurrent: true, streakBest: true },
      }),

      // Habits: completed today
      prisma.habitCompletion.findMany({
        where: { userId, completedAt: { gte: todayStart, lt: todayEnd } },
        select: { habitId: true },
      }),

      // Habits: completions last 7 days (count)
      prisma.habitCompletion.count({
        where: { userId, completedAt: { gte: sevenDaysAgo } },
      }),

      // Tasks: due today or in_progress
      prisma.task.findMany({
        where: {
          userId,
          status: { in: ['todo', 'in_progress'] },
          dueDate: { gte: todayStart, lt: todayEnd },
        },
        select: { title: true, priority: true, status: true },
        take: 10,
      }),

      // Tasks: overdue
      prisma.task.count({
        where: {
          userId,
          status: { in: ['todo', 'in_progress'] },
          dueDate: { lt: todayStart },
        },
      }),

      // Meals: today's logs
      prisma.mealLog.findMany({
        where: { userId, loggedAt: { gte: todayStart, lt: todayEnd } },
        select: { mealType: true, totalCalories: true, totalProtein: true, totalCarbs: true, totalFat: true },
      }),

      // Mood: last 7 entries
      prisma.moodLog.findMany({
        where: { userId, loggedAt: { gte: sevenDaysAgo } },
        select: { moodScore: true, stressLevel: true, energyLevel: true, loggedAt: true },
        orderBy: { loggedAt: 'desc' },
        take: 7,
      }),

      // Workouts: last 7 days
      prisma.workout.findMany({
        where: { userId, completedAt: { gte: sevenDaysAgo } },
        select: { title: true, workoutType: true, durationMinutes: true, caloriesBurned: true, completedAt: true },
        orderBy: { completedAt: 'desc' },
        take: 10,
      }),

      // Finance: accounts (balance overview)
      prisma.financialAccount.findMany({
        where: { userId, isActive: true },
        select: { name: true, type: true, balance: true, currency: true },
      }),

      // Finance: recent transactions
      prisma.transaction.findMany({
        where: { userId, transactionDate: { gte: sevenDaysAgo } },
        select: { description: true, amount: true, type: true, category: true, transactionDate: true },
        orderBy: { transactionDate: 'desc' },
        take: 10,
      }),
    ]);

    // Compute summaries
    const todayCompletedHabitIds = new Set(todayHabitCompletions.map((c) => c.habitId));
    const habitsWithStatus = activeHabits.map((h) => ({
      name: h.name,
      frequency: h.frequency,
      currentStreak: h.streakCurrent,
      completedToday: todayCompletedHabitIds.has(h.id),
    }));

    const avgMood7d = recentMoods.length > 0
      ? (recentMoods.reduce((s, m) => s + m.moodScore, 0) / recentMoods.length).toFixed(1)
      : null;

    const avgSleep7d = sevenDaySleepLogs.length > 0
      ? (sevenDaySleepLogs.reduce((s, l) => s + l.durationMinutes, 0) / sevenDaySleepLogs.length / 60).toFixed(1)
      : null;

    const todayCalories = todayMealLogs.reduce((s, m) => s + (m.totalCalories || 0), 0);
    const todayProtein = todayMealLogs.reduce((s, m) => s + (m.totalProtein || 0), 0);

    const totalBalance = financialAccounts.reduce((s, a) => s + Number(a.balance || 0), 0);
    const weeklySpending = recentTransactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    return {
      health: {
        todayLogs: todayHealthLogs,
      },
      sleep: {
        lastNight: lastSleep
          ? {
              durationHours: (lastSleep.durationMinutes / 60).toFixed(1),
              qualityScore: lastSleep.qualityScore,
              deepSleepMin: lastSleep.deepSleepMinutes,
              remSleepMin: lastSleep.remSleepMinutes,
            }
          : null,
        last7NightsAvgHours: avgSleep7d,
        entries: sevenDaySleepLogs.length,
      },
      habits: {
        active: habitsWithStatus,
        completedTodayCount: todayHabitCompletions.length,
        totalActive: activeHabits.length,
        completionsLast7Days: weekHabitCompletions,
      },
      tasks: {
        todayDue: todayTasks,
        overdueCount: overdueTasks,
      },
      meals: {
        todayCalories,
        todayProtein: todayProtein.toFixed(0),
        mealCount: todayMealLogs.length,
      },
      mood: {
        recent: recentMoods,
        avgScore7d: avgMood7d,
        latestMood: recentMoods[0] || null,
      },
      workouts: {
        last7Days: recentWorkouts,
        count7d: recentWorkouts.length,
      },
      finance: {
        accounts: financialAccounts,
        totalBalance: totalBalance.toFixed(2),
        weeklySpending: weeklySpending.toFixed(2),
        recentTransactions,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Build the system prompt with all real user data embedded
  // ---------------------------------------------------------------------------
  private buildSystemPrompt(
    userProfile: any,
    aiProfile: any,
    data: any,
    moduleContext?: string,
  ): string {
    const style = aiProfile?.communicationStyle || 'casual';
    const name = userProfile?.fullName?.split(' ')[0] || 'there';
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    let prompt = `You are Aura, a personal AI life assistant with access to ${name}'s real tracked data. `;

    if (style === 'formal') {
      prompt += `Communicate professionally and formally. `;
    } else if (style === 'motivational') {
      prompt += `Be encouraging, energetic, and motivational. `;
    } else {
      prompt += `Be friendly, warm, and conversational. `;
    }

    prompt += `Today is ${today}. The user's name is ${name}. `;
    prompt += `Their timezone is ${userProfile?.timezone || 'UTC'}. `;

    if (aiProfile?.personalitySummary) {
      prompt += `About the user: ${aiProfile.personalitySummary}. `;
    }
    if (aiProfile?.goalsSummary) {
      prompt += `Their goals: ${aiProfile.goalsSummary}. `;
    }

    // --- Inject real data ---
    prompt += `\n\n=== ${name.toUpperCase()}'S REAL DATA (use this to answer questions accurately) ===\n`;

    // Sleep
    if (data.sleep.lastNight) {
      const s = data.sleep.lastNight;
      prompt += `\nSLEEP:\n`;
      prompt += `- Last night: ${s.durationHours}h (quality score: ${s.qualityScore ?? 'N/A'}/10)`;
      if (s.deepSleepMin) prompt += `, Deep: ${s.deepSleepMin}min`;
      if (s.remSleepMin) prompt += `, REM: ${s.remSleepMin}min`;
      prompt += `\n`;
      if (data.sleep.last7NightsAvgHours) {
        prompt += `- 7-day average: ${data.sleep.last7NightsAvgHours}h over ${data.sleep.entries} nights\n`;
      }
    } else {
      prompt += `\nSLEEP: No recent data tracked.\n`;
    }

    // Habits
    if (data.habits.active.length > 0) {
      const done = data.habits.completedTodayCount;
      const total = data.habits.totalActive;
      prompt += `\nHABITS (today: ${done}/${total} completed):\n`;
      data.habits.active.forEach((h: any) => {
        const status = h.completedToday ? '✓ done' : '○ pending';
        prompt += `- ${h.name} [${status}] streak: ${h.currentStreak} days\n`;
      });
      prompt += `- Last 7 days total completions: ${data.habits.completionsLast7Days}\n`;
    }

    // Tasks
    prompt += `\nTASKS:\n`;
    if (data.tasks.todayDue.length > 0) {
      prompt += `- Due today (${data.tasks.todayDue.length}):\n`;
      data.tasks.todayDue.forEach((t: any) => {
        prompt += `  • ${t.title} [${t.priority}/${t.status}]\n`;
      });
    } else {
      prompt += `- No tasks due today\n`;
    }
    if (data.tasks.overdueCount > 0) {
      prompt += `- Overdue tasks: ${data.tasks.overdueCount}\n`;
    }

    // Meals
    prompt += `\nNUTRITION (today):\n`;
    if (data.meals.mealCount > 0) {
      prompt += `- Calories: ${data.meals.todayCalories} kcal`;
      if (Number(data.meals.todayProtein) > 0) prompt += `, Protein: ${data.meals.todayProtein}g`;
      prompt += `\n- Meals logged: ${data.meals.mealCount}\n`;
    } else {
      prompt += `- No meals logged today\n`;
    }

    // Mood
    if (data.mood.latestMood) {
      const m = data.mood.latestMood;
      prompt += `\nWELLNESS/MOOD:\n`;
      prompt += `- Latest mood: ${m.moodScore}/5`;
      if (m.stressLevel) prompt += `, Stress: ${m.stressLevel}/10`;
      if (m.energyLevel) prompt += `, Energy: ${m.energyLevel}/10`;
      prompt += `\n`;
      if (data.mood.avgScore7d) {
        prompt += `- 7-day avg mood: ${data.mood.avgScore7d}/5\n`;
      }
    }

    // Workouts
    if (data.workouts.count7d > 0) {
      prompt += `\nWORKOUTS (last 7 days: ${data.workouts.count7d} sessions):\n`;
      data.workouts.last7Days.slice(0, 5).forEach((w: any) => {
        const dateStr = new Date(w.completedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        prompt += `- ${w.title} (${w.workoutType}) — ${w.durationMinutes}min`;
        if (w.caloriesBurned) prompt += `, ${w.caloriesBurned} cal burned`;
        prompt += ` on ${dateStr}\n`;
      });
    } else {
      prompt += `\nWORKOUTS: No workouts in the last 7 days.\n`;
    }

    // Health logs
    if (data.health.todayLogs.length > 0) {
      prompt += `\nHEALTH LOGS (today):\n`;
      data.health.todayLogs.forEach((l: any) => {
        prompt += `- ${l.metricType}: ${l.value} ${l.unit || ''}\n`;
      });
    }

    // Finance
    if (data.finance.accounts.length > 0) {
      prompt += `\nFINANCE:\n`;
      data.finance.accounts.forEach((a: any) => {
        prompt += `- ${a.name} (${a.type}): ${Number(a.balance).toFixed(2)} ${a.currency || 'USD'}\n`;
      });
      prompt += `- Total balance: $${data.finance.totalBalance}\n`;
      prompt += `- This week's spending: $${data.finance.weeklySpending}\n`;
      if (data.finance.recentTransactions.length > 0) {
        prompt += `- Recent transactions:\n`;
        data.finance.recentTransactions.slice(0, 5).forEach((t: any) => {
          prompt += `  • ${t.description}: $${Number(t.amount).toFixed(2)} (${t.category || t.type})\n`;
        });
      }
    }

    prompt += `\n=== END OF USER DATA ===\n`;

    prompt += `\n=== SCOPE & BEHAVIOR RULES ===\n`;
    prompt += `You are STRICTLY a personal life management assistant for the Aura app. You can ONLY help with topics related to these Aura features:\n`;
    prompt += `- Health tracking (steps, heart rate, weight, vitals)\n`;
    prompt += `- Sleep analysis and improvement tips\n`;
    prompt += `- Habit tracking, building, and accountability\n`;
    prompt += `- Task management and productivity\n`;
    prompt += `- Meal planning, nutrition, and calorie tracking\n`;
    prompt += `- Fitness, sports, and workout planning\n`;
    prompt += `- Wellness, mood tracking, and stress management\n`;
    prompt += `- Financial tracking, budgeting, and spending analysis\n`;
    prompt += `- Education and learning goals\n`;
    prompt += `- Social connections and relationship management\n`;
    prompt += `- General wellness advice and motivational coaching related to the above\n\n`;
    prompt += `STRICT RULES:\n`;
    prompt += `1. If the user asks something COMPLETELY UNRELATED to these features (e.g., politics, coding, trivia, news, entertainment, history, science, math problems, writing essays, etc.), respond with: "I'm Aura, your personal life assistant! I'm here to help you with health, habits, tasks, meals, fitness, finance, sleep, wellness, and more within your Aura app. Could you ask me something related to those areas?"\n`;
    prompt += `2. If a question is somewhat related (e.g., "best foods for muscle gain" ties to meals/fitness), answer it helpfully.\n`;
    prompt += `3. Keep responses concise — aim for 2-4 sentences for simple questions, up to a short paragraph for complex ones. Don't write essays.\n`;
    prompt += `4. NEVER fabricate data. Only reference actual numbers from the user data above.\n`;
    prompt += `5. If data for a specific question is not shown above, say you don't have that data tracked yet and suggest the user log it in the relevant Aura module.\n`;
    prompt += `6. Be specific and reference actual numbers from the data when answering.\n`;
    prompt += `7. When giving advice, always tie it back to the user's actual tracked data when possible.\n`;
    prompt += `=== END OF RULES ===\n`;

    if (moduleContext) {
      prompt += `\nYou are currently helping with the "${moduleContext}" module. Focus responses on that topic.`;
    }

    return prompt;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  private async getUserContext(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        fullName: true,
        timezone: true,
        locale: true,
        subscriptionTier: true,
        dateOfBirth: true,
        gender: true,
      },
    });
  }

  private async getAiProfile(userId: string) {
    return prisma.aiUserProfile.findUnique({ where: { userId } });
  }

  private async getConversationHistory(conversationId: string, limit: number) {
    // Note: conversationId scoping is safe because conversations are created
    // with userId and looked up with { id, userId } before this is called.
    return prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { role: true, content: true, createdAt: true },
    });
  }

  private async getModuleData(userId: string, moduleContext: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    switch (moduleContext) {
      case 'health':
        return {
          profile: await prisma.healthProfile.findUnique({ where: { userId } }),
          todayLogs: await prisma.healthLog.findMany({
            where: { userId, loggedAt: { gte: today, lt: tomorrow } },
          }),
          recentWorkouts: await prisma.workout.findMany({
            where: { userId },
            orderBy: { completedAt: 'desc' },
            take: 5,
          }),
        };

      case 'meals':
        return {
          todayMeals: await prisma.mealLog.findMany({
            where: { userId, loggedAt: { gte: today, lt: tomorrow } },
          }),
          activePlan: await prisma.mealPlan.findFirst({
            where: { userId, isActive: true },
          }),
        };

      case 'habits':
        return {
          habits: await prisma.habit.findMany({
            where: { userId, isActive: true },
            include: {
              completions: {
                where: { completedAt: { gte: today, lt: tomorrow } },
              },
            },
          }),
        };

      case 'tasks':
        return {
          todayTasks: await prisma.task.findMany({
            where: {
              userId,
              OR: [
                { dueDate: { gte: today, lt: tomorrow } },
                { status: { in: ['todo', 'in_progress'] } },
              ],
            },
            include: { project: true },
            take: 20,
          }),
        };

      case 'finance': {
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();
        return {
          accounts: await prisma.financialAccount.findMany({
            where: { userId, isActive: true },
            select: { name: true, type: true, balance: true, currency: true },
          }),
          recentTransactions: await prisma.transaction.findMany({
            where: { userId },
            orderBy: { transactionDate: 'desc' },
            take: 10,
          }),
          budgets: await prisma.budget.findMany({
            where: { userId, month: currentMonth, year: currentYear },
          }),
        };
      }

      case 'wellness':
        return {
          recentMoods: await prisma.moodLog.findMany({
            where: { userId },
            orderBy: { loggedAt: 'desc' },
            take: 7,
          }),
          recentJournal: await prisma.journalEntry.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: { title: true, moodScore: true, createdAt: true },
          }),
        };

      case 'learning':
        return {
          activeGoals: await prisma.learningGoal.findMany({
            where: { userId, status: 'active' },
          }),
          recentSessions: await prisma.learningSession.findMany({
            where: { userId },
            orderBy: { completedAt: 'desc' },
            take: 5,
          }),
        };

      default:
        return null;
    }
  }
}
