import { FastifyInstance } from 'fastify';
import { SportsController } from './sports.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

export async function sportsRoutes(app: FastifyInstance) {
  const controller = new SportsController();

  app.addHook('preHandler', authenticate);

  // Profile
  app.get('/profile', async (request, reply) => {
    return controller.getProfile(request, reply);
  });

  app.put('/profile', async (request, reply) => {
    return controller.upsertProfile(request, reply);
  });

  // Stats
  app.get('/stats', async (request, reply) => {
    return controller.getStats(request, reply);
  });

  // Activities
  app.post('/activities', async (request, reply) => {
    return controller.createActivity(request, reply);
  });

  app.get('/activities', async (request, reply) => {
    return controller.getActivities(request, reply);
  });

  app.get('/activities/:id', async (request, reply) => {
    return controller.getActivity(request, reply);
  });

  app.delete('/activities/:id', async (request, reply) => {
    return controller.deleteActivity(request, reply);
  });

  // Training Plans
  app.post('/plans', async (request, reply) => {
    return controller.createTrainingPlan(request, reply);
  });

  app.get('/plans', async (request, reply) => {
    return controller.getTrainingPlans(request, reply);
  });

  app.get('/plans/:id', async (request, reply) => {
    return controller.getTrainingPlan(request, reply);
  });

  app.patch('/plans/:id', async (request, reply) => {
    return controller.updateTrainingPlan(request, reply);
  });

  app.delete('/plans/:id', async (request, reply) => {
    return controller.deleteTrainingPlan(request, reply);
  });
}
