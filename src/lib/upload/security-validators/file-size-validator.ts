/**
 * @fileoverview 文件大小验证器
 * @description 根据用户等级和文件类型验证文件大小限制
 */

import { ALLOWED_FILE_TYPES, getFileSizeLimit } from '../file-security-constants';
import type { UserLevel } from '@/types/user-level';
import type { FileValidationResult } from '../types/validation-types';

/**
 * 文件大小验证器类
 */
export class FileSizeValidator {
  /**
   * 验证文件大小
   */
  public validateFileSize(
    fileSize: number,
    mimeType: string,
    userLevel: UserLevel,
    result: FileValidationResult
  ): void {
    // 检查文件是否为空
    if (fileSize === 0) {
      result.errors.push('文件为空');
      this.updateRiskLevel(result, 'medium');
      return;
    }

    // 检查文件是否过小（可能是恶意文件）
    if (fileSize < 10) {
      result.warnings.push('文件过小，可能存在问题');
      this.updateRiskLevel(result, 'medium');
    }

    // 确定文件类别
    const fileCategory = this.determineFileCategory(mimeType);

    if (!fileCategory) {
      result.errors.push('无法确定文件类别，无法验证大小限制');
      this.updateRiskLevel(result, 'medium');
      return;
    }

    // 获取大小限制
    const sizeLimit = getFileSizeLimit(fileCategory, userLevel as any);

    if (sizeLimit === 0) {
      result.errors.push(`您的用户级别(${userLevel})不允许上传此类文件`);
      this.updateRiskLevel(result, 'high');
      return;
    }

    if (fileSize > sizeLimit) {
      result.errors.push(
        `文件大小超出限制: ${this.formatFileSize(fileSize)} > ${this.formatFileSize(sizeLimit)}`
      );
      this.updateRiskLevel(result, 'medium');
    }

    // 检查是否接近限制（警告）
    const warningThreshold = sizeLimit * 0.9; // 90%阈值
    if (fileSize > warningThreshold && fileSize <= sizeLimit) {
      result.warnings.push(
        `文件大小接近限制: ${this.formatFileSize(fileSize)} (限制: ${this.formatFileSize(sizeLimit)})`
      );
    }

    // 检查异常大的文件
    this.checkAbnormalFileSize(fileSize, mimeType, result);
  }

  /**
   * 确定文件类别
   */
  private determineFileCategory(mimeType: string): 'IMAGES' | 'VIDEOS' | 'DOCUMENTS' | 'ARCHIVES' | null {
    if (ALLOWED_FILE_TYPES.IMAGES.includes(mimeType as any)) {
      return 'IMAGES';
    } else if (ALLOWED_FILE_TYPES.VIDEOS.includes(mimeType as any)) {
      return 'VIDEOS';
    } else if (ALLOWED_FILE_TYPES.DOCUMENTS.includes(mimeType as any)) {
      return 'DOCUMENTS';
    } else if (ALLOWED_FILE_TYPES.ARCHIVES.includes(mimeType as any)) {
      return 'ARCHIVES';
    }
    return null;
  }

  /**
   * 检查异常大的文件
   */
  private checkAbnormalFileSize(fileSize: number, mimeType: string, result: FileValidationResult): void {
    // 定义各类型文件的异常大小阈值
    const abnormalSizeThresholds = {
      'image/jpeg': 50 * 1024 * 1024,  // 50MB
      'image/png': 100 * 1024 * 1024,  // 100MB
      'image/gif': 20 * 1024 * 1024,   // 20MB
      'image/webp': 30 * 1024 * 1024,  // 30MB
      'video/mp4': 2 * 1024 * 1024 * 1024, // 2GB
      'video/avi': 2 * 1024 * 1024 * 1024, // 2GB
      'video/mov': 2 * 1024 * 1024 * 1024, // 2GB
      'application/pdf': 100 * 1024 * 1024, // 100MB
      'application/zip': 500 * 1024 * 1024, // 500MB
    };

    const threshold = abnormalSizeThresholds[mimeType as keyof typeof abnormalSizeThresholds];

    if (threshold && fileSize > threshold) {
      result.warnings.push(
        `文件大小异常: ${this.formatFileSize(fileSize)} 对于 ${mimeType} 类型文件来说过大`
      );
      this.updateRiskLevel(result, 'medium');
    }

    // 检查极小的媒体文件（可能是恶意文件）
    if (mimeType.startsWith('image/') && fileSize < 100) {
      result.warnings.push('图片文件过小，可能不是有效的图片文件');
      this.updateRiskLevel(result, 'medium');
    }

    if (mimeType.startsWith('video/') && fileSize < 1024) {
      result.warnings.push('视频文件过小，可能不是有效的视频文件');
      this.updateRiskLevel(result, 'medium');
    }
  }

  /**
   * 格式化文件大小显示
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes}B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)}KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
    } else {
      return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}GB`;
    }
  }

  /**
   * 获取用户等级的文件大小限制信息
   */
  public getUserSizeLimits(userLevel: UserLevel): Record<string, number> {
    return {
      images: getFileSizeLimit('IMAGES', userLevel as any),
      videos: getFileSizeLimit('VIDEOS', userLevel as any),
      documents: getFileSizeLimit('DOCUMENTS', userLevel as any),
      archives: getFileSizeLimit('ARCHIVES', userLevel as any),
    };
  }

  /**
   * 检查文件大小是否在用户限制内
   */
  public isFileSizeAllowed(
    fileSize: number,
    mimeType: string,
    userLevel: UserLevel
  ): boolean {
    const fileCategory = this.determineFileCategory(mimeType);
    if (!fileCategory) return false;

    const sizeLimit = getFileSizeLimit(fileCategory, userLevel as any);
    return sizeLimit > 0 && fileSize <= sizeLimit;
  }

  /**
   * 更新风险等级
   */
  private updateRiskLevel(
    result: FileValidationResult,
    newLevel: 'low' | 'medium' | 'high' | 'critical'
  ): void {
    const levels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(result.riskLevel);
    const newIndex = levels.indexOf(newLevel);

    if (newIndex > currentIndex) {
      result.riskLevel = newLevel;
    }
  }
}
