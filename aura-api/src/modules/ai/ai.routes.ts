import { FastifyInstance } from 'fastify';
import { AiController } from './ai.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

export async function aiRoutes(app: FastifyInstance) {
  const controller = new AiController();

  app.addHook('preHandler', authenticate);

  // Chat
  app.post('/chat', async (request, reply) => {
    return controller.chat(request, reply);
  });

  // Voice
  app.post('/voice', async (request, reply) => {
    return controller.voiceChat(request, reply);
  });

  // Conversations
  app.get('/conversations', async (request, reply) => {
    return controller.getConversations(request, reply);
  });

  app.get('/conversations/:id', async (request, reply) => {
    return controller.getConversation(request, reply);
  });

  app.delete('/conversations/:id', async (request, reply) => {
    return controller.deleteConversation(request, reply);
  });

  // Insights
  app.get('/insights', async (request, reply) => {
    return controller.getInsights(request, reply);
  });

  // AI Profile
  app.get('/profile', async (request, reply) => {
    return controller.getProfile(request, reply);
  });

  app.patch('/profile', async (request, reply) => {
    return controller.updateProfile(request, reply);
  });

  // Memories
  app.get('/memories', async (request, reply) => {
    return controller.getMemories(request, reply);
  });

  app.post('/memories', async (request, reply) => {
    return controller.createMemory(request, reply);
  });

  app.get('/memories/search', async (request, reply) => {
    return controller.searchMemories(request, reply);
  });

  app.delete('/memories/:id', async (request, reply) => {
    return controller.deleteMemory(request, reply);
  });
}
