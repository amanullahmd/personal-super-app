import { FastifyInstance } from 'fastify';
import { SubscriptionController } from './subscription.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

export async function subscriptionRoutes(app: FastifyInstance) {
  const controller = new SubscriptionController();

  // Webhook (no auth - Stripe sends it directly)
  app.post('/webhook', async (request, reply) => {
    return controller.webhook(request, reply);
  });

  // Protected routes
  app.get('/', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    return controller.getSubscription(request, reply);
  });

  app.post('/checkout', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    return controller.createCheckout(request, reply);
  });

  app.post('/cancel', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    return controller.cancel(request, reply);
  });

  app.post('/restore', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    return controller.restore(request, reply);
  });

  // Mock payment for demo/development — upgrades user to Pro instantly
  app.post('/mock-upgrade', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    return controller.mockUpgrade(request, reply);
  });

  // Downgrade back to free (for testing)
  app.post('/mock-downgrade', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    return controller.mockDowngrade(request, reply);
  });
}
