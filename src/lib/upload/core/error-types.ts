/**
 * @fileoverview 上传系统错误类型定义
 * @description CoserEden上传系统的错误处理相关类型
 * @author Augment AI
 * @date 2025-01-05
 * @version 1.0.0
 */

import { UploadErrorType } from './base-types';

/**
 * 错误信息接口
 */
export interface UploadError {
  type: UploadErrorType;
  code?: string;
  message: string;
  filename: string;
  details?: Record<string, any>;
  stage?: string;
  retryable?: boolean;
  timestamp?: Date;
  originalError?: Error;
}
