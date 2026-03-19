import { FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from './user.service';

const service = new UserService();

export class UserController {
  async getMe(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const user = await service.getMe(userId);
    return reply.send(user);
  }

  async updateMe(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const user = await service.updateMe(userId, request.body as any);
    return reply.send(user);
  }

  async getPreferences(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const prefs = await service.getPreferences(userId);
    return reply.send(prefs);
  }

  async updatePreferences(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const prefs = await service.updatePreferences(userId, request.body as any);
    return reply.send(prefs);
  }

  async deleteAccount(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const result = await service.deleteAccount(userId);
    return reply.send(result);
  }

  async exportData(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    // Check Pro tier
    const { prisma } = await import('../../config/database');
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionTier: true } });
    if (!user || user.subscriptionTier !== 'pro') {
      return reply.status(403).send({ error: 'Pro subscription required for data export' });
    }
    const data = await service.exportData(userId);
    return reply.send(data);
  }
}
