import { FastifyRequest, FastifyReply } from 'fastify';
import { GamificationService } from './gamification.service';

const service = new GamificationService();

export class GamificationController {
  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const profile = await service.getProfile(userId);
    return reply.send(profile);
  }

  async addXp(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { amount, reason } = request.body as { amount: number; reason: string };
    const result = await service.addXp(userId, amount, reason);
    return reply.send(result);
  }

  async getAchievements(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const achievements = await service.getAchievements(userId);
    return reply.send(achievements);
  }

  async unlockAchievement(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { achievementId } = request.body as { achievementId: string };
    const result = await service.unlockAchievement(userId, achievementId);
    return reply.send(result);
  }

  async getLeaderboard(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    const leaderboard = await service.getLeaderboard(parseInt(query.limit) || 20);
    return reply.send(leaderboard);
  }

  async getStats(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const stats = await service.getStats(userId);
    return reply.send(stats);
  }
}
