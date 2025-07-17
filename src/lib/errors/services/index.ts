/**
 * @fileoverview 错误恢复服务工厂
 * @description 统一导出错误恢复相关的服务实例
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import { RetryStrategyService } from './retry-strategy-service';
import { NetworkRecoveryService } from './network-recovery-service';
import { ResumeUploadService } from './resume-upload-service';

/**
 * 创建重试策略服务实例
 */
export const retryStrategyService = () => RetryStrategyService;

/**
 * 创建网络恢复服务实例
 */
export const networkRecoveryService = () => new NetworkRecoveryService();

/**
 * 创建断点续传服务实例
 */
export const resumeUploadService = () => new ResumeUploadService();

/**
 * 导出所有服务类型
 */
export type {
  RetryConfig,
  RetryResult,
} from './retry-strategy-service';

export type {
  NetworkStatus,
  NetworkCheckResult,
} from './network-recovery-service';

export type {
  UploadSession,
  ResumeResult,
  FallbackStrategy,
} from './resume-upload-service';
