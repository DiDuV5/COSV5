/**
 * @fileoverview 用户审核辅助函数
 * @description 提供用户审核相关的辅助功能
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @/lib/prisma: Prisma客户端
 * - @/lib/errors/trpc-error-handler: 错误处理
 *
 * @changelog
 * - 2025-06-22: 初始版本创建，用户审核辅助功能
 */

import { prisma } from "@/lib/prisma";
import { TRPCErrorHandler } from "@/lib/errors/trpc-error-handler";

/**
 * 审核配置接口
 */
export interface ApprovalConfig {
  registrationApprovalEnabled: boolean;
  notificationEnabled: boolean;
  autoApproveAdmin: boolean;
}

/**
 * 获取审核配置
 */
export async function getApprovalConfig(): Promise<ApprovalConfig> {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            "user_registration_approval_enabled",
            "user_approval_notification_enabled", 
            "user_approval_auto_approve_admin",
          ],
        },
      },
    });

    const config: ApprovalConfig = {
      registrationApprovalEnabled: false,
      notificationEnabled: true,
      autoApproveAdmin: true,
    };

    settings.forEach((setting) => {
      const value = setting.value === "true";
      switch (setting.key) {
        case "user_registration_approval_enabled":
          config.registrationApprovalEnabled = value;
          break;
        case "user_approval_notification_enabled":
          config.notificationEnabled = value;
          break;
        case "user_approval_auto_approve_admin":
          config.autoApproveAdmin = value;
          break;
      }
    });

    return config;
  } catch (error) {
    console.error("获取审核配置失败:", error);
    // 返回默认配置
    return {
      registrationApprovalEnabled: false,
      notificationEnabled: true,
      autoApproveAdmin: true,
    };
  }
}

/**
 * 确定用户的初始审核状态
 */
export async function determineApprovalStatus(
  userLevel: string,
  isAdmin: boolean = false
): Promise<string> {
  const config = await getApprovalConfig();

  // 如果未启用审核功能，直接通过
  if (!config.registrationApprovalEnabled) {
    return "APPROVED";
  }

  // 如果是管理员且配置为自动通过，直接通过
  if (isAdmin && config.autoApproveAdmin) {
    return "APPROVED";
  }

  // 如果是管理员级别用户且配置为自动通过，直接通过
  if ((userLevel === "ADMIN" || userLevel === "SUPER_ADMIN") && config.autoApproveAdmin) {
    return "APPROVED";
  }

  // 其他情况需要审核
  return "PENDING";
}

/**
 * 检查用户是否需要审核
 */
export async function needsApproval(
  userLevel: string,
  isAdmin: boolean = false
): Promise<boolean> {
  const status = await determineApprovalStatus(userLevel, isAdmin);
  return status === "PENDING";
}

/**
 * 记录审核日志
 */
export async function logApprovalAction(
  userId: string,
  adminId: string,
  action: string,
  previousStatus: string | null,
  newStatus: string,
  reason?: string,
  metadata?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await prisma.userApprovalLog.create({
      data: {
        userId,
        adminId,
        action,
        previousStatus,
        newStatus,
        reason,
        metadata: metadata || {},
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error("记录审核日志失败:", error);
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 检查用户是否有审核权限
 */
export function hasApprovalPermission(userLevel: string): boolean {
  return userLevel === "ADMIN" || userLevel === "SUPER_ADMIN";
}

/**
 * 获取审核状态的中文描述
 */
export function getApprovalStatusText(status: string): string {
  switch (status) {
    case "PENDING":
      return "待审核";
    case "APPROVED":
      return "已通过";
    case "REJECTED":
      return "已拒绝";
    default:
      return "未知状态";
  }
}

/**
 * 获取审核动作的中文描述
 */
export function getApprovalActionText(action: string): string {
  switch (action) {
    case "APPROVE":
      return "通过审核";
    case "REJECT":
      return "拒绝审核";
    case "PENDING":
      return "设为待审核";
    case "RESUBMIT":
      return "重新提交";
    default:
      return "未知操作";
  }
}

/**
 * 验证审核状态是否有效
 */
export function isValidApprovalStatus(status: string): boolean {
  return ["PENDING", "APPROVED", "REJECTED"].includes(status);
}

/**
 * 验证审核动作是否有效
 */
export function isValidApprovalAction(action: string): boolean {
  return ["APPROVE", "REJECT", "PENDING", "RESUBMIT"].includes(action);
}
