import { FastifyRequest, FastifyReply } from 'fastify';
import { TaskService } from './task.service';
import { paginationSchema } from '../../shared/utils/pagination';

const service = new TaskService();

export class TaskController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const task = await service.create(userId, request.body as any);
    return reply.status(201).send(task);
  }

  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const pagination = paginationSchema.parse(query);
    const tasks = await service.getAll(userId, {
      ...pagination,
      status: query.status,
      priority: query.priority,
      projectId: query.projectId,
    });
    return reply.send(tasks);
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const task = await service.getById(userId, id);
    return reply.send(task);
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const task = await service.update(userId, id, request.body as any);
    return reply.send(task);
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
    const task = await service.complete(userId, id);
    return reply.send(task);
  }

  async getToday(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const tasks = await service.getToday(userId);
    return reply.send(tasks);
  }

  async reorder(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { tasks } = request.body as { tasks: { id: string; sortOrder: number }[] };
    const result = await service.reorder(userId, tasks);
    return reply.send(result);
  }

  // --- Projects ---
  async createProject(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const project = await service.createProject(userId, request.body as any);
    return reply.status(201).send(project);
  }

  async getProjects(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const projects = await service.getProjects(userId);
    return reply.send(projects);
  }

  async getProject(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const project = await service.getProject(userId, id);
    return reply.send(project);
  }

  async updateProject(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const project = await service.updateProject(userId, id, request.body as any);
    return reply.send(project);
  }

  async deleteProject(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const result = await service.deleteProject(userId, id);
    return reply.send(result);
  }
}
