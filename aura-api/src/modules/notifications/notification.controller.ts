import { FastifyRequest, FastifyReply } from 'fastify';
import { NotificationService } from './notification.service';
import { paginationSchema } from '../../shared/utils/pagination';

const service = new NotificationService();

export class NotificationController {
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const pagination = paginationSchema.parse(query);
    const notifications = await service.getAll(userId, {
      ...pagination,
      isRead: query.isRead !== undefined ? query.isRead === 'true' : undefined,
      type: query.type,
    });
    return reply.send(notifications);
  }

  async markAsRead(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const notification = await service.markAsRead(userId, id);
    return reply.send(notification);
  }

  async markAllAsRead(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const result = await service.markAllAsRead(userId);
    return reply.send(result);
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const result = await service.delete(userId, id);
    return reply.send(result);
  }

  async deleteAll(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const result = await service.deleteAll(userId);
    return reply.send(result);
  }

  async getUnreadCount(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const result = await service.getUnreadCount(userId);
    return reply.send(result);
  }

  async getSettings(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const settings = await service.getSettings(userId);
    return reply.send(settings);
  }

  async updateSettings(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const settings = await service.updateSettings(userId, request.body as any);
    return reply.send(settings);
  }
}
