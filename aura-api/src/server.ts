import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env';

// Module routes
import { authRoutes } from './modules/auth/auth.routes';
import { userRoutes } from './modules/users/user.routes';
import { healthRoutes } from './modules/health/health.routes';
import { mealRoutes } from './modules/meals/meal.routes';
import { habitRoutes } from './modules/habits/habit.routes';
import { taskRoutes } from './modules/tasks/task.routes';
import { noteRoutes } from './modules/tasks/note.routes';
import { educationRoutes } from './modules/education/education.routes';
import { financeRoutes } from './modules/finance/finance.routes';
import { sportsRoutes } from './modules/sports/sports.routes';
import { wellnessRoutes } from './modules/wellness/wellness.routes';
import { aiRoutes } from './modules/ai/ai.routes';
import { gamificationRoutes } from './modules/gamification/gamification.routes';
import { subscriptionRoutes } from './modules/subscription/subscription.routes';
import { notificationRoutes } from './modules/notifications/notification.routes';
import { adminRoutes } from './modules/admin/admin.routes';

const app = Fastify({
  logger: {
    level: env.isDev ? 'info' : 'warn',
    transport: env.isDev ? { target: 'pino-pretty' } : undefined,
  },
});

async function bootstrap() {
  // --- Plugins ---
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(jwt, {
    secret: env.jwt.secret,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // --- Auth Decorator ---
  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // --- Root & Health Check ---
  app.get('/', async () => ({
    name: 'Aura API',
    version: '1.0.0',
    status: 'ok',
    timestamp: new Date().toISOString(),
    docs: '/api/health',
  }));

  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }));

  // --- Module Routes ---
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(userRoutes, { prefix: '/api/v1/users' });
  await app.register(healthRoutes, { prefix: '/api/v1/health' });
  await app.register(mealRoutes, { prefix: '/api/v1/meals' });
  await app.register(habitRoutes, { prefix: '/api/v1/habits' });
  await app.register(taskRoutes, { prefix: '/api/v1/tasks' });
  await app.register(noteRoutes, { prefix: '/api/v1/notes' });
  await app.register(educationRoutes, { prefix: '/api/v1/learning' });
  await app.register(financeRoutes, { prefix: '/api/v1/finance' });
  await app.register(sportsRoutes, { prefix: '/api/v1/sports' });
  await app.register(wellnessRoutes, { prefix: '/api/v1/wellness' });
  await app.register(aiRoutes, { prefix: '/api/v1/ai' });
  await app.register(gamificationRoutes, { prefix: '/api/v1/gamification' });
  await app.register(subscriptionRoutes, { prefix: '/api/v1/subscription' });
  await app.register(notificationRoutes, { prefix: '/api/v1/notifications' });
  await app.register(adminRoutes, { prefix: '/api/v1/admin' });

  // --- Global Error Handler ---
  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      error: statusCode >= 500 ? 'Internal Server Error' : error.message,
      ...(env.isDev && { stack: error.stack }),
    });
  });

  // --- Start ---
  try {
    await app.listen({ port: env.port, host: env.host });
    app.log.info(`🟢 Aura API running on http://${env.host}:${env.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();

export default app;
