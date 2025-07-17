/**
 * @fileoverview 上传配置管理器模块统一导出
 * @description 重构后的模块化上传配置管理系统入口
 * @author Augment AI
 * @date 2025-07-06
 * @version 4.0.0 (重构版本)
 */

// 导出核心类
export { ConfigManager } from './core/ConfigManager';
export { CacheManager } from './core/CacheManager';

// 导出服务类
export { ConfigService } from './services/ConfigService';
export { UserService } from './services/UserService';

// 导出适配器
export { CompatibilityAdapter } from './adapters/CompatibilityAdapter';

// 导出工具函数
export { ConfigUtils } from './utils/ConfigUtils';

// 导出主管理器类
export { UploadConfigManager, uploadConfigManager } from './UploadConfigManager';

// 重新导出类型以保持向后兼容
export type {
  UnifiedUploadConfig,
  UserLevelConfig,
  ConfigValidationResult,
  ConfigHealthCheck,
  ConfigLoadOptions,
  UserConfigQueryOptions,
  Environment,
  UploadStrategy
} from '../types/upload-config-types';

// 默认导出主管理器类
export { UploadConfigManager as default } from './UploadConfigManager';
