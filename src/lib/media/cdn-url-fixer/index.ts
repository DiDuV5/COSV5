/**
 * @fileoverview CDN URL修复器模块统一导出
 * @description 重构后的CDN URL修复器模块的统一入口
 * @author Augment AI
 * @date 2025-07-15
 * @version 2.0.0
 */

// 主要类导出
export { CDNUrlFixer } from './CDNUrlFixer';
export { URLValidator } from './URLValidator';
export { URLPatternMatcher } from './URLPatternMatcher';
export { URLTransformer } from './URLTransformer';

// 导入用于内部使用
import { URLValidator } from './URLValidator';
import { CDNUrlFixer } from './CDNUrlFixer';
import type { MediaObject, CDNConnectivityResult, URLDiagnosisResult } from './types';

// 类型导出
export type {
  CDNConfig,
  MediaObject,
  URLValidationResult,
  CDNConnectivityResult,
  URLDiagnosisResult,
  URLTransformOptions,
  SecurityValidationOptions,
  URLProcessingContext,
} from './types';

// 创建默认实例
const defaultCDNUrlFixer = new CDNUrlFixer(process.env.NODE_ENV === 'development');

// 便捷函数导出（保持向后兼容性）
export const fixMediaUrl = (url: string | null | undefined): string =>
  defaultCDNUrlFixer.fixMediaUrl(url);

export const fixMediaUrls = (urls: (string | null | undefined)[]): string[] =>
  defaultCDNUrlFixer.fixMediaUrls(urls);

export const fixMediaObject = <T extends Record<string, any>>(
  media: T,
  urlFields: (keyof T)[] = ['url', 'cdnUrl', 'thumbnailUrl']
): T => defaultCDNUrlFixer.fixMediaObject(media, urlFields);

export const fixMediaObjects = <T extends Record<string, any>>(
  mediaArray: T[],
  urlFields: (keyof T)[] = ['url', 'cdnUrl', 'thumbnailUrl']
): T[] => defaultCDNUrlFixer.fixMediaObjects(mediaArray, urlFields);

export const needsUrlFix = (url: string | null | undefined): boolean =>
  defaultCDNUrlFixer.needsUrlFix(url);

export const getBestMediaUrl = (media: MediaObject): string =>
  defaultCDNUrlFixer.getBestMediaUrl(media);

export const getBestVideoThumbnailUrl = (media: MediaObject): string =>
  defaultCDNUrlFixer.getBestVideoThumbnailUrl(media);

export const checkCdnConnectivity = (): Promise<CDNConnectivityResult> =>
  defaultCDNUrlFixer.checkCdnConnectivity();

export const diagnoseMediaUrl = (url: string): Promise<URLDiagnosisResult> =>
  defaultCDNUrlFixer.diagnoseMediaUrl(url);

export const generateSafeFilename = (originalName: string): string =>
  defaultCDNUrlFixer.generateSafeFilename(originalName);

export const getCDNConfig = () => defaultCDNUrlFixer.getCDNConfig();

// React Hooks（保持向后兼容性）
export const useFixedMediaUrl = (url: string | null | undefined): string =>
  fixMediaUrl(url);

export const useBestMediaUrl = (media: MediaObject): string => {
  console.log('🎯 useBestMediaUrl 被调用:', media);
  const result = getBestMediaUrl(media);
  console.log('🎯 useBestMediaUrl 返回结果:', result);
  return result;
};

export const useVideoThumbnailUrl = (media: MediaObject): string => {
  // 只有视频类型才返回缩略图
  if (media.mediaType === 'VIDEO') {
    return getBestVideoThumbnailUrl(media);
  }
  // 非视频类型返回原始URL
  return getBestMediaUrl(media);
};

export const useOriginalMediaUrl = (media: MediaObject): string => {
  // 无论什么类型都返回原始文件URL
  return getBestMediaUrl(media);
};

// 兼容性：保持原有的CDN_CONFIG导出
export const CDN_CONFIG = getCDNConfig();

// 验证函数导出
export const validateMediaUrl = (url: string) =>
  new URLValidator({ environment: 'development', enableDebugLog: false }).validateMediaUrl(url);

// 默认导出主修复器类
export { CDNUrlFixer as default } from './CDNUrlFixer';
