/**
 * 用户审核通知处理器
 *
 * @description 处理用户审核相关的通知发送，包括邮件通知
 * @author CoserEden Team
 * @version 1.0.0
 */

import { sendApprovalNotification, sendBatchApprovalNotifications } from "@/lib/approval-notification";
import type { ApprovalAction } from "./types";

/**
 * 发送单个用户审核通知
 */
export async function sendUserApprovalNotification(
  user: {
    id: string;
    username: string;
    email: string;
    displayName: string | null;
  },
  action: ApprovalAction,
  reason: string | undefined,
  adminName: string,
  now: Date
): Promise<void> {
  // 发送邮件通知
  if (user.email) {
    try {
      // 只有APPROVE和REJECT操作才发送通知
      if (action === 'APPROVE' || action === 'REJECT') {
        await sendApprovalNotification({
          user,
          action,
          reason,
          adminName,
          approvedAt: action === 'APPROVE' ? now : undefined,
          rejectedAt: action === 'REJECT' ? now : undefined,
        });
      }
      console.log(`审核邮件通知已发送给用户 ${user.username} (${user.email})`);
    } catch (error) {
      console.error(`发送审核邮件通知失败:`, error);
      // 不抛出错误，避免影响主流程
    }
  }
}

/**
 * 批量发送用户审核通知
 */
export async function sendBatchUserApprovalNotifications(
  users: Array<{
    id: string;
    username: string;
    email: string;
    displayName: string | null;
  }>,
  action: ApprovalAction,
  reason: string | undefined,
  adminName: string,
  _now: Date
): Promise<void> {
  try {
    // 转换为sendBatchApprovalNotifications期望的格式
    const convertedAction = action === "APPROVE" ? "APPROVE" : action === "REJECT" ? "REJECT" : "APPROVE";

    await sendBatchApprovalNotifications(
      users,
      convertedAction,
      reason,
      adminName
    );
    console.log(`批量审核通知已发送给 ${users.length} 个用户`);
  } catch (error) {
    console.error(`发送批量审核通知失败:`, error);
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 发送审核状态变更通知
 */
export async function sendApprovalStatusChangeNotification(
  user: {
    id: string;
    username: string;
    email: string;
    displayName: string | null;
  },
  oldStatus: string,
  newStatus: string,
  adminName: string,
  reason?: string
): Promise<void> {
  // 只有状态真正改变时才发送通知
  if (oldStatus === newStatus) {
    return;
  }

  const action: ApprovalAction = newStatus === 'APPROVED' ? 'APPROVE' : 'REJECT';

  await sendUserApprovalNotification(
    user,
    action,
    reason,
    adminName,
    new Date()
  );
}

/**
 * 发送审核提醒通知（给管理员）
 */
export async function sendApprovalReminderNotification(
  pendingCount: number,
  adminEmail: string
): Promise<void> {
  try {
    // TODO: 实现管理员提醒邮件发送逻辑
    console.log(`发送审核提醒通知给管理员 ${adminEmail}，待审核用户数: ${pendingCount}`);
  } catch (error) {
    console.error(`发送审核提醒通知失败:`, error);
  }
}

/**
 * 验证通知发送权限
 */
export function validateNotificationPermissions(
  user: {
    id: string;
    username: string;
    email: string;
  },
  _action: ApprovalAction
): boolean {
  // 检查用户是否有有效的邮箱
  if (!user.email) {
    console.warn(`用户 ${user.username} 没有邮箱，无法发送通知`);
    return false;
  }

  // 检查邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(user.email)) {
    console.warn(`用户 ${user.username} 的邮箱格式无效: ${user.email}`);
    return false;
  }

  return true;
}

/**
 * 格式化通知消息
 */
export function formatNotificationMessage(
  action: ApprovalAction,
  username: string,
  reason?: string
): string {
  const baseMessage = action === 'APPROVE'
    ? `用户 ${username} 的账户已通过审核`
    : `用户 ${username} 的账户审核被拒绝`;

  if (reason && action === 'REJECT') {
    return `${baseMessage}，原因：${reason}`;
  }

  return baseMessage;
}

/**
 * 记录通知发送日志
 */
export function logNotificationSent(
  userId: string,
  username: string,
  action: ApprovalAction,
  channel: 'email',
  success: boolean,
  error?: string
): void {
  const logData = {
    userId,
    username,
    action,
    channel,
    success,
    timestamp: new Date().toISOString(),
    error: error || null,
  };

  if (success) {
    console.log(`通知发送成功:`, logData);
  } else {
    console.error(`通知发送失败:`, logData);
  }
}

/**
 * 获取通知发送统计
 */
export async function getNotificationStats(
  _startDate: Date,
  _endDate: Date
): Promise<{
  totalSent: number;
  emailSent: number;
  successRate: number;
}> {
  // TODO: 实现从数据库获取通知统计的逻辑
  return {
    totalSent: 0,
    emailSent: 0,
    successRate: 0,
  };
}
