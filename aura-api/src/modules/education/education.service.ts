import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/utils/errors';
import { paginate, paginatedResponse, PaginationParams } from '../../shared/utils/pagination';

export class EducationService {
  // --- Learning Goals ---
  async createGoal(userId: string, data: {
    title: string;
    category: string;
    targetDate?: string;
    dailyTimeGoalMinutes?: number;
  }) {
    return prisma.learningGoal.create({
      data: {
        userId,
        title: data.title,
        category: data.category as any,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
        dailyTimeGoalMinutes: data.dailyTimeGoalMinutes || 30,
      },
    });
  }

  async getGoals(userId: string, params: { status?: string }) {
    const where: any = { userId };
    if (params.status) where.status = params.status;

    return prisma.learningGoal.findMany({
      where,
      include: {
        _count: { select: { sessions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getGoal(userId: string, id: string) {
    const goal = await prisma.learningGoal.findFirst({
      where: { id, userId },
      include: {
        sessions: { orderBy: { completedAt: 'desc' }, take: 20 },
      },
    });
    if (!goal) throw new NotFoundError('Learning goal');
    return goal;
  }

  async updateGoal(userId: string, id: string, data: {
    title?: string;
    category?: string;
    targetDate?: string;
    dailyTimeGoalMinutes?: number;
    progressPercent?: number;
    status?: string;
  }) {
    const goal = await prisma.learningGoal.findFirst({ where: { id, userId } });
    if (!goal) throw new NotFoundError('Learning goal');

    return prisma.learningGoal.update({
      where: { id },
      data: {
        ...data,
        category: data.category as any,
        status: data.status as any,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      },
    });
  }

  async deleteGoal(userId: string, id: string) {
    const goal = await prisma.learningGoal.findFirst({ where: { id, userId } });
    if (!goal) throw new NotFoundError('Learning goal');
    await prisma.learningGoal.delete({ where: { id } });
    return { message: 'Learning goal deleted' };
  }

  // --- Learning Sessions ---
  async createSession(userId: string, data: {
    goalId: string;
    durationMinutes: number;
    topic?: string;
    notes?: string;
    resourcesUsed?: any;
    satisfactionScore?: number;
  }) {
    const goal = await prisma.learningGoal.findFirst({ where: { id: data.goalId, userId } });
    if (!goal) throw new NotFoundError('Learning goal');

    const session = await prisma.learningSession.create({
      data: {
        goalId: data.goalId,
        userId,
        durationMinutes: data.durationMinutes,
        topic: data.topic,
        notes: data.notes,
        resourcesUsed: data.resourcesUsed,
        satisfactionScore: data.satisfactionScore,
      },
    });

    return session;
  }

  async getSessions(userId: string, params: PaginationParams & { goalId?: string; from?: string; to?: string }) {
    const where: any = { userId };
    if (params.goalId) where.goalId = params.goalId;
    if (params.from || params.to) {
      where.completedAt = {};
      if (params.from) where.completedAt.gte = new Date(params.from);
      if (params.to) where.completedAt.lte = new Date(params.to);
    }

    const [data, total] = await Promise.all([
      prisma.learningSession.findMany({
        where,
        ...paginate(params),
        orderBy: { completedAt: 'desc' },
        include: { goal: { select: { id: true, title: true, category: true } } },
      }),
      prisma.learningSession.count({ where }),
    ]);

    return paginatedResponse(data, total, params);
  }

  // --- Flashcard Decks ---
  async createDeck(userId: string, data: { name: string; category?: string }) {
    return prisma.flashcardDeck.create({
      data: {
        userId,
        name: data.name,
        category: data.category,
      },
    });
  }

  async getDecks(userId: string) {
    return prisma.flashcardDeck.findMany({
      where: { userId },
      include: { _count: { select: { cards: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDeck(userId: string, id: string) {
    const deck = await prisma.flashcardDeck.findFirst({
      where: { id, userId },
      include: { cards: { orderBy: { createdAt: 'desc' } } },
    });
    if (!deck) throw new NotFoundError('Flashcard deck');
    return deck;
  }

  async deleteDeck(userId: string, id: string) {
    const deck = await prisma.flashcardDeck.findFirst({ where: { id, userId } });
    if (!deck) throw new NotFoundError('Flashcard deck');
    await prisma.flashcardDeck.delete({ where: { id } });
    return { message: 'Deck deleted' };
  }

  // --- Flashcards ---
  async createCard(userId: string, deckId: string, data: {
    front: string;
    back: string;
    difficulty?: string;
  }) {
    const deck = await prisma.flashcardDeck.findFirst({ where: { id: deckId, userId } });
    if (!deck) throw new NotFoundError('Flashcard deck');

    const card = await prisma.flashcard.create({
      data: {
        deckId,
        front: data.front,
        back: data.back,
        difficulty: (data.difficulty as any) || 'medium',
      },
    });

    await prisma.flashcardDeck.update({
      where: { id: deckId },
      data: { cardCount: { increment: 1 } },
    });

    return card;
  }

  async reviewCard(cardId: string, data: {
    difficulty: string;
  }) {
    const card = await prisma.flashcard.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundError('Flashcard');

    // Simple spaced repetition: adjust ease factor and schedule next review
    let easeFactor = card.easeFactor;
    let intervalDays = 1;

    if (data.difficulty === 'easy') {
      easeFactor = Math.min(easeFactor + 0.15, 3.0);
      intervalDays = Math.ceil(card.reviewCount * easeFactor);
    } else if (data.difficulty === 'hard') {
      easeFactor = Math.max(easeFactor - 0.2, 1.3);
      intervalDays = 1;
    } else {
      intervalDays = Math.ceil(card.reviewCount * easeFactor * 0.6);
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + Math.max(intervalDays, 1));

    return prisma.flashcard.update({
      where: { id: cardId },
      data: {
        difficulty: data.difficulty as any,
        easeFactor,
        reviewCount: { increment: 1 },
        nextReviewAt: nextReview,
      },
    });
  }

  async getDueCards(userId: string, deckId: string, limit: number = 20) {
    const deck = await prisma.flashcardDeck.findFirst({ where: { id: deckId, userId } });
    if (!deck) throw new NotFoundError('Flashcard deck');

    return prisma.flashcard.findMany({
      where: {
        deckId,
        OR: [
          { nextReviewAt: null },
          { nextReviewAt: { lte: new Date() } },
        ],
      },
      take: limit,
      orderBy: { nextReviewAt: 'asc' },
    });
  }
}
