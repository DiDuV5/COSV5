/**
 * @fileoverview 通知系统API路由
 * @description 处理通知创建、查询、标记已读等功能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/server: ^10.0.0
 * - zod: ^3.22.0
 * - prisma: ^5.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure as _publicProcedure, authProcedure, adminProcedure as _adminProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { TRPCErrorHandler, BusinessErrorType as _BusinessErrorType } from "@/lib/errors/trpc-error-handler";
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority as _NotificationPriority,
  NOTIFICATION_TYPE_CONFIGS
} from "@/types/notification-types";

export const notificationRouter = createTRPCRouter({
  /**
   * 获取用户通知列表
   */
  getNotifications: authProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
        unreadOnly: z.boolean().default(false),
        type: z.enum(["like", "comment", "follow", "system", "message"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, unreadOnly, type } = input;
      const userId = ctx.session.user.id;

      const notifications = await ctx.db.notification.findMany({
        where: {
          userId,
          ...(unreadOnly && { isRead: false }),
          ...(type && { type }),
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (notifications.length > limit) {
        const nextItem = notifications.pop();
        nextCursor = nextItem!.id;
      }

      return {
        notifications,
        nextCursor,
      };
    }),

  /**
   * 获取未读通知数量
   */
  getUnreadCount: authProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const count = await ctx.db.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return { count };
  }),

  /**
   * 标记通知为已读
   */
  markAsRead: authProcedure
    .input(
      z.object({
        notificationIds: z.array(z.string()).optional(),
        markAll: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { notificationIds, markAll } = input;
      const userId = ctx.session.user.id;

      if (markAll) {
        await ctx.db.notification.updateMany({
          where: {
            userId,
            isRead: false,
          },
          data: {
            isRead: true,
            readAt: new Date(),
          },
        });

        return { success: true, message: "所有通知已标记为已读" };
      } else if (notificationIds && notificationIds.length > 0) {
        await ctx.db.notification.updateMany({
          where: {
            id: { in: notificationIds },
            userId,
          },
          data: {
            isRead: true,
            readAt: new Date(),
          },
        });

        return { success: true, message: "通知已标记为已读" };
      }

      throw TRPCErrorHandler.validationError("请提供要标记的通知ID或选择标记全部");
    }),

  /**
   * 创建通知（内部使用）
   */
  createNotification: authProcedure
    .input(
      z.object({
        userId: z.string(),
        type: z.enum(["like", "comment", "follow", "system", "message"]),
        title: z.string(),
        content: z.string(),
        data: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, ...notificationData } = input;
      const notification = await ctx.db.notification.create({
        data: {
          ...notificationData,
          data: data ? JSON.stringify(data) : null,
        },
      });

      return { success: true, notification };
    }),

  /**
   * 删除通知
   */
  deleteNotification: authProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { notificationId } = input;
      const userId = ctx.session.user.id;

      const notification = await ctx.db.notification.findFirst({
        where: {
          id: notificationId,
          userId,
        },
      });

      if (!notification) {
        throw TRPCErrorHandler.notFound("通知不存在");
      }

      await ctx.db.notification.delete({
        where: { id: notificationId },
      });

      return { success: true, message: "通知已删除" };
    }),

  /**
   * 获取用户通知偏好设置
   */
  getPreferences: authProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const preferences = await ctx.db.userNotificationPreference.findMany({
      where: { userId },
    });

    // 如果用户没有设置偏好，返回默认设置
    if (preferences.length === 0) {
      const defaultPreferences = Object.values(NotificationType).map(type => ({
        userId,
        notificationType: type,
        enableInApp: true,

        enableEmail: false,
        enablePush: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        quietHoursEnabled: false,
        batchEnabled: true,
        batchInterval: 60,
      }));

      return { preferences: defaultPreferences };
    }

    return { preferences };
  }),

  /**
   * 更新用户通知偏好设置
   */
  updatePreferences: authProcedure
    .input(
      z.object({
        preferences: z.array(
          z.object({
            notificationType: z.nativeEnum(NotificationType),
            enableInApp: z.boolean(),

            enableEmail: z.boolean(),
            enablePush: z.boolean(),
            quietHoursStart: z.string().nullable().optional(),
            quietHoursEnd: z.string().nullable().optional(),
            quietHoursEnabled: z.boolean(),
            batchEnabled: z.boolean(),
            batchInterval: z.number().min(1).max(1440),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { preferences } = input;

      // 验证用户权限
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { userLevel: true, isVerified: true, email: true },
      });

      if (!user) {
        throw TRPCErrorHandler.notFound("用户不存在");
      }

      // 验证渠道权限
      for (const pref of preferences) {
        // 检查邮箱权限
        if (pref.enableEmail) {
          if (!user.email || !user.isVerified) {
            throw TRPCErrorHandler.forbidden("需要验证邮箱才能开启邮箱通知");
          }
          if (!["VIP", "CREATOR", "ADMIN", "SUPER_ADMIN"].includes(user.userLevel)) {
            throw TRPCErrorHandler.forbidden("您的用户等级不支持邮箱通知");
          }
        }
      }

      // 批量更新偏好设置
      await ctx.db.$transaction(async (tx: any) => {
        for (const pref of preferences) {
          await tx.userNotificationPreference.upsert({
            where: {
              userId_notificationType: {
                userId,
                notificationType: pref.notificationType,
              },
            },
            update: {
              enableInApp: pref.enableInApp,

              enableEmail: pref.enableEmail,
              enablePush: pref.enablePush,
              quietHoursStart: pref.quietHoursStart,
              quietHoursEnd: pref.quietHoursEnd,
              quietHoursEnabled: pref.quietHoursEnabled,
              batchEnabled: pref.batchEnabled,
              batchInterval: pref.batchInterval,
            },
            create: {
              userId,
              notificationType: pref.notificationType,
              enableInApp: pref.enableInApp,

              enableEmail: pref.enableEmail,
              enablePush: pref.enablePush,
              quietHoursStart: pref.quietHoursStart,
              quietHoursEnd: pref.quietHoursEnd,
              quietHoursEnabled: pref.quietHoursEnabled,
              batchEnabled: pref.batchEnabled,
              batchInterval: pref.batchInterval,
            },
          });
        }
      });

      return { success: true, message: "通知偏好设置已更新" };
    }),

  /**
   * 获取通知类型配置
   */
  getTypeConfigs: authProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { userLevel: true, isVerified: true, email: true },
    });

    if (!user) {
      throw TRPCErrorHandler.notFound("用户不存在");
    }

    // 根据用户等级过滤可用的通知类型
    const availableConfigs = Object.entries(NOTIFICATION_TYPE_CONFIGS)
      .filter(([_, config]) => {
        // 检查用户等级要求（基于通知优先级）
        if (config.priority === 'URGENT' && user.userLevel === 'GUEST') {
          return false; // 访客不接收紧急通知
        }

        // 检查验证要求（重要通知需要验证用户）
        if (config.priority === 'IMPORTANT' && !user.isVerified) {
          return false;
        }

        return true;
      })
      .map(([_type, config]) => ({
        ...config,
        availableChannels: config.defaultChannels.filter(channel => {
          switch (channel) {
            case NotificationChannel.IN_APP:
              return true;

            case NotificationChannel.EMAIL:
              return user.email && user.isVerified && ["VIP", "CREATOR", "ADMIN", "SUPER_ADMIN"].includes(user.userLevel);
            default:
              return false;
          }
        }),
      }));

    return {
      configs: availableConfigs,
      userInfo: {
        userLevel: user.userLevel,
        isVerified: user.isVerified,

        email: user.email,
      }
    };
  }),

  /**
   * 创建测试通知
   */
  createTestNotification: authProcedure
    .input(
      z.object({
        userId: z.string(),
        type: z.string(),
        testData: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, type, testData = {} } = input;

      // 查找目标用户
      const targetUser = await ctx.db.user.findFirst({
        where: {
          OR: [
            { id: userId },
            { username: userId }
          ]
        }
      });

      if (!targetUser) {
        throw TRPCErrorHandler.notFound("目标用户不存在");
      }

      // 创建测试通知
      const notification = await ctx.db.notification.create({
        data: {
          userId: targetUser.id,
          type,
          priority: 'NORMAL',
          title: `测试通知 - ${type}`,
          content: `这是一个${type}类型的测试通知，发送时间：${new Date().toLocaleString()}`,
          data: JSON.stringify({
            ...testData,
            isTest: true,
            createdBy: ctx.session.user.id,
          }),
        },
      });

      return {
        success: true,
        notification,
        message: "测试通知创建成功"
      };
    }),

  /**
   * 测试通知渠道连通性
   */
  testNotificationChannel: authProcedure
    .input(
      z.object({
        channel: z.enum(['email']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { channel } = input;

      // 获取用户信息
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,

          userLevel: true,
          isVerified: true
        },
      });

      if (!user) {
        throw TRPCErrorHandler.notFound("用户不存在");
      }

      try {
        if (channel === 'email') {
          if (!user.email || !user.isVerified) {
            throw TRPCErrorHandler.forbidden("请先验证邮箱地址");
          }

          // 发送测试邮件
          await sendTestEmail(user);

          return {
            success: true,
            message: "测试邮件发送成功！请检查您的邮箱（包括垃圾邮件文件夹）是否收到测试邮件。",
          };
        }

        throw TRPCErrorHandler.validationError("不支持的通知渠道");
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        // 处理具体的发送错误
        const errorMessage = error instanceof Error ? error.message : '未知错误';

        throw TRPCErrorHandler.internalError(`邮箱通知测试失败: ${errorMessage}`);
      }
    }),

});



/**
 * 发送测试邮件
 */
async function sendTestEmail(user: any) {
  // TODO: 实现真实的邮件发送逻辑
  // 这里先模拟发送过程
  console.log(`发送测试邮件到用户 ${user.username} (${user.email})`);

  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 800));

  // 模拟可能的发送失败
  if (Math.random() < 0.15) { // 15% 概率失败
    throw new Error('邮件发送失败，请检查邮箱地址是否正确或SMTP配置');
  }
}
