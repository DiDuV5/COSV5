/**
 * @fileoverview 上传配置管理器导出文件
 * @description 为了保持向后兼容性，重新导出核心模块
 * @author Augment AI
 * @date 2025-07-05
 */

// 重新导出核心上传配置管理器
export { UploadConfigManager } from './core/upload-config-manager';

// 重新导出相关类型
export type {
  UnifiedUploadConfig,
  UserLevelConfig,
  ConfigValidationResult,
  ConfigHealthCheck,
  ConfigLoadOptions,
  UserConfigQueryOptions
} from './types/upload-config-types';

// 导入类以创建实例
import { UploadConfigManager } from './core/upload-config-manager';

// 创建默认实例导出
export const uploadConfigManager = UploadConfigManager.getInstance();
