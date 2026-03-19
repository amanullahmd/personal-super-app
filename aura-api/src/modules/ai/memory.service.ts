import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/utils/errors';
import { paginate, paginatedResponse, PaginationParams } from '../../shared/utils/pagination';

export class MemoryService {
  async create(userId: string, data: {
    content: string;
    sourceType: string;
    sourceId?: string;
    category: string;
    importanceScore?: number;
    expiresAt?: string;
  }) {
    return prisma.aiMemory.create({
      data: {
        userId,
        content: data.content,
        sourceType: data.sourceType as any,
        sourceId: data.sourceId,
        category: data.category as any,
        importanceScore: data.importanceScore ?? 0.5,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    });
  }

  async getAll(userId: string, params: PaginationParams & { category?: string }) {
    const where: any = { userId };
    if (params.category) where.category = params.category;

    // Exclude expired memories
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
    ];

    const [data, total] = await Promise.all([
      prisma.aiMemory.findMany({
        where,
        ...paginate(params),
        orderBy: { importanceScore: 'desc' },
      }),
      prisma.aiMemory.count({ where }),
    ]);

    return paginatedResponse(data, total, params);
  }

  async searchByContent(userId: string, query: string, limit: number = 10) {
    // Text-based search fallback (vector search would use pgvector in production)
    const memories = await prisma.aiMemory.findMany({
      where: {
        userId,
        content: { contains: query, mode: 'insensitive' },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { importanceScore: 'desc' },
      take: limit,
    });

    // Update last accessed
    if (memories.length > 0) {
      await prisma.aiMemory.updateMany({
        where: { id: { in: memories.map(m => m.id) } },
        data: { lastAccessedAt: new Date() },
      });
    }

    return memories;
  }

  async update(userId: string, id: string, data: {
    content?: string;
    category?: string;
    importanceScore?: number;
    expiresAt?: string | null;
  }) {
    const memory = await prisma.aiMemory.findFirst({ where: { id, userId } });
    if (!memory) throw new NotFoundError('Memory');

    return prisma.aiMemory.update({
      where: { id },
      data: {
        content: data.content,
        category: data.category as any,
        importanceScore: data.importanceScore,
        expiresAt: data.expiresAt === null ? null :
                   data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    });
  }

  async delete(userId: string, id: string) {
    const memory = await prisma.aiMemory.findFirst({ where: { id, userId } });
    if (!memory) throw new NotFoundError('Memory');
    await prisma.aiMemory.delete({ where: { id } });
    return { message: 'Memory deleted' };
  }

  async getRelevantMemories(userId: string, context: string, limit: number = 5) {
    // In production, this would use vector similarity search with embeddings.
    // Fallback: keyword-based relevance with importance weighting.
    const keywords = context.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    const memories = await prisma.aiMemory.findMany({
      where: {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: [
        { importanceScore: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit * 3, // Fetch more and filter
    });

    // Simple relevance scoring based on keyword overlap
    const scored = memories.map(m => {
      const contentLower = m.content.toLowerCase();
      const matchCount = keywords.filter(k => contentLower.includes(k)).length;
      return { ...m, relevanceScore: matchCount * m.importanceScore };
    });

    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const topMemories = scored.slice(0, limit);

    // Update last accessed
    if (topMemories.length > 0) {
      await prisma.aiMemory.updateMany({
        where: { id: { in: topMemories.map(m => m.id) } },
        data: { lastAccessedAt: new Date() },
      });
    }

    return topMemories;
  }
}
