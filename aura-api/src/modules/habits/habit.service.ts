import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/utils/errors';
import { paginate, paginatedResponse, PaginationParams } from '../../shared/utils/pagination';

export class HabitService {
  async create(userId: string, data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    frequency?: string;
    frequencyConfig?: any;
    targetCount?: number;
    reminderTimes?: any;
    category?: string;
  }) {
    return prisma.habit.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        icon: data.icon || 'star',
        color: data.color || '#6C5CE7',
        frequency: (data.frequency as any) || 'daily',
        frequencyConfig: data.frequencyConfig,
        targetCount: data.targetCount || 1,
        reminderTimes: data.reminderTimes,
        category: (data.category as any) || 'custom',
      },
    });
  }

  async getAll(userId: string, params: { isActive?: boolean; category?: string }) {
    const where: any = { userId };
    if (params.isActive !== undefined) where.isActive = params.isActive;
    if (params.category) where.category = params.category;

    return prisma.habit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(userId: string, id: string) {
    const habit = await prisma.habit.findFirst({
      where: { id, userId },
      include: {
        completions: {
          orderBy: { completedAt: 'desc' },
          take: 30,
        },
      },
    });
    if (!habit) throw new NotFoundError('Habit');
    return habit;
  }

  async update(userId: string, id: string, data: {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    frequency?: string;
    frequencyConfig?: any;
    targetCount?: number;
    reminderTimes?: any;
    category?: string;
    isActive?: boolean;
  }) {
    const habit = await prisma.habit.findFirst({ where: { id, userId } });
    if (!habit) throw new NotFoundError('Habit');

    return prisma.habit.update({
      where: { id },
      data: {
        ...data,
        frequency: data.frequency as any,
        category: data.category as any,
      },
    });
  }

  async delete(userId: string, id: string) {
    const habit = await prisma.habit.findFirst({ where: { id, userId } });
    if (!habit) throw new NotFoundError('Habit');
    await prisma.habit.delete({ where: { id } });
    return { message: 'Habit deleted' };
  }

  async complete(userId: string, habitId: string, data: { value?: number; note?: string }) {
    const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
    if (!habit) throw new NotFoundError('Habit');

    const completion = await prisma.habitCompletion.create({
      data: {
        habitId,
        userId,
        value: data.value,
        note: data.note,
      },
    });

    // Update streak
    const newStreak = habit.streakCurrent + 1;
    await prisma.habit.update({
      where: { id: habitId },
      data: {
        streakCurrent: newStreak,
        streakBest: Math.max(newStreak, habit.streakBest),
      },
    });

    return completion;
  }

  async getHistory(userId: string, habitId: string, params: PaginationParams & { from?: string; to?: string }) {
    const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
    if (!habit) throw new NotFoundError('Habit');

    const where: any = { habitId, userId };
    if (params.from || params.to) {
      where.completedAt = {};
      if (params.from) where.completedAt.gte = new Date(params.from);
      if (params.to) where.completedAt.lte = new Date(params.to);
    }

    const [data, total] = await Promise.all([
      prisma.habitCompletion.findMany({
        where,
        ...paginate(params),
        orderBy: { completedAt: 'desc' },
      }),
      prisma.habitCompletion.count({ where }),
    ]);

    return paginatedResponse(data, total, params);
  }

  async getStats(userId: string) {
    const habits = await prisma.habit.findMany({
      where: { userId, isActive: true },
      include: {
        _count: { select: { completions: true } },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCompletions = await prisma.habitCompletion.findMany({
      where: {
        userId,
        completedAt: { gte: today, lt: tomorrow },
      },
      select: { habitId: true },
    });

    const completedTodayIds = new Set(todayCompletions.map(c => c.habitId));

    return {
      totalHabits: habits.length,
      completedToday: completedTodayIds.size,
      habits: habits.map(h => ({
        id: h.id,
        name: h.name,
        icon: h.icon,
        color: h.color,
        streakCurrent: h.streakCurrent,
        streakBest: h.streakBest,
        totalCompletions: h._count.completions,
        completedToday: completedTodayIds.has(h.id),
      })),
    };
  }
}
