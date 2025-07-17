/**
 * @fileoverview 兼容的FFmpeg命令生成器
 * @description 支持不同FFmpeg版本的兼容性命令生成
 * @author Augment AI
 * @date 2025-06-15
 * @version 1.0.0
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CompatibleTranscodingOptions {
  inputPath: string;
  outputPath: string;
  width: number;
  height: number;
  duration: number;
  originalSize: number;
  originalCodec?: string;
  maxWidth?: number;
  maxHeight?: number;
}

export interface FFmpegCapabilities {
  version: string;
  supportsForceDiv: boolean;
  supportsModernFilters: boolean;
}

let cachedCapabilities: FFmpegCapabilities | null = null;

/**
 * 检测FFmpeg能力（缓存结果）
 */
export async function detectFFmpegCapabilities(): Promise<FFmpegCapabilities> {
  if (cachedCapabilities) {
    return cachedCapabilities;
  }
  
  try {
    const { stdout } = await execAsync('ffmpeg -version');
    const versionMatch = stdout.match(/ffmpeg version (\d+\.\d+\.\d+)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';
    
    const [major, minor] = version.split('.').map(Number);
    const supportsForceDiv = major > 4 || (major === 4 && minor >= 4);
    const supportsModernFilters = major >= 4;
    
    cachedCapabilities = {
      version,
      supportsForceDiv,
      supportsModernFilters
    };
    
    return cachedCapabilities;
  } catch (error) {
    // 默认假设是旧版本
    cachedCapabilities = {
      version: '4.2.7',
      supportsForceDiv: false,
      supportsModernFilters: true
    };
    return cachedCapabilities;
  }
}

/**
 * 计算兼容的偶数分辨率
 */
function calculateCompatibleResolution(
  width: number, 
  height: number, 
  maxWidth: number = 1920, 
  maxHeight: number = 1080
): { width: number; height: number } {
  // 计算缩放比例
  const scaleX = maxWidth / width;
  const scaleY = maxHeight / height;
  const scale = Math.min(scaleX, scaleY, 1);
  
  // 计算目标分辨率
  let targetWidth = Math.round(width * scale);
  let targetHeight = Math.round(height * scale);
  
  // 确保偶数（向下取整）
  targetWidth = targetWidth - (targetWidth % 2);
  targetHeight = targetHeight - (targetHeight % 2);
  
  // 确保最小分辨率
  targetWidth = Math.max(targetWidth, 2);
  targetHeight = Math.max(targetHeight, 2);
  
  return { width: targetWidth, height: targetHeight };
}

/**
 * 生成兼容的缩放滤镜（适用于FFmpeg 4.2+）
 */
function generateCompatibleScaleFilter(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  capabilities: FFmpegCapabilities
): string {
  const { width: targetWidth, height: targetHeight } = calculateCompatibleResolution(
    originalWidth,
    originalHeight,
    maxWidth,
    maxHeight
  );
  
  if (capabilities.supportsForceDiv) {
    // 现代FFmpeg版本（4.4+）
    return `scale='min(${maxWidth},iw)':'min(${maxHeight},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,format=yuv420p`;
  } else {
    // 旧版FFmpeg（4.2-4.3）- 使用精确的分辨率
    if (originalWidth <= maxWidth && originalHeight <= maxHeight && 
        originalWidth % 2 === 0 && originalHeight % 2 === 0) {
      // 无需缩放，只需格式转换
      return 'format=yuv420p';
    } else {
      // 需要缩放到精确的偶数分辨率
      return `scale=${targetWidth}:${targetHeight},format=yuv420p`;
    }
  }
}

/**
 * 生成兼容的FFmpeg转码命令
 */
export async function generateCompatibleFFmpegCommand(options: CompatibleTranscodingOptions): Promise<string> {
  const capabilities = await detectFFmpegCapabilities();
  
  const maxWidth = options.maxWidth || 1920;
  const maxHeight = options.maxHeight || 1080;
  
  // 对竖屏视频调整限制
  const effectiveMaxWidth = maxWidth;
  let effectiveMaxHeight = maxHeight;
  
  if (options.height > options.width) {
    effectiveMaxHeight = Math.max(maxHeight, 1920);
    console.log(`📱 竖屏视频检测: ${options.width}x${options.height}, 调整最大高度到${effectiveMaxHeight}`);
  }
  
  // 生成兼容的缩放滤镜
  const scaleFilter = generateCompatibleScaleFilter(
    options.width,
    options.height,
    effectiveMaxWidth,
    effectiveMaxHeight,
    capabilities
  );
  
  // 基础转码参数（保守设置确保兼容性）
  const commands: string[] = [
    'ffmpeg',
    '-i', `"${options.inputPath}"`,
    
    // 视频编码参数
    '-c:v', 'libx264',
    '-crf', '26',
    '-preset', 'medium',
    '-profile:v', 'main',
    '-level:v', '3.1',
    
    // 比特率控制
    '-maxrate', '1800k',
    '-bufsize', '3600k',
    
    // 兼容的视频滤镜
    '-vf', scaleFilter,
    
    // 颜色空间
    '-colorspace', 'bt709',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    
    // 音频编码
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
    '-ac', '2',
    
    // 输出优化
    '-movflags', '+faststart',
    '-avoid_negative_ts', 'make_zero',
    '-y',
    
    `"${options.outputPath}"`
  ];
  
  const command = commands.join(' ');
  console.log(`🔧 生成兼容命令 (FFmpeg ${capabilities.version}): ${scaleFilter}`);
  
  return command;
}

export default {
  generateCompatibleFFmpegCommand,
  detectFFmpegCapabilities,
  calculateCompatibleResolution
};