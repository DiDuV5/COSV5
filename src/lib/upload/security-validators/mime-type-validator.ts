/**
 * @fileoverview MIME类型验证器
 * @description 验证文件MIME类型的安全性
 */

import { getAllAllowedMimeTypes } from '../file-security-constants';
import type { FileValidationResult } from '../types/validation-types';

/**
 * MIME类型验证器类
 */
export class MimeTypeValidator {
  private readonly allowedMimeTypes: string[];

  constructor() {
    this.allowedMimeTypes = getAllAllowedMimeTypes();
  }

  /**
   * 验证MIME类型
   */
  public validateMimeType(mimeType: string, result: FileValidationResult): void {
    // 白名单验证
    if (!this.allowedMimeTypes.includes(mimeType)) {
      result.errors.push(`MIME类型不在允许列表中: ${mimeType}`);
      this.updateRiskLevel(result, 'high');
    }

    // 检查危险的MIME类型
    const dangerousMimeTypes = [
      'application/x-executable',
      'application/x-msdownload',
      'application/x-msdos-program',
      'application/x-winexe',
      'application/x-php',
      'application/x-httpd-php',
      'text/x-php',
      'application/x-javascript',
      'text/javascript',
      'application/javascript',
      'application/x-sh',
      'application/x-shellscript',
      'text/x-shellscript',
      'application/x-perl',
      'text/x-perl',
      'application/x-python',
      'text/x-python',
      'application/x-ruby',
      'text/x-ruby',
      'application/java-archive',
      'application/x-java-archive',
      'application/x-dosexec',
      'application/x-msdownload',
      'application/x-msi',
      'application/x-apple-diskimage',
      'application/x-iso9660-image'
    ];

    if (dangerousMimeTypes.includes(mimeType)) {
      result.errors.push(`检测到危险的MIME类型: ${mimeType}`);
      this.updateRiskLevel(result, 'critical');
    }

    // 检查可疑的MIME类型
    const suspiciousMimeTypes = [
      'application/octet-stream', // 通用二进制文件
      'application/x-unknown',
      'application/unknown',
      'text/html', // HTML文件可能包含脚本
      'text/xml',  // XML文件可能包含恶意内容
      'application/xml'
    ];

    if (suspiciousMimeTypes.includes(mimeType)) {
      result.warnings.push(`检测到可疑的MIME类型: ${mimeType}`);
      this.updateRiskLevel(result, 'medium');
    }

    // 检查MIME类型格式
    if (!this.isValidMimeTypeFormat(mimeType)) {
      result.errors.push(`MIME类型格式无效: ${mimeType}`);
      this.updateRiskLevel(result, 'high');
    }
  }

  /**
   * 验证MIME类型格式是否正确
   */
  private isValidMimeTypeFormat(mimeType: string): boolean {
    // MIME类型应该是 type/subtype 格式
    const mimeTypePattern = /^[a-zA-Z][a-zA-Z0-9][a-zA-Z0-9\!\#\$\&\-\^\_]*\/[a-zA-Z0-9][a-zA-Z0-9\!\#\$\&\-\^\_\+]*$/;
    return mimeTypePattern.test(mimeType);
  }

  /**
   * 检查MIME类型是否为媒体文件
   */
  public isMediaMimeType(mimeType: string): boolean {
    return mimeType.startsWith('image/') || 
           mimeType.startsWith('video/') || 
           mimeType.startsWith('audio/');
  }

  /**
   * 检查MIME类型是否为图片
   */
  public isImageMimeType(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * 检查MIME类型是否为视频
   */
  public isVideoMimeType(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  /**
   * 检查MIME类型是否为音频
   */
  public isAudioMimeType(mimeType: string): boolean {
    return mimeType.startsWith('audio/');
  }

  /**
   * 检查MIME类型是否为文档
   */
  public isDocumentMimeType(mimeType: string): boolean {
    const documentMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'text/rtf'
    ];
    
    return documentMimeTypes.includes(mimeType);
  }

  /**
   * 检查MIME类型是否为压缩文件
   */
  public isArchiveMimeType(mimeType: string): boolean {
    const archiveMimeTypes = [
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/x-tar',
      'application/gzip',
      'application/x-bzip2',
      'application/x-xz'
    ];
    
    return archiveMimeTypes.includes(mimeType);
  }

  /**
   * 获取允许的MIME类型列表
   */
  public getAllowedMimeTypes(): string[] {
    return [...this.allowedMimeTypes];
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
