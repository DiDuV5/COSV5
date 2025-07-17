/**
 * @fileoverview 上传策略选择器
 * @description 根据文件特征和系统状态选择最优上传策略
 * @author Augment AI
 * @date 2025-07-03
 */

import {
  UploadStrategy,
  type FileAnalysis,
  type UnifiedUploadRequest
} from '../index';

/**
 * 策略选择结果
 */
export interface StrategySelectionResult {
  strategy: UploadStrategy;
  reason: string;
  estimatedTime: number;
  requirements: string[];
  fallbackStrategy?: UploadStrategy;
}

/**
 * 上传策略选择器类
 */
export class UploadStrategySelector {

  /**
   * 选择上传策略
   */
  static async selectUploadStrategy(
    analysis: FileAnalysis,
    request: UnifiedUploadRequest
  ): Promise<StrategySelectionResult> {
    // 如果用户指定了流式上传
    if (request.enableStreaming) {
      return {
        strategy: UploadStrategy.STREAM,
        reason: '用户指定使用流式上传',
        estimatedTime: this.estimateUploadTime(UploadStrategy.STREAM, analysis.size),
        requirements: this.getProcessingRequirements(analysis.uploadType, request),
        fallbackStrategy: UploadStrategy.DIRECT
      };
    }

    // 检查存储可用性
    const storageAvailable = await this.checkStorageAvailability();
    if (!storageAvailable) {
      return {
        strategy: UploadStrategy.MEMORY_SAFE,
        reason: '存储服务不可用，使用内存安全策略',
        estimatedTime: this.estimateUploadTime(UploadStrategy.MEMORY_SAFE, analysis.size),
        requirements: this.getProcessingRequirements(analysis.uploadType, request),
        fallbackStrategy: UploadStrategy.STREAM
      };
    }

    // 根据文件大小选择策略
    const recommendedStrategy = this.getRecommendedStrategy(analysis.size);
    const reason = this.getStrategyReason(analysis.size);

    return {
      strategy: recommendedStrategy,
      reason,
      estimatedTime: this.estimateUploadTime(recommendedStrategy, analysis.size),
      requirements: this.getProcessingRequirements(analysis.uploadType, request),
      fallbackStrategy: this.getFallbackStrategy(recommendedStrategy)
    };
  }

  /**
   * 检查存储可用性
   */
  private static async checkStorageAvailability(): Promise<boolean> {
    try {
      // 快速连接测试（5秒超时）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // 这里应该实际测试存储连接
      // 暂时返回true，实际项目中应该ping存储服务
      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      console.warn('存储可用性检查失败:', error);
      return false;
    }
  }

  /**
   * 获取推荐策略
   */
  private static getRecommendedStrategy(fileSize: number): UploadStrategy {
    if (fileSize > 200 * 1024 * 1024) return UploadStrategy.MEMORY_SAFE;
    if (fileSize > 50 * 1024 * 1024) return UploadStrategy.STREAM;
    return UploadStrategy.DIRECT;
  }

  /**
   * 获取策略原因
   */
  private static getStrategyReason(fileSize: number): string {
    const sizeMB = Math.round(fileSize / 1024 / 1024);

    if (fileSize > 200 * 1024 * 1024) {
      return `文件过大(${sizeMB}MB)，使用内存安全策略避免内存溢出`;
    }
    if (fileSize > 50 * 1024 * 1024) {
      return `文件较大(${sizeMB}MB)，使用流式上传提高稳定性`;
    }
    return `文件较小(${sizeMB}MB)，使用直接上传提高速度`;
  }

  /**
   * 获取回退策略
   */
  private static getFallbackStrategy(primaryStrategy: UploadStrategy): UploadStrategy {
    switch (primaryStrategy) {
      case UploadStrategy.DIRECT:
        return UploadStrategy.STREAM;
      case UploadStrategy.STREAM:
        return UploadStrategy.MEMORY_SAFE;
      case UploadStrategy.MEMORY_SAFE:
        return UploadStrategy.STREAM;
      default:
        return UploadStrategy.DIRECT;
    }
  }

  /**
   * 获取处理需求
   */
  private static getProcessingRequirements(uploadType: any, request: UnifiedUploadRequest): string[] {
    const requirements: string[] = [];

    if (uploadType === 'IMAGE' || uploadType === 'AVATAR') {
      if (request.generateThumbnails !== false) requirements.push('缩略图生成');
      if (request.imageQuality) requirements.push('图片压缩');
      // 水印功能暂时不可用
      // if (request.watermark) requirements.push('水印添加');
    }

    if (uploadType === 'VIDEO') {
      if (request.generateThumbnails !== false) requirements.push('视频缩略图');
      if (request.targetQuality) requirements.push('视频压缩');
      requirements.push('编码验证');
    }

    if (uploadType === 'DOCUMENT') {
      requirements.push('文档预览生成');
      // 文本提取功能暂时不可用
      // if (request.extractText) requirements.push('文本提取');
    }

    return requirements;
  }

  /**
   * 估算上传时间
   */
  private static estimateUploadTime(strategy: UploadStrategy, fileSize: number): number {
    const baseTimePerMB = {
      [UploadStrategy.DIRECT]: 100,      // 100ms per MB
      [UploadStrategy.STREAM]: 150,      // 150ms per MB
      [UploadStrategy.MEMORY_SAFE]: 200  // 200ms per MB
    };

    const sizeMB = fileSize / (1024 * 1024);
    const baseTime = baseTimePerMB[strategy as keyof typeof baseTimePerMB] || 150;

    return Math.max(1000, Math.round(sizeMB * baseTime));
  }

  /**
   * 选择最优策略（高级版本）
   */
  static async selectOptimalStrategy(
    analysis: FileAnalysis,
    request: UnifiedUploadRequest,
    systemLoad?: number
  ): Promise<StrategySelectionResult> {
    const baseResult = await this.selectUploadStrategy(analysis, request);

    // 考虑系统负载
    if (systemLoad && systemLoad > 0.8) {
      // 系统负载高，选择更保守的策略
      const conservativeStrategy = this.getConservativeStrategy(baseResult.strategy);
      return {
        ...baseResult,
        strategy: conservativeStrategy,
        reason: `${baseResult.reason}，但由于系统负载高(${Math.round(systemLoad * 100)}%)，调整为保守策略`,
        estimatedTime: this.estimateUploadTime(conservativeStrategy, analysis.size)
      };
    }

    return baseResult;
  }

  /**
   * 获取保守策略
   */
  private static getConservativeStrategy(strategy: UploadStrategy): UploadStrategy {
    switch (strategy) {
      case UploadStrategy.DIRECT:
        return UploadStrategy.STREAM;
      case UploadStrategy.STREAM:
        return UploadStrategy.MEMORY_SAFE;
      default:
        return strategy;
    }
  }

  /**
   * 验证策略可行性
   */
  static validateStrategy(
    strategy: UploadStrategy,
    analysis: FileAnalysis,
    request: UnifiedUploadRequest
  ): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // 检查文件大小限制
    if (strategy === UploadStrategy.DIRECT && analysis.size > 100 * 1024 * 1024) {
      issues.push('直接上传不适合超过100MB的文件');
    }

    // 检查内存限制
    if (strategy === UploadStrategy.MEMORY_SAFE && analysis.size < 10 * 1024 * 1024) {
      issues.push('内存安全策略对小文件来说过于保守');
    }

    // 检查流式上传要求
    if (strategy === UploadStrategy.STREAM && !request.enableStreaming) {
      issues.push('流式上传需要客户端支持');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * 获取策略性能预测
   */
  static predictPerformance(
    strategy: UploadStrategy,
    analysis: FileAnalysis
  ): {
    memoryUsage: number;
    cpuUsage: number;
    networkEfficiency: number;
    reliability: number;
  } {
    const fileSize = analysis.size;
    const sizeMB = fileSize / (1024 * 1024);

    switch (strategy) {
      case UploadStrategy.DIRECT:
        return {
          memoryUsage: Math.min(100, sizeMB * 2), // 2MB内存每MB文件
          cpuUsage: 20, // 低CPU使用
          networkEfficiency: 95, // 高网络效率
          reliability: Math.max(60, 100 - sizeMB) // 文件越大可靠性越低
        };

      case UploadStrategy.STREAM:
        return {
          memoryUsage: Math.min(50, sizeMB * 0.5), // 0.5MB内存每MB文件
          cpuUsage: 40, // 中等CPU使用
          networkEfficiency: 85, // 中等网络效率
          reliability: 90 // 高可靠性
        };

      case UploadStrategy.MEMORY_SAFE:
        return {
          memoryUsage: Math.min(20, sizeMB * 0.1), // 0.1MB内存每MB文件
          cpuUsage: 60, // 高CPU使用
          networkEfficiency: 75, // 较低网络效率
          reliability: 95 // 最高可靠性
        };

      default:
        return {
          memoryUsage: 50,
          cpuUsage: 30,
          networkEfficiency: 80,
          reliability: 80
        };
    }
  }

  /**
   * 动态调整策略
   */
  static async adjustStrategy(
    currentStrategy: UploadStrategy,
    progress: number,
    errorCount: number,
    analysis: FileAnalysis
  ): Promise<UploadStrategy | null> {
    // 如果错误太多，降级到更安全的策略
    if (errorCount > 3) {
      if (currentStrategy === UploadStrategy.DIRECT) {
        return UploadStrategy.STREAM;
      }
      if (currentStrategy === UploadStrategy.STREAM) {
        return UploadStrategy.MEMORY_SAFE;
      }
    }

    // 如果进度缓慢且文件较大，考虑切换策略
    if (progress < 0.1 && analysis.size > 100 * 1024 * 1024) {
      if (currentStrategy === UploadStrategy.DIRECT) {
        return UploadStrategy.STREAM;
      }
    }

    // 不需要调整
    return null;
  }
}
