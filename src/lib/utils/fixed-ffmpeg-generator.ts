/**
 * @fileoverview 修复的FFmpeg命令生成器
 * @description 解决缩放滤镜和H.264编码兼容性问题
 * @author Augment AI
 * @date 2025-06-15
 * @version 2.0.0
 */

import { selectOptimalTranscodingConfig } from '../config/optimized-transcoding';

export interface FixedTranscodingOptions {
  inputPath: string;
  outputPath: string;
  width: number;
  height: number;
  duration: number;
  originalSize: number;
  originalCodec?: string;
  targetQuality?: 'high' | 'standard' | 'compressed';
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * 计算符合H.264要求的偶数分辨率
 */
function calculateEvenResolution(width: number, height: number, maxWidth: number = 1920, maxHeight: number = 1080): { width: number; height: number } {
  // 首先计算缩放比例
  const scaleX = maxWidth / width;
  const scaleY = maxHeight / height;
  const scale = Math.min(scaleX, scaleY, 1); // 不放大，只缩小
  
  // 计算目标分辨率
  let targetWidth = Math.round(width * scale);
  let targetHeight = Math.round(height * scale);
  
  // 确保宽度和高度都是偶数（H.264要求）
  if (targetWidth % 2 !== 0) {
    targetWidth = targetWidth - 1; // 向下取偶数
  }
  if (targetHeight % 2 !== 0) {
    targetHeight = targetHeight - 1; // 向下取偶数
  }
  
  // 确保最小分辨率
  targetWidth = Math.max(targetWidth, 2);
  targetHeight = Math.max(targetHeight, 2);
  
  return { width: targetWidth, height: targetHeight };
}

/**
 * 生成正确的视频缩放滤镜
 */
function generateVideoScaleFilter(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number = 1920,
  maxHeight: number = 1080
): string {
  const { width: targetWidth, height: targetHeight } = calculateEvenResolution(
    originalWidth,
    originalHeight,
    maxWidth,
    maxHeight
  );
  
  // 如果不需要缩放，只确保偶数分辨率
  if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
    if (originalWidth % 2 === 0 && originalHeight % 2 === 0) {
      return 'format=yuv420p'; // 只需要像素格式转换
    } else {
      // 只需要确保偶数分辨率
      const evenWidth = originalWidth % 2 === 0 ? originalWidth : originalWidth - 1;
      const evenHeight = originalHeight % 2 === 0 ? originalHeight : originalHeight - 1;
      return `scale=${evenWidth}:${evenHeight},format=yuv420p`;
    }
  }
  
  // 需要缩放到指定分辨率
  return `scale=${targetWidth}:${targetHeight},format=yuv420p`;
}

/**
 * 检测竖屏视频并应用特殊处理
 */
function isPortraitVideo(width: number, height: number): boolean {
  return height > width;
}

/**
 * 生成修复的FFmpeg转码命令
 */
export function generateFixedFFmpegCommand(options: FixedTranscodingOptions): string {
  const config = selectOptimalTranscodingConfig(
    options.width,
    options.height,
    options.duration,
    options.originalSize,
    options.originalCodec
  );
  
  const maxWidth = options.maxWidth || 1920;
  const maxHeight = options.maxHeight || 1080;
  
  // 对于竖屏视频，调整最大分辨率限制
  const effectiveMaxWidth = maxWidth;
  let effectiveMaxHeight = maxHeight;
  
  if (isPortraitVideo(options.width, options.height)) {
    // 竖屏视频：允许更高的高度
    effectiveMaxHeight = Math.max(maxHeight, 1920); // 允许竖屏高度达到1920
    console.log(`📱 检测到竖屏视频: ${options.width}x${options.height}, 调整最大高度限制到${effectiveMaxHeight}`);
  }
  
  // 生成正确的缩放滤镜
  const scaleFilter = generateVideoScaleFilter(
    options.width,
    options.height,
    effectiveMaxWidth,
    effectiveMaxHeight
  );
  
  const commands: string[] = [
    'ffmpeg',
    '-i', `"${options.inputPath}"`,
    
    // 视频编码参数
    '-c:v', 'libx264',
    '-crf', config.crf.toString(),
    '-preset', config.preset,
    '-profile:v', config.profile,
    '-level:v', config.level,
    
    // 比特率控制
    '-maxrate', `${config.maxBitrate}k`,
    '-bufsize', `${config.maxBitrate * 2}k`,
    
    // 修复的视频滤镜
    '-vf', scaleFilter,
    
    // 颜色空间设置
    '-colorspace', 'bt709',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    
    // 音频编码参数
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
    '-ac', '2',
    
    // 输出优化
    '-movflags', '+faststart',
    '-avoid_negative_ts', 'make_zero',
    '-fflags', '+genpts',
    '-y',
    
    `"${options.outputPath}"`
  ];
  
  return commands.join(' ');
}

/**
 * 生成带错误恢复的转码命令
 */
export function generateRobustFFmpegCommand(options: FixedTranscodingOptions): string[] {
  const commands: string[] = [];
  
  // 第一次尝试：使用优化参数
  commands.push(generateFixedFFmpegCommand(options));
  
  // 第二次尝试：使用更保守的参数（如果第一次失败）
  const conservativeOptions = { ...options };
  const conservativeConfig = {
    crf: 28, // 更高的CRF值
    preset: 'fast',
    profile: 'baseline', // 更兼容的profile
    level: '3.0',
    maxBitrate: 1000 // 更低的比特率
  };
  
  const conservativeScaleFilter = generateVideoScaleFilter(
    options.width,
    options.height,
    1280, // 更保守的最大宽度
    720   // 更保守的最大高度
  );
  
  const conservativeCommand = [
    'ffmpeg',
    '-i', `"${options.inputPath}"`,
    '-c:v', 'libx264',
    '-crf', conservativeConfig.crf.toString(),
    '-preset', conservativeConfig.preset,
    '-profile:v', conservativeConfig.profile,
    '-level:v', conservativeConfig.level,
    '-maxrate', `${conservativeConfig.maxBitrate}k`,
    '-bufsize', `${conservativeConfig.maxBitrate * 2}k`,
    '-vf', conservativeScaleFilter,
    '-c:a', 'aac',
    '-b:a', '96k', // 更低的音频比特率
    '-ar', '44100',
    '-ac', '2',
    '-movflags', '+faststart',
    '-avoid_negative_ts', 'make_zero',
    '-y',
    `"${options.outputPath}"`
  ].join(' ');
  
  commands.push(conservativeCommand);
  
  return commands;
}

/**
 * 测试分辨率计算函数
 */
export function testResolutionCalculation(): void {
  const testCases = [
    { input: [1080, 1692], expected: [688, 1080] }, // 竖屏视频
    { input: [1920, 1080], expected: [1920, 1080] }, // 标准1080p
    { input: [689, 1080], expected: [688, 1080] }, // 奇数宽度
    { input: [1080, 689], expected: [1080, 688] }, // 奇数高度
    { input: [3840, 2160], expected: [1920, 1080] }, // 4K缩放
    { input: [1281, 721], expected: [1280, 720] }   // 奇数分辨率
  ];
  
  console.log('🧪 测试分辨率计算函数:');
  testCases.forEach(({ input, expected }, index) => {
    const result = calculateEvenResolution(input[0], input[1]);
    const passed = result.width === expected[0] && result.height === expected[1];
    console.log(`  测试 ${index + 1}: ${input[0]}x${input[1]} → ${result.width}x${result.height} ${passed ? '✅' : '❌'}`);
    if (!passed) {
      console.log(`    预期: ${expected[0]}x${expected[1]}`);
    }
  });
}

export default {
  generateFixedFFmpegCommand,
  generateRobustFFmpegCommand,
  calculateEvenResolution,
  generateVideoScaleFilter,
  testResolutionCalculation
};