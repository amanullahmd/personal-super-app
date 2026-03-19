import { FastifyRequest, FastifyReply } from 'fastify';
import { WellnessService } from './wellness.service';
import { paginationSchema } from '../../shared/utils/pagination';

const service = new WellnessService();

export class WellnessController {
  // --- Mood ---
  async createMoodLog(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const log = await service.createMoodLog(userId, request.body as any);
    return reply.status(201).send(log);
  }

  async getMoodLogs(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const pagination = paginationSchema.parse(query);
    const logs = await service.getMoodLogs(userId, {
      ...pagination,
      from: query.from,
      to: query.to,
    });
    return reply.send(logs);
  }

  async getMoodStats(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const stats = await service.getMoodStats(userId, parseInt(query.days) || 30);
    return reply.send(stats);
  }

  // --- Journal ---
  async createJournalEntry(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const entry = await service.createJournalEntry(userId, request.body as any);
    return reply.status(201).send(entry);
  }

  async getJournalEntries(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const pagination = paginationSchema.parse(query);
    const entries = await service.getJournalEntries(userId, {
      ...pagination,
      from: query.from,
      to: query.to,
    });
    return reply.send(entries);
  }

  async getJournalEntry(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const entry = await service.getJournalEntry(userId, id);
    return reply.send(entry);
  }

  async updateJournalEntry(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const entry = await service.updateJournalEntry(userId, id, request.body as any);
    return reply.send(entry);
  }

  async deleteJournalEntry(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const result = await service.deleteJournalEntry(userId, id);
    return reply.send(result);
  }

  // --- Meditation ---
  async createMeditationSession(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const session = await service.createMeditationSession(userId, request.body as any);
    return reply.status(201).send(session);
  }

  async getMeditationSessions(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const pagination = paginationSchema.parse(query);
    const sessions = await service.getMeditationSessions(userId, {
      ...pagination,
      type: query.type,
      from: query.from,
      to: query.to,
    });
    return reply.send(sessions);
  }

  async getMeditationStats(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const stats = await service.getMeditationStats(userId);
    return reply.send(stats);
  }
}
