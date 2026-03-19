import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/utils/errors';
import { paginate, paginatedResponse, PaginationParams } from '../../shared/utils/pagination';

export class HealthService {
  // --- Health Profile ---
  async getProfile(userId: string) {
    const profile = await prisma.healthProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundError('Health profile');
    }
    return profile;
  }

  async upsertProfile(userId: string, data: {
    heightCm?: number;
    weightKg?: number;
    bloodType?: string;
    allergies?: any;
    medicalConditions?: any;
    fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';
    dailyCalorieGoal?: number;
    dailyWaterGoalMl?: number;
    dailyStepsGoal?: number;
    sleepGoalHours?: number;
  }) {
    return prisma.healthProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  // --- Health Logs ---
  async createLog(userId: string, data: {
    metricType: string;
    value: number;
    unit: string;
    metadata?: any;
    source?: string;
  }) {
    return prisma.healthLog.create({
      data: {
        userId,
        metricType: data.metricType as any,
        value: data.value,
        unit: data.unit,
        metadata: data.metadata,
        source: (data.source as any) || 'manual',
      },
    });
  }

  async getLogs(userId: string, params: PaginationParams & { metricType?: string; from?: string; to?: string }) {
    const where: any = { userId };
    if (params.metricType) where.metricType = params.metricType;
    if (params.from || params.to) {
      where.loggedAt = {};
      if (params.from) where.loggedAt.gte = new Date(params.from);
      if (params.to) where.loggedAt.lte = new Date(params.to);
    }

    const [data, total] = await Promise.all([
      prisma.healthLog.findMany({
        where,
        ...paginate(params),
        orderBy: { loggedAt: 'desc' },
      }),
      prisma.healthLog.count({ where }),
    ]);

    return paginatedResponse(data, total, params);
  }

  // --- Workouts ---
  async createWorkout(userId: string, data: {
    workoutType: string;
    title: string;
    durationMinutes: number;
    caloriesBurned?: number;
    intensity?: string;
    exercises?: any;
    notes?: string;
    heartRateAvg?: number;
    heartRateMax?: number;
  }) {
    return prisma.workout.create({
      data: {
        userId,
        workoutType: data.workoutType as any,
        title: data.title,
        durationMinutes: data.durationMinutes,
        caloriesBurned: data.caloriesBurned,
        intensity: (data.intensity as any) || 'medium',
        exercises: data.exercises,
        notes: data.notes,
        heartRateAvg: data.heartRateAvg,
        heartRateMax: data.heartRateMax,
      },
    });
  }

  async getWorkouts(userId: string, params: PaginationParams & { workoutType?: string; from?: string; to?: string }) {
    const where: any = { userId };
    if (params.workoutType) where.workoutType = params.workoutType;
    if (params.from || params.to) {
      where.completedAt = {};
      if (params.from) where.completedAt.gte = new Date(params.from);
      if (params.to) where.completedAt.lte = new Date(params.to);
    }

    const [data, total] = await Promise.all([
      prisma.workout.findMany({
        where,
        ...paginate(params),
        orderBy: { completedAt: 'desc' },
      }),
      prisma.workout.count({ where }),
    ]);

    return paginatedResponse(data, total, params);
  }

  async getWorkout(userId: string, workoutId: string) {
    const workout = await prisma.workout.findFirst({
      where: { id: workoutId, userId },
    });
    if (!workout) throw new NotFoundError('Workout');
    return workout;
  }

  async deleteWorkout(userId: string, workoutId: string) {
    const workout = await prisma.workout.findFirst({ where: { id: workoutId, userId } });
    if (!workout) throw new NotFoundError('Workout');
    await prisma.workout.delete({ where: { id: workoutId } });
    return { message: 'Workout deleted' };
  }

  // --- Sleep ---
  async createSleepLog(userId: string, data: {
    sleepStart: string;
    sleepEnd: string;
    qualityScore?: number;
    deepSleepMinutes?: number;
    remSleepMinutes?: number;
    lightSleepMinutes?: number;
    awakeMinutes?: number;
    source?: string;
    notes?: string;
  }) {
    const start = new Date(data.sleepStart);
    const end = new Date(data.sleepEnd);
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

    return prisma.sleepLog.create({
      data: {
        userId,
        sleepStart: start,
        sleepEnd: end,
        durationMinutes,
        qualityScore: data.qualityScore,
        deepSleepMinutes: data.deepSleepMinutes,
        remSleepMinutes: data.remSleepMinutes,
        lightSleepMinutes: data.lightSleepMinutes,
        awakeMinutes: data.awakeMinutes,
        source: (data.source as any) || 'manual',
        notes: data.notes,
      },
    });
  }

  async getSleepLogs(userId: string, params: PaginationParams & { from?: string; to?: string }) {
    const where: any = { userId };
    if (params.from || params.to) {
      where.sleepStart = {};
      if (params.from) where.sleepStart.gte = new Date(params.from);
      if (params.to) where.sleepStart.lte = new Date(params.to);
    }

    const [data, total] = await Promise.all([
      prisma.sleepLog.findMany({
        where,
        ...paginate(params),
        orderBy: { sleepStart: 'desc' },
      }),
      prisma.sleepLog.count({ where }),
    ]);

    return paginatedResponse(data, total, params);
  }

  // --- Dashboard ---
  async getDashboard(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [profile, todayLogs, todayWorkouts, lastSleep, todayWater] = await Promise.all([
      prisma.healthProfile.findUnique({ where: { userId } }),
      prisma.healthLog.findMany({
        where: { userId, loggedAt: { gte: today, lt: tomorrow } },
        orderBy: { loggedAt: 'desc' },
      }),
      prisma.workout.findMany({
        where: { userId, completedAt: { gte: today, lt: tomorrow } },
      }),
      prisma.sleepLog.findFirst({
        where: { userId },
        orderBy: { sleepStart: 'desc' },
      }),
      prisma.waterLog.findMany({
        where: { userId, loggedAt: { gte: today, lt: tomorrow } },
      }),
    ]);

    const totalWaterMl = todayWater.reduce((sum, w) => sum + w.amountMl, 0);
    const totalCaloriesBurned = todayWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);

    return {
      profile,
      today: {
        healthLogs: todayLogs,
        workouts: todayWorkouts,
        lastSleep,
        waterIntakeMl: totalWaterMl,
        waterGoalMl: profile?.dailyWaterGoalMl || 2000,
        caloriesBurned: totalCaloriesBurned,
        stepsGoal: profile?.dailyStepsGoal || 10000,
      },
    };
  }
}
