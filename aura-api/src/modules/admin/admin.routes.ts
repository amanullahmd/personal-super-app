import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';
import { authenticate } from '../../shared/middleware/auth.middleware';

// Simple admin check: demo@aura.app or ADMIN_EMAILS env var
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'demo@aura.app,admin@aura.app').split(',');

async function requireAdmin(request: any, reply: any) {
  await authenticate(request, reply);
  const userId = request.user?.sub;
  if (!userId) return reply.status(401).send({ error: 'Unauthorized' });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    return reply.status(403).send({ error: 'Admin access required' });
  }
}

export async function adminRoutes(app: FastifyInstance) {
  // Stats overview
  app.get('/stats', { preHandler: [requireAdmin] }, async (_req, reply) => {
    const [totalUsers, proUsers, totalTasks, totalHabits, totalWorkouts, totalTransactions] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { subscriptionTier: 'pro' } }),
      prisma.task.count(),
      prisma.habit.count(),
      prisma.sportsActivity.count(),
      prisma.transaction.count(),
    ]);

    const newUsersThisWeek = await prisma.user.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    });

    return reply.send({
      users: { total: totalUsers, pro: proUsers, free: totalUsers - proUsers, newThisWeek: newUsersThisWeek },
      content: { tasks: totalTasks, habits: totalHabits, workouts: totalWorkouts, transactions: totalTransactions },
      revenue: {
        mrr: proUsers * 9.99,
        arr: proUsers * 9.99 * 12,
        conversionRate: totalUsers > 0 ? Math.round((proUsers / totalUsers) * 100) : 0,
      },
    });
  });

  // Users list
  app.get('/users', { preHandler: [requireAdmin] }, async (request: any, reply) => {
    const page = Number(request.query?.page ?? 1);
    const limit = Number(request.query?.limit ?? 20);
    const search = request.query?.search as string | undefined;

    const where = search
      ? { OR: [{ email: { contains: search } }, { fullName: { contains: search } }] }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, fullName: true, subscriptionTier: true,
          isActive: true, createdAt: true, lastLoginAt: true,
          _count: { select: { tasks: true, habits: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return reply.send({ users, total, page, limit, pages: Math.ceil(total / limit) });
  });

  // Toggle user subscription (admin action)
  app.patch('/users/:id/subscription', { preHandler: [requireAdmin] }, async (request: any, reply) => {
    const { id } = request.params;
    const { tier } = request.body as { tier: 'free' | 'pro' };
    const user = await prisma.user.update({
      where: { id },
      data: { subscriptionTier: tier },
      select: { id: true, email: true, subscriptionTier: true },
    });
    return reply.send(user);
  });

  // Toggle user active status
  app.patch('/users/:id/status', { preHandler: [requireAdmin] }, async (request: any, reply) => {
    const { id } = request.params;
    const { isActive } = request.body as { isActive: boolean };
    const user = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, email: true, isActive: true },
    });
    return reply.send(user);
  });

  // Recent activity across all modules
  app.get('/activity', { preHandler: [requireAdmin] }, async (_req, reply) => {
    const [recentTasks, recentWorkouts, recentTransactions] = await Promise.all([
      prisma.task.findMany({
        take: 10, orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, createdAt: true, user: { select: { email: true } } },
      }),
      prisma.sportsActivity.findMany({
        take: 10, orderBy: { completedAt: 'desc' },
        select: { id: true, sportType: true, completedAt: true, user: { select: { email: true } } },
      }),
      prisma.transaction.findMany({
        take: 10, orderBy: { transactionDate: 'desc' },
        select: { id: true, description: true, amount: true, transactionDate: true, user: { select: { email: true } } },
      }),
    ]);
    return reply.send({ recentTasks, recentWorkouts, recentTransactions });
  });
}
