/**
 * @fileoverview 超时通知器
 * @description 发送超时相关的通知和提醒
 * @author Augment AI
 * @date 2025-07-03
 */

import { prisma } from '@/lib/prisma';
import { sendUserApprovalNotification } from '@/server/api/routers/user-approval/notification-handler';
import {
  TimeoutUser,
  AdminReminderData,
  TimeoutNotificationType
} from '../types/timeout-types';

/**
 * 超时通知器类
 */
export class TimeoutNotifier {

  /**
   * 发送超时提醒通知
   */
  static async sendTimeoutNotifications(users: TimeoutUser[]): Promise<number> {
    try {
      let notifiedCount = 0;

      console.log(`📧 开始发送超时提醒: ${users.length} 个用户`);

      for (const user of users) {
        try {
          // 检查是否有最近的通知记录
          const hasRecentNotification = await this.hasRecentTimeoutNotification(user.id);
          if (hasRecentNotification) {
            console.log(`⏭️ 跳过用户 ${user.username}: 24小时内已发送过提醒`);
            continue;
          }

          // 发送提醒邮件
          await this.sendTimeoutReminderEmail(user);

          // 记录通知
          await this.recordTimeoutNotification(user.id, TimeoutNotificationType.TIMEOUT_REMINDER);

          notifiedCount++;
          console.log(`✅ 已发送超时提醒: ${user.username}`);

        } catch (error) {
          console.error(`❌ 发送提醒失败 ${user.username}:`, error);
        }
      }

      console.log(`✅ 超时提醒发送完成: ${notifiedCount}/${users.length} 个用户`);
      return notifiedCount;

    } catch (error) {
      console.error('发送超时提醒失败:', error);
      throw error;
    }
  }

  /**
   * 发送管理员超时提醒
   */
  static async sendAdminTimeoutReminders(
    timeoutUsers: TimeoutUser[],
    upcomingTimeoutUsers: TimeoutUser[]
  ): Promise<void> {
    try {
      console.log('📧 发送管理员超时提醒');

      // 获取管理员列表
      const admins = await prisma.user.findMany({
        where: {
          userLevel: {
            in: ['ADMIN', 'SUPER_ADMIN']
          }
        },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true
        }
      });

      if (admins.length === 0) {
        console.log('⚠️ 没有找到管理员用户');
        return;
      }

      // 获取总待审批数量
      const totalPendingApprovals = await prisma.user.count({
        where: { userLevel: 'GUEST' }
      });

      // 计算最老的待审批天数
      const oldestPending = await prisma.user.findFirst({
        where: { userLevel: 'GUEST' },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true }
      });

      const oldestPendingDays = oldestPending
        ? Math.floor((Date.now() - oldestPending.createdAt.getTime()) / (24 * 60 * 60 * 1000))
        : 0;

      const reminderData: AdminReminderData = {
        timeoutUsers,
        upcomingTimeoutUsers,
        totalPendingApprovals,
        oldestPendingDays,
        reminderSentAt: new Date()
      };

      // 发送给每个管理员
      for (const admin of admins) {
        try {
          await this.sendAdminReminderEmail(admin, reminderData);

          // 记录管理员通知
          await this.recordTimeoutNotification(admin.id, TimeoutNotificationType.ADMIN_REMINDER);

          console.log(`✅ 已发送管理员提醒: ${admin.username}`);

        } catch (error) {
          console.error(`❌ 发送管理员提醒失败 ${admin.username}:`, error);
        }
      }

      console.log('✅ 管理员超时提醒发送完成');

    } catch (error) {
      console.error('发送管理员超时提醒失败:', error);
      throw error;
    }
  }

  /**
   * 发送拒绝通知
   */
  static async sendRejectionNotifications(users: TimeoutUser[], reason: string): Promise<void> {
    try {
      console.log(`📧 发送拒绝通知: ${users.length} 个用户`);

      for (const user of users) {
        try {
          await sendUserApprovalNotification(
            {
              id: user.id,
              username: user.username,
              email: user.email,
              displayName: user.displayName || user.username
            },
            'REJECT',
            reason,
            'System',
            new Date()
          );

          // 记录拒绝通知
          await this.recordTimeoutNotification(user.id, TimeoutNotificationType.AUTO_REJECTION);

          console.log(`✅ 已发送拒绝通知: ${user.username}`);

        } catch (error) {
          console.error(`❌ 发送拒绝通知失败 ${user.username}:`, error);
        }
      }

      console.log('✅ 拒绝通知发送完成');

    } catch (error) {
      console.error('发送拒绝通知失败:', error);
      throw error;
    }
  }

  /**
   * 发送即将超时提醒
   */
  static async sendUpcomingTimeoutNotifications(users: TimeoutUser[]): Promise<number> {
    try {
      let notifiedCount = 0;

      console.log(`📧 发送即将超时提醒: ${users.length} 个用户`);

      for (const user of users) {
        try {
          // 检查是否有最近的通知记录
          const hasRecentNotification = await this.hasRecentTimeoutNotification(user.id);
          if (hasRecentNotification) {
            continue;
          }

          // 发送即将超时提醒邮件
          await this.sendUpcomingTimeoutReminderEmail(user);

          // 记录通知
          await this.recordTimeoutNotification(user.id, TimeoutNotificationType.UPCOMING_TIMEOUT);

          notifiedCount++;
          console.log(`✅ 已发送即将超时提醒: ${user.username}`);

        } catch (error) {
          console.error(`❌ 发送即将超时提醒失败 ${user.username}:`, error);
        }
      }

      console.log(`✅ 即将超时提醒发送完成: ${notifiedCount}/${users.length} 个用户`);
      return notifiedCount;

    } catch (error) {
      console.error('发送即将超时提醒失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户是否有最近的超时通知
   */
  private static async hasRecentTimeoutNotification(userId: string): Promise<boolean> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const notification = await prisma.timeoutNotification.findFirst({
        where: {
          userId,
          createdAt: { gte: oneDayAgo }
        }
      });

      return !!notification;

    } catch (error) {
      console.error('检查超时通知失败:', error);
      return false;
    }
  }

  /**
   * 记录超时通知
   */
  private static async recordTimeoutNotification(
    userId: string,
    type: TimeoutNotificationType
  ): Promise<void> {
    try {
      await prisma.timeoutNotification.create({
        data: {
          userId,
          type
        }
      });
    } catch (error) {
      console.error('记录超时通知失败:', error);
      // 不抛出错误，避免影响主要流程
    }
  }

  /**
   * 发送超时提醒邮件
   */
  private static async sendTimeoutReminderEmail(user: TimeoutUser): Promise<void> {
    try {
      const { sendEmail } = await import('@/lib/email');

      const subject = 'CoserEden - 账户审批提醒';
      const content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">账户审批提醒</h2>
          <p>亲爱的 ${user.displayName || user.username}，</p>
          <p>您的CoserEden账户注册申请已提交 ${Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60))} 小时，目前仍在审核中。</p>
          <p>为了加快审核进度，请确保您的个人资料信息完整准确。</p>
          <p>如有疑问，请联系我们的客服团队。</p>
          <p>感谢您的耐心等待！</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            此邮件由系统自动发送，请勿回复。<br>
            CoserEden团队
          </p>
        </div>
      `;

      await sendEmail({
        to: user.email,
        subject,
        html: content
      });

    } catch (error) {
      console.error('发送超时提醒邮件失败:', error);
      throw error;
    }
  }

  /**
   * 发送即将超时提醒邮件
   */
  private static async sendUpcomingTimeoutReminderEmail(user: TimeoutUser): Promise<void> {
    try {
      const { sendEmail } = await import('@/lib/email');

      const subject = 'CoserEden - 账户审批即将超时提醒';
      const content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ff6b35;">账户审批即将超时</h2>
          <p>亲爱的 ${user.displayName || user.username}，</p>
          <p>您的CoserEden账户注册申请即将超过审核时限。</p>
          <p>请尽快完善您的个人资料信息，以便我们能够及时完成审核。</p>
          <p><strong>注意：</strong>如果超过时限仍未通过审核，您的申请可能会被自动拒绝。</p>
          <p>如有疑问，请立即联系我们的客服团队。</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            此邮件由系统自动发送，请勿回复。<br>
            CoserEden团队
          </p>
        </div>
      `;

      await sendEmail({
        to: user.email,
        subject,
        html: content
      });

    } catch (error) {
      console.error('发送即将超时提醒邮件失败:', error);
      throw error;
    }
  }

  /**
   * 发送管理员提醒邮件
   */
  private static async sendAdminReminderEmail(
    admin: any,
    reminderData: AdminReminderData
  ): Promise<void> {
    try {
      const { sendEmail } = await import('@/lib/email');

      const subject = 'CoserEden - 用户审批超时提醒';
      const content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">用户审批超时提醒</h2>
          <p>亲爱的管理员 ${admin.displayName || admin.username}，</p>

          <div style="background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 5px;">
            <h3>审批统计</h3>
            <ul>
              <li>已超时用户: <strong>${reminderData.timeoutUsers.length}</strong> 个</li>
              <li>即将超时用户: <strong>${reminderData.upcomingTimeoutUsers.length}</strong> 个</li>
              <li>总待审批用户: <strong>${reminderData.totalPendingApprovals}</strong> 个</li>
              <li>最长等待时间: <strong>${reminderData.oldestPendingDays}</strong> 天</li>
            </ul>
          </div>

          <p>请及时处理待审批用户，避免影响用户体验。</p>
          <p><a href="${process.env.COSEREEDEN_NEXTAUTH_URL}/admin/user-approval" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">前往审批页面</a></p>

          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            此邮件由系统自动发送，请勿回复。<br>
            CoserEden管理系统
          </p>
        </div>
      `;

      await sendEmail({
        to: admin.email,
        subject,
        html: content
      });

    } catch (error) {
      console.error('发送管理员提醒邮件失败:', error);
      throw error;
    }
  }
}
