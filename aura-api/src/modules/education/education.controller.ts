import { FastifyRequest, FastifyReply } from 'fastify';
import { EducationService } from './education.service';
import { paginationSchema } from '../../shared/utils/pagination';

const service = new EducationService();

export class EducationController {
  // --- Goals ---
  async createGoal(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const goal = await service.createGoal(userId, request.body as any);
    return reply.status(201).send(goal);
  }

  async getGoals(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const goals = await service.getGoals(userId, { status: query.status });
    return reply.send(goals);
  }

  async getGoal(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const goal = await service.getGoal(userId, id);
    return reply.send(goal);
  }

  async updateGoal(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const goal = await service.updateGoal(userId, id, request.body as any);
    return reply.send(goal);
  }

  async deleteGoal(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const result = await service.deleteGoal(userId, id);
    return reply.send(result);
  }

  // --- Sessions ---
  async createSession(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const session = await service.createSession(userId, request.body as any);
    return reply.status(201).send(session);
  }

  async getSessions(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const pagination = paginationSchema.parse(query);
    const sessions = await service.getSessions(userId, {
      ...pagination,
      goalId: query.goalId,
      from: query.from,
      to: query.to,
    });
    return reply.send(sessions);
  }

  // --- Flashcard Decks ---
  async createDeck(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const deck = await service.createDeck(userId, request.body as any);
    return reply.status(201).send(deck);
  }

  async getDecks(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const decks = await service.getDecks(userId);
    return reply.send(decks);
  }

  async getDeck(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const deck = await service.getDeck(userId, id);
    return reply.send(deck);
  }

  async deleteDeck(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const result = await service.deleteDeck(userId, id);
    return reply.send(result);
  }

  // --- Flashcards ---
  async createCard(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { deckId } = request.params as { deckId: string };
    const card = await service.createCard(userId, deckId, request.body as any);
    return reply.status(201).send(card);
  }

  async reviewCard(request: FastifyRequest, reply: FastifyReply) {
    const { cardId } = request.params as { cardId: string };
    const card = await service.reviewCard(cardId, request.body as any);
    return reply.send(card);
  }

  async getDueCards(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { deckId } = request.params as { deckId: string };
    const query = request.query as any;
    const cards = await service.getDueCards(userId, deckId, parseInt(query.limit) || 20);
    return reply.send(cards);
  }
}
