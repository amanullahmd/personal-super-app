import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/utils/errors';
import { paginate, paginatedResponse, PaginationParams } from '../../shared/utils/pagination';

export class SportsService {
  // --- Profile ---
  async getProfile(userId: string) {
    const profile = await prisma.sportsProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundError('Sports profile');
    return profile;
  }

  async upsertProfile(userId: string, data: {
    primarySports?: any;
    skillLevels?: any;
    preferredWorkoutTimes?: any;
    injuries?: any;
  }) {
    return prisma.sportsProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  // --- Activities ---
  async createActivity(userId: string, data: {
    sportType: string;
    distanceKm?: number;
    durationMinutes: number;
    caloriesBurned?: number;
    avgSpeed?: number;
    maxSpeed?: number;
    routeData?: any;
    weatherConditions?: any;
    performanceNotes?: string;
    personalBest?: boolean;
  }) {
    return prisma.sportsActivity.create({
      data: { userId, ...data },
    });
  }

  async getActivities(userId: string, params: PaginationParams & {
    sportType?: string;
    from?: string;
    to?: string;
  }) {
    const where: any = { userId };
    if (params.sportType) where.sportType = params.sportType;
    if (params.from || params.to) {
      where.completedAt = {};
      if (params.from) where.completedAt.gte = new Date(params.from);
      if (params.to) where.completedAt.lte = new Date(params.to);
    }

    const [data, total] = await Promise.all([
      prisma.sportsActivity.findMany({
        where,
        ...paginate(params),
        orderBy: { completedAt: 'desc' },
      }),
      prisma.sportsActivity.count({ where }),
    ]);

    return paginatedResponse(data, total, params);
  }

  async getActivity(userId: string, id: string) {
    const activity = await prisma.sportsActivity.findFirst({ where: { id, userId } });
    if (!activity) throw new NotFoundError('Sports activity');
    return activity;
  }

  async deleteActivity(userId: string, id: string) {
    const activity = await prisma.sportsActivity.findFirst({ where: { id, userId } });
    if (!activity) throw new NotFoundError('Sports activity');
    await prisma.sportsActivity.delete({ where: { id } });
    return { message: 'Activity deleted' };
  }

  // --- Training Plans ---
  async createTrainingPlan(userId: string, data: {
    name: string;
    sportType: string;
    goal?: string;
    weeksDuration: number;
    schedule: any;
    aiGenerated?: boolean;
  }) {
    return prisma.trainingPlan.create({
      data: { userId, ...data },
    });
  }

  async getTrainingPlans(userId: string, params: { status?: string }) {
    const where: any = { userId };
    if (params.status) where.status = params.status;

    return prisma.trainingPlan.findMany({
      where,
      orderBy: { startedAt: 'desc' },
    });
  }

  async getTrainingPlan(userId: string, id: string) {
    const plan = await prisma.trainingPlan.findFirst({ where: { id, userId } });
    if (!plan) throw new NotFoundError('Training plan');
    return plan;
  }

  async updateTrainingPlan(userId: string, id: string, data: {
    name?: string;
    goal?: string;
    schedule?: any;
    status?: string;
  }) {
    const plan = await prisma.trainingPlan.findFirst({ where: { id, userId } });
    if (!plan) throw new NotFoundError('Training plan');

    return prisma.trainingPlan.update({
      where: { id },
      data: { ...data, status: data.status as any },
    });
  }

  async deleteTrainingPlan(userId: string, id: string) {
    const plan = await prisma.trainingPlan.findFirst({ where: { id, userId } });
    if (!plan) throw new NotFoundError('Training plan');
    await prisma.trainingPlan.delete({ where: { id } });
    return { message: 'Training plan deleted' };
  }

  // --- Stats ---
  async getStats(userId: string, sportType?: string) {
    const where: any = { userId };
    if (sportType) where.sportType = sportType;

    const [totalActivities, aggregates, personalBests] = await Promise.all([
      prisma.sportsActivity.count({ where }),
      prisma.sportsActivity.aggregate({
        where,
        _sum: {
          distanceKm: true,
          durationMinutes: true,
          caloriesBurned: true,
        },
        _avg: {
          avgSpeed: true,
          distanceKm: true,
        },
      }),
      prisma.sportsActivity.findMany({
        where: { ...where, personalBest: true },
        orderBy: { completedAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      totalActivities,
      totalDistanceKm: aggregates._sum.distanceKm || 0,
      totalDurationMinutes: aggregates._sum.durationMinutes || 0,
      totalCaloriesBurned: aggregates._sum.caloriesBurned || 0,
      avgSpeed: aggregates._avg.avgSpeed || 0,
      avgDistanceKm: aggregates._avg.distanceKm || 0,
      personalBests,
    };
  }
}
