/**
 * @fileoverview 存储工厂模块统一导出
 * @description 重构后的存储工厂模块的统一入口
 * @author Augment AI
 * @date 2025-07-15
 * @version 3.0.0
 */

// 主要类导出
export { StorageFactory } from './StorageFactory';
export { EnvironmentValidator } from './EnvironmentValidator';
export { ConfigurationBuilder } from './ConfigurationBuilder';
export { URLGenerator } from './URLGenerator';

// 导入用于内部使用
import { StorageFactory } from './StorageFactory';

// 类型导出
export type {
  EnvironmentValidationResult,
  ConfigValidationResult,
  ConfigStatus,
  URLGenerationOptions,
  RequiredEnvVar,
  OptionalEnvVar,
} from './types';

export {
  REQUIRED_ENV_VARS,
  OPTIONAL_ENV_VARS,
} from './types';

// 创建默认实例
const defaultStorageFactory = new StorageFactory();

// 便捷函数导出（保持向后兼容性）
export const createStorageService = (config?: any) =>
  StorageFactory.createStorageService(config);

export const getDefaultManager = () =>
  StorageFactory.getDefaultManager();

export const resetDefaultManager = () =>
  StorageFactory.resetDefaultManager();

export const createDefaultConfig = () =>
  StorageFactory.createDefaultConfig();

export const createPrimaryStorageConfig = () =>
  StorageFactory.createPrimaryStorageConfig();

export const createFallbackStorageConfig = () =>
  StorageFactory.createFallbackStorageConfig();

export const createCloudflareR2Config = () =>
  StorageFactory.createCloudflareR2Config();

export const createLocalStorageConfig = () =>
  StorageFactory.createLocalStorageConfig();

export const validateStorageConfig = (config: any) =>
  StorageFactory.validateStorageConfig(config);

export const validateCloudflareR2Config = (config: any) =>
  StorageFactory.validateCloudflareR2Config(config);

export const validateLocalStorageConfig = (config: any) =>
  StorageFactory.validateLocalStorageConfig(config);

export const getConfigSummary = (config: any) =>
  StorageFactory.getConfigSummary(config);

export const validateManagerConfig = (config: any) =>
  StorageFactory.validateManagerConfig(config);

export const createTestConfig = () =>
  StorageFactory.createTestConfig();

export const getConfigStatus = () =>
  StorageFactory.getConfigStatus();

export const createConfigForEnvironment = (environment?: string) =>
  StorageFactory.createConfigForEnvironment(environment);

export const generateCDNUrl = (key: string) =>
  StorageFactory.generateCDNUrl(key);

export const generatePublicUrl = (key: string) =>
  StorageFactory.generatePublicUrl(key);

export const generateCustomDomainUrl = (key: string) =>
  StorageFactory.generateCustomDomainUrl(key);

export const getBestAccessUrl = (key: string) =>
  StorageFactory.getBestAccessUrl(key);

export const encodeFilename = (filename: string) =>
  StorageFactory.encodeFilename(filename);

export const checkEnvironmentConfig = () =>
  StorageFactory.checkEnvironmentConfig();

export const createDevelopmentConfig = () =>
  StorageFactory.createDevelopmentConfig();

export const createProductionConfig = () =>
  StorageFactory.createProductionConfig();

export const validateConfiguration = (config: any) =>
  StorageFactory.validateConfiguration(config);

export const mergeConfigs = (base: any, override: any) =>
  StorageFactory.mergeConfigs(base, override);

export const compareConfigs = (config1: any, config2: any) =>
  StorageFactory.compareConfigs(config1, config2);

export const generateConfigReport = () =>
  StorageFactory.generateConfigReport();

export const generateMultipleUrls = (keys: string[]) =>
  StorageFactory.generateMultipleUrls(keys);

export const generateThumbnailUrl = (key: string, size?: string) =>
  StorageFactory.generateThumbnailUrl(key, size);

export const isCDNUrl = (url: string) =>
  StorageFactory.isCDNUrl(url);

export const extractKeyFromUrl = (url: string) =>
  StorageFactory.extractKeyFromUrl(url);

export const getEnvironmentStatus = () =>
  StorageFactory.getEnvironmentStatus();

// 兼容性导出
export const getDefaultStorageManager = () =>
  StorageFactory.getDefaultManager();

export const checkStorageConfig = (config?: any) =>
  StorageFactory.validateManagerConfig(config || StorageFactory.createDefaultConfig());

// 默认导出主工厂类
export { StorageFactory as default } from './StorageFactory';
