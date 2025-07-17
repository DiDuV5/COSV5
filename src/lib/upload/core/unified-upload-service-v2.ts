/**
 * @fileoverview 统一上传服务 V2 - 重构版本
 * @description 重构后的统一上传服务，模块化架构
 * @author Augment AI
 * @date 2025-07-03
 * @version 2.0.0 - 重构版本
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { SimpleLogger } from './simple-logger';

// 导入重构后的模块
import { UploadValidators } from './validators/upload-validators';
import { UploadStrategySelector } from './strategies/upload-strategy-selector';
import { ProcessorManager } from './processors/processor-manager';
import { MediaManager } from './media/media-manager';
import { generateUploadId, createProgressReporter } from './utils/upload-service-utils';

import {
  UploadType,
  type UnifiedUploadRequest,
  type UnifiedUploadResult,
  type UploadProgress
} from './index';

/**
 * 统一上传服务类 - 重构版
 */
export class UnifiedUploadServiceV2 {
  private processorManager: ProcessorManager;
  private isInitialized = false;
  private activeUploads = new Map<string, any>();
  private logger: SimpleLogger;

  constructor() {
    this.logger = new SimpleLogger('unified-upload-service-v2');
    this.processorManager = new ProcessorManager();
  }

  /**
   * 初始化服务
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔒 统一上传服务已初始化，跳过重复初始化');
      return;
    }

    try {
      this.logger.info('🚀 初始化统一上传服务V2...');

      // 检查处理器健康状态
      const healthCheck = await this.processorManager.healthCheck();
      if (!healthCheck.healthy) {
        throw new Error(`处理器健康检查失败: ${healthCheck.issues.join(', ')}`);
      }

      this.isInitialized = true;
      this.logger.info('✅ 统一上传服务V2初始化完成');

      console.log('📊 服务状态:', {
        processorCount: healthCheck.processorCount,
        supportedTypes: this.processorManager.getSupportedTypes(),
        activeUploads: this.activeUploads.size
      });

    } catch (error) {
      this.logger.error('❌ 统一上传服务V2初始化失败:', error instanceof Error ? error : new Error(String(error)));
      throw TRPCErrorHandler.internalError(
        `上传服务初始化失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 处理上传 - 主要入口点
   */
  public async processUpload(
    request: UnifiedUploadRequest,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UnifiedUploadResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const uploadId = generateUploadId();
    const reportProgress = createProgressReporter(onProgress);

    try {
      this.logger.info(`🎬 开始处理上传: ${request.filename} (ID: ${uploadId})`);

      // 记录活跃上传
      this.activeUploads.set(uploadId, {
        id: uploadId,
        filename: request.filename,
        startTime: Date.now(),
        status: 'processing'
      });

      reportProgress('validation', 10, '验证上传请求...');

      // 1. 验证请求
      UploadValidators.validateRequest(request);

      reportProgress('analysis', 20, '分析文件信息...');

      // 2. 分析文件
      const analysis = UploadValidators.analyzeFile(request);

      if (!analysis.isSafe) {
        throw TRPCErrorHandler.validationError(
          `文件安全检查失败: ${analysis.securityIssues.join(', ')}`
        );
      }

      reportProgress('strategy', 30, '选择上传策略...');

      // 3. 选择上传策略
      const strategyResult = await UploadStrategySelector.selectUploadStrategy(analysis, request);

      this.logger.info(`📋 选择策略: ${strategyResult.strategy} - ${strategyResult.reason}`);

      reportProgress('processing', 40, `使用${strategyResult.strategy}策略处理...`);

      // 4. 获取处理器并执行
      const processor = this.processorManager.getProcessor(analysis.uploadType);

      const result = await this.processorManager.processWithStrategy(
        strategyResult.strategy,
        request,
        processor,
        (progress) => {
          // 将处理器进度映射到40-90%范围
          const mappedPercentage = 40 + ((progress.progress || 0) * 0.5);
          reportProgress(progress.stage || 'processing', mappedPercentage, progress.message || '处理中...');
        }
      );

      reportProgress('finalizing', 95, '完成上传处理...');

      // 5. 更新活跃上传状态
      this.activeUploads.set(uploadId, {
        ...this.activeUploads.get(uploadId),
        status: 'completed',
        endTime: Date.now(),
        result
      });

      reportProgress('completed', 100, '上传处理完成');

      this.logger.info(`✅ 上传处理完成: ${request.filename} (ID: ${uploadId})`);

      // 添加额外信息到结果中
      const enhancedResult = result as any;
      enhancedResult.uploadId = uploadId;
      enhancedResult.strategy = strategyResult.strategy;
      enhancedResult.processingTime = Date.now() - (this.activeUploads.get(uploadId)?.startTime || Date.now());

      return enhancedResult;

    } catch (error) {
      this.logger.error(`❌ 上传处理失败: ${request.filename} (ID: ${uploadId})`, error instanceof Error ? error : new Error(String(error)));

      // 更新失败状态
      this.activeUploads.set(uploadId, {
        ...this.activeUploads.get(uploadId),
        status: 'failed',
        error: error instanceof Error ? error.message : '未知错误',
        endTime: Date.now()
      });

      reportProgress('error', 0, `上传失败: ${error instanceof Error ? error.message : '未知错误'}`);

      throw error;
    } finally {
      // 清理过期的活跃上传记录（保留1小时）
      setTimeout(() => {
        this.activeUploads.delete(uploadId);
      }, 60 * 60 * 1000);
    }
  }

  /**
   * 获取活跃上传统计
   */
  public getActiveUploads(): any[] {
    return Array.from(this.activeUploads.values());
  }

  /**
   * 获取支持的文件类型
   */
  public getSupportedTypes(): UploadType[] {
    return this.processorManager.getSupportedTypes();
  }

  /**
   * 获取媒体文件信息
   */
  public async getMediaInfo(fileId: string): Promise<any | null> {
    return MediaManager.getMediaInfo(fileId);
  }

  /**
   * 删除媒体文件
   */
  public async deleteMedia(mediaId: string): Promise<boolean> {
    return MediaManager.deleteMedia(mediaId);
  }

  /**
   * 更新媒体顺序
   */
  public async updateMediaOrder(mediaUpdates: Array<{ id: string; order: number }>): Promise<void> {
    return MediaManager.updateMediaOrder(mediaUpdates);
  }

  /**
   * 获取用户上传统计
   */
  public async getUserUploadStats(userId: string): Promise<any> {
    return MediaManager.getUserUploadStats(userId);
  }

  /**
   * 清理过期会话
   */
  public async cleanupExpiredSessions(): Promise<number> {
    try {
      // 清理超过1小时的活跃上传记录
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      let cleaned = 0;

      for (const [uploadId, upload] of this.activeUploads) {
        if (upload.endTime && upload.endTime < oneHourAgo) {
          this.activeUploads.delete(uploadId);
          cleaned++;
        }
      }

      this.logger.info(`🧹 清理过期会话完成，清理了 ${cleaned} 个记录`);
      return cleaned;
    } catch (error) {
      this.logger.error('清理过期会话失败:', error instanceof Error ? error : new Error(String(error)));
      return 0;
    }
  }

  /**
   * 获取服务健康状态
   */
  public async getHealthStatus(): Promise<{
    healthy: boolean;
    issues: string[];
    stats: any;
  }> {
    const issues: string[] = [];

    if (!this.isInitialized) {
      issues.push('服务未初始化');
    }

    const processorHealth = await this.processorManager.healthCheck();
    if (!processorHealth.healthy) {
      issues.push(...processorHealth.issues);
    }

    const stats = {
      initialized: this.isInitialized,
      activeUploads: this.activeUploads.size,
      supportedTypes: this.processorManager.getSupportedTypes().length,
      processorCount: processorHealth.processorCount
    };

    return {
      healthy: issues.length === 0,
      issues,
      stats
    };
  }

  /**
   * 重新初始化服务
   */
  public async reinitialize(): Promise<void> {
    this.logger.info('🔄 重新初始化上传服务...');

    this.isInitialized = false;
    this.activeUploads.clear();

    await this.processorManager.reinitialize();
    await this.initialize();
  }
}

// 全局单例实例
let globalUploadService: UnifiedUploadServiceV2 | null = null;

/**
 * 获取统一上传服务的单例实例
 */
export async function getUnifiedUploadService(): Promise<UnifiedUploadServiceV2> {
  if (!globalUploadService) {
    globalUploadService = new UnifiedUploadServiceV2();
    await globalUploadService.initialize();
  }
  return globalUploadService;
}
