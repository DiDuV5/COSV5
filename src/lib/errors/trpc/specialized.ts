/**
 * @fileoverview tRPC专用错误处理器
 * @description 提供文件上传、视频编码等专用错误处理功能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { TRPCError } from '@trpc/server';
import { TRPCErrorCore } from './core';
import { 
  BusinessErrorType, 
  TRPCErrorContext, 
  FileUploadErrorType,
  FileUploadErrorContext 
} from './types';

/**
 * tRPC专用错误处理器类
 */
export class TRPCSpecializedErrors {
  /**
   * 创建文件上传相关错误
   */
  static uploadError(
    type: FileUploadErrorType,
    message?: string,
    context?: FileUploadErrorContext
  ): TRPCError {
    const businessType = BusinessErrorType[type];
    return TRPCErrorCore.businessError(businessType, message, context);
  }

  /**
   * 创建文件安全错误
   */
  static fileSecurityError(
    fileName: string,
    fileType: string,
    reason: string,
    message?: string,
    context?: TRPCErrorContext
  ): TRPCError {
    const defaultMessage = `文件类型不安全，禁止上传。文件：${fileName}，类型：${fileType}，原因：${reason}`;

    return TRPCErrorCore.businessError(
      BusinessErrorType.INVALID_FILE_TYPE, 
      message || defaultMessage, 
      {
        ...context,
        context: {
          ...context?.context,
          fileName,
          fileType,
          securityReason: reason,
          timestamp: new Date().toISOString(),
        },
        recoveryActions: [
          '请选择安全的文件类型（图片、视频、文档）',
          '避免上传可执行文件或脚本文件',
          '如有疑问请联系技术支持',
        ],
      }
    );
  }

  /**
   * 创建视频编码错误
   */
  static videoEncodingError(
    currentCodec: string,
    message?: string,
    context?: TRPCErrorContext
  ): TRPCError {
    const defaultMessage = `视频编码格式不支持。当前格式：${currentCodec}，请使用H.264编码的MP4文件以确保浏览器兼容性。`;

    return TRPCErrorCore.businessError(
      BusinessErrorType.VIDEO_ENCODING_INVALID, 
      message || defaultMessage, 
      {
        ...context,
        context: {
          ...context?.context,
          currentCodec,
          requiredCodec: 'H.264',
        },
        recoveryActions: [
          '使用视频转换工具将文件转换为H.264编码',
          '重新录制或导出为MP4格式（H.264编码）',
          '联系技术支持获取转换工具推荐',
        ],
      }
    );
  }

  /**
   * 创建文件大小错误
   */
  static fileSizeError(
    fileName: string,
    currentSize: number,
    maxSize: number,
    context?: TRPCErrorContext
  ): TRPCError {
    const currentSizeMB = (currentSize / 1024 / 1024).toFixed(2);
    const maxSizeMB = (maxSize / 1024 / 1024).toFixed(2);
    
    return TRPCErrorCore.businessError(
      BusinessErrorType.FILE_TOO_LARGE,
      `文件"${fileName}"大小超出限制。当前：${currentSizeMB}MB，限制：${maxSizeMB}MB`,
      {
        ...context,
        context: {
          ...context?.context,
          fileName,
          currentSize,
          maxSize,
          currentSizeMB,
          maxSizeMB,
        },
        recoveryActions: [
          '请选择更小的文件',
          '使用压缩工具减小文件大小',
          '联系管理员提升上传限制',
        ],
      }
    );
  }

  /**
   * 创建文件类型错误
   */
  static fileTypeError(
    fileName: string,
    fileType: string,
    allowedTypes: string[],
    context?: TRPCErrorContext
  ): TRPCError {
    return TRPCErrorCore.businessError(
      BusinessErrorType.UNSUPPORTED_FILE_TYPE,
      `文件"${fileName}"类型不支持。当前类型：${fileType}，支持的类型：${allowedTypes.join(', ')}`,
      {
        ...context,
        context: {
          ...context?.context,
          fileName,
          fileType,
          allowedTypes,
        },
        recoveryActions: [
          `请选择支持的文件类型：${allowedTypes.join(', ')}`,
          '转换文件格式后重新上传',
          '联系技术支持了解更多支持的格式',
        ],
      }
    );
  }

  /**
   * 创建上传会话错误
   */
  static uploadSessionError(
    sessionId: string,
    reason: string,
    context?: TRPCErrorContext
  ): TRPCError {
    return TRPCErrorCore.businessError(
      BusinessErrorType.SESSION_NOT_FOUND,
      `上传会话无效或已过期。会话ID：${sessionId}，原因：${reason}`,
      {
        ...context,
        context: {
          ...context?.context,
          sessionId,
          reason,
        },
        recoveryActions: [
          '重新开始上传流程',
          '检查网络连接是否稳定',
          '如问题持续，请联系技术支持',
        ],
      }
    );
  }

  /**
   * 创建分块上传错误
   */
  static chunkUploadError(
    chunkIndex: number,
    totalChunks: number,
    reason: string,
    context?: TRPCErrorContext
  ): TRPCError {
    return TRPCErrorCore.businessError(
      BusinessErrorType.CHUNK_UPLOAD_FAILED,
      `分块上传失败。块：${chunkIndex + 1}/${totalChunks}，原因：${reason}`,
      {
        ...context,
        context: {
          ...context?.context,
          chunkIndex,
          totalChunks,
          reason,
        },
        recoveryActions: [
          '重试当前分块上传',
          '检查网络连接稳定性',
          '如多次失败，请重新开始上传',
        ],
      }
    );
  }

  /**
   * 创建文件完整性错误
   */
  static fileIntegrityError(
    fileName: string,
    expectedHash: string,
    actualHash: string,
    context?: TRPCErrorContext
  ): TRPCError {
    return TRPCErrorCore.businessError(
      BusinessErrorType.FILE_INTEGRITY_ERROR,
      `文件"${fileName}"完整性校验失败，文件可能在传输过程中损坏`,
      {
        ...context,
        context: {
          ...context?.context,
          fileName,
          expectedHash,
          actualHash,
        },
        recoveryActions: [
          '重新上传文件',
          '检查文件是否损坏',
          '确保网络连接稳定',
        ],
      }
    );
  }

  /**
   * 创建存储空间不足错误
   */
  static storageQuotaError(
    userLevel: string,
    usedSpace: number,
    totalSpace: number,
    context?: TRPCErrorContext
  ): TRPCError {
    const usedSpaceMB = (usedSpace / 1024 / 1024).toFixed(2);
    const totalSpaceMB = (totalSpace / 1024 / 1024).toFixed(2);

    return TRPCErrorCore.businessError(
      BusinessErrorType.QUOTA_EXCEEDED,
      `存储空间不足。已使用：${usedSpaceMB}MB，总容量：${totalSpaceMB}MB`,
      {
        ...context,
        context: {
          ...context?.context,
          userLevel,
          usedSpace,
          totalSpace,
          usedSpaceMB,
          totalSpaceMB,
        },
        recoveryActions: [
          '删除不需要的文件释放空间',
          '升级账户获得更多存储空间',
          '联系客服了解存储方案',
        ],
      }
    );
  }

  /**
   * 创建并发上传限制错误
   */
  static concurrentUploadLimitError(
    currentUploads: number,
    maxConcurrent: number,
    context?: TRPCErrorContext
  ): TRPCError {
    return TRPCErrorCore.businessError(
      BusinessErrorType.RATE_LIMIT_EXCEEDED,
      `并发上传数量超出限制。当前：${currentUploads}，限制：${maxConcurrent}`,
      {
        ...context,
        context: {
          ...context?.context,
          currentUploads,
          maxConcurrent,
        },
        recoveryActions: [
          '等待其他上传完成后重试',
          '减少同时上传的文件数量',
          '升级账户获得更高并发限制',
        ],
      }
    );
  }
}
