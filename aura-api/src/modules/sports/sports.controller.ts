import { FastifyRequest, FastifyReply } from 'fastify';
import { SportsService } from './sports.service';
import { paginationSchema } from '../../shared/utils/pagination';

const service = new SportsService();

export class SportsController {
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

  async createActivity(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const activity = await service.createActivity(userId, request.body as any);
    return reply.status(201).send(activity);
  }

  async getActivities(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const pagination = paginationSchema.parse(query);
    const activities = await service.getActivities(userId, {
      ...pagination,
      sportType: query.sportType,
      from: query.from,
      to: query.to,
    });
    return reply.send(activities);
  }

  async getActivity(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const activity = await service.getActivity(userId, id);
    return reply.send(activity);
  }

  async deleteActivity(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const result = await service.deleteActivity(userId, id);
    return reply.send(result);
  }

  async createTrainingPlan(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const plan = await service.createTrainingPlan(userId, request.body as any);
    return reply.status(201).send(plan);
  }

  async getTrainingPlans(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const plans = await service.getTrainingPlans(userId, { status: query.status });
    return reply.send(plans);
  }

  async getTrainingPlan(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const plan = await service.getTrainingPlan(userId, id);
    return reply.send(plan);
  }

  async updateTrainingPlan(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const plan = await service.updateTrainingPlan(userId, id, request.body as any);
    return reply.send(plan);
  }

  async deleteTrainingPlan(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const result = await service.deleteTrainingPlan(userId, id);
    return reply.send(result);
  }

  async getStats(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const stats = await service.getStats(userId, query.sportType);
    return reply.send(stats);
  }
}
