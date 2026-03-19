import { FastifyInstance } from 'fastify';
import { HealthController } from './health.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

export async function healthRoutes(app: FastifyInstance) {
  const controller = new HealthController();

  app.addHook('preHandler', authenticate);

  // Health Profile
  app.get('/profile', async (request, reply) => {
    return controller.getProfile(request, reply);
  });

  app.put('/profile', async (request, reply) => {
    return controller.upsertProfile(request, reply);
  });

  // Health Logs
  app.post('/logs', async (request, reply) => {
    return controller.createLog(request, reply);
  });

  app.get('/logs', async (request, reply) => {
    return controller.getLogs(request, reply);
  });

  // Workouts
  app.post('/workouts', async (request, reply) => {
    return controller.createWorkout(request, reply);
  });

  app.get('/workouts', async (request, reply) => {
    return controller.getWorkouts(request, reply);
  });

  app.get('/workouts/:id', async (request, reply) => {
    return controller.getWorkout(request, reply);
  });

  app.delete('/workouts/:id', async (request, reply) => {
    return controller.deleteWorkout(request, reply);
  });

  // Sleep
  app.post('/sleep', async (request, reply) => {
    return controller.createSleepLog(request, reply);
  });

  app.get('/sleep', async (request, reply) => {
    return controller.getSleepLogs(request, reply);
  });

  // Dashboard
  app.get('/dashboard', async (request, reply) => {
    return controller.getDashboard(request, reply);
  });
}
