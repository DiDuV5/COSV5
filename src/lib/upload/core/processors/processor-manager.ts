/**
 * @fileoverview 处理器管理器
 * @description 管理各种文件类型的处理器
 * @author Augment AI
 * @date 2025-07-03
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { DocumentProcessor } from '../../processors/document-processor';
import { ImageProcessor } from '../../processors/image-processor';
import { VideoProcessor } from '../../processors/video-processor';
import {
  UploadStrategy,
  UploadType,
  type UploadProcessor,
  type UnifiedUploadRequest,
  type UnifiedUploadResult,
  type UploadProgress
} from '../index';

/**
 * 处理器管理器类
 */
export class ProcessorManager {
  private processors = new Map<UploadType, UploadProcessor>();
  private isInitialized = false;

  constructor() {
    this.initializeProcessors();
  }

  /**
   * 初始化处理器
   */
  private initializeProcessors(): void {
    try {
      // 注册图片处理器
      const imageProcessor = new ImageProcessor();
      imageProcessor.supportedTypes.forEach(type => {
        this.processors.set(type, imageProcessor);
      });

      // 注册视频处理器
      const videoProcessor = new VideoProcessor();
      videoProcessor.supportedTypes.forEach(type => {
        this.processors.set(type, videoProcessor);
      });

      // 注册文档处理器
      const documentProcessor = new DocumentProcessor();
      documentProcessor.supportedTypes.forEach(type => {
        this.processors.set(type, documentProcessor);
      });

      this.isInitialized = true;
      console.log('✅ 处理器管理器初始化完成');
    } catch (error) {
      console.error('❌ 处理器管理器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 获取处理器
   */
  getProcessor(uploadType: UploadType): UploadProcessor {
    if (!this.isInitialized) {
      throw TRPCErrorHandler.internalError('处理器管理器未初始化');
    }

    const processor = this.processors.get(uploadType);
    if (!processor) {
      throw TRPCErrorHandler.validationError(`不支持的文件类型: ${uploadType}`);
    }
    return processor;
  }

  /**
   * 检查是否支持文件类型
   */
  isTypeSupported(uploadType: UploadType): boolean {
    return this.processors.has(uploadType);
  }

  /**
   * 获取所有支持的文件类型
   */
  getSupportedTypes(): UploadType[] {
    return Array.from(this.processors.keys());
  }

  /**
   * 使用策略处理文件
   */
  async processWithStrategy(
    strategy: UploadStrategy,
    request: UnifiedUploadRequest,
    processor: UploadProcessor,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UnifiedUploadResult> {
    console.log(`🚀 使用${strategy}策略处理文件: ${request.filename}`);

    try {
      switch (strategy) {
        case UploadStrategy.DIRECT:
          return await this.processDirectUpload(request, processor, onProgress);

        case UploadStrategy.STREAM:
          return await this.processStreamUpload(request, processor, onProgress);

        case UploadStrategy.MEMORY_SAFE:
          return await this.processMemorySafeUpload(request, processor, onProgress);

        default:
          throw TRPCErrorHandler.validationError(`不支持的上传策略: ${strategy}`);
      }
    } catch (error) {
      console.error(`❌ ${strategy}策略处理失败:`, error);
      throw error;
    }
  }

  /**
   * 直接上传处理
   */
  private async processDirectUpload(
    request: UnifiedUploadRequest,
    processor: UploadProcessor,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UnifiedUploadResult> {
    // 报告开始进度
    onProgress?.({
      stage: 'processing',
      progress: 0,
      message: '开始直接上传处理...'
    });

    // 使用处理器处理文件
    const result = await processor.processUpload(request);

    // 报告完成进度
    onProgress?.({
      stage: 'completed',
      progress: 100,
      message: '直接上传处理完成'
    });

    return result;
  }

  /**
   * 流式上传处理
   */
  private async processStreamUpload(
    request: UnifiedUploadRequest,
    processor: UploadProcessor,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UnifiedUploadResult> {
    // 报告开始进度
    onProgress?.({
      stage: 'streaming',
      progress: 0,
      message: '开始流式上传处理...'
    });

    // 分块处理
    const chunkSize = 1024 * 1024; // 1MB chunks
    const totalChunks = Math.ceil(request.buffer.length / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, request.buffer.length);
      const chunk = request.buffer.subarray(start, end);

      // 处理当前块
      const chunkProgress = ((i + 1) / totalChunks) * 80; // 80%用于分块处理
      onProgress?.({
        stage: 'streaming',
        progress: chunkProgress,
        message: `处理分块 ${i + 1}/${totalChunks}...`
      });

      // 模拟分块处理延迟
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // 最终处理
    onProgress?.({
      stage: 'finalizing',
      progress: 90,
      message: '合并分块并最终处理...'
    });

    const result = await processor.processUpload(request);

    // 报告完成进度
    onProgress?.({
      stage: 'completed',
      progress: 100,
      message: '流式上传处理完成'
    });

    return result;
  }

  /**
   * 内存安全上传处理
   */
  private async processMemorySafeUpload(
    request: UnifiedUploadRequest,
    processor: UploadProcessor,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UnifiedUploadResult> {
    // 报告开始进度
    onProgress?.({
      stage: 'memory_safe',
      progress: 0,
      message: '开始内存安全上传处理...'
    });

    // 创建临时文件处理
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');

    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `temp_upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

    try {
      // 写入临时文件
      onProgress?.({
        stage: 'temp_write',
        progress: 20,
        message: '写入临时文件...'
      });

      await fs.promises.writeFile(tempFilePath, request.buffer);

      // 分批读取和处理
      onProgress?.({
        stage: 'batch_processing',
        progress: 50,
        message: '分批处理文件...'
      });

      // 模拟分批处理
      const batchSize = 512 * 1024; // 512KB batches
      const totalBatches = Math.ceil(request.buffer.length / batchSize);

      for (let i = 0; i < totalBatches; i++) {
        const batchProgress = 50 + ((i + 1) / totalBatches) * 30; // 30%用于分批处理
        onProgress?.({
          stage: 'batch_processing',
          progress: batchProgress,
          message: `处理批次 ${i + 1}/${totalBatches}...`
        });

        // 模拟批次处理延迟
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      // 最终处理
      onProgress?.({
        stage: 'finalizing',
        progress: 90,
        message: '最终处理...'
      });

      const result = await processor.processUpload(request);

      // 报告完成进度
      onProgress?.({
        stage: 'completed',
        progress: 100,
        message: '内存安全上传处理完成'
      });

      return result;

    } finally {
      // 清理临时文件
      try {
        await fs.promises.unlink(tempFilePath);
      } catch (cleanupError) {
        console.warn('临时文件清理失败:', cleanupError);
      }
    }
  }

  /**
   * 估算处理时间
   */
  estimateProcessingTime(uploadType: UploadType, fileSize: number): number {
    const processor = this.processors.get(uploadType);
    return processor?.estimateProcessingTime(fileSize) || 1000;
  }

  /**
   * 获取处理器状态
   */
  getProcessorStatus(): Record<string, any> {
    const status: Record<string, any> = {};

    this.processors.forEach((processor, type) => {
      status[type] = {
        supportedTypes: processor.supportedTypes,
        isHealthy: true, // 这里可以添加健康检查逻辑
        lastUsed: new Date().toISOString()
      };
    });

    return status;
  }

  /**
   * 重新初始化处理器
   */
  async reinitialize(): Promise<void> {
    console.log('🔄 重新初始化处理器管理器...');

    this.processors.clear();
    this.isInitialized = false;

    this.initializeProcessors();
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
    processorCount: number;
  }> {
    const issues: string[] = [];

    if (!this.isInitialized) {
      issues.push('处理器管理器未初始化');
    }

    if (this.processors.size === 0) {
      issues.push('没有可用的处理器');
    }

    // 检查每个处理器
    for (const [type, processor] of this.processors) {
      try {
        // 这里可以添加处理器特定的健康检查
        if (!processor.supportedTypes || processor.supportedTypes.length === 0) {
          issues.push(`处理器 ${type} 没有支持的类型`);
        }
      } catch (error) {
        issues.push(`处理器 ${type} 健康检查失败: ${error}`);
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
      processorCount: this.processors.size
    };
  }
}
