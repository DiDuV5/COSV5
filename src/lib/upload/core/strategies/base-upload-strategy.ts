/**
 * @fileoverview 基础上传策略抽象类
 * @description 定义所有上传策略的通用接口和基础功能
 * @author Augment AI
 * @date 2025-06-30
 * @version 1.0.0
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { UserLevel } from '@/types/user-level';
import { UploadConfigManager } from '../upload-config-manager';

/**
 * 上传请求接口
 */
export interface UploadRequest {
  filename: string;
  buffer: Buffer;
  mimeType: string;
  userId: string;
  userLevel: UserLevel;
  postId?: string;

  // 处理选项
  enableDeduplication?: boolean;
  generateThumbnails?: boolean;
  autoTranscodeVideo?: boolean;

  // 图片处理选项
  imageQuality?: number;
  maxWidth?: number;
  maxHeight?: number;

  // 元数据
  customMetadata?: Record<string, any>;
}

/**
 * 上传结果接口
 */
export interface UploadResult {
  success: boolean;
  fileId: string;
  filename: string;
  originalName: string;
  url: string;
  cdnUrl: string;
  thumbnailUrl?: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'GIF';
  width?: number;
  height?: number;
  duration?: number;
  fileSize: number;
  isDuplicate?: boolean;

  // 测试兼容性属性
  strategy?: string; // 使用的上传策略
  isAsync?: boolean; // 是否异步上传
  sessionId?: string; // 上传会话ID
  size?: number; // 文件大小（fileSize的别名）
  uploadedAt?: Date; // 上传时间
  metadata?: Record<string, any>; // 元数据

  processingInfo?: {
    hasMultipleSizes?: boolean;
    isTranscoded?: boolean;
    thumbnailGenerated?: boolean;
    compressionApplied?: boolean;
  };
  uploadStats?: {
    uploadTime: number;
    processingTime: number;
    compressionRatio: number;
  };
  error?: string;
}

/**
 * 上传进度接口
 */
export interface UploadProgress {
  stage: 'validation' | 'upload' | 'processing' | 'finalization' | 'complete' | 'error';
  progress: number; // 0-100
  bytesUploaded: number;
  totalBytes: number;
  speed?: number; // bytes/second
  estimatedTimeRemaining?: number; // seconds
  message?: string;
}

/**
 * 基础上传策略抽象类
 */
export abstract class BaseUploadStrategy {
  // 简化配置管理
  protected config = {
    streamThreshold: 50 * 1024 * 1024, // 50MB
    memorySafeThreshold: 100 * 1024 * 1024, // 100MB
  };

  /**
   * 策略名称
   */
  abstract readonly strategyName: string;

  /**
   * 执行上传
   */
  abstract upload(
    request: UploadRequest,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult>;

  /**
   * 验证上传请求
   */
  protected validateRequest(request: UploadRequest): void {
    // 简化的用户配置
    const maxFileSize = 1000 * 1024 * 1024; // 1GB

    // 验证文件大小
    if (request.buffer.length > maxFileSize) {
      throw TRPCErrorHandler.validationError(
        `文件大小超出限制: ${Math.round(request.buffer.length / 1024 / 1024)}MB > ${Math.round(maxFileSize / 1024 / 1024)}MB`
      );
    }

    // 验证MIME类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm'];
    if (!allowedTypes.includes(request.mimeType)) {
      throw TRPCErrorHandler.validationError(
        `不支持的文件类型: ${request.mimeType}`
      );
    }

    // 验证文件名
    if (!request.filename || request.filename.trim().length === 0) {
      throw TRPCErrorHandler.validationError('文件名不能为空');
    }

    // 验证用户ID
    if (!request.userId || request.userId.trim().length === 0) {
      throw TRPCErrorHandler.validationError('用户ID不能为空');
    }
  }

  /**
   * 检查文件类型
   */
  protected getMediaType(mimeType: string): 'IMAGE' | 'VIDEO' | 'GIF' {
    if (mimeType === 'image/gif') {
      return 'GIF';
    } else if (mimeType.startsWith('image/')) {
      return 'IMAGE';
    } else if (mimeType.startsWith('video/')) {
      return 'VIDEO';
    } else {
      throw TRPCErrorHandler.validationError(`不支持的媒体类型: ${mimeType}`);
    }
  }

  /**
   * 生成文件ID
   */
  protected generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 计算文件哈希
   */
  protected async calculateFileHash(buffer: Buffer): Promise<string> {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * 报告进度
   */
  protected reportProgress(
    onProgress: ((progress: UploadProgress) => void) | undefined,
    progress: Partial<UploadProgress>
  ): void {
    if (onProgress) {
      const fullProgress: UploadProgress = {
        stage: 'upload',
        progress: 0,
        bytesUploaded: 0,
        totalBytes: 0,
        ...progress,
      };
      onProgress(fullProgress);
    }
  }

  /**
   * 处理上传错误（使用统一错误处理器）
   */
  protected handleUploadError(error: any, context: any): never {
    console.error(`❌ ${this.strategyName}上传失败:`, error);

    // 如果已经是TRPCError，直接抛出
    if (error?.name === 'TRPCError') {
      throw error;
    }

    // 使用TRPCErrorHandler抛出错误
    throw TRPCErrorHandler.internalError(
      error.message || '上传失败',
      {
        context: {
          strategy: this.strategyName,
          ...context,
        }
      }
    );
  }

  /**
   * 记录上传统计
   */
  protected logUploadStats(
    request: UploadRequest,
    result: UploadResult,
    startTime: number
  ): void {
    const duration = Date.now() - startTime;
    const sizeInMB = Math.round(request.buffer.length / 1024 / 1024 * 100) / 100;
    const speedMBps = Math.round(sizeInMB / (duration / 1000) * 100) / 100;

    console.log(`📊 ${this.strategyName}上传统计:`, {
      filename: request.filename,
      size: `${sizeInMB}MB`,
      duration: `${duration}ms`,
      speed: `${speedMBps}MB/s`,
      strategy: this.strategyName,
      success: result.success,
    });
  }

  /**
   * 获取策略信息
   */
  public getStrategyInfo(): {
    name: string;
    description: string;
    supportedFeatures: string[];
    limitations: string[];
  } {
    return {
      name: this.strategyName,
      description: this.getStrategyDescription(),
      supportedFeatures: this.getSupportedFeatures(),
      limitations: this.getLimitations(),
    };
  }

  /**
   * 获取策略描述（子类实现）
   */
  protected abstract getStrategyDescription(): string;

  /**
   * 获取支持的功能（子类实现）
   */
  protected abstract getSupportedFeatures(): string[];

  /**
   * 获取限制条件（子类实现）
   */
  protected abstract getLimitations(): string[];
}
