/**
 * @fileoverview 配置工具函数
 * @description 配置相关的工具函数
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { UserLevel } from '@/types/user-level';

/**
 * 配置工具函数类
 */
export class ConfigUtils {
  /**
   * 检查是否为视频文件
   */
  public static isVideoFile(mimeType: string): boolean {
    const videoMimeTypes = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      'video/avi'
    ];

    return videoMimeTypes.includes(mimeType.toLowerCase());
  }

  /**
   * 判断是否应该使用混合上传策略
   */
  public static shouldUseHybridStrategy(fileSize: number, userLevel: UserLevel): boolean {
    // 大于50MB的文件使用混合策略
    const threshold = 50 * 1024 * 1024; // 50MB

    // VIP用户和创作者可以使用混合策略处理更大的文件
    const isVipUser = ['VIP', 'CREATOR', 'ADMIN', 'SUPER_ADMIN'].includes(userLevel);

    return fileSize > threshold || isVipUser;
  }

  /**
   * 获取视频处理配置
   */
  public static getVideoProcessingConfig(): any {
    return {
      requiredCodec: 'h264',
      outputFormats: ['mp4'],
      browserCompatibleCodecs: ['h264', 'avc1'],
      defaultQuality: 23,
      maxResolution: '1920x1080',
      enableTranscoding: true,
      enableThumbnailGeneration: true,
    };
  }

  /**
   * 获取R2配置
   */
  public static async getR2Config(): Promise<any> {
    return {
      accountId: process.env.COSEREEDEN_CLOUDFLARE_ACCOUNT_ID || 'test-account-id',
      accessKeyId: process.env.COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID || 'test-access-key',
      secretAccessKey: process.env.COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY || 'test-secret-key',
      bucketName: process.env.COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME || 'test-bucket',
      endpoint: process.env.COSEREEDEN_CLOUDFLARE_R2_ENDPOINT || 'https://test.r2.cloudflarestorage.com',
      cdnDomain: process.env.COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN || 'https://test.cdn.com',
    };
  }

  /**
   * 验证文件类型
   */
  public static isValidFileType(mimeType: string, allowedTypes: string[]): boolean {
    if (allowedTypes.includes('*')) {
      return true;
    }

    return allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        const category = type.slice(0, -2);
        return mimeType.startsWith(category + '/');
      }
      return mimeType === type;
    });
  }

  /**
   * 格式化文件大小
   */
  public static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 检查用户级别权限
   */
  public static hasPermission(userLevel: UserLevel, requiredLevel: UserLevel): boolean {
    const levels = ['GUEST', 'USER', 'VIP', 'CREATOR', 'ADMIN', 'SUPER_ADMIN'];
    const userIndex = levels.indexOf(userLevel);
    const requiredIndex = levels.indexOf(requiredLevel);

    return userIndex >= requiredIndex;
  }
}
