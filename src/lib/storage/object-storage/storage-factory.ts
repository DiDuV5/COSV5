/**
 * @fileoverview 存储服务工厂 - 重构后的模块化版本
 * @description 根据环境配置创建和管理存储服务实例，完全依赖环境变量
 * @author Augment AI
 * @date 2025-07-15
 * @version 3.0.0 (模块化重构版)
 * @deprecated 请使用 ./storage-factory/index.ts 中的新模块化版本
 */

// 重新导出新的模块化版本以保持向后兼容性

export {
  // 主要类
  StorageFactory,
  EnvironmentValidator,
  ConfigurationBuilder,
  URLGenerator,

  // 便捷函数
  createStorageService,
  getDefaultManager,
  resetDefaultManager,
  createDefaultConfig,
  createPrimaryStorageConfig,
  createFallbackStorageConfig,
  createCloudflareR2Config,
  createLocalStorageConfig,
  validateStorageConfig,
  validateCloudflareR2Config,
  validateLocalStorageConfig,
  getConfigSummary,
  validateManagerConfig,
  createTestConfig,
  getConfigStatus,
  createConfigForEnvironment,
  generateCDNUrl,
  generatePublicUrl,
  generateCustomDomainUrl,
  getBestAccessUrl,
  encodeFilename,
  checkEnvironmentConfig,
  createDevelopmentConfig,
  createProductionConfig,
  validateConfiguration,
  mergeConfigs,
  compareConfigs,
  generateConfigReport,
  generateMultipleUrls,
  generateThumbnailUrl,
  isCDNUrl,
  extractKeyFromUrl,
  getEnvironmentStatus,

  // 兼容性导出
  getDefaultStorageManager,
  checkStorageConfig,

  // 类型和常量
  type EnvironmentValidationResult,
  type ConfigValidationResult,
  type ConfigStatus,
  type URLGenerationOptions,
  type RequiredEnvVar,
  type OptionalEnvVar,
  REQUIRED_ENV_VARS,
  OPTIONAL_ENV_VARS,
} from './storage-factory/index';
