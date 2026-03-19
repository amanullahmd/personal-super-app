import { FastifyInstance } from 'fastify';
import { UserController } from './user.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

export async function userRoutes(app: FastifyInstance) {
  const controller = new UserController();

  // All user routes require authentication
  app.addHook('preHandler', authenticate);

  app.get('/me', async (request, reply) => {
    return controller.getMe(request, reply);
  });

  app.patch('/me', async (request, reply) => {
    return controller.updateMe(request, reply);
  });

  app.get('/preferences', async (request, reply) => {
    return controller.getPreferences(request, reply);
  });

  app.patch('/preferences', async (request, reply) => {
    return controller.updatePreferences(request, reply);
  });

  app.delete('/me', async (request, reply) => {
    return controller.deleteAccount(request, reply);
  });

  // Pro-only: export all user data as JSON
  app.get('/me/export', async (request, reply) => {
    return controller.exportData(request, reply);
  });
}
