import { FastifyRequest, FastifyReply } from 'fastify';
import { HealthService } from './health.service';
import { paginationSchema } from '../../shared/utils/pagination';

const service = new HealthService();

export class HealthController {
  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const profile = await service.getProfile(userId);
    return reply.send(profile);
  }

  async upsertProfile(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const profile = await service.upsertProfile(userId, request.body as any);
    return reply.send(profile);
  }

  async createLog(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const log = await service.createLog(userId, request.body as any);
    return reply.status(201).send(log);
  }

  async getLogs(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const pagination = paginationSchema.parse(query);
    const logs = await service.getLogs(userId, {
      ...pagination,
      metricType: query.metricType,
      from: query.from,
      to: query.to,
    });
    return reply.send(logs);
  }

  async createWorkout(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const workout = await service.createWorkout(userId, request.body as any);
    return reply.status(201).send(workout);
  }

  async getWorkouts(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const pagination = paginationSchema.parse(query);
    const workouts = await service.getWorkouts(userId, {
      ...pagination,
      workoutType: query.workoutType,
      from: query.from,
      to: query.to,
    });
    return reply.send(workouts);
  }

  async getWorkout(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const workout = await service.getWorkout(userId, id);
    return reply.send(workout);
  }

  async deleteWorkout(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const result = await service.deleteWorkout(userId, id);
    return reply.send(result);
  }

  async createSleepLog(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const log = await service.createSleepLog(userId, request.body as any);
    return reply.status(201).send(log);
  }

  async getSleepLogs(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const pagination = paginationSchema.parse(query);
    const logs = await service.getSleepLogs(userId, {
      ...pagination,
      from: query.from,
      to: query.to,
    });
    return reply.send(logs);
  }

  async getDashboard(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const dashboard = await service.getDashboard(userId);
    return reply.send(dashboard);
  }
}
