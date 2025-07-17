/**
 * @fileoverview WebP转换配置
 * @description 统一管理WebP格式转换相关的配置参数
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

/**
 * WebP转换配置接口
 */
export interface WebPConversionConfig {
  /** 是否启用WebP转换 */
  enabled: boolean;
  /** 有损压缩质量 (1-100) */
  lossyQuality: number;
  /** 大文件有损压缩质量 */
  largeLossyQuality: number;
  /** 无损压缩质量 (0-100) */
  losslessQuality: number;
  /** 压缩努力程度 (0-6) */
  effort: number;
  /** 文件大小阈值，超过此大小使用更激进压缩 */
  largeSizeThreshold: number;
  /** 是否保留原始文件（调试用） */
  keepOriginal: boolean;
  /** 是否转换动图 */
  convertAnimated: boolean;
  /** 动图质量 */
  animatedQuality: number;
  /** 支持的输入格式 */
  supportedInputFormats: string[];
  /** 是否异步处理 */
  asyncProcessing: boolean;
  /** 异步处理延迟（毫秒） */
  asyncDelay: number;
}

/**
 * 默认WebP转换配置
 */
export const DEFAULT_WEBP_CONFIG: WebPConversionConfig = {
  enabled: true,
  lossyQuality: 85,
  largeLossyQuality: 80, // 大文件使用更激进的压缩
  losslessQuality: 100,
  effort: 6, // 最高压缩努力程度
  largeSizeThreshold: 2 * 1024 * 1024, // 2MB
  keepOriginal: false, // 生产环境删除原文件
  convertAnimated: true,
  animatedQuality: 80,
  supportedInputFormats: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/bmp',
    'image/tiff'
  ],
  asyncProcessing: true,
  asyncDelay: 1000, // 1秒延迟，避免阻塞用户体验
};

/**
 * WebP转换策略枚举
 */
export enum WebPConversionStrategy {
  /** 有损压缩 */
  LOSSY = 'lossy',
  /** 无损压缩 */
  LOSSLESS = 'lossless',
  /** 动画转换 */
  ANIMATED = 'animated',
  /** 跳过转换 */
  SKIP = 'skip'
}

/**
 * WebP转换结果接口
 */
export interface WebPConversionResult {
  success: boolean;
  strategy: WebPConversionStrategy;
  originalSize: number;
  webpSize: number;
  compressionRatio: number;
  originalUrl: string;
  webpUrl: string;
  processingTime: number;
  error?: string;
}

/**
 * 根据文件信息确定WebP转换策略
 */
export function determineWebPStrategy(
  mimeType: string,
  fileSize: number,
  hasTransparency: boolean = false,
  isAnimated: boolean = false,
  config: WebPConversionConfig = DEFAULT_WEBP_CONFIG
): WebPConversionStrategy {
  // 检查是否启用转换
  if (!config.enabled) {
    return WebPConversionStrategy.SKIP;
  }

  // 检查是否支持的格式
  if (!config.supportedInputFormats.includes(mimeType)) {
    return WebPConversionStrategy.SKIP;
  }

  // 已经是WebP格式，跳过
  if (mimeType === 'image/webp') {
    return WebPConversionStrategy.SKIP;
  }

  // 动图处理
  if (isAnimated && config.convertAnimated) {
    return WebPConversionStrategy.ANIMATED;
  }

  // PNG透明图片使用无损压缩
  if (mimeType === 'image/png' && hasTransparency) {
    return WebPConversionStrategy.LOSSLESS;
  }

  // 其他格式使用有损压缩
  return WebPConversionStrategy.LOSSY;
}

/**
 * 获取WebP转换参数
 */
export function getWebPConversionParams(
  strategy: WebPConversionStrategy,
  fileSize: number,
  config: WebPConversionConfig = DEFAULT_WEBP_CONFIG
): any {
  const isLargeFile = fileSize > config.largeSizeThreshold;

  switch (strategy) {
    case WebPConversionStrategy.LOSSY:
      return {
        quality: isLargeFile ? config.largeLossyQuality : config.lossyQuality,
        effort: config.effort,
        lossless: false,
      };

    case WebPConversionStrategy.LOSSLESS:
      return {
        quality: config.losslessQuality,
        effort: config.effort,
        lossless: true,
      };

    case WebPConversionStrategy.ANIMATED:
      return {
        quality: config.animatedQuality,
        effort: config.effort,
        lossless: false,
      };

    default:
      return null;
  }
}

/**
 * 格式化WebP转换日志
 */
export function formatWebPConversionLog(result: WebPConversionResult): string {
  const originalSizeMB = (result.originalSize / 1024 / 1024).toFixed(2);
  const webpSizeMB = (result.webpSize / 1024 / 1024).toFixed(2);
  const ratio = result.compressionRatio.toFixed(1);
  const time = result.processingTime.toFixed(0);

  return `WebP转换完成 [${result.strategy}]: ${originalSizeMB}MB → ${webpSizeMB}MB (压缩${ratio}%, 耗时${time}ms)`;
}

/**
 * 检查浏览器WebP支持
 */
export function checkWebPSupport(): boolean {
  // 服务端总是返回true，因为我们目标浏览器支持率97%
  if (typeof window === 'undefined') {
    return true;
  }

  // 客户端检查
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

/**
 * 生成WebP文件名
 */
export function generateWebPFilename(originalFilename: string): string {
  const nameWithoutExt = originalFilename.replace(/\.[^/.]+$/, '');
  return `${nameWithoutExt}.webp`;
}

/**
 * 计算预期压缩比例
 */
export function estimateWebPCompression(mimeType: string, strategy: WebPConversionStrategy): number {
  switch (strategy) {
    case WebPConversionStrategy.LOSSY:
      if (mimeType === 'image/jpeg') return 0.25; // JPEG → WebP: 25%减少
      if (mimeType === 'image/png') return 0.40; // PNG → WebP: 40%减少
      return 0.30; // 其他格式: 30%减少

    case WebPConversionStrategy.LOSSLESS:
      return 0.20; // 无损: 20%减少

    case WebPConversionStrategy.ANIMATED:
      return 0.35; // 动图: 35%减少

    default:
      return 0;
  }
}
