/**
 * @fileoverview WebP转换服务
 * @description 处理图片到WebP格式的转换，包括异步处理和文件管理
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

import sharp from 'sharp';
import {
  DEFAULT_WEBP_CONFIG,
  WebPConversionStrategy,
  determineWebPStrategy,
  getWebPConversionParams,
  generateWebPFilename,
  formatWebPConversionLog,
  type WebPConversionConfig,
  type WebPConversionResult
} from '@/lib/config/webp-conversion-config';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';

/**
 * WebP转换请求接口
 */
export interface WebPConversionRequest {
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
  uploadResult: any;
}

/**
 * WebP转换服务类
 */
export class WebPConversionService {
  private config: WebPConversionConfig;
  private conversionQueue: Map<string, WebPConversionRequest> = new Map();
  private processingCount = 0;
  private readonly maxConcurrentConversions = 3;

  constructor(config: WebPConversionConfig = DEFAULT_WEBP_CONFIG) {
    this.config = config;
  }

  /**
   * 转换图片为WebP格式
   */
  public async convertToWebP(request: WebPConversionRequest): Promise<WebPConversionResult> {
    const startTime = Date.now();

    try {
      console.log(`🔄 开始WebP转换: ${request.originalFilename}`);

      // 分析图片信息
      const metadata = await sharp(request.buffer).metadata();
      const hasTransparency = metadata.hasAlpha || false;
      const isAnimated = (metadata.pages || 1) > 1;

      // 确定转换策略
      const strategy = determineWebPStrategy(
        request.mimeType,
        request.fileSize,
        hasTransparency,
        isAnimated,
        this.config
      );

      // 跳过转换
      if (strategy === WebPConversionStrategy.SKIP) {
        return {
          success: false,
          strategy,
          originalSize: request.fileSize,
          webpSize: request.fileSize,
          compressionRatio: 0,
          originalUrl: request.uploadResult.url,
          webpUrl: request.uploadResult.url,
          processingTime: Date.now() - startTime,
          error: 'Conversion skipped'
        };
      }

      // 获取转换参数
      const conversionParams = getWebPConversionParams(strategy, request.fileSize, this.config);
      if (!conversionParams) {
        throw new Error(`Invalid conversion strategy: ${strategy}`);
      }

      console.log(`📋 WebP转换策略: ${strategy}, 参数:`, conversionParams);

      // 执行转换
      const webpBuffer = await this.performConversion(
        request.buffer,
        strategy,
        conversionParams,
        metadata
      );

      // 生成WebP文件名和存储键
      const webpFilename = generateWebPFilename(request.originalFilename);
      const webpStorageKey = request.storageKey.replace(/\.[^/.]+$/, '.webp');

      // 上传WebP文件
      const { UnifiedR2Storage } = await import('@/lib/storage/unified-r2-storage');
      const storage = UnifiedR2Storage.getInstance();
      await storage.initialize();

      const webpUploadResult = await storage.uploadFile({
        key: webpStorageKey,
        buffer: webpBuffer,
        size: webpBuffer.length,
        contentType: 'image/webp',
        metadata: {
          originalFormat: request.mimeType,
          conversionStrategy: strategy,
          originalSize: request.fileSize.toString(),
          webpSize: webpBuffer.length.toString(),
          hasTransparency: hasTransparency.toString(),
          isAnimated: isAnimated.toString(),
        },
      });

      const compressionRatio = ((request.fileSize - webpBuffer.length) / request.fileSize) * 100;
      const processingTime = Date.now() - startTime;

      const result: WebPConversionResult = {
        success: true,
        strategy,
        originalSize: request.fileSize,
        webpSize: webpBuffer.length,
        compressionRatio,
        originalUrl: request.uploadResult.url,
        webpUrl: webpUploadResult.url,
        processingTime,
      };

      console.log(`✅ ${formatWebPConversionLog(result)}`);
      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ WebP转换失败: ${request.originalFilename}`, error);

      return {
        success: false,
        strategy: WebPConversionStrategy.SKIP,
        originalSize: request.fileSize,
        webpSize: 0,
        compressionRatio: 0,
        originalUrl: request.uploadResult.url,
        webpUrl: '',
        processingTime,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 执行实际的格式转换
   */
  private async performConversion(
    buffer: Buffer,
    strategy: WebPConversionStrategy,
    params: any,
    metadata: sharp.Metadata
  ): Promise<Buffer> {
    const sharpInstance = sharp(buffer);

    switch (strategy) {
      case WebPConversionStrategy.LOSSY:
        return sharpInstance.webp({
          quality: params.quality,
          effort: params.effort,
          lossless: false,
        }).toBuffer();

      case WebPConversionStrategy.LOSSLESS:
        return sharpInstance.webp({
          quality: params.quality,
          effort: params.effort,
          lossless: true,
        }).toBuffer();

      case WebPConversionStrategy.ANIMATED:
        // 处理动图
        if (metadata.pages && metadata.pages > 1) {
          return sharpInstance.webp({
            quality: params.quality,
            effort: params.effort,
            lossless: false,
          }).toBuffer();
        } else {
          // 非动图按有损处理
          return sharpInstance.webp({
            quality: params.quality,
            effort: params.effort,
            lossless: false,
          }).toBuffer();
        }

      default:
        throw new Error(`Unsupported conversion strategy: ${strategy}`);
    }
  }

  /**
   * 异步转换（P1功能）
   */
  public async convertToWebPAsync(request: WebPConversionRequest): Promise<string> {
    if (!this.config.asyncProcessing) {
      // 同步转换
      const result = await this.convertToWebP(request);
      return result.webpUrl;
    }

    // 生成任务ID
    const taskId = `webp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 添加到队列
    this.conversionQueue.set(taskId, request);

    console.log(`📋 WebP转换任务已加入队列: ${taskId} (队列长度: ${this.conversionQueue.size})`);

    // 异步处理
    setTimeout(() => {
      this.processConversionQueue();
    }, this.config.asyncDelay);

    // 返回原始URL，转换完成后会更新数据库
    return request.uploadResult.url;
  }

  /**
   * 处理转换队列
   */
  private async processConversionQueue(): Promise<void> {
    if (this.processingCount >= this.maxConcurrentConversions) {
      console.log(`⏳ WebP转换队列繁忙，等待处理 (当前处理: ${this.processingCount})`);
      return;
    }

    const entries = Array.from(this.conversionQueue.entries());
    if (entries.length === 0) {
      return;
    }

    const [taskId, request] = entries[0];
    this.conversionQueue.delete(taskId);
    this.processingCount++;

    try {
      console.log(`🔄 开始处理WebP转换任务: ${taskId}`);

      const result = await this.convertToWebP(request);

      if (result.success) {
        // 更新数据库记录
        await this.updateDatabaseRecord(request, result);

        // 删除原始文件（如果配置允许）
        if (!this.config.keepOriginal) {
          await this.deleteOriginalFile(request);
        }
      }

    } catch (error) {
      console.error(`❌ WebP转换任务失败: ${taskId}`, error);
    } finally {
      this.processingCount--;

      // 继续处理队列中的下一个任务
      if (this.conversionQueue.size > 0) {
        setTimeout(() => {
          this.processConversionQueue();
        }, 100);
      }
    }
  }

  /**
   * 更新数据库记录
   */
  private async updateDatabaseRecord(
    request: WebPConversionRequest,
    result: WebPConversionResult
  ): Promise<void> {
    try {
      const { prisma } = await import('@/lib/prisma');

      // 查找对应的媒体记录
      const mediaRecord = await prisma.postMedia.findFirst({
        where: {
          url: request.uploadResult.url
        }
      });

      if (mediaRecord) {
        // 生成WebP存储键
        const webpStorageKey = request.storageKey.replace(/\.[^/.]+$/, '.webp');

        await prisma.postMedia.update({
          where: { id: mediaRecord.id },
          data: {
            url: result.webpUrl,
            mimeType: 'image/webp',
            fileSize: result.webpSize,
            filename: generateWebPFilename(request.originalFilename),
            storageKey: webpStorageKey, // 更新存储键为WebP扩展名
          }
        });

        console.log(`✅ 数据库记录已更新: ${mediaRecord.id} → WebP (存储键: ${webpStorageKey})`);
      }
    } catch (error) {
      console.error('❌ 更新数据库记录失败:', error);
    }
  }

  /**
   * 删除原始文件
   */
  private async deleteOriginalFile(request: WebPConversionRequest): Promise<void> {
    try {
      const { UnifiedR2Storage } = await import('@/lib/storage/unified-r2-storage');
      const storage = UnifiedR2Storage.getInstance();

      await storage.deleteFile(request.storageKey);
      console.log(`🗑️ 原始文件已删除: ${request.storageKey}`);
    } catch (error) {
      console.error('❌ 删除原始文件失败:', error);
    }
  }

  /**
   * 获取队列状态
   */
  public getQueueStatus(): { queueLength: number; processing: number } {
    return {
      queueLength: this.conversionQueue.size,
      processing: this.processingCount,
    };
  }

  /**
   * 清空队列
   */
  public clearQueue(): void {
    this.conversionQueue.clear();
    console.log('🧹 WebP转换队列已清空');
  }
}
