import { FastifyRequest, FastifyReply } from 'fastify';
import { HabitService } from './habit.service';
import { paginationSchema } from '../../shared/utils/pagination';

const service = new HabitService();

export class HabitController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const habit = await service.create(userId, request.body as any);
    return reply.status(201).send(habit);
  }

  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const habits = await service.getAll(userId, {
      isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
      category: query.category,
    });
    return reply.send(habits);
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const habit = await service.getById(userId, id);
    return reply.send(habit);
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const habit = await service.update(userId, id, request.body as any);
    return reply.send(habit);
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const result = await service.delete(userId, id);
    return reply.send(result);
  }

  async complete(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const completion = await service.complete(userId, id, request.body as any || {});
    return reply.status(201).send(completion);
  }

  async getHistory(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const query = request.query as any;
    const pagination = paginationSchema.parse(query);
    const history = await service.getHistory(userId, id, {
      ...pagination,
      from: query.from,
      to: query.to,
    });
    return reply.send(history);
  }

  async getStats(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const stats = await service.getStats(userId);
    return reply.send(stats);
  }
}
