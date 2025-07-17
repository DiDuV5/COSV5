/**
 * @fileoverview 图片压缩配置
 * @description 统一管理图片压缩相关的配置参数
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

/**
 * 图片压缩配置接口
 */
export interface ImageCompressionConfig {
  /** 文件大小压缩阈值（字节） */
  compressionThreshold: number;
  /** 默认JPEG质量 */
  defaultJpegQuality: number;
  /** 大文件JPEG质量 */
  largeFileJpegQuality: number;
  /** PNG压缩级别 */
  pngCompressionLevel: number;
  /** 大文件PNG压缩级别 */
  largeFilePngCompressionLevel: number;
  /** WebP质量 */
  webpQuality: number;
  /** 大文件WebP质量 */
  largeFileWebpQuality: number;
  /** 最大图片尺寸 */
  maxWidth: number;
  maxHeight: number;
  /** 是否启用渐进式JPEG */
  enableProgressiveJpeg: boolean;
  /** 是否启用mozjpeg优化 */
  enableMozjpeg: boolean;
}

/**
 * 默认图片压缩配置
 */
export const DEFAULT_IMAGE_COMPRESSION_CONFIG: ImageCompressionConfig = {
  // 文件大小阈值：2MB
  compressionThreshold: 2 * 1024 * 1024,
  
  // JPEG质量设置
  defaultJpegQuality: 85,
  largeFileJpegQuality: 80, // 大文件使用更激进的压缩
  
  // PNG压缩设置
  pngCompressionLevel: 6,
  largeFilePngCompressionLevel: 9, // 大文件使用最高压缩
  
  // WebP质量设置
  webpQuality: 85,
  largeFileWebpQuality: 80,
  
  // 尺寸限制
  maxWidth: 2048,
  maxHeight: 2048,
  
  // 优化选项
  enableProgressiveJpeg: true,
  enableMozjpeg: true,
};

/**
 * 根据文件大小获取压缩配置
 */
export function getCompressionConfigForFileSize(
  fileSize: number,
  config: ImageCompressionConfig = DEFAULT_IMAGE_COMPRESSION_CONFIG
): {
  shouldCompress: boolean;
  jpegQuality: number;
  pngCompressionLevel: number;
  webpQuality: number;
} {
  const isLargeFile = fileSize > config.compressionThreshold;
  
  return {
    shouldCompress: isLargeFile,
    jpegQuality: isLargeFile ? config.largeFileJpegQuality : config.defaultJpegQuality,
    pngCompressionLevel: isLargeFile ? config.largeFilePngCompressionLevel : config.pngCompressionLevel,
    webpQuality: isLargeFile ? config.largeFileWebpQuality : config.webpQuality,
  };
}

/**
 * 格式化压缩比例
 */
export function formatCompressionRatio(originalSize: number, compressedSize: number): string {
  if (originalSize === 0) return '0%';
  const ratio = ((originalSize - compressedSize) / originalSize * 100);
  return `${ratio.toFixed(1)}%`;
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 检查是否需要压缩
 */
export function shouldCompressImage(
  fileSize: number,
  mimeType: string,
  config: ImageCompressionConfig = DEFAULT_IMAGE_COMPRESSION_CONFIG
): boolean {
  // 检查文件大小
  if (fileSize > config.compressionThreshold) {
    return true;
  }
  
  // 检查文件类型
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!supportedTypes.includes(mimeType)) {
    return false;
  }
  
  return false;
}

/**
 * 获取压缩日志信息
 */
export function getCompressionLogInfo(
  originalSize: number,
  compressedSize: number,
  mimeType: string,
  quality?: number
): string {
  const ratio = formatCompressionRatio(originalSize, compressedSize);
  const originalSizeStr = formatFileSize(originalSize);
  const compressedSizeStr = formatFileSize(compressedSize);
  
  let qualityInfo = '';
  if (quality !== undefined) {
    qualityInfo = `, 质量${quality}%`;
  }
  
  return `${mimeType} 压缩完成: ${originalSizeStr} → ${compressedSizeStr} (压缩${ratio}${qualityInfo})`;
}
