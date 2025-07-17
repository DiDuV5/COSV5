/**
 * @fileoverview 错误处理服务工厂
 * @description 统一导出错误处理相关的服务实例
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import { ErrorClassificationService } from './error-classification-service';
import { ErrorRecoveryService } from './error-recovery-service';
import { ErrorLoggingService } from './error-logging-service';

/**
 * 创建错误分类服务实例
 */
export const errorClassificationService = () => ErrorClassificationService;

/**
 * 创建错误恢复服务实例
 */
export const errorRecoveryService = () => ErrorRecoveryService;

/**
 * 创建错误日志服务实例
 */
export const errorLoggingService = () => ErrorLoggingService;

/**
 * 导出所有服务类型和枚举
 */
export {
  ErrorType,
  ErrorSeverity,
} from './error-classification-service';

export type {
  RecoveryAction,
} from './error-recovery-service';

export type {
  StandardError,
  ErrorHandlerOptions,
} from './error-logging-service';
