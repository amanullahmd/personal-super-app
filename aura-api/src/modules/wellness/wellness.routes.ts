import { FastifyInstance } from 'fastify';
import { WellnessController } from './wellness.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

export async function wellnessRoutes(app: FastifyInstance) {
  const controller = new WellnessController();

  app.addHook('preHandler', authenticate);

  // Mood
  app.post('/mood', async (request, reply) => {
    return controller.createMoodLog(request, reply);
  });

  app.get('/mood', async (request, reply) => {
    return controller.getMoodLogs(request, reply);
  });

  app.get('/mood/stats', async (request, reply) => {
    return controller.getMoodStats(request, reply);
  });

  // Journal
  app.post('/journal', async (request, reply) => {
    return controller.createJournalEntry(request, reply);
  });

  app.get('/journal', async (request, reply) => {
    return controller.getJournalEntries(request, reply);
  });

  app.get('/journal/:id', async (request, reply) => {
    return controller.getJournalEntry(request, reply);
  });

  app.patch('/journal/:id', async (request, reply) => {
    return controller.updateJournalEntry(request, reply);
  });

  app.delete('/journal/:id', async (request, reply) => {
    return controller.deleteJournalEntry(request, reply);
  });

  // Meditation
  app.post('/meditation', async (request, reply) => {
    return controller.createMeditationSession(request, reply);
  });

  app.get('/meditation', async (request, reply) => {
    return controller.getMeditationSessions(request, reply);
  });

  app.get('/meditation/stats', async (request, reply) => {
    return controller.getMeditationStats(request, reply);
  });
}
