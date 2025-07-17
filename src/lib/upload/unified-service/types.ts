/**
 * @fileoverview 统一上传服务类型定义导出
 * @description 为了保持向后兼容性，重新导出类型定义
 * @author Augment AI
 * @date 2025-07-05
 */

// 重新导出核心类型
export type {
  UnifiedUploadRequest,
  UnifiedUploadResult,
  UploadProgress,
  UploadType
} from '../core/index';

// 重新导出策略相关类型
export type {
  UploadRequest,
  UploadResult
} from '../core/strategies/base-upload-strategy';

// 重新导出配置类型
export type {
  UnifiedUploadConfig,
  UserLevelConfig,
  ConfigValidationResult,
  ConfigHealthCheck,
  ConfigLoadOptions,
  UserConfigQueryOptions
} from '../types/upload-config-types';
