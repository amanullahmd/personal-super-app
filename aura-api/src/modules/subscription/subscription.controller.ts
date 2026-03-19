import { FastifyRequest, FastifyReply } from 'fastify';
import { SubscriptionService } from './subscription.service';
import { env } from '../../config/env';
import crypto from 'crypto';

const service = new SubscriptionService();

export class SubscriptionController {
  async getSubscription(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const subscription = await service.getSubscription(userId);
    return reply.send(subscription);
  }

  async createCheckout(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const result = await service.createCheckoutSession(userId, request.body as any);
    return reply.send(result);
  }

  async cancel(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const result = await service.cancelSubscription(userId);
    return reply.send(result);
  }

  async restore(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const result = await service.restoreSubscription(userId);
    return reply.send(result);
  }

  async mockUpgrade(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const result = await service.mockUpgrade(userId);
    return reply.send(result);
  }

  async mockDowngrade(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const result = await service.mockDowngrade(userId);
    return reply.send(result);
  }

  async webhook(request: FastifyRequest, reply: FastifyReply) {
    // Verify Stripe webhook signature
    const signature = request.headers['stripe-signature'] as string;
    const rawBody = (request as any).rawBody || JSON.stringify(request.body);

    if (env.stripe.webhookSecret && signature) {
      const parts = signature.split(',').reduce((acc: Record<string, string>, part: string) => {
        const [key, value] = part.split('=');
        acc[key] = value;
        return acc;
      }, {});

      const timestamp = parts['t'];
      const expectedSignature = crypto
        .createHmac('sha256', env.stripe.webhookSecret)
        .update(`${timestamp}.${rawBody}`)
        .digest('hex');

      if (parts['v1'] !== expectedSignature) {
        return reply.status(400).send({ error: 'Invalid webhook signature' });
      }
    }

    const event = request.body as { type: string; data: { object: any } };
    const result = await service.handleWebhook(event);
    return reply.send(result);
  }
}
