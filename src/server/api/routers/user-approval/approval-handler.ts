/**
 * @fileoverview 用户审批处理器
 * @description 处理用户审批的核心业务逻辑
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { TRPCErrorHandler } from "@/lib/errors/trpc-error-handler";
import {
  validateApprovalPermission,
  validateApprovalOperation,
  validateBatchApprovalOperation,
  validateApprovalReason,
  checkApprovalRateLimit,
  logSecurityEvent,
  generateApprovalSummary,
} from "@/lib/approval-security";
import type { ApprovalAction, ApprovalResult, BatchApprovalResult } from './types';
import {
  createUserUpdateData,
  createApprovalLogData,
  createBatchApprovalLogData,
  validatePendingStatus,
  validateBatchUsers,
  getClientIpAddress,
  getUserAgent,
} from './utils';
import { sendUserApprovalNotification, sendBatchUserApprovalNotifications } from './notification-handler';

/**
 * 获取管理员信息用于通知
 */
async function getAdminForNotification(db: any, adminId: string) {
  const admin = await db.user.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
    },
  });
  return admin;
}

/**
 * 处理单个用户审批通知
 */
async function handleApprovalNotification(
  user: any,
  action: any,
  reason: string | undefined,
  adminUser: any,
  notifyUser: boolean,
  now: Date
) {
  if (notifyUser && adminUser) {
    await sendUserApprovalNotification(user, action, reason, adminUser.displayName || adminUser.username, now);
  }
}

/**
 * 处理批量用户审批通知
 */
async function handleBatchApprovalNotification(
  users: any[],
  action: any,
  reason: string | undefined,
  adminUser: any,
  notifyUsers: boolean
) {
  if (notifyUsers && adminUser) {
    const now = new Date();
    await sendBatchUserApprovalNotifications(
      users,
      action,
      reason,
      adminUser.displayName || adminUser.username,
      now
    );
  }
}

/**
 * 处理单个用户审批
 */
export async function processSingleUserApproval(
  db: any,
  req: any,
  userId: string,
  action: ApprovalAction,
  reason: string | undefined,
  notifyUser: boolean,
  adminId: string,
  userLevel: string
): Promise<ApprovalResult> {
  // 安全验证
  validateApprovalPermission(userLevel, "用户审核");
  validateApprovalReason(action, reason);
  checkApprovalRateLimit(adminId, "single");

  // 检查用户是否存在
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      approvalStatus: true,
      userLevel: true,

    },
  });

  TRPCErrorHandler.requireResource(user, "用户", userId);

  // 验证审核操作的合法性
  validateApprovalOperation(userId, adminId, action, user.approvalStatus);
  validatePendingStatus(user, userId);

  const now = new Date();
  const newStatus = action === "APPROVE" ? "APPROVED" : action === "REJECT" ? "REJECTED" : "PENDING";
  const ipAddress = getClientIpAddress(req);
  const userAgent = getUserAgent(req);

  // 使用事务处理审核操作
  const result = await db.$transaction(async (tx: any) => {
    // 更新用户状态
    const updateData = createUserUpdateData(action, adminId, reason, now);
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        approvalStatus: true,
        approvedAt: true,
        rejectedAt: true,
      },
    });

    // 记录审核日志
    const logData = createApprovalLogData(
      userId,
      adminId,
      action,
      user.approvalStatus,
      newStatus,
      reason,
      user.userLevel,
      notifyUser,
      ipAddress,
      userAgent,
      false,
      now
    );

    await tx.userApprovalLog.create({ data: logData });

    return updatedUser;
  });

  // 发送通知给用户（如果启用）
  if (notifyUser) {
    const adminUser = await getAdminForNotification(db, adminId);
    await handleApprovalNotification(user, action, reason, adminUser, notifyUser, now);
  }

  return {
    success: true,
    user: result,
    message: action === "APPROVE" ? "用户审核通过" : "用户审核被拒绝",
  };
}

/**
 * 处理批量用户审批
 */
export async function processBatchUserApproval(
  db: any,
  req: any,
  userIds: string[],
  action: ApprovalAction,
  reason: string | undefined,
  notifyUsers: boolean,
  adminId: string,
  userLevel: string
): Promise<BatchApprovalResult> {
  // 安全验证
  validateApprovalPermission(userLevel, "批量用户审核");
  validateBatchApprovalOperation(userIds, adminId, action);
  validateApprovalReason(action, reason);
  checkApprovalRateLimit(adminId, "batch");

  // 检查用户是否存在且处于待审核状态
  const users = await db.user.findMany({
    where: {
      id: { in: userIds },
      approvalStatus: "PENDING",
    },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,

      approvalStatus: true,
      userLevel: true,
    },
  });

  validateBatchUsers(users, userIds);

  const now = new Date();
  const newStatus = action === "APPROVE" ? "APPROVED" : action === "REJECT" ? "REJECTED" : "PENDING";
  const ipAddress = getClientIpAddress(req);
  const userAgent = getUserAgent(req);

  // 记录安全事件
  await logSecurityEvent(
    adminId,
    "BATCH_APPROVAL_OPERATION",
    {
      action,
      userCount: users.length,
      requestedCount: userIds.length,
      reason,
    },
    ipAddress,
    userAgent
  );

  // 使用事务处理批量审核
  const result = await db.$transaction(async (tx: any) => {
    // 批量更新用户状态
    const updateData = createUserUpdateData(action, adminId, reason, now);
    await tx.user.updateMany({
      where: { id: { in: users.map((u: any) => u.id) } },
      data: updateData,
    });

    // 批量创建审核日志
    const logData = createBatchApprovalLogData(
      users,
      adminId,
      action,
      newStatus,
      reason,
      notifyUsers,
      ipAddress,
      userAgent,
      now
    );

    await tx.userApprovalLog.createMany({ data: logData });

    return users.length;
  });

  // 批量发送通知（如果启用）
  if (notifyUsers) {
    const adminUser = await getAdminForNotification(db, adminId);
    await handleBatchApprovalNotification(users, action, reason, adminUser, notifyUsers);
  }

  // 生成操作摘要
  const summary = generateApprovalSummary(action, result, reason);

  return {
    success: true,
    processedCount: result,
    skippedCount: userIds.length - result,
    message: `批量审核完成: ${summary}`,
    summary,
  };
}

/**
 * 获取待审核用户列表
 */
export async function getPendingUsersList(
  db: any,
  limit: number,
  cursor: string | undefined,
  sortBy: string,
  sortOrder: string,
  search: string | undefined
) {
  const { buildUserWhereClause, processPaginatedResult } = await import('./utils');

  const where = buildUserWhereClause(search, cursor);

  const users = await db.user.findMany({
    where,
    take: limit + 1, // 多取一个用于判断是否有下一页
    orderBy: { [sortBy]: sortOrder },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      userLevel: true,
      approvalStatus: true,

      createdAt: true,
      approvedAt: true,
      approvedBy: true,
      rejectedAt: true,
      rejectedBy: true,
      rejectionReason: true,
    },
  });

  return processPaginatedResult(users, limit);
}
