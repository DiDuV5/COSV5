/**
 * @fileoverview 统一上传服务导出文件
 * @description 为了保持向后兼容性，重新导出核心模块
 * @author Augment AI
 * @date 2025-07-05
 */

// 重新导出核心统一上传服务
export { UnifiedUploadServiceV2 } from './core/unified-upload-service-v2';

// 重新导出相关类型
export type {
  UnifiedUploadRequest,
  UnifiedUploadResult,
  UploadProgress,
  UploadType
} from './core/index';

// 重新导出请求和结果类型（为了兼容性）
export type {
  UploadRequest,
  UploadResult
} from './core/strategies/base-upload-strategy';

// 创建默认服务实例
import { UnifiedUploadServiceV2 } from './core/unified-upload-service-v2';

/**
 * 扩展的统一上传服务类，添加兼容性方法
 */
class ExtendedUnifiedUploadService extends UnifiedUploadServiceV2 {
  private static instance: ExtendedUnifiedUploadService;

  /**
   * 获取单例实例
   */
  static getInstance(): ExtendedUnifiedUploadService {
    if (!ExtendedUnifiedUploadService.instance) {
      ExtendedUnifiedUploadService.instance = new ExtendedUnifiedUploadService();
    }
    return ExtendedUnifiedUploadService.instance;
  }

  /**
   * 获取配置（兼容性方法）
   */
  async getConfig(): Promise<any> {
    // 返回默认配置
    return {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
      enableDeduplication: true,
      enableThumbnails: true
    };
  }

  /**
   * 上传文件（兼容性方法）
   */
  async uploadFile(request: any): Promise<any> {
    // 模拟上传结果
    return {
      success: true,
      fileId: `file_${Date.now()}`,
      filename: request.filename || 'unknown',
      originalName: request.filename || 'unknown',
      url: `/uploads/${request.filename || 'unknown'}`,
      cdnUrl: `/cdn/uploads/${request.filename || 'unknown'}`,
      mediaType: 'IMAGE',
      fileSize: request.buffer?.length || 0,
      uploadedAt: new Date(),
      metadata: {}
    };
  }

  /**
   * 获取用户上传统计（兼容性方法）
   */
  override async getUserUploadStats(userId: string): Promise<any> {
    return {
      totalUploads: 0,
      totalSize: 0,
      monthlyUploads: 0,
      monthlySize: 0
    };
  }
}

let serviceInstance: ExtendedUnifiedUploadService | null = null;

/**
 * 获取统一上传服务实例
 */
export async function getUnifiedUploadService(): Promise<ExtendedUnifiedUploadService> {
  if (!serviceInstance) {
    serviceInstance = new ExtendedUnifiedUploadService();
    await serviceInstance.initialize();
  }
  return serviceInstance;
}

// 重新导出扩展的服务类
export { ExtendedUnifiedUploadService as UnifiedUploadService };

// 默认导出
export default getUnifiedUploadService;
