import { FastifyRequest, FastifyReply } from 'fastify';
import { MealService } from './meal.service';
import { paginationSchema } from '../../shared/utils/pagination';

const service = new MealService();

export class MealController {
  async createMealLog(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const log = await service.createMealLog(userId, request.body as any);
    return reply.status(201).send(log);
  }

  async getMealLogs(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const pagination = paginationSchema.parse(query);
    const logs = await service.getMealLogs(userId, {
      ...pagination,
      mealType: query.mealType,
      from: query.from,
      to: query.to,
    });
    return reply.send(logs);
  }

  async getMealLog(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const log = await service.getMealLog(userId, id);
    return reply.send(log);
  }

  async deleteMealLog(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const result = await service.deleteMealLog(userId, id);
    return reply.send(result);
  }

  async createWaterLog(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const log = await service.createWaterLog(userId, request.body as any);
    return reply.status(201).send(log);
  }

  async getWaterLogs(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const logs = await service.getWaterLogs(userId, { from: query.from, to: query.to });
    return reply.send(logs);
  }

  async createMealPlan(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const plan = await service.createMealPlan(userId, request.body as any);
    return reply.status(201).send(plan);
  }

  async getMealPlans(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const plans = await service.getMealPlans(userId);
    return reply.send(plans);
  }

  async getMealPlan(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const plan = await service.getMealPlan(userId, id);
    return reply.send(plan);
  }

  async updateMealPlan(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const plan = await service.updateMealPlan(userId, id, request.body as any);
    return reply.send(plan);
  }

  async deleteMealPlan(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const result = await service.deleteMealPlan(userId, id);
    return reply.send(result);
  }

  async searchFood(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    const results = await service.searchFood(query.q || '', parseInt(query.limit) || 20);
    return reply.send(results);
  }

  async getDailySummary(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const summary = await service.getDailySummary(userId, query.date);
    return reply.send(summary);
  }
}
