import { FastifyInstance } from 'fastify';
import { HabitController } from './habit.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

export async function habitRoutes(app: FastifyInstance) {
  const controller = new HabitController();

  app.addHook('preHandler', authenticate);

  app.post('/', async (request, reply) => {
    return controller.create(request, reply);
  });

  app.get('/', async (request, reply) => {
    return controller.getAll(request, reply);
  });

  app.get('/stats', async (request, reply) => {
    return controller.getStats(request, reply);
  });

  app.get('/:id', async (request, reply) => {
    return controller.getById(request, reply);
  });

  app.patch('/:id', async (request, reply) => {
    return controller.update(request, reply);
  });

  app.delete('/:id', async (request, reply) => {
    return controller.delete(request, reply);
  });

  app.post('/:id/complete', async (request, reply) => {
    return controller.complete(request, reply);
  });

  app.get('/:id/history', async (request, reply) => {
    return controller.getHistory(request, reply);
  });
}
