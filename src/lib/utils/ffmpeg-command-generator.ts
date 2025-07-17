/**
 * @fileoverview FFmpeg命令生成器
 * @description 生成优化的FFmpeg转码命令
 * @author Augment AI
 * @date 2025-06-15
 * @version 1.0.0
 */

import { selectOptimalTranscodingConfig } from '../config/optimized-transcoding';

export interface TranscodingOptions {
  inputPath: string;
  outputPath: string;
  width: number;
  height: number;
  duration: number;
  originalSize: number;
  originalCodec?: string;
  targetQuality?: 'high' | 'standard' | 'compressed';
}

/**
 * 生成优化的FFmpeg转码命令
 */
export function generateOptimizedFFmpegCommand(options: TranscodingOptions): string {
  const config = selectOptimalTranscodingConfig(
    options.width,
    options.height,
    options.duration,
    options.originalSize,
    options.originalCodec
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
    
    // 像素格式和颜色空间
    '-pix_fmt', 'yuv420p',
    '-colorspace', 'bt709',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    
    // 音频编码参数
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
    '-ac', '2',
    
    // 输出选项
    '-movflags', '+faststart',  // 优化网络播放
    '-avoid_negative_ts', 'make_zero',
    '-y',  // 覆盖输出文件
    
    `"${options.outputPath}"`
  ];
  
  return commands.join(' ');
}

/**
 * 生成两遍编码命令（用于更好的压缩效果）
 */
export function generateTwoPassFFmpegCommands(options: TranscodingOptions): string[] {
  const config = selectOptimalTranscodingConfig(
    options.width,
    options.height,
    options.duration,
    options.originalSize,
    options.originalCodec
  );
  
  const baseParams = [
    '-c:v', 'libx264',
    '-preset', config.preset,
    '-profile:v', config.profile,
    '-level:v', config.level,
    '-b:v', `${config.maxBitrate}k`,
    '-maxrate', `${config.maxBitrate}k`,
    '-bufsize', `${config.maxBitrate * 2}k`,
    '-pix_fmt', 'yuv420p',
    '-colorspace', 'bt709',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709'
  ];
  
  // 第一遍（分析）
  const firstPass = [
    'ffmpeg',
    '-i', `"${options.inputPath}"`,
    ...baseParams,
    '-pass', '1',
    '-an',  // 跳过音频
    '-f', 'null',
    '/dev/null'
  ].join(' ');
  
  // 第二遍（编码）
  const secondPass = [
    'ffmpeg',
    '-i', `"${options.inputPath}"`,
    ...baseParams,
    '-pass', '2',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
    '-ac', '2',
    '-movflags', '+faststart',
    '-avoid_negative_ts', 'make_zero',
    '-y',
    `"${options.outputPath}"`
  ].join(' ');
  
  return [firstPass, secondPass];
}

/**
 * 估算转码后文件大小
 */
export function estimateOutputFileSize(
  duration: number,
  videoBitrate: number,
  audioBitrate: number = 128
): number {
  // 文件大小 = (视频比特率 + 音频比特率) * 时长 / 8
  const totalBitrate = videoBitrate + audioBitrate; // kbps
  const fileSizeBytes = (totalBitrate * 1000 * duration) / 8;
  return Math.round(fileSizeBytes);
}

export default {
  generateOptimizedFFmpegCommand,
  generateTwoPassFFmpegCommands,
  estimateOutputFileSize
};