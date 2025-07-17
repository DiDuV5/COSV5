/**
 * @fileoverview 严格文件安全验证器 - CoserEden平台 (重构版)
 * @description 实现严格的文件上传安全策略，采用模块化架构
 * @author Augment AI
 * @date 2025-06-29
 * @version 2.0.0
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * import { StrictFileSecurityValidator } from '@/lib/upload/strict-file-security-validator';
 *
 * const validator = new StrictFileSecurityValidator();
 * const result = await validator.validateFile(buffer, 'test.exe', 'application/octet-stream', 'USER');
 *
 * if (!result.isValid) {
 *   console.log('文件验证失败:', result.errors);
 *   // 记录审计日志
 *   await validator.logSecurityViolation(result);
 * }
 * ```
 *
 * @dependencies
 * - @/lib/upload/security-validators/*: 模块化验证器
 * - @/lib/errors/trpc-error-handler: 错误处理器
 * - @/lib/audit-logger: 审计日志记录器
 * - @/types/user-level: 用户等级类型
 *
 * @changelog
 * - 2025-06-21: 初始版本创建，实现严格文件安全验证
 * - 2025-06-29: v2.0.0 重构为模块化架构，拆分验证器
 */

import path from 'path';
import { TRPCErrorHandler, BusinessErrorType } from '@/lib/errors/trpc-error-handler';
import { auditLogger, AuditEventType, AuditLevel } from '@/lib/audit-logger';
import type { UserLevel } from '@/types/user-level';

// 导入拆分的验证器模块
import { FileNameValidator } from './security-validators/file-name-validator';
import { FileExtensionValidator } from './security-validators/file-extension-validator';
import { MimeTypeValidator } from './security-validators/mime-type-validator';
import { FileSizeValidator } from './security-validators/file-size-validator';
import { FileHeaderValidator } from './security-validators/file-header-validator';
import { ContentSecurityValidator } from './security-validators/content-security-validator';
import type { FileValidationResult, FileValidationOptions } from './types/validation-types';

/**
 * 严格文件安全验证器 (重构版)
 * 基于CoserEden 4600+专业cosplay创作者平台安全需求
 * 采用模块化架构，每个验证器负责特定的验证功能
 */
export class StrictFileSecurityValidator {
  // 模块化验证器
  private readonly fileNameValidator: FileNameValidator;
  private readonly fileExtensionValidator: FileExtensionValidator;
  private readonly mimeTypeValidator: MimeTypeValidator;
  private readonly fileSizeValidator: FileSizeValidator;
  private readonly fileHeaderValidator: FileHeaderValidator;
  private readonly contentSecurityValidator: ContentSecurityValidator;

  constructor() {
    // 初始化所有验证器模块
    this.fileNameValidator = new FileNameValidator();
    this.fileExtensionValidator = new FileExtensionValidator();
    this.mimeTypeValidator = new MimeTypeValidator();
    this.fileSizeValidator = new FileSizeValidator();
    this.fileHeaderValidator = new FileHeaderValidator();
    this.contentSecurityValidator = new ContentSecurityValidator();
  }

  /**
   * 验证文件安全性
   */
  async validateFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    userLevel: UserLevel,
    options: FileValidationOptions = {}
  ): Promise<FileValidationResult> {
    const result: FileValidationResult = {
      isValid: true,
      isSafe: true,
      errors: [],
      warnings: [],
      riskLevel: 'low',
      details: {
        fileName,
        fileSize: buffer.length,
        mimeType,
        extension: path.extname(fileName).toLowerCase(),
        userLevel,
        validationTimestamp: new Date().toISOString(),
      },
    };

    try {
      console.log(`🔍 开始文件安全验证: ${fileName} (${Math.round(buffer.length / 1024)}KB)`);

      // 使用模块化验证器进行验证
      // 1. 验证文件名
      this.fileNameValidator.validateFileName(fileName, result);

      // 2. 验证文件扩展名
      this.fileExtensionValidator.validateFileExtension(fileName, result);
      this.fileExtensionValidator.validateExtensionMimeMatch(fileName, mimeType, result);

      // 3. 验证MIME类型
      this.mimeTypeValidator.validateMimeType(mimeType, result);

      // 4. 验证文件大小
      this.fileSizeValidator.validateFileSize(buffer.length, mimeType, userLevel, result);

      // 5. 验证文件头魔数
      this.fileHeaderValidator.validateFileHeaders(buffer, mimeType, result);

      // 6. 内容安全扫描（可选）
      if (!options.skipContentScan) {
        this.contentSecurityValidator.scanContentSecurity(buffer, fileName, mimeType, result);
      }

      // 7. 严格模式额外检查
      if (options.strictMode) {
        this.performStrictModeChecks(buffer, fileName, mimeType, result);
      }

      // 8. 最终验证结果评估
      this.evaluateFinalResult(result);

      console.log(`✅ 文件安全验证完成: ${fileName}, 风险等级: ${result.riskLevel}`);

    } catch (error) {
      result.isValid = false;
      result.isSafe = false;
      this.updateRiskLevel(result, 'critical');
      result.errors.push(`安全验证过程中发生错误: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    return result;
  }

  /**
   * 严格模式额外检查
   */
  private performStrictModeChecks(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    result: FileValidationResult
  ): void {
    // 检查文件是否为空
    if (buffer.length === 0) {
      result.errors.push('文件为空');
      this.updateRiskLevel(result, 'medium');
    }

    // 检查文件是否过小（可能是恶意文件）
    if (buffer.length < 10) {
      result.warnings.push('文件过小，可能存在问题');
      this.updateRiskLevel(result, 'medium');
    }
  }

  /**
   * 最终验证结果评估
   */
  private evaluateFinalResult(result: FileValidationResult): void {
    // 设置最终验证状态
    if (result.errors.length > 0) {
      result.isValid = false;
    }

    if (result.riskLevel === 'high' || result.riskLevel === 'critical') {
      result.isSafe = false;
      result.isValid = false;
    }
  }

  /**
   * 更新风险等级（只允许升级，不允许降级）
   */
  private updateRiskLevel(result: FileValidationResult, newLevel: 'low' | 'medium' | 'high' | 'critical'): void {
    const levels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(result.riskLevel);
    const newIndex = levels.indexOf(newLevel);

    if (newIndex > currentIndex) {
      result.riskLevel = newLevel;
    }
  }





  /**
   * 记录安全违规事件到审计日志
   */
  async logSecurityViolation(
    validationResult: FileValidationResult,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await auditLogger.log({
        userId: userId || undefined,
        eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
        level: this.mapRiskLevelToAuditLevel(validationResult.riskLevel),
        message: `文件安全验证失败: ${validationResult.details.fileName}`,
        details: {
          fileName: validationResult.details.fileName,
          fileSize: validationResult.details.fileSize,
          mimeType: validationResult.details.mimeType,
          extension: validationResult.details.extension,
          userLevel: validationResult.details.userLevel,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          riskLevel: validationResult.riskLevel,
          detectedType: validationResult.detectedType,
          validationTimestamp: validationResult.details.validationTimestamp,
        },
        ipAddress,
        userAgent,
        resource: 'file_upload',
        resourceId: validationResult.details.fileName,
      });
    } catch (error) {
      console.error('记录文件安全违规日志失败:', error);
    }
  }


  /**
   * 将风险等级映射到审计日志等级
   */
  private mapRiskLevelToAuditLevel(riskLevel: string): AuditLevel {
    switch (riskLevel) {
      case 'critical':
        return AuditLevel.CRITICAL;
      case 'high':
        return AuditLevel.ERROR;
      case 'medium':
        return AuditLevel.WARNING;
      case 'low':
      default:
        return AuditLevel.INFO;
    }
  }

  /**
   * 抛出文件安全错误
   */
  throwSecurityError(validationResult: FileValidationResult): never {
    const primaryError = validationResult.errors[0] || '文件安全验证失败';
    const securityReason = validationResult.errors.join('; ');

    throw TRPCErrorHandler.fileSecurityError(
      validationResult.details.fileName,
      validationResult.details.mimeType,
      securityReason,
      primaryError,
      {
        userLevel: validationResult.details.userLevel,
        context: {
          validationResult,
          timestamp: new Date().toISOString(),
        },
      }
    );
  }
}

/**
 * 导出单例实例
 */
export const strictFileSecurityValidator = new StrictFileSecurityValidator();

/**
 * 便捷验证函数
 */
export async function validateFileStrict(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  userLevel: UserLevel,
  options?: FileValidationOptions & {
    throwOnError?: boolean;
    logViolations?: boolean;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<FileValidationResult> {
  const validator = new StrictFileSecurityValidator();
  const result = await validator.validateFile(buffer, fileName, mimeType, userLevel, options);

  // 记录安全违规
  if (options?.logViolations && (!result.isValid || !result.isSafe)) {
    await validator.logSecurityViolation(
      result,
      options.userId,
      options.ipAddress,
      options.userAgent
    );
  }

  // 抛出错误
  if (options?.throwOnError && !result.isValid) {
    validator.throwSecurityError(result);
  }

  return result;
}
