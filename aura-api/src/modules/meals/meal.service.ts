import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/utils/errors';
import { paginate, paginatedResponse, PaginationParams } from '../../shared/utils/pagination';

export class MealService {
  // --- Meal Logs ---
  async createMealLog(userId: string, data: {
    mealPlanId?: string;
    mealType: string;
    foodItems: any;
    totalCalories: number;
    totalProtein?: number;
    totalCarbs?: number;
    totalFat?: number;
    photoUrl?: string;
  }) {
    return prisma.mealLog.create({
      data: {
        userId,
        mealPlanId: data.mealPlanId,
        mealType: data.mealType as any,
        foodItems: data.foodItems,
        totalCalories: data.totalCalories,
        totalProtein: data.totalProtein,
        totalCarbs: data.totalCarbs,
        totalFat: data.totalFat,
        photoUrl: data.photoUrl,
      },
    });
  }

  async getMealLogs(userId: string, params: PaginationParams & { mealType?: string; from?: string; to?: string }) {
    const where: any = { userId };
    if (params.mealType) where.mealType = params.mealType;
    if (params.from || params.to) {
      where.loggedAt = {};
      if (params.from) where.loggedAt.gte = new Date(params.from);
      if (params.to) where.loggedAt.lte = new Date(params.to);
    }

    const [data, total] = await Promise.all([
      prisma.mealLog.findMany({
        where,
        ...paginate(params),
        orderBy: { loggedAt: 'desc' },
      }),
      prisma.mealLog.count({ where }),
    ]);

    return paginatedResponse(data, total, params);
  }

  async getMealLog(userId: string, id: string) {
    const log = await prisma.mealLog.findFirst({ where: { id, userId } });
    if (!log) throw new NotFoundError('Meal log');
    return log;
  }

  async deleteMealLog(userId: string, id: string) {
    const log = await prisma.mealLog.findFirst({ where: { id, userId } });
    if (!log) throw new NotFoundError('Meal log');
    await prisma.mealLog.delete({ where: { id } });
    return { message: 'Meal log deleted' };
  }

  // --- Water Logs ---
  async createWaterLog(userId: string, data: { amountMl: number }) {
    return prisma.waterLog.create({
      data: { userId, amountMl: data.amountMl },
    });
  }

  async getWaterLogs(userId: string, params: { from?: string; to?: string }) {
    const where: any = { userId };
    if (params.from || params.to) {
      where.loggedAt = {};
      if (params.from) where.loggedAt.gte = new Date(params.from);
      if (params.to) where.loggedAt.lte = new Date(params.to);
    }

    const logs = await prisma.waterLog.findMany({
      where,
      orderBy: { loggedAt: 'desc' },
    });

    const totalMl = logs.reduce((sum, l) => sum + l.amountMl, 0);

    return { logs, totalMl };
  }

  // --- Meal Plans ---
  async createMealPlan(userId: string, data: {
    name: string;
    dietType: string;
    dailyCalorieTarget?: number;
    macroTargets?: any;
    startDate?: string;
    endDate?: string;
  }) {
    return prisma.mealPlan.create({
      data: {
        userId,
        name: data.name,
        dietType: data.dietType as any,
        dailyCalorieTarget: data.dailyCalorieTarget,
        macroTargets: data.macroTargets,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }

  async getMealPlans(userId: string) {
    return prisma.mealPlan.findMany({
      where: { userId },
      include: { _count: { select: { mealLogs: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMealPlan(userId: string, id: string) {
    const plan = await prisma.mealPlan.findFirst({
      where: { id, userId },
      include: { mealLogs: { orderBy: { loggedAt: 'desc' }, take: 20 } },
    });
    if (!plan) throw new NotFoundError('Meal plan');
    return plan;
  }

  async updateMealPlan(userId: string, id: string, data: {
    name?: string;
    dietType?: string;
    dailyCalorieTarget?: number;
    macroTargets?: any;
    isActive?: boolean;
  }) {
    const plan = await prisma.mealPlan.findFirst({ where: { id, userId } });
    if (!plan) throw new NotFoundError('Meal plan');

    return prisma.mealPlan.update({
      where: { id },
      data: {
        ...data,
        dietType: data.dietType as any,
      },
    });
  }

  async deleteMealPlan(userId: string, id: string) {
    const plan = await prisma.mealPlan.findFirst({ where: { id, userId } });
    if (!plan) throw new NotFoundError('Meal plan');
    await prisma.mealPlan.delete({ where: { id } });
    return { message: 'Meal plan deleted' };
  }

  // --- Food Search ---
  async searchFood(query: string, limit: number = 20) {
    return prisma.food.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { brand: { contains: query, mode: 'insensitive' } },
          { barcode: query },
        ],
      },
      take: limit,
      orderBy: { name: 'asc' },
    });
  }

  // --- Daily Summary ---
  async getDailySummary(userId: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const [meals, water] = await Promise.all([
      prisma.mealLog.findMany({
        where: {
          userId,
          loggedAt: { gte: targetDate, lt: nextDay },
        },
        orderBy: { loggedAt: 'asc' },
      }),
      prisma.waterLog.findMany({
        where: {
          userId,
          loggedAt: { gte: targetDate, lt: nextDay },
        },
      }),
    ]);

    const totalCalories = meals.reduce((sum, m) => sum + m.totalCalories, 0);
    const totalProtein = meals.reduce((sum, m) => sum + (m.totalProtein || 0), 0);
    const totalCarbs = meals.reduce((sum, m) => sum + (m.totalCarbs || 0), 0);
    const totalFat = meals.reduce((sum, m) => sum + (m.totalFat || 0), 0);
    const totalWaterMl = water.reduce((sum, w) => sum + w.amountMl, 0);

    return {
      date: targetDate.toISOString().split('T')[0],
      meals,
      totals: { calories: totalCalories, protein: totalProtein, carbs: totalCarbs, fat: totalFat },
      waterMl: totalWaterMl,
    };
  }
}
