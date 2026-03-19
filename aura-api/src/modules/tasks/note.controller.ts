import { FastifyRequest, FastifyReply } from 'fastify';
import { NoteService } from './note.service';
import { paginationSchema } from '../../shared/utils/pagination';

const service = new NoteService();

export class NoteController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const note = await service.create(userId, request.body as any);
    return reply.status(201).send(note);
  }

  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const pagination = paginationSchema.parse(query);
    const notes = await service.getAll(userId, {
      ...pagination,
      folderId: query.folderId,
      isPinned: query.isPinned !== undefined ? query.isPinned === 'true' : undefined,
      isArchived: query.isArchived === 'true',
    });
    return reply.send(notes);
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const note = await service.getById(userId, id);
    return reply.send(note);
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const note = await service.update(userId, id, request.body as any);
    return reply.send(note);
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const result = await service.delete(userId, id);
    return reply.send(result);
  }

  async search(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const pagination = paginationSchema.parse(query);
    const results = await service.search(userId, query.q || '', pagination);
    return reply.send(results);
  }

  // --- Folders ---
  async createFolder(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const folder = await service.createFolder(userId, request.body as any);
    return reply.status(201).send(folder);
  }

  async getFolders(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const folders = await service.getFolders(userId);
    return reply.send(folders);
  }

  async updateFolder(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const folder = await service.updateFolder(userId, id, request.body as any);
    return reply.send(folder);
  }

  async deleteFolder(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const result = await service.deleteFolder(userId, id);
    return reply.send(result);
  }
}
