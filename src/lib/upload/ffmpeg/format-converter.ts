/**
 * @fileoverview 格式转换器 - CoserEden平台
 * @description 视频格式转换和兼容性处理
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import type {
  FormatConversionOptions,
  FormatConversionResult,
  VideoMetadata,
} from './ffmpeg-types';
import { FFmpegCore } from './ffmpeg-core';
import { VideoDecoder } from './video-decoder';
import {
  generateSessionId,
  formatFileSize,
  formatProcessingTime,
  SUPPORTED_FORMATS,
} from './ffmpeg-utils';

/**
 * 格式转换器类
 * 负责视频格式转换和兼容性处理
 */
export class FormatConverter {
  private ffmpegCore: FFmpegCore;
  private videoDecoder: VideoDecoder;

  constructor(ffmpegCore?: FFmpegCore) {
    this.ffmpegCore = ffmpegCore || FFmpegCore.getInstance();
    this.videoDecoder = new VideoDecoder();
  }

  /**
   * 转换视频格式
   * 
   * @param inputPath - 输入文件路径
   * @param outputPath - 输出文件路径
   * @param options - 转换选项
   * @returns Promise<FormatConversionResult> - 转换结果
   * 
   * @example
   * ```typescript
   * const converter = new FormatConverter();
   * const result = await converter.convertFormat('/path/to/input.avi', '/path/to/output.mp4', {
   *   outputFormat: 'mp4',
   *   videoCodec: 'libx264',
   *   audioCodec: 'aac'
   * });
   * ```
   */
  public async convertFormat(
    inputPath: string,
    outputPath: string,
    options: FormatConversionOptions
  ): Promise<FormatConversionResult> {
    const startTime = Date.now();

    try {
      console.log(`🔄 开始格式转换: ${path.basename(inputPath)} -> ${options.outputFormat}`);

      // 获取输入文件信息
      const inputMetadata = await this.videoDecoder.extractMetadata(inputPath);
      console.log(`📊 输入格式: ${inputMetadata.format}, 编码: ${inputMetadata.codec}`);

      // 验证格式支持
      this.validateFormatSupport(inputMetadata.format, options.outputFormat);

      // 构建转换命令
      const command = this.buildConversionCommand(inputPath, outputPath, options, inputMetadata);

      // 执行转换
      const sessionId = generateSessionId();
      await this.ffmpegCore.executeFFmpeg(command, sessionId);

      // 验证输出文件
      await this.validateOutput(outputPath);

      const result: FormatConversionResult = {
        success: true,
        outputPath,
        originalFormat: inputMetadata.format,
        outputFormat: options.outputFormat,
        processingTime: Date.now() - startTime,
      };

      console.log(`✅ 格式转换完成: ${formatProcessingTime(result.processingTime)}`);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error(`❌ 格式转换失败: ${errorMessage}`);

      return {
        success: false,
        originalFormat: 'unknown',
        outputFormat: options.outputFormat,
        processingTime: Date.now() - startTime,
        error: errorMessage,
      };
    }
  }

  /**
   * 验证格式支持
   */
  private validateFormatSupport(inputFormat: string, outputFormat: string): void {
    // 检查输入格式支持
    const inputSupported = SUPPORTED_FORMATS.INPUT.some(format =>
      inputFormat.toLowerCase().includes(format.toLowerCase())
    );

    if (!inputSupported) {
      throw new Error(`不支持的输入格式: ${inputFormat}`);
    }

    // 检查输出格式支持
    const outputSupported = SUPPORTED_FORMATS.OUTPUT.includes(outputFormat.toLowerCase() as any);

    if (!outputSupported) {
      throw new Error(`不支持的输出格式: ${outputFormat}`);
    }

    console.log(`✅ 格式支持验证通过: ${inputFormat} -> ${outputFormat}`);
  }

  /**
   * 构建转换命令
   */
  private buildConversionCommand(
    inputPath: string,
    outputPath: string,
    options: FormatConversionOptions,
    inputMetadata: VideoMetadata
  ): string[] {
    const command: string[] = ['-i', inputPath];

    // 视频编码设置
    if (options.videoCodec) {
      command.push('-c:v', options.videoCodec);
    } else {
      // 根据输出格式选择默认编码器
      const defaultVideoCodec = this.getDefaultVideoCodec(options.outputFormat);
      if (defaultVideoCodec) {
        command.push('-c:v', defaultVideoCodec);
      }
    }

    // 音频编码设置
    if (options.audioCodec) {
      command.push('-c:a', options.audioCodec);
    } else {
      // 根据输出格式选择默认音频编码器
      const defaultAudioCodec = this.getDefaultAudioCodec(options.outputFormat);
      if (defaultAudioCodec) {
        command.push('-c:a', defaultAudioCodec);
      }
    }

    // 质量设置
    if (options.quality !== undefined) {
      if (options.videoCodec === 'libx264' || !options.videoCodec) {
        command.push('-crf', options.quality.toString());
      }
    }

    // 元数据处理
    if (options.preserveMetadata) {
      command.push('-map_metadata', '0');
    } else {
      command.push('-map_metadata', '-1'); // 移除元数据
    }

    // 格式特定设置
    this.addFormatSpecificOptions(command, options.outputFormat);

    // 输出文件
    command.push('-y', outputPath);

    console.log(`🔧 转换命令: ${command.join(' ')}`);
    return command;
  }

  /**
   * 获取默认视频编码器
   */
  private getDefaultVideoCodec(format: string): string | null {
    const codecMap: Record<string, string> = {
      'mp4': 'libx264',
      'webm': 'libvpx-vp9',
      'avi': 'libx264',
      'mov': 'libx264',
    };

    return codecMap[format.toLowerCase()] || null;
  }

  /**
   * 获取默认音频编码器
   */
  private getDefaultAudioCodec(format: string): string | null {
    const codecMap: Record<string, string> = {
      'mp4': 'aac',
      'webm': 'libvorbis',
      'avi': 'aac',
      'mov': 'aac',
    };

    return codecMap[format.toLowerCase()] || null;
  }

  /**
   * 添加格式特定选项
   */
  private addFormatSpecificOptions(command: string[], format: string): void {
    switch (format.toLowerCase()) {
      case 'mp4':
        command.push('-movflags', '+faststart'); // 优化流媒体播放
        command.push('-pix_fmt', 'yuv420p'); // 确保兼容性
        break;

      case 'webm':
        command.push('-deadline', 'good'); // VP9编码质量
        command.push('-cpu-used', '2'); // 编码速度
        break;

      case 'avi':
        // AVI格式通常不需要特殊选项
        break;

      case 'mov':
        command.push('-pix_fmt', 'yuv420p'); // 确保兼容性
        break;
    }
  }

  /**
   * 验证输出文件
   */
  private async validateOutput(outputPath: string): Promise<void> {
    try {
      // 检查文件是否存在
      const stats = await fs.stat(outputPath);
      if (stats.size === 0) {
        throw new Error('输出文件为空');
      }

      // 尝试读取元数据验证文件完整性
      await this.videoDecoder.extractMetadata(outputPath);

      console.log(`✅ 输出文件验证通过: ${formatFileSize(stats.size)}`);
    } catch (error) {
      console.error('❌ 输出文件验证失败:', error);
      
      // 尝试删除无效文件
      try {
        await fs.unlink(outputPath);
        console.log('🗑️ 已删除无效的输出文件');
      } catch (cleanupError) {
        console.warn('⚠️ 清理无效文件失败:', cleanupError);
      }
      
      throw error;
    }
  }

  /**
   * 检查是否需要格式转换
   * 
   * @param inputPath - 输入文件路径
   * @param targetFormat - 目标格式
   * @returns Promise<boolean> - 是否需要转换
   */
  public async needsFormatConversion(inputPath: string, targetFormat: string): Promise<boolean> {
    try {
      const metadata = await this.videoDecoder.extractMetadata(inputPath);
      const currentFormat = metadata.format.toLowerCase();
      const target = targetFormat.toLowerCase();

      // 检查格式是否匹配
      if (currentFormat.includes(target) || target.includes(currentFormat)) {
        console.log(`📋 格式已匹配，无需转换: ${currentFormat}`);
        return false;
      }

      console.log(`📋 需要格式转换: ${currentFormat} -> ${target}`);
      return true;
    } catch (error) {
      console.warn('检查格式转换需求失败:', error);
      // 出错时默认转换以确保安全
      return true;
    }
  }

  /**
   * 获取推荐的输出格式
   * 
   * @param inputPath - 输入文件路径
   * @param targetUse - 目标用途 ('web', 'mobile', 'desktop')
   * @returns Promise<string> - 推荐格式
   */
  public async getRecommendedFormat(
    inputPath: string,
    targetUse: 'web' | 'mobile' | 'desktop' = 'web'
  ): Promise<string> {
    try {
      const metadata = await this.videoDecoder.extractMetadata(inputPath);

      // 根据用途推荐格式
      const recommendations: Record<string, string> = {
        'web': 'mp4', // 最佳Web兼容性
        'mobile': 'mp4', // 移动设备兼容性
        'desktop': 'mp4', // 桌面播放器兼容性
      };

      const recommended = recommendations[targetUse];
      console.log(`💡 推荐格式: ${recommended} (用途: ${targetUse})`);
      
      return recommended;
    } catch (error) {
      console.warn('获取推荐格式失败:', error);
      return 'mp4'; // 默认推荐MP4
    }
  }

  /**
   * 批量格式转换
   * 
   * @param conversions - 转换任务列表
   * @returns Promise<FormatConversionResult[]> - 转换结果列表
   */
  public async batchConvert(
    conversions: Array<{
      inputPath: string;
      outputPath: string;
      options: FormatConversionOptions;
    }>
  ): Promise<FormatConversionResult[]> {
    const results: FormatConversionResult[] = [];

    console.log(`🔄 开始批量格式转换: ${conversions.length}个任务`);

    for (let i = 0; i < conversions.length; i++) {
      const { inputPath, outputPath, options } = conversions[i];
      
      console.log(`📋 处理任务 ${i + 1}/${conversions.length}: ${path.basename(inputPath)}`);
      
      try {
        const result = await this.convertFormat(inputPath, outputPath, options);
        results.push(result);
      } catch (error) {
        console.error(`❌ 任务 ${i + 1} 失败:`, error);
        results.push({
          success: false,
          originalFormat: 'unknown',
          outputFormat: options.outputFormat,
          processingTime: 0,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ 批量转换完成: ${successCount}/${conversions.length} 成功`);

    return results;
  }
}
