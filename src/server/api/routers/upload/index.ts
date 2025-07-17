/**
 * @fileoverview 统一上传路由导出
 * @description 合并所有上传子路由，保持API兼容性
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import { createTRPCRouter } from '../../trpc';

// 导入所有子路由
import { batchUploadRouter } from './batch';
import { coreUploadRouter } from './core';
import { emergencyRouter } from './emergency';
import { monitoringRouter } from './monitoring';

/**
 * 废弃警告辅助函数
 */
// function logDeprecationWarning(oldEndpoint: string, newEndpoint: string) {
//   console.warn(`⚠️ 端点 '${oldEndpoint}' 已废弃，请使用 '${newEndpoint}' 替代`);
// }

/**
 * 统一上传路由
 *
 * 将所有上传相关的功能模块合并为一个统一的路由器，
 * 保持与原有API的完全兼容性。
 *
 * 模块结构：
 * - core: 核心上传功能 (upload, optimizedUpload, streamUpload等)
 * - batch: 批量上传功能 (batchUpload, batchStatus等)
 * - monitoring: 系统监控和统计 (getSystemStatus, systemHealthCheck等)
 * - emergency: 紧急处理和恢复 (emergencyUpload, cleanup等)
 */
export const uploadRouter = createTRPCRouter({
  // ===== 核心上传功能 =====
  // 获取上传配置
  getUploadConfig: coreUploadRouter.getUploadConfig,

  // 获取优化上传配置（临时兼容性实现）
  getOptimizedUploadConfig: coreUploadRouter.getOptimizedUploadConfig,

  // 获取上传策略推荐
  getUploadStrategyRecommendation: coreUploadRouter.getUploadStrategyRecommendation,

  // 验证上传请求
  validateUploadRequest: coreUploadRouter.validateUploadRequest,

  // 获取统一用户配置（临时兼容性实现）
  getUserUploadConfig: coreUploadRouter.getUserUploadConfig,

  // 统一上传API - 唯一的上传入口
  upload: coreUploadRouter.upload,

  // 保持向后兼容的别名
  optimizedUpload: coreUploadRouter.optimizedUpload,

  // 流式上传API
  streamUploadInit: coreUploadRouter.streamUploadInit,
  streamUploadChunk: coreUploadRouter.streamUploadChunk,
  streamUploadProgress: coreUploadRouter.streamUploadProgress,
  streamUploadCancel: coreUploadRouter.streamUploadCancel,

  // 获取上传进度（用于分片上传）
  getUploadProgress: coreUploadRouter.getUploadProgress,

  // 创建上传会话
  createUploadSession: coreUploadRouter.createUploadSession,

  // 更新上传进度
  updateUploadProgress: coreUploadRouter.updateUploadProgress,

  // 取消上传会话
  cancelUpload: coreUploadRouter.cancelUpload,

  // ===== 批量上传功能 =====
  // 批量上传API
  batchUpload: batchUploadRouter.batchUpload,

  // 获取批量上传状态
  getBatchUploadStatus: batchUploadRouter.getBatchUploadStatus,

  // 取消批量上传
  cancelBatchUpload: batchUploadRouter.cancelBatchUpload,

  // 重试失败的批量上传项
  retryBatchUploadItems: batchUploadRouter.retryBatchUploadItems,

  // 获取用户上传统计
  getUserUploadStats: batchUploadRouter.getUserUploadStats,

  // 获取用户批量上传历史
  getUserBatchUploadHistory: batchUploadRouter.getUserBatchUploadHistory,

  // 批量上传配置获取
  getBatchUploadConfig: batchUploadRouter.getBatchUploadConfig,

  // 验证批量上传请求
  validateBatchUploadRequest: batchUploadRouter.validateBatchUploadRequest,

  // ===== 系统监控和统计 =====
  // 系统状态监控（管理员功能）
  getSystemStatus: monitoringRouter.getSystemStatus,

  // 获取详细进度信息
  getDetailedProgress: monitoringRouter.getDetailedProgress,

  // 系统健康检查（管理员功能）
  systemHealthCheck: monitoringRouter.systemHealthCheck,

  // 获取流式连接统计（管理员功能）
  getConnectionStats: monitoringRouter.getConnectionStats,

  // 平台健康状态（管理员功能）
  getPlatformHealth: monitoringRouter.getPlatformHealth,

  // 平台配置摘要（管理员功能）
  getPlatformConfigSummary: monitoringRouter.getPlatformConfigSummary,

  // 平台诊断（管理员功能）
  performPlatformDiagnostics: monitoringRouter.performPlatformDiagnostics,

  // 监控指标查询（管理员功能）
  getMonitoringMetrics: monitoringRouter.getMonitoringMetrics,

  // 性能指标查询（管理员功能）
  getPerformanceMetrics: monitoringRouter.getPerformanceMetrics,

  // 性能基准测试（管理员功能）
  runPerformanceBenchmark: monitoringRouter.runPerformanceBenchmark,

  // 获取系统资源使用情况
  getSystemResourceUsage: monitoringRouter.getSystemResourceUsage,

  // 获取上传统计信息
  getUploadStatistics: monitoringRouter.getUploadStatistics,

  // 获取错误日志
  getErrorLogs: monitoringRouter.getErrorLogs,

  // ===== 紧急处理和恢复 =====
  // 紧急上传API
  emergencyUpload: emergencyRouter.emergencyUpload,

  // 取消上传（增强版）
  cancelUploadEnhanced: emergencyRouter.cancelUploadEnhanced,

  // 系统清理操作（管理员功能）
  performSystemCleanup: emergencyRouter.performSystemCleanup,

  // 紧急清理操作（管理员功能）
  emergencyCleanup: emergencyRouter.emergencyCleanup,

  // 清理过期的上传会话（管理员功能）
  cleanupExpiredSessions: emergencyRouter.cleanupExpiredSessions,

  // 更新媒体文件顺序
  updateMediaOrder: emergencyRouter.updateMediaOrder,

  // 删除媒体文件
  deleteMedia: emergencyRouter.deleteMedia,

  // 综合优化分析（管理员功能）
  performComprehensiveAnalysis: emergencyRouter.performComprehensiveAnalysis,

  // 自动优化执行（管理员功能）
  performAutomaticOptimizations: emergencyRouter.performAutomaticOptimizations,

  // 优化报告生成（管理员功能）
  generateOptimizationReport: emergencyRouter.generateOptimizationReport,

  // 代码重构分析（管理员功能）
  analyzeCodeRefactoring: emergencyRouter.analyzeCodeRefactoring,

  // 测试覆盖分析（管理员功能）
  analyzeTestCoverage: emergencyRouter.analyzeTestCoverage,

  // 系统恢复操作（管理员功能）
  performSystemRecovery: emergencyRouter.performSystemRecovery,

  // 数据备份操作（管理员功能）
  performDataBackup: emergencyRouter.performDataBackup,
});

// 导出类型
export type UploadRouter = typeof uploadRouter;
