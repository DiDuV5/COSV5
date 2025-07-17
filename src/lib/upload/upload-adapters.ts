/**
 * @fileoverview 上传适配器
 * @description 提供tRPC和REST API的上传适配器
 * @author Augment AI
 * @date 2025-07-05
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { UserLevel } from '@/types/user-level';
import { getUnifiedUploadService } from './unified-service';
import type { UploadRequest, UploadResult } from './core/strategies/base-upload-strategy';

/**
 * tRPC上传适配器
 */
export class TRPCUploadAdapter {
  private uploadService: any = null;

  constructor() {
    this.initializeService();
  }

  /**
   * 初始化上传服务
   */
  private async initializeService(): Promise<void> {
    try {
      this.uploadService = await getUnifiedUploadService();
    } catch (error) {
      throw TRPCErrorHandler.handleError(error, {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'tRPC上传适配器初始化失败'
      });
    }
  }

  /**
   * 处理tRPC上传请求
   */
  async handleUpload(request: UploadRequest): Promise<UploadResult> {
    try {
      if (!this.uploadService) {
        await this.initializeService();
      }

      return await this.uploadService.upload(request);
    } catch (error) {
      throw TRPCErrorHandler.handleError(error, {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'tRPC上传处理失败'
      });
    }
  }

  /**
   * 验证上传请求
   */
  async validateRequest(request: UploadRequest): Promise<boolean> {
    try {
      if (!this.uploadService) {
        await this.initializeService();
      }

      return await this.uploadService.validateRequest(request);
    } catch (error) {
      throw TRPCErrorHandler.handleError(error, {
        code: 'BAD_REQUEST',
        message: 'tRPC上传请求验证失败'
      });
    }
  }

  /**
   * 处理上传（静态方法，兼容性）
   */
  static async processUpload(params: any): Promise<any> {
    const adapter = new TRPCUploadAdapter();
    return await adapter.handleUpload(params);
  }

  /**
   * 统一上传（静态方法，兼容性）
   */
  static async unifiedUpload(params: any): Promise<any> {
    const adapter = new TRPCUploadAdapter();
    return await adapter.handleUpload(params);
  }

  /**
   * 增强文件处理（静态方法，兼容性）
   */
  static async processFileEnhanced(params: any): Promise<any> {
    const adapter = new TRPCUploadAdapter();
    return await adapter.handleUpload(params);
  }
}

/**
 * REST API上传适配器
 */
export class RESTUploadAdapter {
  private uploadService: any = null;

  constructor() {
    this.initializeService();
  }

  /**
   * 初始化上传服务
   */
  private async initializeService(): Promise<void> {
    try {
      this.uploadService = await getUnifiedUploadService();
    } catch (error) {
      console.error('REST上传适配器初始化失败:', error);
      throw new Error('REST上传适配器初始化失败');
    }
  }

  /**
   * 处理REST上传请求
   */
  async handleUpload(request: UploadRequest): Promise<UploadResult> {
    try {
      if (!this.uploadService) {
        await this.initializeService();
      }

      return await this.uploadService.upload(request);
    } catch (error) {
      console.error('REST上传处理失败:', error);
      throw new Error('REST上传处理失败');
    }
  }

  /**
   * 验证上传请求
   */
  async validateRequest(request: UploadRequest): Promise<boolean> {
    try {
      if (!this.uploadService) {
        await this.initializeService();
      }

      return await this.uploadService.validateRequest(request);
    } catch (error) {
      console.error('REST上传请求验证失败:', error);
      throw new Error('REST上传请求验证失败');
    }
  }

  /**
   * 转换为REST响应格式
   */
  formatResponse(result: UploadResult): any {
    return {
      success: result.success,
      data: {
        fileId: result.fileId,
        filename: result.filename,
        originalName: result.originalName,
        url: result.url,
        cdnUrl: result.cdnUrl,
        thumbnailUrl: result.thumbnailUrl,
        mediaType: result.mediaType,
        width: result.width,
        height: result.height,
        fileSize: result.fileSize,
        duration: result.duration
      },
      message: result.success ? '上传成功' : '上传失败'
    };
  }

  /**
   * 处理单个文件上传（静态方法，兼容性）
   */
  static async processSingleUpload(params: any): Promise<any> {
    const adapter = new RESTUploadAdapter();
    const result = await adapter.handleUpload(params);
    return adapter.formatResponse(result);
  }

  /**
   * 处理批量文件上传（静态方法，兼容性）
   */
  static async processBatchUpload(params: any): Promise<any> {
    const adapter = new RESTUploadAdapter();
    const results: any[] = [];

    // 模拟批量上传
    if (params.files && Array.isArray(params.files)) {
      for (const file of params.files) {
        const result = await adapter.handleUpload(file);
        results.push(result);
      }
    }

    return {
      success: true,
      results,
      message: '批量上传完成'
    };
  }
}

// 创建默认实例
export const trpcUploadAdapter = new TRPCUploadAdapter();
export const restUploadAdapter = new RESTUploadAdapter();

// 重新导出基础类型
export type { UploadRequest, UploadResult } from './core/strategies/base-upload-strategy';
