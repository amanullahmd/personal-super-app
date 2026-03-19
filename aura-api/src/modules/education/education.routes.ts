import { FastifyInstance } from 'fastify';
import { EducationController } from './education.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

export async function educationRoutes(app: FastifyInstance) {
  const controller = new EducationController();

  app.addHook('preHandler', authenticate);

  // Learning Goals
  app.post('/goals', async (request, reply) => {
    return controller.createGoal(request, reply);
  });

  app.get('/goals', async (request, reply) => {
    return controller.getGoals(request, reply);
  });

  app.get('/goals/:id', async (request, reply) => {
    return controller.getGoal(request, reply);
  });

  app.patch('/goals/:id', async (request, reply) => {
    return controller.updateGoal(request, reply);
  });

  app.delete('/goals/:id', async (request, reply) => {
    return controller.deleteGoal(request, reply);
  });

  // Learning Sessions
  app.post('/sessions', async (request, reply) => {
    return controller.createSession(request, reply);
  });

  app.get('/sessions', async (request, reply) => {
    return controller.getSessions(request, reply);
  });

  // Flashcard Decks
  app.post('/flashcards/decks', async (request, reply) => {
    return controller.createDeck(request, reply);
  });

  app.get('/flashcards/decks', async (request, reply) => {
    return controller.getDecks(request, reply);
  });

  app.get('/flashcards/decks/:id', async (request, reply) => {
    return controller.getDeck(request, reply);
  });

  app.delete('/flashcards/decks/:id', async (request, reply) => {
    return controller.deleteDeck(request, reply);
  });

  // Flashcards
  app.post('/flashcards/decks/:deckId/cards', async (request, reply) => {
    return controller.createCard(request, reply);
  });

  app.post('/flashcards/cards/:cardId/review', async (request, reply) => {
    return controller.reviewCard(request, reply);
  });

  app.get('/flashcards/decks/:deckId/due', async (request, reply) => {
    return controller.getDueCards(request, reply);
  });
}
