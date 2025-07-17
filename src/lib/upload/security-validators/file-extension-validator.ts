/**
 * @fileoverview 文件扩展名验证器
 * @description 验证文件扩展名的安全性，基于白名单和黑名单
 */

import path from 'path';
import { 
  getAllForbiddenExtensions,
  getAllAllowedExtensions
} from '../file-security-constants';
import type { FileValidationResult } from '../types/validation-types';

/**
 * 文件扩展名验证器类
 */
export class FileExtensionValidator {
  private readonly forbiddenExtensions: string[];
  private readonly allowedExtensions: string[];

  constructor() {
    this.forbiddenExtensions = getAllForbiddenExtensions();
    this.allowedExtensions = getAllAllowedExtensions();
  }

  /**
   * 验证文件扩展名
   */
  public validateFileExtension(fileName: string, result: FileValidationResult): void {
    const extension = path.extname(fileName).toLowerCase();

    // 检查是否有扩展名
    if (!extension) {
      result.warnings.push('文件没有扩展名');
      this.updateRiskLevel(result, 'medium');
      return;
    }

    // 检查是否在禁止列表中
    if (this.forbiddenExtensions.includes(extension)) {
      result.errors.push(`禁止的文件扩展名: ${extension}`);
      this.updateRiskLevel(result, 'critical');
      return;
    }

    // 检查是否在允许列表中（白名单验证）
    if (!this.allowedExtensions.includes(extension)) {
      result.errors.push(`文件扩展名不在允许列表中: ${extension}`);
      this.updateRiskLevel(result, 'high');
    }

    // 检查双重扩展名（常见的恶意文件伪装技术）
    const doubleExtensionPattern = /\.(exe|bat|cmd|scr|pif|com|vbs|js|jar|app)\.(jpg|jpeg|png|gif|pdf|txt|doc|docx)$/i;
    if (doubleExtensionPattern.test(fileName)) {
      result.errors.push('检测到双重扩展名，可能是恶意文件伪装');
      this.updateRiskLevel(result, 'critical');
    }

    // 检查可疑的扩展名组合
    const suspiciousExtensions = [
      '.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.vbs', '.js', '.jar', '.app',
      '.php', '.asp', '.jsp', '.cgi', '.pl', '.py', '.rb',
      '.sh', '.bash', '.zsh', '.fish',
      '.msi', '.deb', '.rpm', '.dmg',
      '.iso', '.img', '.vhd', '.vmdk'
    ];

    if (suspiciousExtensions.includes(extension)) {
      result.errors.push(`检测到高风险文件扩展名: ${extension}`);
      this.updateRiskLevel(result, 'critical');
    }
  }

  /**
   * 检查扩展名与MIME类型的匹配性
   */
  public validateExtensionMimeMatch(
    fileName: string, 
    mimeType: string, 
    result: FileValidationResult
  ): void {
    const extension = path.extname(fileName).toLowerCase();
    
    // 定义扩展名与MIME类型的映射关系
    const extensionMimeMap: Record<string, string[]> = {
      '.jpg': ['image/jpeg'],
      '.jpeg': ['image/jpeg'],
      '.png': ['image/png'],
      '.gif': ['image/gif'],
      '.webp': ['image/webp'],
      '.bmp': ['image/bmp'],
      '.tiff': ['image/tiff'],
      '.svg': ['image/svg+xml'],
      '.mp4': ['video/mp4'],
      '.avi': ['video/x-msvideo'],
      '.mov': ['video/quicktime'],
      '.wmv': ['video/x-ms-wmv'],
      '.flv': ['video/x-flv'],
      '.webm': ['video/webm'],
      '.mkv': ['video/x-matroska'],
      '.mp3': ['audio/mpeg'],
      '.wav': ['audio/wav'],
      '.ogg': ['audio/ogg'],
      '.flac': ['audio/flac'],
      '.aac': ['audio/aac'],
      '.pdf': ['application/pdf'],
      '.doc': ['application/msword'],
      '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      '.xls': ['application/vnd.ms-excel'],
      '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      '.ppt': ['application/vnd.ms-powerpoint'],
      '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
      '.txt': ['text/plain'],
      '.csv': ['text/csv'],
      '.zip': ['application/zip'],
      '.rar': ['application/x-rar-compressed'],
      '.7z': ['application/x-7z-compressed'],
      '.tar': ['application/x-tar'],
      '.gz': ['application/gzip']
    };

    const expectedMimeTypes = extensionMimeMap[extension];
    
    if (expectedMimeTypes && !expectedMimeTypes.includes(mimeType)) {
      result.warnings.push(
        `MIME类型与文件扩展名不匹配: ${mimeType} vs ${extension} (期望: ${expectedMimeTypes.join(', ')})`
      );
      this.updateRiskLevel(result, 'medium');
    }
  }

  /**
   * 获取允许的扩展名列表
   */
  public getAllowedExtensions(): string[] {
    return [...this.allowedExtensions];
  }

  /**
   * 获取禁止的扩展名列表
   */
  public getForbiddenExtensions(): string[] {
    return [...this.forbiddenExtensions];
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
