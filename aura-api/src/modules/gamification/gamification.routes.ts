import { FastifyInstance } from 'fastify';
import { GamificationController } from './gamification.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

export async function gamificationRoutes(app: FastifyInstance) {
  const controller = new GamificationController();

  app.addHook('preHandler', authenticate);

  // Profile & XP
  app.get('/profile', async (request, reply) => {
    return controller.getProfile(request, reply);
  });

  app.post('/xp', async (request, reply) => {
    return controller.addXp(request, reply);
  });

  app.get('/stats', async (request, reply) => {
    return controller.getStats(request, reply);
  });

  // Achievements
  app.get('/achievements', async (request, reply) => {
    return controller.getAchievements(request, reply);
  });

  app.post('/achievements/unlock', async (request, reply) => {
    return controller.unlockAchievement(request, reply);
  });

  // Leaderboard
  app.get('/leaderboard', async (request, reply) => {
    return controller.getLeaderboard(request, reply);
  });
}
