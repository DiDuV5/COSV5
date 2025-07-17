/**
 * @fileoverview 上传策略选择器
 * @description 根据文件特征和用户权限智能选择最优上传策略
 * @author Augment AI
 * @date 2025-06-30
 * @version 1.0.0
 */

import { UserLevel } from '@/types/user-level';
import { UploadConfigManager } from './upload-config-manager';
import type { UploadStrategy, UploadStrategyType, UnifiedUploadConfig, UserLevelConfig } from './types/upload-config-types';

/**
 * 文件分析结果
 */
export interface FileAnalysis {
  size: number;
  mimeType: string;
  extension: string;
  isImage: boolean;
  isVideo: boolean;
  estimatedProcessingTime: number;
  memoryRequirement: number;
  complexity: 'low' | 'medium' | 'high';
}

/**
 * 策略选择结果
 */
export interface StrategySelection {
  strategy: UploadStrategyType;
  reason: string;
  config: {
    chunkSize?: number;
    maxConcurrentChunks?: number;
    enableMemoryMonitoring?: boolean;
    enableProgressTracking?: boolean;
    estimatedDuration?: number;
  };
  warnings: string[];
}

/**
 * 上传策略选择器
 */
export class UploadStrategySelector {
  // 使用静态方法，不需要实例

  /**
   * 分析文件特征
   */
  public analyzeFile(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): FileAnalysis {
    const size = buffer.length;
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const isImage = mimeType.startsWith('image/');
    const isVideo = mimeType.startsWith('video/');

    // 估算处理时间（毫秒）
    let estimatedProcessingTime = 1000; // 基础1秒
    if (isVideo) {
      estimatedProcessingTime += Math.floor(size / (1024 * 1024)) * 2000; // 每MB增加2秒
    } else if (isImage) {
      estimatedProcessingTime += Math.floor(size / (1024 * 1024)) * 500; // 每MB增加0.5秒
    }

    // 估算内存需求
    let memoryRequirement = size;
    if (isVideo) {
      memoryRequirement *= 1.5; // 视频处理需要额外内存
    } else if (isImage) {
      memoryRequirement *= 1.2; // 图片处理需要少量额外内存
    }

    // 判断复杂度
    let complexity: 'low' | 'medium' | 'high' = 'low';
    if (size > 100 * 1024 * 1024) { // 100MB
      complexity = 'high';
    } else if (size > 10 * 1024 * 1024) { // 10MB
      complexity = 'medium';
    }

    return {
      size,
      mimeType,
      extension,
      isImage,
      isVideo,
      estimatedProcessingTime,
      memoryRequirement,
      complexity,
    };
  }

  /**
   * 选择最优上传策略
   */
  public async selectStrategy(
    fileAnalysis: FileAnalysis,
    userLevel: UserLevel,
    systemLoad?: {
      memoryUsage: number;
      cpuUsage: number;
      activeUploads: number;
    }
  ): Promise<StrategySelection> {
    const config = await UploadConfigManager.getConfig();
    const userConfig = await UploadConfigManager.getUserLevelConfig(userLevel);
    const warnings: string[] = [];

    // 检查文件大小限制
    if (fileAnalysis.size > userConfig.maxFileSize) {
      throw new Error(
        `文件大小超出用户权限限制: ${Math.round(fileAnalysis.size / 1024 / 1024)}MB > ${Math.round(userConfig.maxFileSize / 1024 / 1024)}MB`
      );
    }

    // 检查MIME类型
    if (!userConfig.allowedMimeTypes.includes(fileAnalysis.mimeType)) {
      throw new Error(`不支持的文件类型: ${fileAnalysis.mimeType}`);
    }

    // 基于文件大小的基础策略选择
    let strategy: UploadStrategyType;
    let reason: string;

    if (fileAnalysis.size > (config.memorySafeThreshold || 100 * 1024 * 1024)) {
      strategy = 'memory-safe';
      reason = `文件大小 ${Math.round(fileAnalysis.size / 1024 / 1024)}MB 超过内存安全阈值 ${Math.round((config.memorySafeThreshold || 100 * 1024 * 1024) / 1024 / 1024)}MB`;
    } else if (fileAnalysis.size > (config.streamThreshold || 10 * 1024 * 1024)) {
      strategy = 'stream';
      reason = `文件大小 ${Math.round(fileAnalysis.size / 1024 / 1024)}MB 超过流式上传阈值 ${Math.round((config.streamThreshold || 10 * 1024 * 1024) / 1024 / 1024)}MB`;
    } else {
      strategy = 'direct';
      reason = `文件大小 ${Math.round(fileAnalysis.size / 1024 / 1024)}MB 适合直接上传`;
    }

    // 系统负载调整
    if (systemLoad) {
      if (systemLoad.memoryUsage > 0.8 && strategy === 'direct') {
        strategy = 'stream';
        reason += '，但由于系统内存使用率过高，改用流式上传';
        warnings.push('系统内存使用率过高，可能影响上传性能');
      }

      if (systemLoad.activeUploads > 10 && strategy === 'memory-safe') {
        warnings.push('当前活跃上传数量较多，可能需要排队等待');
      }
    }

    // 文件类型特殊处理
    if (fileAnalysis.isVideo && fileAnalysis.size > 50 * 1024 * 1024) {
      if (strategy === 'direct') {
        strategy = 'stream';
        reason += '，视频文件建议使用流式上传';
      }
      warnings.push('大视频文件上传可能需要较长时间，建议保持网络连接稳定');
    }

    // 用户权限调整
    if (!userConfig.enableAdvancedFeatures && strategy === 'memory-safe') {
      strategy = 'stream';
      reason += '，但用户权限不支持内存安全模式，降级为流式上传';
      warnings.push('当前用户权限不支持高级上传功能');
    }

    // 生成策略配置
    const strategyConfig = await this.generateStrategyConfig(strategy, fileAnalysis, config);

    return {
      strategy,
      reason,
      config: strategyConfig,
      warnings,
    };
  }

  /**
   * 生成策略特定配置
   */
  private async generateStrategyConfig(
    strategy: UploadStrategyType,
    fileAnalysis: FileAnalysis,
    globalConfig: any
  ): Promise<StrategySelection['config']> {
    const baseConfig = {
      enableProgressTracking: globalConfig.enableProgressTracking,
      estimatedDuration: fileAnalysis.estimatedProcessingTime,
    };

    switch (strategy) {
      case 'direct':
        return {
          ...baseConfig,
          enableMemoryMonitoring: false,
        };

      case 'stream':
        return {
          ...baseConfig,
          chunkSize: await this.calculateOptimalChunkSize(fileAnalysis.size),
          maxConcurrentChunks: await this.calculateOptimalConcurrency(fileAnalysis.complexity),
          enableMemoryMonitoring: true,
        };

      case 'memory-safe':
        return {
          ...baseConfig,
          chunkSize: Math.min(globalConfig.chunkSize, 32 * 1024), // 更小的分片
          maxConcurrentChunks: 1, // 串行处理
          enableMemoryMonitoring: true,
        };

      default:
        return baseConfig;
    }
  }

  /**
   * 计算最优分片大小
   */
  private async calculateOptimalChunkSize(fileSize: number): Promise<number> {
    const config = await UploadConfigManager.getConfig();

    // 基于文件大小动态调整分片大小
    if (fileSize < 10 * 1024 * 1024) { // < 10MB
      return 64 * 1024; // 64KB
    } else if (fileSize < 100 * 1024 * 1024) { // < 100MB
      return 256 * 1024; // 256KB
    } else if (fileSize < 1024 * 1024 * 1024) { // < 1GB
      return 1024 * 1024; // 1MB
    } else {
      return 2 * 1024 * 1024; // 2MB
    }
  }

  /**
   * 计算最优并发数
   */
  private async calculateOptimalConcurrency(complexity: 'low' | 'medium' | 'high'): Promise<number> {
    const config = await UploadConfigManager.getConfig();

    const maxChunks = config.maxConcurrentChunks || 3;

    switch (complexity) {
      case 'low':
        return Math.min(maxChunks, 5);
      case 'medium':
        return Math.min(maxChunks, 3);
      case 'high':
        return 1; // 高复杂度文件串行处理
      default:
        return maxChunks;
    }
  }

  /**
   * 验证策略选择
   */
  public async validateStrategy(
    strategy: UploadStrategyType,
    fileAnalysis: FileAnalysis,
    userLevel: UserLevel
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const config = await UploadConfigManager.getConfig();
    const userConfig = await UploadConfigManager.getUserLevelConfig(userLevel);

    // 验证文件大小
    if (fileAnalysis.size > userConfig.maxFileSize) {
      errors.push(`文件大小超出用户权限限制`);
    }

    // 验证内存需求
    const maxMemory = config.maxMemoryUsage || 100 * 1024 * 1024; // 100MB default
    if (strategy === 'direct' && fileAnalysis.memoryRequirement > maxMemory) {
      errors.push(`直接上传模式内存需求过高，建议使用流式上传`);
    }

    // 验证用户权限
    if (strategy === 'memory-safe' && !userConfig.enableAdvancedFeatures) {
      errors.push(`当前用户权限不支持内存安全模式`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取策略描述
   */
  public getStrategyDescription(strategy: UploadStrategyType): string {
    switch (strategy) {
      case 'direct':
        return '直接上传：适用于小文件，一次性上传，速度快';
      case 'stream':
        return '流式上传：适用于中大型文件，分片上传，支持断点续传';
      case 'memory-safe':
        return '内存安全：适用于超大文件，严格控制内存使用，确保系统稳定';
      default:
        return '未知策略';
    }
  }
}

/**
 * 导出单例实例
 */
export const uploadStrategySelector = new UploadStrategySelector();
