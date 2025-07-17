/**
 * @fileoverview 文件名安全验证器
 * @description 验证文件名的安全性，防止路径遍历攻击等
 */

import type { FileValidationResult } from '../types/validation-types';

/**
 * 文件名验证器类
 */
export class FileNameValidator {
  /**
   * 验证文件名安全性
   */
  public validateFileName(fileName: string, result: FileValidationResult): void {
    // 检查文件名长度
    if (fileName.length > 255) {
      result.errors.push('文件名过长，最大允许255个字符');
      this.updateRiskLevel(result, 'medium');
    }

    // 检查空文件名
    if (!fileName.trim()) {
      result.errors.push('文件名不能为空');
      this.updateRiskLevel(result, 'high');
    }

    // 检查非法字符
    const illegalChars = /[<>:"|?*\x00-\x1f]/;
    if (illegalChars.test(fileName)) {
      result.errors.push('文件名包含非法字符');
      this.updateRiskLevel(result, 'high');
    }

    // 检查Windows保留名称
    const reservedNames = [
      'CON', 'PRN', 'AUX', 'NUL',
      'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
      'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];
    
    const nameWithoutExt = fileName.split('.')[0].toUpperCase();
    if (reservedNames.includes(nameWithoutExt)) {
      result.errors.push(`文件名使用了系统保留名称: ${nameWithoutExt}`);
      this.updateRiskLevel(result, 'high');
    }

    // 检查隐藏文件（以.开头）
    if (fileName.startsWith('.') && fileName !== '.htaccess') {
      result.warnings.push('检测到隐藏文件');
      this.updateRiskLevel(result, 'medium');
    }

    // 检查多重扩展名（可能的伪装）
    const parts = fileName.split('.');
    if (parts.length > 3) {
      result.warnings.push('文件名包含多重扩展名，可能存在伪装');
      this.updateRiskLevel(result, 'medium');
    }

    // 检查可疑的文件名模式
    const suspiciousPatterns = [
      /\.(exe|bat|cmd|scr|pif|com|vbs|js|jar|app)$/i,
      /\.(php|asp|jsp|cgi)$/i,
      /\.(sh|bash|zsh|fish)$/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(fileName)) {
        result.errors.push(`文件名包含可疑的扩展名: ${fileName}`);
        this.updateRiskLevel(result, 'critical');
        break;
      }
    }

    // 检查路径遍历攻击（更精确的检查）
    if (fileName.includes('..') ||
        fileName.includes('../') ||
        fileName.includes('..\\') ||
        fileName.startsWith('/') ||
        fileName.startsWith('\\') ||
        fileName.includes(':/') ||
        fileName.includes(':\\')) {
      result.errors.push('文件名包含路径遍历字符，存在安全风险');
      this.updateRiskLevel(result, 'critical');
    }
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
