/**
 * @fileoverview 用户审核路由统一导出模块
 * @description 统一导出用户审核相关的路由和类型，保持向后兼容性
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 模块化重构版本
 */

import { createTRPCRouter } from "@/server/api/trpc";
import { approvalRoutes } from './routes/approval-routes';
import { configRoutes } from './routes/config-routes';
import { statsRoutes } from './routes/stats-routes';
import { enhancedRoutes } from './routes/enhanced-routes';

// ===== 主路由器 =====

/**
 * 用户审批路由器 - 模块化版本
 */
export const userApprovalRouter = createTRPCRouter({
  // 核心审批功能
  getPendingUsers: approvalRoutes.getPendingUsers,
  approveUser: approvalRoutes.approveUser,
  batchApproveUsers: approvalRoutes.batchApproveUsers,
  getApprovalLogs: approvalRoutes.getApprovalLogs,

  // 配置管理功能
  getApprovalConfig: configRoutes.getApprovalConfig,
  updateApprovalConfig: configRoutes.updateApprovalConfig,
  getEnhancedConfig: configRoutes.getEnhancedConfig,
  updateEnhancedConfig: configRoutes.updateEnhancedConfig,
  initializeMissingConfigs: configRoutes.initializeMissingConfigs,

  // 统计分析功能
  getApprovalStats: statsRoutes.getApprovalStats,
  getApprovalHistory: statsRoutes.getApprovalHistory,
  getApprovalStatisticsEnhanced: statsRoutes.getApprovalStatisticsEnhanced,

  // 增强功能
  getTimeoutUsers: enhancedRoutes.getTimeoutUsers,
  processTimeoutApprovals: enhancedRoutes.processTimeoutApprovals,
  getApprovalQueueStatus: enhancedRoutes.getApprovalQueueStatus,
  resendNotifications: enhancedRoutes.resendNotifications,
  exportApprovalReport: enhancedRoutes.exportApprovalReport,
});

// ===== 类型导出 =====

// 导出所有类型定义
export type * from './types';

// 导出模块化路由（可选，用于高级用法）
export {
  approvalRoutes,
  configRoutes,
  statsRoutes,
  enhancedRoutes,
};

// ===== 向后兼容性导出 =====

// 重新导出处理器函数以保持向后兼容
export {
  getPendingUsersList,
  processSingleUserApproval,
  processBatchUserApproval,
} from './approval-handler';

export {
  getApprovalStatistics,
  getApprovalLogsList,
} from './stats-handler';

export {
  getApprovalConfiguration,
  updateApprovalConfiguration,
} from './config-handler';

export {
  sendUserApprovalNotification,
  sendBatchUserApprovalNotifications,
} from './notification-handler';

// 导出工具函数
export * from './utils';

// 导出验证模式（明确重新导出以避免冲突）
export {
  getPendingUsersInputSchema,
  approveUserInputSchema,
  batchApproveUsersInputSchema,
  getApprovalLogsInputSchema,
  approvalStatsSchema,
  userApprovalInfoSchema,
  approvalLogSchema,
  approvalConfigSchema,
  updateApprovalConfigInputSchema,
  ApprovalStatusSchema,
  ApprovalActionSchema,
} from './schemas';

// 导出Schema类型（使用不同的名称以避免冲突）
export type {
  ApprovalStatusType,
  ApprovalActionType,
  GetPendingUsersInput,
  ApproveUserInput,
  BatchApproveUsersInput,
  GetApprovalLogsInput,
  UserApprovalInfo,
  ApprovalLog,
  UpdateApprovalConfigInput,
} from './schemas';

// 重命名导出以避免与types.ts中的冲突
export type {
  ApprovalStats as ApprovalStatsSchema,
  ApprovalConfig as ApprovalConfigSchema,
} from './schemas';

// ===== 默认导出 =====

export default userApprovalRouter;
