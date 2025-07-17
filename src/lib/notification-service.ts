/**
 * @fileoverview 通知服务层
 * @description 处理通知的创建、发送和管理
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

import { prisma } from "@/lib/prisma";
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NOTIFICATION_TYPE_CONFIGS,
  NotificationStatus
} from "@/types/notification-types";

/**
 * 通知创建参数
 */
interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  data?: Record<string, any>;
  scheduledAt?: Date;
  expiresAt?: Date;
}

/**
 * 通知服务类
 */
export class NotificationService {
  /**
   * 创建通知
   */
  static async createNotification(params: CreateNotificationParams) {
    const { userId, type, data = {}, scheduledAt, expiresAt } = params;

    // 获取通知类型配置
    const config = NOTIFICATION_TYPE_CONFIGS[type as keyof typeof NOTIFICATION_TYPE_CONFIGS];
    if (!config) {
      throw new Error(`未知的通知类型: ${type}`);
    }

    // 渲染通知内容
    const { title, content, actionUrl } = this.renderNotificationContent(config, data);

    // 创建通知记录
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        priority: config.priority,
        title,
        content,
        data: JSON.stringify(data),
        actionUrl,
        scheduledAt,
        expiresAt,
      },
    });

    // 获取用户通知偏好
    const preferences = await this.getUserPreferences(userId, type);

    // 创建发送任务
    await this.createDeliveryTasks(notification.id, userId, preferences);

    return notification;
  }

  /**
   * 批量创建通知
   */
  static async createBulkNotifications(notifications: CreateNotificationParams[]) {
    const results: any[] = [];

    for (const notificationParams of notifications) {
      try {
        const notification = await this.createNotification(notificationParams);
        results.push({ success: true, notification });
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : '未知错误',
          params: notificationParams
        });
      }
    }

    return results;
  }

  /**
   * 获取用户通知偏好
   */
  private static async getUserPreferences(userId: string, type: NotificationType) {
    const preference = await prisma.userNotificationPreference.findUnique({
      where: {
        userId_notificationType: {
          userId,
          notificationType: type,
        },
      },
    });

    // 如果没有设置偏好，使用默认配置
    if (!preference) {
      const config = NOTIFICATION_TYPE_CONFIGS[type as keyof typeof NOTIFICATION_TYPE_CONFIGS];
      return {
        enableInApp: config.defaultChannels.includes('IN_APP' as any),
        enableEmail: config.defaultChannels.includes('EMAIL' as any),
        enablePush: config.defaultChannels.includes('PUSH' as any),
        quietHoursEnabled: false,
        batchEnabled: true,
      };
    }

    return preference;
  }

  /**
   * 创建发送任务
   */
  private static async createDeliveryTasks(
    notificationId: string,
    userId: string,
    preferences: any
  ) {
    const deliveryTasks: any[] = [];

    // 站内通知（总是发送）
    if (preferences.enableInApp) {
      deliveryTasks.push({
        notificationId,
        userId,
        channel: NotificationChannel.IN_APP,
        status: 'SENT', // 站内通知立即标记为已发送
        sentAt: new Date(),
      });
    }



    // 邮箱通知
    if (preferences.enableEmail) {
      deliveryTasks.push({
        notificationId,
        userId,
        channel: NotificationChannel.EMAIL,
        status: 'PENDING',
      });
    }

    if (deliveryTasks.length > 0) {
      await prisma.notificationDelivery.createMany({
        data: deliveryTasks,
      });
    }
  }

  /**
   * 渲染通知内容
   */
  private static renderNotificationContent(
    config: any,
    data: Record<string, any>
  ) {
    let title = config.template.title;
    let content = config.template.content;
    let actionUrl = config.template.actionUrl;

    // 替换模板变量
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      title = title.replace(new RegExp(placeholder, 'g'), String(value));
      content = content.replace(new RegExp(placeholder, 'g'), String(value));
      if (actionUrl) {
        actionUrl = actionUrl.replace(new RegExp(placeholder, 'g'), String(value));
      }
    });

    return { title, content, actionUrl };
  }

  /**
   * 发送待处理的通知
   */
  static async processPendingNotifications() {
    const pendingDeliveries = await prisma.notificationDelivery.findMany({
      where: {
        status: 'PENDING',
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: new Date() } },
        ],
      },
      include: {
        notification: true,
        user: {
          select: {
            id: true,
            email: true,

            username: true,
            displayName: true,
          },
        },
      },
      take: 100, // 每次处理100条
    });

    for (const delivery of pendingDeliveries) {
      try {
        await this.sendNotification(delivery);
      } catch (error) {
        console.error(`发送通知失败: ${delivery.id}`, error);
        await this.handleDeliveryFailure(delivery.id, error);
      }
    }
  }

  /**
   * 发送单个通知
   */
  private static async sendNotification(delivery: any) {
    const { channel, notification, user } = delivery;

    switch (channel) {

      case NotificationChannel.EMAIL:
        await this.sendEmailNotification(delivery, notification, user);
        break;
      default:
        throw new Error(`不支持的通知渠道: ${channel}`);
    }

    // 标记为已发送
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  }



  /**
   * 发送邮箱通知
   */
  private static async sendEmailNotification(delivery: any, notification: any, user: any) {
    if (!user.email) {
      throw new Error('用户未设置邮箱');
    }

    // TODO: 实现邮箱发送逻辑
    console.log(`发送邮箱通知到 ${user.email}: ${notification.title}`);

    // 模拟发送延迟
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  /**
   * 处理发送失败
   */
  private static async handleDeliveryFailure(deliveryId: string, error: any) {
    const delivery = await prisma.notificationDelivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) return;

    const retryCount = delivery.retryCount + 1;
    const maxRetries = delivery.maxRetries;

    if (retryCount >= maxRetries) {
      // 超过最大重试次数，标记为失败
      await prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'FAILED',
          failureReason: error instanceof Error ? error.message : '未知错误',
          retryCount,
        },
      });
    } else {
      // 计算下次重试时间（指数退避）
      const nextRetryAt = new Date(Date.now() + Math.pow(2, retryCount) * 60000);

      await prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'RETRYING',
          failureReason: error instanceof Error ? error.message : '未知错误',
          retryCount,
          nextRetryAt,
        },
      });
    }
  }

  /**
   * 清理过期通知
   */
  static async cleanupExpiredNotifications() {
    const now = new Date();

    // 删除过期的通知
    await prisma.notification.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    // 删除30天前的已读通知
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    await prisma.notification.deleteMany({
      where: {
        isRead: true,
        readAt: {
          lt: thirtyDaysAgo,
        },
      },
    });
  }
}
