/**
 * @fileoverview FFmpeg工具函数 - CoserEden平台
 * @description FFmpeg处理的通用工具函数和辅助方法
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { exec } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import type { 
  FFmpegCapabilities, 
  FFmpegCommandOptions, 
  TranscodeProgress,
  MemoryMonitorInfo 
} from './ffmpeg-types';

/**
 * 默认配置常量
 */
export const FFMPEG_DEFAULTS = {
  TIMEOUT: 300000, // 5分钟
  MAX_RETRIES: 3,
  TEMP_DIR: '/tmp/video-processing',
  THUMBNAIL_TIME: 10, // 10秒处提取缩略图
  THUMBNAIL_WIDTH: 320,
  THUMBNAIL_HEIGHT: 240,
  CRF_DEFAULT: 23,
  PRESET_DEFAULT: 'medium',
} as const;

/**
 * 支持的视频编解码器
 */
export const SUPPORTED_CODECS = {
  VIDEO: {
    INPUT: ['h264', 'h265', 'vp8', 'vp9', 'av1', 'mpeg4', 'mpeg2', 'wmv', 'flv'],
    OUTPUT: ['libx264', 'libx265', 'libvpx-vp9'],
    H264_VARIANTS: ['h264', 'avc', 'avc1'],
  },
  AUDIO: {
    INPUT: ['aac', 'mp3', 'ac3', 'dts', 'flac', 'vorbis', 'opus'],
    OUTPUT: ['aac', 'mp3', 'libvorbis', 'libopus'],
  },
} as const;

/**
 * 支持的视频格式
 */
export const SUPPORTED_FORMATS = {
  INPUT: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv', '3gp', 'ts', 'm4v'],
  OUTPUT: ['mp4', 'webm', 'avi', 'mov'],
} as const;

/**
 * 检查FFmpeg是否可用
 * 
 * @returns Promise<boolean> - FFmpeg是否可用
 */
export async function isFFmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    exec('ffmpeg -version', { timeout: 5000 }, (error, stdout) => {
      if (error) {
        console.error('❌ FFmpeg不可用:', error.message);
        resolve(false);
      } else {
        console.log('✅ FFmpeg可用:', stdout.split('\n')[0]);
        resolve(true);
      }
    });
  });
}

/**
 * 检查ffprobe是否可用
 * 
 * @returns Promise<boolean> - ffprobe是否可用
 */
export async function isFFprobeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    exec('ffprobe -version', { timeout: 5000 }, (error, stdout) => {
      if (error) {
        console.error('❌ FFprobe不可用:', error.message);
        resolve(false);
      } else {
        console.log('✅ FFprobe可用:', stdout.split('\n')[0]);
        resolve(true);
      }
    });
  });
}

/**
 * 检测FFmpeg能力
 * 
 * @returns Promise<FFmpegCapabilities> - FFmpeg能力信息
 */
export async function detectFFmpegCapabilities(): Promise<FFmpegCapabilities> {
  const capabilities: FFmpegCapabilities = {
    version: '',
    codecs: { video: [], audio: [] },
    formats: [],
    filters: [],
    hardwareAccel: [],
    isAvailable: false,
  };

  try {
    // 检查版本
    const versionOutput = await execCommand('ffmpeg -version');
    const versionMatch = versionOutput.match(/ffmpeg version ([^\s]+)/);
    if (versionMatch) {
      capabilities.version = versionMatch[1];
    }

    // 检查编解码器
    const codecsOutput = await execCommand('ffmpeg -codecs');
    capabilities.codecs.video = extractCodecs(codecsOutput, 'video');
    capabilities.codecs.audio = extractCodecs(codecsOutput, 'audio');

    // 检查格式
    const formatsOutput = await execCommand('ffmpeg -formats');
    capabilities.formats = extractFormats(formatsOutput);

    // 检查硬件加速
    const hwaccelsOutput = await execCommand('ffmpeg -hwaccels');
    capabilities.hardwareAccel = extractHardwareAccels(hwaccelsOutput);

    capabilities.isAvailable = true;
  } catch (error) {
    console.error('检测FFmpeg能力失败:', error);
  }

  return capabilities;
}

/**
 * 执行命令并返回输出
 */
async function execCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout + stderr);
      }
    });
  });
}

/**
 * 从FFmpeg输出中提取编解码器
 */
function extractCodecs(output: string, type: 'video' | 'audio'): string[] {
  const lines = output.split('\n');
  const codecs: string[] = [];
  
  for (const line of lines) {
    if (line.includes('DEV') && type === 'video') {
      const match = line.match(/\s+(\w+)\s+/);
      if (match) codecs.push(match[1]);
    } else if (line.includes('DEA') && type === 'audio') {
      const match = line.match(/\s+(\w+)\s+/);
      if (match) codecs.push(match[1]);
    }
  }
  
  return codecs;
}

/**
 * 从FFmpeg输出中提取格式
 */
function extractFormats(output: string): string[] {
  const lines = output.split('\n');
  const formats: string[] = [];
  
  for (const line of lines) {
    if (line.includes('DE ')) {
      const match = line.match(/DE\s+(\w+)/);
      if (match) formats.push(match[1]);
    }
  }
  
  return formats;
}

/**
 * 从FFmpeg输出中提取硬件加速
 */
function extractHardwareAccels(output: string): string[] {
  const lines = output.split('\n');
  const hwaccels: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.includes('Hardware acceleration methods:')) {
      hwaccels.push(trimmed);
    }
  }
  
  return hwaccels;
}

/**
 * 解析帧率字符串
 * 
 * @param fpsString - 帧率字符串（如 "30/1" 或 "29.97"）
 * @returns 帧率数值
 */
export function parseFPS(fpsString: string): number {
  if (!fpsString) return 0;

  if (fpsString.includes('/')) {
    const [numerator, denominator] = fpsString.split('/').map(Number);
    return denominator ? numerator / denominator : 0;
  }

  return parseFloat(fpsString) || 0;
}

/**
 * 解析FFmpeg命令字符串为参数数组
 * 
 * @param commandString - FFmpeg命令字符串
 * @returns 参数数组
 */
export function parseFFmpegCommand(commandString: string): string[] {
  // 移除 'ffmpeg' 前缀（如果存在）
  const cleanCommand = commandString.replace(/^ffmpeg\s+/, '');

  // 简单的参数解析，处理引号
  const args: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < cleanCommand.length; i++) {
    const char = cleanCommand[i];

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = '';
    } else if (char === ' ' && !inQuotes) {
      if (current.trim()) {
        args.push(current.trim());
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    args.push(current.trim());
  }

  console.log(`🔧 解析FFmpeg命令参数: ${args.length}个参数`);
  return args;
}

/**
 * 构建FFmpeg命令参数
 * 
 * @param options - 命令选项
 * @returns FFmpeg命令参数数组
 */
export function buildFFmpegCommand(options: FFmpegCommandOptions): string[] {
  const args: string[] = [];

  // 全局选项
  if (options.globalOptions?.overwrite !== false) {
    args.push('-y'); // 默认覆盖输出文件
  }

  if (options.globalOptions?.threads) {
    args.push('-threads', options.globalOptions.threads.toString());
  }

  // 输入文件
  args.push('-i', options.inputPath);

  // 视频选项
  if (options.videoOptions) {
    const { codec, preset, crf, profile, level, pixelFormat } = options.videoOptions;
    
    if (codec) {
      args.push('-c:v', codec);
    }
    
    if (preset) {
      args.push('-preset', preset);
    }
    
    if (crf !== undefined) {
      args.push('-crf', crf.toString());
    }
    
    if (profile) {
      args.push('-profile:v', profile);
    }
    
    if (level) {
      args.push('-level', level);
    }
    
    if (pixelFormat) {
      args.push('-pix_fmt', pixelFormat);
    }
  }

  // 音频选项
  if (options.audioOptions) {
    const { codec, bitrate, sampleRate, channels } = options.audioOptions;
    
    if (codec) {
      args.push('-c:a', codec);
    }
    
    if (bitrate) {
      args.push('-b:a', bitrate);
    }
    
    if (sampleRate) {
      args.push('-ar', sampleRate.toString());
    }
    
    if (channels) {
      args.push('-ac', channels.toString());
    }
  }

  // 滤镜选项
  if (options.filterOptions) {
    const filters: string[] = [];
    
    if (options.filterOptions.scale) {
      filters.push(`scale=${options.filterOptions.scale}`);
    }
    
    if (options.filterOptions.fps) {
      filters.push(`fps=${options.filterOptions.fps}`);
    }
    
    if (options.filterOptions.deinterlace) {
      filters.push('yadif');
    }
    
    if (filters.length > 0) {
      args.push('-vf', filters.join(','));
    }
  }

  // 输出文件
  args.push(options.outputPath);

  return args;
}

/**
 * 确保目录存在
 * 
 * @param dirPath - 目录路径
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error(`❌ 创建目录失败: ${dirPath}`, error);
    throw error;
  }
}

/**
 * 获取内存使用信息
 * 
 * @returns 内存监控信息
 */
export function getMemoryInfo(): MemoryMonitorInfo {
  const memoryUsage = process.memoryUsage();
  
  return {
    heapUsed: memoryUsage.heapUsed,
    heapTotal: memoryUsage.heapTotal,
    external: memoryUsage.external,
    rss: memoryUsage.rss,
    percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
    timestamp: Date.now(),
  };
}

/**
 * 检查内存压力
 * 
 * @param threshold - 内存使用阈值（百分比）
 * @returns 是否存在内存压力
 */
export function checkMemoryPressure(threshold: number = 85): boolean {
  const memoryInfo = getMemoryInfo();
  return memoryInfo.percentage > threshold;
}

/**
 * 强制垃圾回收
 */
export function forceGarbageCollection(): void {
  if (global.gc) {
    global.gc();
    console.log('🧹 强制垃圾回收完成');
  } else {
    console.warn('⚠️ 垃圾回收不可用，需要使用 --expose-gc 标志启动Node.js');
  }
}

/**
 * 生成唯一的会话ID
 * 
 * @returns 会话ID
 */
export function generateSessionId(): string {
  return `ffmpeg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 格式化文件大小
 * 
 * @param bytes - 字节数
 * @returns 格式化的文件大小字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化处理时间
 * 
 * @param milliseconds - 毫秒数
 * @returns 格式化的时间字符串
 */
export function formatProcessingTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
