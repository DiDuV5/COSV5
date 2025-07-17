/**
 * @fileoverview 用户审批系统工具函数
 * @description 提供用户审批相关的工具函数和验证逻辑
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import type { ApprovalAction, ApprovalStatus, ApprovalConfig, SystemSetting } from './types';

/**
 * 构建用户查询条件
 */
export function buildUserWhereClause(search?: string, cursor?: string) {
  const where: any = {
    approvalStatus: "PENDING",
  };

  // 添加搜索条件
  if (search) {
    where.OR = [
      { username: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { displayName: { contains: search, mode: "insensitive" } },
    ];
  }

  // 添加游标分页
  if (cursor) {
    where.id = { lt: cursor };
  }

  return where;
}

/**
 * 构建审批日志查询条件
 */
export function buildLogWhereClause(
  userId?: string,
  adminId?: string,
  action?: ApprovalAction,
  startDate?: Date,
  endDate?: Date,
  cursor?: string
) {
  const where: any = {};

  if (userId) where.userId = userId;
  if (adminId) where.adminId = adminId;
  if (action) where.action = action;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  if (cursor) {
    where.id = { lt: cursor };
  }

  return where;
}

/**
 * 创建用户更新数据
 */
export function createUserUpdateData(
  action: ApprovalAction,
  adminId: string,
  reason?: string,
  now: Date = new Date()
) {
  const newStatus = action === "APPROVE" ? "APPROVED" : action === "REJECT" ? "REJECTED" : "PENDING";
  const updateData: any = {
    approvalStatus: newStatus,
  };

  if (action === "APPROVE") {
    updateData.approvedAt = now;
    updateData.approvedBy = adminId;
    updateData.rejectedAt = null;
    updateData.rejectedBy = null;
    updateData.rejectionReason = null;
  } else if (action === "REJECT") {
    updateData.rejectedAt = now;
    updateData.rejectedBy = adminId;
    updateData.rejectionReason = reason;
    updateData.approvedAt = null;
    updateData.approvedBy = null;
  }

  return updateData;
}

/**
 * 创建审批日志数据
 */
export function createApprovalLogData(
  userId: string,
  adminId: string,
  action: ApprovalAction,
  previousStatus: ApprovalStatus,
  newStatus: ApprovalStatus,
  reason: string | undefined,
  userLevel: string,
  notifyUser: boolean,
  ipAddress?: string,
  userAgent?: string,
  isBatch: boolean = false,
  now: Date = new Date()
) {
  return {
    userId,
    adminId,
    action,
    previousStatus,
    newStatus,
    reason,
    metadata: {
      userLevel,
      notifyUser,
      batchOperation: isBatch,
      timestamp: now.toISOString(),
    },
    ipAddress,
    userAgent,
  };
}

/**
 * 创建批量审批日志数据
 */
export function createBatchApprovalLogData(
  users: Array<{ id: string; approvalStatus: ApprovalStatus; userLevel: string }>,
  adminId: string,
  action: ApprovalAction,
  newStatus: ApprovalStatus,
  reason: string | undefined,
  notifyUsers: boolean,
  ipAddress?: string,
  userAgent?: string,
  now: Date = new Date()
) {
  return users.map(user => createApprovalLogData(
    user.id,
    adminId,
    action,
    user.approvalStatus,
    newStatus,
    reason,
    user.userLevel,
    notifyUsers,
    ipAddress,
    userAgent,
    true,
    now
  ));
}

/**
 * 处理分页结果
 */
export function processPaginatedResult<T extends { id: string }>(
  items: T[],
  limit: number
): { items: T[]; nextCursor?: string; hasMore: boolean } {
  let nextCursor: string | undefined = undefined;
  if (items.length > limit) {
    const nextItem = items.pop();
    nextCursor = nextItem!.id;
  }

  return {
    items,
    nextCursor,
    hasMore: !!nextCursor,
  };
}

/**
 * 解析审批配置
 */
export function parseApprovalConfig(settings: SystemSetting[]): ApprovalConfig {
  const config: ApprovalConfig = {
    registrationApprovalEnabled: false,
    notificationEnabled: true,
    autoApproveAdmin: true,
    timeoutHours: 72,
    autoRejectTimeout: false,
    batchSizeLimit: 50,
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
}

/**
 * 创建配置更新数据
 */
export function createConfigUpdates(input: Partial<ApprovalConfig>): Array<{ key: string; value: string }> {
  const updates: Array<{ key: string; value: string }> = [];

  if (input.registrationApprovalEnabled !== undefined) {
    updates.push({
      key: "user_registration_approval_enabled",
      value: input.registrationApprovalEnabled.toString(),
    });
  }

  if (input.notificationEnabled !== undefined) {
    updates.push({
      key: "user_approval_notification_enabled",
      value: input.notificationEnabled.toString(),
    });
  }

  if (input.autoApproveAdmin !== undefined) {
    updates.push({
      key: "user_approval_auto_approve_admin",
      value: input.autoApproveAdmin.toString(),
    });
  }

  return updates;
}

/**
 * 获取客户端IP地址
 */
export function getClientIpAddress(req: any): string | undefined {
  return req?.headers["x-forwarded-for"] as string ||
         req?.headers["x-real-ip"] as string ||
         req?.connection?.remoteAddress;
}

/**
 * 获取用户代理
 */
export function getUserAgent(req: any): string | undefined {
  return req?.headers["user-agent"];
}

/**
 * 获取今日开始时间
 */
export function getTodayStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * 格式化管理员名称
 */
export function formatAdminName(admin: { username: string; displayName: string | null } | null): string {
  return admin?.displayName || admin?.username || "管理员";
}

/**
 * 验证用户是否处于待审核状态
 */
export function validatePendingStatus(user: { approvalStatus: string }, userId: string): void {
  if (user.approvalStatus !== "PENDING") {
    throw new Error(`用户 ${userId} 不在待审核状态，当前状态: ${user.approvalStatus}`);
  }
}

/**
 * 验证批量操作用户数量
 */
export function validateBatchUsers(users: any[], userIds: string[]): void {
  if (users.length === 0) {
    throw new Error(`没有找到待审核的用户，请求的用户ID: ${userIds.join(', ')}`);
  }
}

/**
 * 创建审计日志数据
 */
export function createAuditLogData(
  userId: string,
  action: string,
  message: string,
  details: any,
  resource: string,
  ipAddress?: string,
  userAgent?: string
) {
  return {
    userId,
    action,
    level: "INFO" as const,
    message,
    details: JSON.stringify(details),
    resource,
    ipAddress,
    userAgent,
  };
}
