/**
 * @fileoverview 上传文件验证器 - CoserEden平台
 * @description 文件上传的安全验证和格式验证功能
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 * @since 1.0.0
 */

import {
  UploadType,
  getUploadTypeFromMimeType,
  type FileValidationResult,
  type SecurityValidationResult,
  type UnifiedUploadRequest,
} from './index';
import { isFilenameSafe, isSupportedDocumentType, isSupportedImageType, isSupportedVideoType } from './upload-utils';

/**
 * 文件大小限制配置（字节）
 */
export const FILE_SIZE_LIMITS = {
  [UploadType.IMAGE]: 1000 * 1024 * 1024, // 1000MB (1GB)
  [UploadType.VIDEO]: 1000 * 1024 * 1024, // 1000MB (1GB)
  [UploadType.DOCUMENT]: 1000 * 1024 * 1024, // 1000MB (1GB)
  [UploadType.AUDIO]: 1000 * 1024 * 1024, // 1000MB (1GB)
  [UploadType.AVATAR]: 10 * 1024 * 1024, // 10MB
} as const;

/**
 * 支持的文件类型配置
 */
export const SUPPORTED_FILE_TYPES = {
  [UploadType.IMAGE]: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  [UploadType.VIDEO]: ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/x-msvideo'],
  [UploadType.DOCUMENT]: ['application/pdf', 'text/plain'],
  [UploadType.AUDIO]: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  [UploadType.AVATAR]: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
} as const;

/**
 * 执行增强的文件安全验证
 *
 * @param buffer - 文件缓冲区
 * @param request - 上传请求
 * @returns 安全验证结果
 *
 * @example
 * ```typescript
 * const securityResult = performSecurityValidation(fileBuffer, uploadRequest);
 * if (!securityResult.isSecure) {
 *   console.error('安全威胁:', securityResult.threats);
 * }
 * ```
 */
export function performSecurityValidation(
  buffer: Buffer,
  request: UnifiedUploadRequest
): SecurityValidationResult {
  const threats: string[] = [];
  const warnings: string[] = [];

  try {
    // 1. 检查文件头魔数
    const fileHeader = buffer.slice(0, 16).toString('hex');

    // 检查常见的恶意文件特征
    const maliciousPatterns = [
      '4d5a', // PE executable
      '7f454c46', // ELF executable
      '504b0304', // ZIP (可能包含恶意脚本)
    ];

    for (const pattern of maliciousPatterns) {
      if (fileHeader.toLowerCase().startsWith(pattern.toLowerCase())) {
        threats.push(`检测到可疑文件头: ${pattern}`);
      }
    }

    // 2. 检查文件大小异常
    if (buffer.length === 0) {
      threats.push('文件为空');
    } else if (buffer.length > 2 * 1024 * 1024 * 1024) { // 2GB
      threats.push('文件过大，可能是攻击');
    }

    // 3. 检查MIME类型与文件头的一致性
    const declaredType = request.mimeType.toLowerCase();
    if (declaredType.startsWith('image/')) {
      const imageHeaders = ['ffd8ff', '89504e47', '47494638', '424d']; // JPEG, PNG, GIF, BMP
      const hasValidImageHeader = imageHeaders.some(header =>
        fileHeader.toLowerCase().startsWith(header.toLowerCase())
      );

      if (!hasValidImageHeader) {
        warnings.push('图片文件头与声明类型不匹配');
      }
    }

    // 4. 检查文件名安全性
    if (!isFilenameSafe(request.filename)) {
      warnings.push('文件名包含可疑字符或格式');
    }

    // 5. 检查文件内容的基本完整性
    if (buffer.length < 100) { // 小于100字节的文件可能有问题
      warnings.push('文件大小异常小，可能不完整');
    }

    // 6. 检查特定文件类型的头部验证
    if (declaredType === 'image/jpeg' && !fileHeader.toLowerCase().startsWith('ffd8ff')) {
      warnings.push('JPEG文件头验证失败');
    } else if (declaredType === 'image/png' && !fileHeader.toLowerCase().startsWith('89504e47')) {
      warnings.push('PNG文件头验证失败');
    } else if (declaredType === 'image/gif' && !fileHeader.toLowerCase().startsWith('47494638')) {
      warnings.push('GIF文件头验证失败');
    }

  } catch (error) {
    console.error('安全验证过程中出错:', error);
    warnings.push('安全验证过程中出现异常');
  }

  return {
    isSecure: threats.length === 0,
    threats,
    warnings,
  };
}

/**
 * 验证文件格式和大小
 *
 * @param buffer - 文件缓冲区
 * @param request - 上传请求
 * @returns 文件验证结果
 *
 * @example
 * ```typescript
 * const validation = validateFile(fileBuffer, uploadRequest);
 * if (!validation.isValid) {
 *   throw new Error(validation.error);
 * }
 * ```
 */
export function validateFile(buffer: Buffer, request: UnifiedUploadRequest): FileValidationResult {
  // 如果没有指定上传类型，自动检测
  const uploadType = request.uploadType || getUploadTypeFromMimeType(request.mimeType);

  // 0. 执行安全验证
  const securityCheck = performSecurityValidation(buffer, request);
  if (!securityCheck.isSecure) {
    return {
      isValid: false,
      uploadType,
      error: `安全验证失败: ${securityCheck.threats.join(', ')}`,
    };
  }

  // 记录安全警告
  if (securityCheck.warnings.length > 0) {
    console.warn('🔒 文件安全警告:', securityCheck.warnings);
  }

  // 1. 检查文件大小
  const maxSize = FILE_SIZE_LIMITS[uploadType];
  if (buffer.length > maxSize) {
    return {
      isValid: false,
      uploadType,
      error: `文件大小超出限制: ${Math.round(buffer.length / 1024 / 1024)}MB > ${Math.round(maxSize / 1024 / 1024)}MB`,
    };
  }

  // 2. 检查MIME类型
  const supportedMimes = SUPPORTED_FILE_TYPES[uploadType] as readonly string[];
  if (!supportedMimes.includes(request.mimeType)) {
    return {
      isValid: false,
      uploadType,
      error: `不支持的文件类型: ${request.mimeType}`,
    };
  }

  // 3. 检查文件内容（基础验证）
  if (buffer.length === 0) {
    return {
      isValid: false,
      uploadType,
      error: '文件内容为空',
    };
  }

  // 4. 根据上传类型进行特定验证
  const typeValidation = validateByUploadType(buffer, request);
  if (!typeValidation.isValid) {
    return typeValidation;
  }

  return {
    isValid: true,
    uploadType,
  };
}

/**
 * 根据上传类型进行特定验证
 *
 * @param buffer - 文件缓冲区
 * @param request - 上传请求
 * @returns 验证结果
 */
function validateByUploadType(buffer: Buffer, request: UnifiedUploadRequest): FileValidationResult {
  switch (request.uploadType) {
    case UploadType.IMAGE:
      return validateImageFile(buffer, request);
    case UploadType.VIDEO:
      return validateVideoFile(buffer, request);
    case UploadType.DOCUMENT:
      return validateDocumentFile(buffer, request);
    default:
      return {
        isValid: false,
        uploadType: request.uploadType || UploadType.IMAGE,
        error: `不支持的上传类型: ${request.uploadType}`,
      };
  }
}

/**
 * 验证图片文件
 */
function validateImageFile(buffer: Buffer, request: UnifiedUploadRequest): FileValidationResult {
  if (!isSupportedImageType(request.mimeType)) {
    return {
      isValid: false,
      uploadType: UploadType.IMAGE,
      error: `不支持的图片类型: ${request.mimeType}`,
    };
  }

  // 检查图片文件的最小大小
  if (buffer.length < 1024) { // 1KB
    return {
      isValid: false,
      uploadType: UploadType.IMAGE,
      error: '图片文件过小，可能已损坏',
    };
  }

  return {
    isValid: true,
    uploadType: UploadType.IMAGE,
  };
}

/**
 * 验证视频文件
 */
function validateVideoFile(buffer: Buffer, request: UnifiedUploadRequest): FileValidationResult {
  if (!isSupportedVideoType(request.mimeType)) {
    return {
      isValid: false,
      uploadType: UploadType.VIDEO,
      error: `不支持的视频类型: ${request.mimeType}`,
    };
  }

  // 检查视频文件的最小大小
  if (buffer.length < 10 * 1024) { // 10KB
    return {
      isValid: false,
      uploadType: UploadType.VIDEO,
      error: '视频文件过小，可能已损坏',
    };
  }

  return {
    isValid: true,
    uploadType: UploadType.VIDEO,
  };
}

/**
 * 验证文档文件
 */
function validateDocumentFile(buffer: Buffer, request: UnifiedUploadRequest): FileValidationResult {
  if (!isSupportedDocumentType(request.mimeType)) {
    return {
      isValid: false,
      uploadType: UploadType.DOCUMENT,
      error: `不支持的文档类型: ${request.mimeType}`,
    };
  }

  // 检查文档文件的最小大小
  if (buffer.length < 100) { // 100字节
    return {
      isValid: false,
      uploadType: UploadType.DOCUMENT,
      error: '文档文件过小，可能已损坏',
    };
  }

  return {
    isValid: true,
    uploadType: UploadType.DOCUMENT,
  };
}
