import { FastifyInstance } from 'fastify';
import { NotificationController } from './notification.controller';

const controller = new NotificationController();

export async function notificationRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', (app as any).authenticate);

  // GET /api/v1/notifications
  app.get('/', controller.getAll.bind(controller));

  // GET /api/v1/notifications/count
  app.get('/count', controller.getUnreadCount.bind(controller));

  // PATCH /api/v1/notifications/read-all
  app.patch('/read-all', controller.markAllAsRead.bind(controller));

  // DELETE /api/v1/notifications
  app.delete('/', controller.deleteAll.bind(controller));

  // PATCH /api/v1/notifications/:id/read
  app.patch('/:id/read', controller.markAsRead.bind(controller));

  // DELETE /api/v1/notifications/:id
  app.delete('/:id', controller.delete.bind(controller));

  // GET /api/v1/notifications/settings
  app.get('/settings', controller.getSettings.bind(controller));

  // PUT /api/v1/notifications/settings
  app.put('/settings', controller.updateSettings.bind(controller));
}
