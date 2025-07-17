/**
 * @fileoverview 上传系统批量和会话类型定义
 * @description CoserEden上传系统的批量上传和会话管理相关类型
 * @author Augment AI
 * @date 2025-01-05
 * @version 1.0.0
 */

import { UnifiedUploadRequest, UnifiedUploadResult } from './core-interfaces';
import { UploadError } from './error-types';

/**
 * 批量上传请求接口
 */
export interface BatchUploadRequest {
  files: Array<{
    filename: string;
    buffer: Buffer;
    mimeType: string;
  }>;
  commonOptions: Partial<UnifiedUploadRequest>;
  batchId?: string;
  maxConcurrency?: number;
}

/**
 * 批量上传结果接口
 */
export interface BatchUploadResult {
  batchId: string;
  totalFiles: number;
  successCount: number;
  failureCount: number;
  results: Array<UnifiedUploadResult | UploadError>;
  startTime: Date;
  endTime: Date;
  totalDuration: number;
}

/**
 * 上传会话接口
 */
export interface UploadSession {
  sessionId: string;
  userId: string;
  filename: string;
  totalSize: number;
  uploadedSize: number;
  chunks: Array<{
    index: number;
    size: number;
    uploaded: boolean;
    etag?: string;
  }>;
  multipartUploadId?: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
}
