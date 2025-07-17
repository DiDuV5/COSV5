/**
 * @fileoverview 视频编码工具函数
 * @description 视频编码验证相关的工具函数
 * @author Augment AI
 * @date 2025-07-03
 */

import { SupportedVideoFormat, CodecType } from '../types/video-codec-types';

/**
 * 解析帧率字符串
 */
export function parseFramerate(framerateStr: string): number {
  if (!framerateStr) return 0;

  try {
    // 处理分数格式 (如 "30/1", "25000/1001")
    if (framerateStr.includes('/')) {
      const [numerator, denominator] = framerateStr.split('/').map(Number);
      return denominator > 0 ? numerator / denominator : 0;
    }
    
    // 处理小数格式
    return parseFloat(framerateStr);
  } catch (error) {
    console.warn(`⚠️ 无法解析帧率: ${framerateStr}`, error);
    return 0;
  }
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  return filename.toLowerCase().split('.').pop() || '';
}

/**
 * 检查是否为支持的视频格式
 */
export function isSupportedVideoFormat(extension: string): boolean {
  const supportedFormats = Object.values(SupportedVideoFormat);
  return supportedFormats.includes(extension as SupportedVideoFormat);
}

/**
 * 根据扩展名推测编码类型
 */
export function guessCodecFromExtension(extension: string): CodecType {
  switch (extension.toLowerCase()) {
    case 'mp4':
    case 'mov':
      return CodecType.H264; // 最常见的编码
    case 'webm':
      return CodecType.VP8;
    case 'mkv':
      return CodecType.H264; // 通常是H.264
    case 'avi':
      return CodecType.UNKNOWN; // AVI可能包含各种编码
    default:
      return CodecType.UNKNOWN;
  }
}

/**
 * 标准化编码名称
 */
export function normalizeCodecName(codec: string): string {
  const normalized = codec.toLowerCase().trim();
  
  // H.264的各种别名
  if (normalized.includes('h264') || 
      normalized.includes('h.264') || 
      normalized.includes('avc') ||
      normalized.includes('libx264')) {
    return 'h264';
  }
  
  // H.265的各种别名
  if (normalized.includes('h265') || 
      normalized.includes('h.265') || 
      normalized.includes('hevc') ||
      normalized.includes('libx265')) {
    return 'h265';
  }
  
  // VP8/VP9
  if (normalized.includes('vp8')) return 'vp8';
  if (normalized.includes('vp9')) return 'vp9';
  
  // AV1
  if (normalized.includes('av1')) return 'av1';
  
  return normalized;
}

/**
 * 检查编码是否为H.264
 */
export function isH264Codec(codec: string): boolean {
  const normalized = normalizeCodecName(codec);
  return normalized === 'h264';
}

/**
 * 获取转换建议
 */
export function getConversionSuggestions(currentCodec: string): string[] {
  const suggestions = [
    '使用视频转换工具将文件转换为H.264编码的MP4格式',
    '推荐使用FFmpeg命令：ffmpeg -i input.video -c:v libx264 -preset medium -crf 23 output.mp4',
    '或使用在线转换工具如HandBrake、CloudConvert等',
  ];

  // 根据当前编码提供特定建议
  const normalizedCodec = normalizeCodecName(currentCodec);
  switch (normalizedCodec) {
    case 'h265':
      suggestions.push('H.265编码虽然质量更好，但兼容性不如H.264，建议转换为H.264');
      break;
    case 'vp8':
    case 'vp9':
      suggestions.push('WebM格式主要用于网页，建议转换为MP4格式以获得更好的兼容性');
      break;
    case 'av1':
      suggestions.push('AV1是新兴编码格式，目前兼容性有限，建议转换为H.264');
      break;
  }

  return suggestions;
}

/**
 * 获取通用建议
 */
export function getGeneralSuggestions(): string[] {
  return [
    '请确保上传的是有效的视频文件',
    '推荐使用H.264编码的MP4格式以获得最佳兼容性',
    '如果文件损坏，请重新录制或重新导出视频',
    '联系技术支持获取更多帮助',
  ];
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化时长
 */
export function formatDuration(seconds: number): string {
  if (seconds === 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * 检查视频分辨率是否合理
 */
export function isValidResolution(width: number, height: number): boolean {
  // 检查基本有效性
  if (width <= 0 || height <= 0) return false;
  
  // 检查是否过小（可能是错误检测）
  if (width < 64 || height < 64) return false;
  
  // 检查是否过大（超过8K）
  if (width > 7680 || height > 4320) return false;
  
  return true;
}

/**
 * 检查比特率是否合理
 */
export function isValidBitrate(bitrate: number): boolean {
  // 检查基本有效性
  if (bitrate <= 0) return false;
  
  // 检查是否过低（可能是音频比特率）
  if (bitrate < 100000) return false; // 100 kbps
  
  // 检查是否过高（超过100 Mbps）
  if (bitrate > 100000000) return false;
  
  return true;
}

/**
 * 检查帧率是否合理
 */
export function isValidFramerate(framerate: number): boolean {
  // 检查基本有效性
  if (framerate <= 0) return false;
  
  // 检查是否在合理范围内（1-120 fps）
  return framerate >= 1 && framerate <= 120;
}
