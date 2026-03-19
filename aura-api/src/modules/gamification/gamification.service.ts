import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/utils/errors';

export class GamificationService {
  // --- User XP & Level ---
  async getProfile(userId: string) {
    const [xp, achievementCount] = await Promise.all([
      prisma.userXp.findUnique({ where: { userId } }),
      prisma.userAchievement.count({ where: { userId } }),
    ]);

    if (!xp) {
      // Create default XP record
      const newXp = await prisma.userXp.create({ data: { userId } });
      return { ...newXp, achievementCount: 0 };
    }

    return { ...xp, achievementCount };
  }

  async addXp(userId: string, amount: number, reason: string) {
    const xp = await prisma.userXp.upsert({
      where: { userId },
      create: { userId, totalXp: amount },
      update: { totalXp: { increment: amount } },
    });

    // Check for level up
    let { level, xpToNextLevel, totalXp } = xp;
    let leveledUp = false;

    while (totalXp >= xpToNextLevel) {
      totalXp -= xpToNextLevel;
      level += 1;
      xpToNextLevel = Math.floor(100 * Math.pow(1.5, level - 1)); // Exponential scaling
      leveledUp = true;
    }

    if (leveledUp) {
      await prisma.userXp.update({
        where: { userId },
        data: { level, xpToNextLevel, totalXp },
      });
    }

    return {
      totalXp: xp.totalXp,
      xpAdded: amount,
      reason,
      level,
      xpToNextLevel,
      leveledUp,
    };
  }

  // --- Achievements ---
  async getAchievements(userId: string) {
    const [allAchievements, userAchievements] = await Promise.all([
      prisma.achievement.findMany({ orderBy: { category: 'asc' } }),
      prisma.userAchievement.findMany({
        where: { userId },
        include: { achievement: true },
      }),
    ]);

    const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId));

    return {
      unlocked: userAchievements.map(ua => ({
        ...ua.achievement,
        unlockedAt: ua.unlockedAt,
        progressPercent: ua.progressPercent,
      })),
      locked: allAchievements
        .filter(a => !unlockedIds.has(a.id))
        .map(a => ({
          id: a.id,
          name: a.name,
          description: a.description,
          iconUrl: a.iconUrl,
          category: a.category,
          xpReward: a.xpReward,
        })),
      total: allAchievements.length,
      unlockedCount: userAchievements.length,
    };
  }

  async unlockAchievement(userId: string, achievementId: string) {
    const achievement = await prisma.achievement.findUnique({
      where: { id: achievementId },
    });
    if (!achievement) throw new NotFoundError('Achievement');

    // Check if already unlocked
    const existing = await prisma.userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId } },
    });

    if (existing) {
      return { alreadyUnlocked: true, achievement };
    }

    const [userAchievement] = await Promise.all([
      prisma.userAchievement.create({
        data: {
          userId,
          achievementId,
          progressPercent: 100,
        },
        include: { achievement: true },
      }),
      this.addXp(userId, achievement.xpReward, `Achievement: ${achievement.name}`),
    ]);

    return {
      alreadyUnlocked: false,
      achievement: userAchievement.achievement,
      xpAwarded: achievement.xpReward,
    };
  }

  async updateAchievementProgress(userId: string, achievementId: string, progressPercent: number) {
    const userAchievement = await prisma.userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId } },
    });

    if (userAchievement) {
      return prisma.userAchievement.update({
        where: { id: userAchievement.id },
        data: { progressPercent: Math.min(progressPercent, 100) },
      });
    }

    return prisma.userAchievement.create({
      data: {
        userId,
        achievementId,
        progressPercent: Math.min(progressPercent, 100),
      },
    });
  }

  // --- Leaderboard / Challenges ---
  async getLeaderboard(limit: number = 20) {
    const topUsers = await prisma.userXp.findMany({
      orderBy: { totalXp: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
      },
    });

    return topUsers.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      fullName: entry.user.fullName,
      avatarUrl: entry.user.avatarUrl,
      totalXp: entry.totalXp,
      level: entry.level,
    }));
  }

  // --- Stats ---
  async getStats(userId: string) {
    const xp = await prisma.userXp.findUnique({ where: { userId } });

    const [totalAchievements, unlockedAchievements] = await Promise.all([
      prisma.achievement.count(),
      prisma.userAchievement.count({ where: { userId } }),
    ]);

    return {
      level: xp?.level || 1,
      totalXp: xp?.totalXp || 0,
      xpToNextLevel: xp?.xpToNextLevel || 100,
      weeklyXp: xp?.weeklyXp || {},
      achievements: {
        total: totalAchievements,
        unlocked: unlockedAchievements,
        percentComplete: totalAchievements > 0
          ? Math.round((unlockedAchievements / totalAchievements) * 100)
          : 0,
      },
    };
  }
}
