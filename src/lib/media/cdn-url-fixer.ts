/**
 * @fileoverview CDN URL修复工具 - 重构后的模块化版本
 * @description 修复和优化媒体文件的CDN URL，支持环境变量配置和动态切换
 * @author Augment AI
 * @date 2025-07-15
 * @version 3.0.0
 * @since 1.0.0
 * @deprecated 请使用 ./cdn-url-fixer/index.ts 中的新模块化版本
 *
 * @example
 * import { fixMediaUrl, getCDNConfig } from './cdn-url-fixer'
 * const fixedUrl = fixMediaUrl(originalUrl)
 *
 * @dependencies
 * - ./cdn-url-fixer/index: 新的模块化CDN修复器
 *
 * @changelog
 * - 2025-07-15: 重构为模块化版本，拆分为多个专门的类
 * - 2025-06-15: 重构为环境适配版本，支持动态配置和安全验证
 * - 2025-06-14: 修复SSL连接问题
 * - 2024-01-XX: 初始版本创建
 */

// 重新导出新的模块化版本以保持向后兼容性

export {
  // 主要类
  CDNUrlFixer,
  URLValidator,
  URLPatternMatcher,
  URLTransformer,

  // 便捷函数
  fixMediaUrl,
  fixMediaUrls,
  fixMediaObject,
  fixMediaObjects,
  needsUrlFix,
  getBestMediaUrl,
  getBestVideoThumbnailUrl,
  checkCdnConnectivity,
  diagnoseMediaUrl,
  generateSafeFilename,
  getCDNConfig,

  // React Hooks
  useFixedMediaUrl,
  useBestMediaUrl,
  useVideoThumbnailUrl,
  useOriginalMediaUrl,

  // 验证函数
  validateMediaUrl,

  // 兼容性导出
  CDN_CONFIG,

  // 类型
  type CDNConfig,
  type MediaObject,
  type URLValidationResult,
  type CDNConnectivityResult,
  type URLDiagnosisResult,
  type URLTransformOptions,
  type SecurityValidationOptions,
  type URLProcessingContext,
} from './cdn-url-fixer/index';
