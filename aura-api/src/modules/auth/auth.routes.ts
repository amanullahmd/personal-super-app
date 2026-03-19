import { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

export async function authRoutes(app: FastifyInstance) {
  const controller = new AuthController(app);

  app.post('/register', async (request, reply) => {
    return controller.register(request, reply);
  });

  app.post('/login', async (request, reply) => {
    return controller.login(request, reply);
  });

  app.post('/logout', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    return controller.logout(request, reply);
  });

  app.post('/refresh-token', async (request, reply) => {
    return controller.refreshToken(request, reply);
  });

  app.post('/forgot-password', async (request, reply) => {
    return controller.forgotPassword(request, reply);
  });
}
