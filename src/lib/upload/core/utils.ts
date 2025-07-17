/**
 * @fileoverview 上传系统工具函数
 * @description CoserEden上传系统的工具函数和类型守卫
 * @author Augment AI
 * @date 2025-01-05
 * @version 1.0.0
 */

import { UploadType } from './base-types';

/**
 * 类型守卫函数
 */
export function isImageType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function isVideoType(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

export function isDocumentType(mimeType: string): boolean {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];
  return documentTypes.includes(mimeType);
}

export function getUploadTypeFromMimeType(mimeType: string): UploadType {
  if (isImageType(mimeType)) return UploadType.IMAGE;
  if (isVideoType(mimeType)) return UploadType.VIDEO;
  if (isDocumentType(mimeType)) return UploadType.DOCUMENT;
  if (mimeType.startsWith('audio/')) return UploadType.AUDIO;
  return UploadType.DOCUMENT; // 默认类型
}
