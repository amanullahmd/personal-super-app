import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/utils/errors';
import { paginate, paginatedResponse, PaginationParams } from '../../shared/utils/pagination';

export class WellnessService {
  // --- Mood Logs ---
  async createMoodLog(userId: string, data: {
    moodScore: number;
    emotions?: any;
    energyLevel?: number;
    stressLevel?: number;
    triggers?: any;
    journalEntry?: string;
  }) {
    return prisma.moodLog.create({
      data: { userId, ...data },
    });
  }

  async getMoodLogs(userId: string, params: PaginationParams & { from?: string; to?: string }) {
    const where: any = { userId };
    if (params.from || params.to) {
      where.loggedAt = {};
      if (params.from) where.loggedAt.gte = new Date(params.from);
      if (params.to) where.loggedAt.lte = new Date(params.to);
    }

    const [data, total] = await Promise.all([
      prisma.moodLog.findMany({
        where,
        ...paginate(params),
        orderBy: { loggedAt: 'desc' },
      }),
      prisma.moodLog.count({ where }),
    ]);

    return paginatedResponse(data, total, params);
  }

  async getMoodStats(userId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await prisma.moodLog.findMany({
      where: { userId, loggedAt: { gte: since } },
      orderBy: { loggedAt: 'asc' },
      select: {
        moodScore: true,
        energyLevel: true,
        stressLevel: true,
        loggedAt: true,
      },
    });

    const avgMood = logs.length > 0
      ? logs.reduce((sum, l) => sum + l.moodScore, 0) / logs.length
      : 0;

    const avgEnergy = logs.filter(l => l.energyLevel != null).length > 0
      ? logs.filter(l => l.energyLevel != null).reduce((sum, l) => sum + l.energyLevel!, 0) /
        logs.filter(l => l.energyLevel != null).length
      : 0;

    const avgStress = logs.filter(l => l.stressLevel != null).length > 0
      ? logs.filter(l => l.stressLevel != null).reduce((sum, l) => sum + l.stressLevel!, 0) /
        logs.filter(l => l.stressLevel != null).length
      : 0;

    return {
      period: `${days} days`,
      totalEntries: logs.length,
      averageMood: Math.round(avgMood * 10) / 10,
      averageEnergy: Math.round(avgEnergy * 10) / 10,
      averageStress: Math.round(avgStress * 10) / 10,
      trend: logs,
    };
  }

  // --- Journal ---
  async createJournalEntry(userId: string, data: {
    title?: string;
    content: string;
    moodScore?: number;
    gratitudeItems?: any;
    tags?: any;
    isPrivate?: boolean;
  }) {
    return prisma.journalEntry.create({
      data: {
        userId,
        title: data.title,
        content: data.content,
        moodScore: data.moodScore,
        gratitudeItems: data.gratitudeItems,
        tags: data.tags,
        isPrivate: data.isPrivate ?? true,
      },
    });
  }

  async getJournalEntries(userId: string, params: PaginationParams & { from?: string; to?: string }) {
    const where: any = { userId };
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = new Date(params.from);
      if (params.to) where.createdAt.lte = new Date(params.to);
    }

    const [data, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        ...paginate(params),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.journalEntry.count({ where }),
    ]);

    return paginatedResponse(data, total, params);
  }

  async getJournalEntry(userId: string, id: string) {
    const entry = await prisma.journalEntry.findFirst({ where: { id, userId } });
    if (!entry) throw new NotFoundError('Journal entry');
    return entry;
  }

  async updateJournalEntry(userId: string, id: string, data: {
    title?: string;
    content?: string;
    moodScore?: number;
    gratitudeItems?: any;
    tags?: any;
  }) {
    const entry = await prisma.journalEntry.findFirst({ where: { id, userId } });
    if (!entry) throw new NotFoundError('Journal entry');

    return prisma.journalEntry.update({ where: { id }, data });
  }

  async deleteJournalEntry(userId: string, id: string) {
    const entry = await prisma.journalEntry.findFirst({ where: { id, userId } });
    if (!entry) throw new NotFoundError('Journal entry');
    await prisma.journalEntry.delete({ where: { id } });
    return { message: 'Journal entry deleted' };
  }

  // --- Meditation ---
  async createMeditationSession(userId: string, data: {
    type: string;
    durationMinutes: number;
    moodBefore?: number;
    moodAfter?: number;
  }) {
    return prisma.meditationSession.create({
      data: {
        userId,
        type: data.type as any,
        durationMinutes: data.durationMinutes,
        moodBefore: data.moodBefore,
        moodAfter: data.moodAfter,
      },
    });
  }

  async getMeditationSessions(userId: string, params: PaginationParams & { type?: string; from?: string; to?: string }) {
    const where: any = { userId };
    if (params.type) where.type = params.type;
    if (params.from || params.to) {
      where.completedAt = {};
      if (params.from) where.completedAt.gte = new Date(params.from);
      if (params.to) where.completedAt.lte = new Date(params.to);
    }

    const [data, total] = await Promise.all([
      prisma.meditationSession.findMany({
        where,
        ...paginate(params),
        orderBy: { completedAt: 'desc' },
      }),
      prisma.meditationSession.count({ where }),
    ]);

    return paginatedResponse(data, total, params);
  }

  async getMeditationStats(userId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalSessions, recentSessions, aggregates] = await Promise.all([
      prisma.meditationSession.count({ where: { userId } }),
      prisma.meditationSession.count({
        where: { userId, completedAt: { gte: thirtyDaysAgo } },
      }),
      prisma.meditationSession.aggregate({
        where: { userId },
        _sum: { durationMinutes: true },
        _avg: { durationMinutes: true },
      }),
    ]);

    return {
      totalSessions,
      sessionsLast30Days: recentSessions,
      totalMinutes: aggregates._sum.durationMinutes || 0,
      avgDurationMinutes: Math.round((aggregates._avg.durationMinutes || 0) * 10) / 10,
    };
  }
}
