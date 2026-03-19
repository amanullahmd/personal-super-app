import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { NotFoundError, AppError } from '../../shared/utils/errors';

export class SubscriptionService {
  async getSubscription(userId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    return subscription || {
      plan: 'free',
      status: 'active',
      message: 'No active subscription',
    };
  }

  async createCheckoutSession(userId: string, data: {
    plan: string;
    successUrl?: string;
    cancelUrl?: string;
  }) {
    if (!env.stripe.secretKey) {
      throw new AppError('Payment service not configured', 503);
    }

    // Create Stripe checkout session
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.stripe.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'subscription',
        'client_reference_id': userId,
        'success_url': data.successUrl || 'https://aura-app.com/subscription/success',
        'cancel_url': data.cancelUrl || 'https://aura-app.com/subscription/cancel',
        'line_items[0][price]': this.getPriceId(data.plan),
        'line_items[0][quantity]': '1',
        'metadata[userId]': userId,
        'metadata[plan]': data.plan,
      }),
    });

    if (!response.ok) {
      throw new AppError('Failed to create checkout session', 500);
    }

    const session = await response.json() as any;

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  async cancelSubscription(userId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription');
    }

    if (subscription.status === 'cancelled') {
      return { message: 'Subscription is already cancelled' };
    }

    // Cancel on Stripe
    if (subscription.providerSubscriptionId && env.stripe.secretKey) {
      await fetch(`https://api.stripe.com/v1/subscriptions/${subscription.providerSubscriptionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${env.stripe.secretKey}`,
        },
      });
    }

    await prisma.subscription.update({
      where: { userId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });

    // Update user tier
    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionTier: 'free' },
    });

    return { message: 'Subscription cancelled successfully' };
  }

  async restoreSubscription(userId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription');
    }

    if (subscription.status !== 'cancelled') {
      return { message: 'Subscription is not cancelled' };
    }

    // Check if still within the current billing period
    if (subscription.currentPeriodEnd && subscription.currentPeriodEnd > new Date()) {
      await prisma.subscription.update({
        where: { userId },
        data: {
          status: 'active',
          cancelledAt: null,
        },
      });

      await prisma.user.update({
        where: { id: userId },
        data: { subscriptionTier: 'pro' },
      });

      return { message: 'Subscription restored successfully' };
    }

    return { message: 'Cannot restore - billing period has ended. Please create a new subscription.' };
  }

  async handleWebhook(event: {
    type: string;
    data: { object: any };
  }) {
    const { type, data } = event;

    switch (type) {
      case 'checkout.session.completed': {
        const session = data.object;
        const userId = session.metadata?.userId || session.client_reference_id;
        const plan = session.metadata?.plan || 'pro_monthly';

        if (userId) {
          await prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              plan: plan as any,
              status: 'active',
              paymentProvider: 'stripe',
              providerSubscriptionId: session.subscription,
              currentPeriodStart: new Date(),
            },
            update: {
              plan: plan as any,
              status: 'active',
              paymentProvider: 'stripe',
              providerSubscriptionId: session.subscription,
              currentPeriodStart: new Date(),
              cancelledAt: null,
            },
          });

          await prisma.user.update({
            where: { id: userId },
            data: { subscriptionTier: 'pro' },
          });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = data.object;
        const subscriptionId = invoice.subscription;

        const subscription = await prisma.subscription.findFirst({
          where: { providerSubscriptionId: subscriptionId },
        });

        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: 'active',
              currentPeriodStart: new Date(invoice.period_start * 1000),
              currentPeriodEnd: new Date(invoice.period_end * 1000),
            },
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = data.object;
        const subscriptionId = invoice.subscription;

        const subscription = await prisma.subscription.findFirst({
          where: { providerSubscriptionId: subscriptionId },
        });

        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: 'expired' },
          });

          await prisma.user.update({
            where: { id: subscription.userId },
            data: { subscriptionTier: 'free' },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = data.object;
        const subscription = await prisma.subscription.findFirst({
          where: { providerSubscriptionId: sub.id },
        });

        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: 'cancelled',
              cancelledAt: new Date(),
            },
          });

          await prisma.user.update({
            where: { id: subscription.userId },
            data: { subscriptionTier: 'free' },
          });
        }
        break;
      }
    }

    return { received: true };
  }

  async mockUpgrade(userId: string) {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan: 'pro_monthly' as any,
        status: 'active',
        paymentProvider: 'mock',
        currentPeriodStart: new Date(),
        currentPeriodEnd: expiresAt,
      },
      update: {
        plan: 'pro_monthly' as any,
        status: 'active',
        paymentProvider: 'mock',
        currentPeriodStart: new Date(),
        currentPeriodEnd: expiresAt,
        cancelledAt: null,
      },
    });

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: 'pro',
        subscriptionExpiresAt: expiresAt,
      },
      select: { id: true, email: true, subscriptionTier: true, subscriptionExpiresAt: true },
    });

    return { success: true, user, message: 'Upgraded to Pro successfully!' };
  }

  async mockDowngrade(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionTier: 'free', subscriptionExpiresAt: null },
    });

    return { success: true, message: 'Downgraded to Free plan.' };
  }

  private getPriceId(plan: string): string {
    // Map plan names to Stripe price IDs (configured via env in production)
    const priceMap: Record<string, string> = {
      pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
      pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly',
      family: process.env.STRIPE_PRICE_FAMILY || 'price_family',
    };

    return priceMap[plan] || priceMap['pro_monthly'];
  }
}
