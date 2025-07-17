/**
 * @fileoverview 用户审核相关的Schema定义
 * @description 定义用户审核系统的输入输出类型和验证规则
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - zod: ^3.25.64
 *
 * @changelog
 * - 2025-06-22: 初始版本创建，用户审核Schema定义
 */

import { z } from "zod";

// 审核状态枚举 Schema
export const ApprovalStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);

// 审核动作枚举 Schema
export const ApprovalActionSchema = z.enum(["APPROVE", "REJECT", "PENDING", "RESUBMIT"]);

// 获取待审核用户列表的输入Schema
export const getPendingUsersInputSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  sortBy: z.enum(["createdAt", "username", "email"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(), // 搜索用户名或邮箱
});

// 审核用户的输入Schema
export const approveUserInputSchema = z.object({
  userId: z.string().min(1, "用户ID不能为空"),
  action: ApprovalActionSchema,
  reason: z.string().optional(),
  notifyUser: z.boolean().default(true), // 是否通知用户
});

// 批量审核用户的输入Schema
export const batchApproveUsersInputSchema = z.object({
  userIds: z.array(z.string()).min(1, "至少选择一个用户").max(50, "一次最多审核50个用户"),
  action: ApprovalActionSchema,
  reason: z.string().optional(),
  notifyUsers: z.boolean().default(true),
});

// 获取审核日志的输入Schema
export const getApprovalLogsInputSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  userId: z.string().optional(), // 筛选特定用户的日志
  adminId: z.string().optional(), // 筛选特定管理员的操作
  action: ApprovalActionSchema.optional(), // 筛选特定动作
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

// 获取审核统计的输出Schema
export const approvalStatsSchema = z.object({
  pendingCount: z.number(),
  approvedCount: z.number(),
  rejectedCount: z.number(),
  totalCount: z.number(),
  todayApprovals: z.number(),
  todayRejections: z.number(),
  averageProcessingTime: z.number(), // 平均处理时间（小时）
});

// 用户审核信息的输出Schema
export const userApprovalInfoSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  displayName: z.string().nullable(),
  userLevel: z.string(),
  approvalStatus: ApprovalStatusSchema,

  createdAt: z.date(),
  approvedAt: z.date().nullable(),
  approvedBy: z.string().nullable(),
  rejectedAt: z.date().nullable(),
  rejectedBy: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  // 关联信息
  approver: z.object({
    id: z.string(),
    username: z.string(),
    displayName: z.string().nullable(),
  }).nullable(),
  rejecter: z.object({
    id: z.string(),
    username: z.string(),
    displayName: z.string().nullable(),
  }).nullable(),
});

// 审核日志的输出Schema
export const approvalLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  adminId: z.string(),
  action: ApprovalActionSchema,
  previousStatus: ApprovalStatusSchema.nullable(),
  newStatus: ApprovalStatusSchema,
  reason: z.string().nullable(),
  metadata: z.record(z.any()),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.date(),
  // 关联信息
  user: z.object({
    id: z.string(),
    username: z.string(),
    displayName: z.string().nullable(),
  }),
  admin: z.object({
    id: z.string(),
    username: z.string(),
    displayName: z.string().nullable(),
  }),
});

// 审核配置的输出Schema
export const approvalConfigSchema = z.object({
  registrationApprovalEnabled: z.boolean(),
  notificationEnabled: z.boolean(),
  autoApproveAdmin: z.boolean(),
});

// 更新审核配置的输入Schema
export const updateApprovalConfigInputSchema = z.object({
  registrationApprovalEnabled: z.boolean().optional(),
  notificationEnabled: z.boolean().optional(),
  autoApproveAdmin: z.boolean().optional(),
});

// 导出类型
export type ApprovalStatusType = z.infer<typeof ApprovalStatusSchema>;
export type ApprovalActionType = z.infer<typeof ApprovalActionSchema>;
export type GetPendingUsersInput = z.infer<typeof getPendingUsersInputSchema>;
export type ApproveUserInput = z.infer<typeof approveUserInputSchema>;
export type BatchApproveUsersInput = z.infer<typeof batchApproveUsersInputSchema>;
export type GetApprovalLogsInput = z.infer<typeof getApprovalLogsInputSchema>;
export type ApprovalStats = z.infer<typeof approvalStatsSchema>;
export type UserApprovalInfo = z.infer<typeof userApprovalInfoSchema>;
export type ApprovalLog = z.infer<typeof approvalLogSchema>;
export type ApprovalConfig = z.infer<typeof approvalConfigSchema>;
export type UpdateApprovalConfigInput = z.infer<typeof updateApprovalConfigInputSchema>;
