/**
 * @fileoverview 改进的转码错误处理器
 * @description 处理转码失败，避免上传无用文件
 * @author Augment AI
 * @date 2025-06-15
 * @version 1.0.0
 */

export interface TranscodingError {
  type: 'ffmpeg_error' | 'format_unsupported' | 'file_corrupted' | 'timeout' | 'unknown';
  message: string;
  originalError?: Error;
  suggestions: string[];
}

export interface TranscodingResult {
  success: boolean;
  outputPath?: string;
  error?: TranscodingError;
  shouldUpload: boolean;
  userMessage: string;
}

/**
 * 分析转码错误类型
 */
export function analyzeTranscodingError(error: Error | string): TranscodingError {
  const errorMessage = error instanceof Error ? error.message : error;
  
  // FFmpeg版本兼容性问题
  if (errorMessage.includes('force_divisible_by') || errorMessage.includes('Unknown option')) {
    return {
      type: 'ffmpeg_error',
      message: 'FFmpeg版本兼容性问题',
      originalError: error instanceof Error ? error : undefined,
      suggestions: [
        '使用兼容的FFmpeg命令语法',
        '升级FFmpeg到4.4+版本'
      ]
    };
  }
  
  // 分辨率问题
  if (errorMessage.includes('width not divisible by 2') || errorMessage.includes('height not divisible by 2')) {
    return {
      type: 'ffmpeg_error',
      message: '视频分辨率不符合H.264编码要求',
      originalError: error instanceof Error ? error : undefined,
      suggestions: [
        '调整视频分辨率为偶数',
        '使用兼容的缩放滤镜'
      ]
    };
  }
  
  // 不支持的格式
  if (errorMessage.includes('Invalid data found') || errorMessage.includes('Unknown format')) {
    return {
      type: 'format_unsupported',
      message: '视频格式不受支持或文件损坏',
      originalError: error instanceof Error ? error : undefined,
      suggestions: [
        '使用H.264编码的MP4文件',
        '检查视频文件是否完整'
      ]
    };
  }
  
  // 默认未知错误
  return {
    type: 'unknown',
    message: '转码过程中发生未知错误',
    originalError: error instanceof Error ? error : undefined,
    suggestions: [
      '检查视频文件格式和完整性',
      '尝试使用不同的视频文件'
    ]
  };
}

/**
 * 处理转码失败的策略
 */
export function handleTranscodingFailure(
  error: Error | string,
  originalCodec: string,
  fileSize: number
): TranscodingResult {
  const transcodingError = analyzeTranscodingError(error);
  
  // 决定是否应该上传原始文件
  let shouldUpload = false;
  let userMessage = '';
  
  switch (transcodingError.type) {
    case 'ffmpeg_error':
      // FFmpeg错误 - 不上传，建议用户使用兼容格式
      shouldUpload = false;
      userMessage = '视频转码失败，请使用H.264编码的MP4文件。HEVC格式在某些浏览器中无法播放。';
      break;
      
    case 'format_unsupported':
      // 格式不支持 - 不上传，明确告知用户
      shouldUpload = false;
      userMessage = '视频格式不受支持。请使用标准的MP4格式（H.264编码）重新上传。';
      break;
      
    default:
      // 未知错误 - 保守处理，不上传
      shouldUpload = false;
      userMessage = '视频处理失败，请检查文件格式和完整性后重新上传。建议使用H.264编码的MP4文件。';
  }
  
  return {
    success: false,
    error: transcodingError,
    shouldUpload,
    userMessage
  };
}

export default {
  analyzeTranscodingError,
  handleTranscodingFailure
};