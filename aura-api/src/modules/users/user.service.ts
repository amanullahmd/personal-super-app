import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/utils/errors';

export class UserService {
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        avatarUrl: true,
        dateOfBirth: true,
        gender: true,
        timezone: true,
        locale: true,
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        onboardingCompleted: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    return user;
  }

  async updateMe(userId: string, data: {
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
    dateOfBirth?: string;
    gender?: string;
    timezone?: string;
    locale?: string;
    onboardingCompleted?: boolean;
  }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        avatarUrl: true,
        dateOfBirth: true,
        gender: true,
        timezone: true,
        locale: true,
        subscriptionTier: true,
        onboardingCompleted: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async getPreferences(userId: string) {
    const prefs = await prisma.userPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      // Create default preferences if they don't exist
      return prisma.userPreference.create({
        data: { userId },
      });
    }

    return prefs;
  }

  async updatePreferences(userId: string, data: {
    theme?: 'light' | 'dark' | 'auto';
    accentColor?: string;
    dashboardLayout?: any;
    activeModules?: any;
    notificationSettings?: any;
    voiceAssistantEnabled?: boolean;
    voiceId?: string;
    units?: 'metric' | 'imperial';
  }) {
    const prefs = await prisma.userPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    return prefs;
  }

  async deleteAccount(userId: string) {
    await prisma.user.delete({ where: { id: userId } });
    return { message: 'Account deleted successfully' };
  }

  async exportData(userId: string) {
    // Pro-only: gather all user data across modules
    const [user, tasks, habits, meals, sleepLogs, transactions, workouts, moodLogs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, fullName: true, createdAt: true, subscriptionTier: true },
      }),
      prisma.task.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.habit.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.mealLog.findMany({ where: { userId }, orderBy: { loggedAt: 'desc' }, take: 200 }),
      prisma.sleepLog.findMany({ where: { userId }, orderBy: { sleepStart: 'desc' }, take: 200 }),
      prisma.transaction.findMany({ where: { userId }, orderBy: { transactionDate: 'desc' }, take: 500 }),
      prisma.sportsActivity.findMany({ where: { userId }, orderBy: { completedAt: 'desc' }, take: 200 }),
      prisma.moodLog.findMany({ where: { userId }, orderBy: { loggedAt: 'desc' }, take: 200 }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      user,
      data: {
        tasks: { count: tasks.length, items: tasks },
        habits: { count: habits.length, items: habits },
        meals: { count: meals.length, items: meals },
        sleep: { count: sleepLogs.length, items: sleepLogs },
        finance: { count: transactions.length, items: transactions },
        workouts: { count: workouts.length, items: workouts },
        mood: { count: moodLogs.length, items: moodLogs },
      },
    };
  }
}
