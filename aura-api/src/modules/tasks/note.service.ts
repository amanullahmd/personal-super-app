import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/utils/errors';
import { paginate, paginatedResponse, PaginationParams } from '../../shared/utils/pagination';

export class NoteService {
  // --- Notes ---
  async create(userId: string, data: {
    folderId?: string;
    title: string;
    content?: string;
    tags?: any;
    linkedModule?: string;
    linkedRecordId?: string;
  }) {
    return prisma.note.create({
      data: {
        userId,
        folderId: data.folderId,
        title: data.title,
        content: data.content,
        tags: data.tags,
        linkedModule: data.linkedModule,
        linkedRecordId: data.linkedRecordId,
      },
    });
  }

  async getAll(userId: string, params: PaginationParams & {
    folderId?: string;
    isPinned?: boolean;
    isArchived?: boolean;
  }) {
    const where: any = { userId };
    if (params.folderId) where.folderId = params.folderId;
    if (params.isPinned !== undefined) where.isPinned = params.isPinned;
    where.isArchived = params.isArchived ?? false;

    const [data, total] = await Promise.all([
      prisma.note.findMany({
        where,
        ...paginate(params),
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
        include: { folder: true },
      }),
      prisma.note.count({ where }),
    ]);

    return paginatedResponse(data, total, params);
  }

  async getById(userId: string, id: string) {
    const note = await prisma.note.findFirst({
      where: { id, userId },
      include: { folder: true },
    });
    if (!note) throw new NotFoundError('Note');
    return note;
  }

  async update(userId: string, id: string, data: {
    title?: string;
    content?: string;
    folderId?: string | null;
    tags?: any;
    isPinned?: boolean;
    isArchived?: boolean;
  }) {
    const note = await prisma.note.findFirst({ where: { id, userId } });
    if (!note) throw new NotFoundError('Note');

    return prisma.note.update({
      where: { id },
      data,
      include: { folder: true },
    });
  }

  async delete(userId: string, id: string) {
    const note = await prisma.note.findFirst({ where: { id, userId } });
    if (!note) throw new NotFoundError('Note');
    await prisma.note.delete({ where: { id } });
    return { message: 'Note deleted' };
  }

  async search(userId: string, query: string, params: PaginationParams) {
    const where: any = {
      userId,
      isArchived: false,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
      ],
    };

    const [data, total] = await Promise.all([
      prisma.note.findMany({
        where,
        ...paginate(params),
        orderBy: { updatedAt: 'desc' },
        include: { folder: true },
      }),
      prisma.note.count({ where }),
    ]);

    return paginatedResponse(data, total, params);
  }

  // --- Folders ---
  async createFolder(userId: string, data: {
    name: string;
    color?: string;
    parentId?: string;
  }) {
    return prisma.noteFolder.create({
      data: {
        userId,
        name: data.name,
        color: data.color || '#A29BFE',
        parentId: data.parentId,
      },
    });
  }

  async getFolders(userId: string) {
    return prisma.noteFolder.findMany({
      where: { userId },
      include: {
        _count: { select: { notes: true } },
        children: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async updateFolder(userId: string, id: string, data: {
    name?: string;
    color?: string;
    parentId?: string | null;
  }) {
    const folder = await prisma.noteFolder.findFirst({ where: { id, userId } });
    if (!folder) throw new NotFoundError('Folder');

    return prisma.noteFolder.update({
      where: { id },
      data,
    });
  }

  async deleteFolder(userId: string, id: string) {
    const folder = await prisma.noteFolder.findFirst({ where: { id, userId } });
    if (!folder) throw new NotFoundError('Folder');

    // Move notes in this folder to no folder
    await prisma.note.updateMany({
      where: { folderId: id, userId },
      data: { folderId: null },
    });

    await prisma.noteFolder.delete({ where: { id } });
    return { message: 'Folder deleted' };
  }
}
