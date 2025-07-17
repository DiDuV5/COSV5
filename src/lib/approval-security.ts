/**
 * @fileoverview 用户审核安全控制
 * @description 提供用户审核相关的安全控制和权限验证功能
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @/lib/errors/trpc-error-handler: 错误处理
 * - @/lib/user-approval-helper: 审核辅助函数
 *
 * @changelog
 * - 2025-06-22: 初始版本创建，审核安全控制
 */

import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";
import { hasApprovalPermission } from "@/lib/user-approval-helper";

/**
 * 审核操作权限验证
 */
export function validateApprovalPermission(userLevel: string, operation: string) {
  if (!hasApprovalPermission(userLevel)) {
    throw TRPCErrorHandler.forbidden(
      `您没有权限执行${operation}操作`,
      { context: { userLevel, operation } }
    );
  }
}

/**
 * 验证审核操作的合法性
 */
export function validateApprovalOperation(
  targetUserId: string,
  adminId: string,
  action: string,
  currentStatus: string
) {
  // 防止自己审核自己
  if (targetUserId === adminId) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INVALID_OPERATION,
      "不能审核自己的账号",
      { context: { targetUserId, adminId } }
    );
  }

  // 验证状态转换的合法性
  if (currentStatus === "APPROVED" && action === "APPROVE") {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INVALID_OPERATION,
      "用户已经通过审核",
      { context: { targetUserId, currentStatus, action } }
    );
  }

  if (currentStatus === "REJECTED" && action === "REJECT") {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INVALID_OPERATION,
      "用户已经被拒绝",
      { context: { targetUserId, currentStatus, action } }
    );
  }

  // 只有待审核状态的用户才能被审核
  if (currentStatus !== "PENDING" && (action === "APPROVE" || action === "REJECT")) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INVALID_OPERATION,
      "只能审核待审核状态的用户",
      { context: { targetUserId, currentStatus, action } }
    );
  }
}

/**
 * 验证批量审核操作
 */
export function validateBatchApprovalOperation(
  userIds: string[],
  adminId: string,
  _action: string
) {
  // 检查用户ID数量限制
  if (userIds.length === 0) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INVALID_INPUT,
      "请选择要审核的用户",
      { context: { userIds } }
    );
  }

  if (userIds.length > 50) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INVALID_INPUT,
      "一次最多只能审核50个用户",
      { context: { userIds: userIds.length } }
    );
  }

  // 防止审核自己
  if (userIds.includes(adminId)) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INVALID_OPERATION,
      "不能在批量操作中包含自己的账号",
      { context: { userIds, adminId } }
    );
  }

  // 检查是否有重复的用户ID
  const uniqueUserIds = new Set(userIds);
  if (uniqueUserIds.size !== userIds.length) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INVALID_INPUT,
      "用户列表中包含重复的用户",
      { context: { userIds } }
    );
  }
}

/**
 * 审核操作频率限制
 */
const approvalRateLimit = new Map<string, { count: number; resetTime: number }>();

export function checkApprovalRateLimit(adminId: string, operation: string) {
  const now = Date.now();
  const key = `${adminId}:${operation}`;
  const limit = operation === "batch" ? 10 : 100; // 批量操作限制更严格
  const windowMs = 60 * 1000; // 1分钟窗口

  const current = approvalRateLimit.get(key);

  if (!current || now > current.resetTime) {
    // 重置计数器
    approvalRateLimit.set(key, { count: 1, resetTime: now + windowMs });
    return;
  }

  if (current.count >= limit) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.RATE_LIMIT_EXCEEDED,
      `${operation}操作过于频繁，请稍后再试`,
      { context: { adminId, operation, limit, windowMs } }
    );
  }

  current.count++;
}

/**
 * 验证审核原因
 */
export function validateApprovalReason(action: string, reason?: string) {
  if (action === "REJECT" && (!reason || reason.trim().length === 0)) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INVALID_INPUT,
      "拒绝用户时必须提供拒绝原因",
      { context: { action } }
    );
  }

  if (reason && reason.length > 500) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INVALID_INPUT,
      "审核原因不能超过500个字符",
      { context: { reason: reason.length } }
    );
  }

  // 检查是否包含敏感词汇（简化版本）
  if (reason) {
    const sensitiveWords = ["测试", "随便", "不知道"];
    const containsSensitive = sensitiveWords.some(word =>
      reason.toLowerCase().includes(word.toLowerCase())
    );

    if (containsSensitive) {
      console.warn(`审核原因包含可能不当的词汇: ${reason}`);
    }
  }
}

/**
 * 记录安全事件
 */
export async function logSecurityEvent(
  adminId: string,
  event: string,
  details: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    // 这里可以集成到审计日志系统
    console.log(`安全事件: ${event}`, {
      adminId,
      details,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    // TODO: 集成到数据库审计日志
    // await prisma.auditLog.create({
    //   data: {
    //     userId: adminId,
    //     action: event,
    //     level: "SECURITY",
    //     message: `审核安全事件: ${event}`,
    //     details: JSON.stringify(details),
    //     ipAddress,
    //     userAgent,
    //   },
    // });
  } catch (error) {
    console.error("记录安全事件失败:", error);
  }
}

/**
 * 检查可疑的审核模式
 */
export function detectSuspiciousApprovalPattern(
  adminId: string,
  recentActions: Array<{ action: string; timestamp: Date; userId: string }>
) {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // 过滤最近一小时的操作
  const recentOperations = recentActions.filter(
    action => action.timestamp >= oneHourAgo
  );

  // 检查是否有大量拒绝操作
  const rejections = recentOperations.filter(op => op.action === "REJECT");
  if (rejections.length > 20) {
    logSecurityEvent(adminId, "SUSPICIOUS_MASS_REJECTION", {
      rejectionCount: rejections.length,
      timeWindow: "1hour",
    });
  }

  // 检查是否有大量批准操作
  const approvals = recentOperations.filter(op => op.action === "APPROVE");
  if (approvals.length > 50) {
    logSecurityEvent(adminId, "SUSPICIOUS_MASS_APPROVAL", {
      approvalCount: approvals.length,
      timeWindow: "1hour",
    });
  }

  // 检查是否有快速连续操作
  const sortedOps = recentOperations.sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  let rapidOperations = 0;
  for (let i = 1; i < sortedOps.length; i++) {
    const timeDiff = sortedOps[i].timestamp.getTime() - sortedOps[i - 1].timestamp.getTime();
    if (timeDiff < 2000) { // 2秒内的操作
      rapidOperations++;
    }
  }

  if (rapidOperations > 10) {
    logSecurityEvent(adminId, "SUSPICIOUS_RAPID_OPERATIONS", {
      rapidOperationCount: rapidOperations,
      timeWindow: "1hour",
    });
  }
}

/**
 * 验证IP地址白名单（可选功能）
 */
export function validateAdminIPAccess(ipAddress: string, adminId: string) {
  // 这里可以实现IP白名单验证
  // 例如只允许特定IP地址进行审核操作

  // 示例：检查是否为内网IP
  const isPrivateIP = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(ipAddress);

  if (!isPrivateIP && process.env.NODE_ENV === "production") {
    // 在生产环境中，可以要求管理员操作只能来自内网
    console.warn(`管理员 ${adminId} 从外网IP ${ipAddress} 进行审核操作`);
  }
}

/**
 * 生成审核操作摘要
 */
export function generateApprovalSummary(
  action: string,
  userCount: number,
  reason?: string
) {
  const actionText = action === "APPROVE" ? "批准" : "拒绝";
  let summary = `${actionText}了 ${userCount} 个用户`;

  if (reason) {
    summary += `，原因: ${reason.substring(0, 50)}${reason.length > 50 ? "..." : ""}`;
  }

  return summary;
}
