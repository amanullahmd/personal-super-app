import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/utils/errors';
import { paginate, paginatedResponse, PaginationParams } from '../../shared/utils/pagination';

export class NotificationService {
  async create(userId: string, data: {
    title: string;
    body: string;
    type: string;
    data?: any;
  }) {
    return prisma.notification.create({
      data: {
        userId,
        title: data.title,
        body: data.body,
        type: data.type,
        data: data.data,
      },
    });
  }

  async getAll(userId: string, params: PaginationParams & { isRead?: boolean; type?: string }) {
    const where: any = { userId };
    if (params.isRead !== undefined) where.isRead = params.isRead;
    if (params.type) where.type = params.type;

    const [data, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        ...paginate(params),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      ...paginatedResponse(data, total, params),
      unreadCount,
    };
  }

  async markAsRead(userId: string, id: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundError('Notification');

    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { message: `${result.count} notifications marked as read` };
  }

  async delete(userId: string, id: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundError('Notification');

    await prisma.notification.delete({ where: { id } });
    return { message: 'Notification deleted' };
  }

  async deleteAll(userId: string) {
    const result = await prisma.notification.deleteMany({
      where: { userId },
    });
    return { message: `${result.count} notifications deleted` };
  }

  async getUnreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { unreadCount: count };
  }

  // --- Notification Settings ---
  async getSettings(userId: string) {
    const prefs = await prisma.userPreference.findUnique({
      where: { userId },
      select: { notificationSettings: true },
    });

    return prefs?.notificationSettings || {
      pushEnabled: true,
      emailEnabled: false,
      habitReminders: true,
      taskReminders: true,
      mealReminders: true,
      sleepReminders: true,
      insightNotifications: true,
      socialNotifications: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    };
  }

  async updateSettings(userId: string, settings: any) {
    await prisma.userPreference.update({
      where: { userId },
      data: { notificationSettings: settings },
    });

    return settings;
  }
}
