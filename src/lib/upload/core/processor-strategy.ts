/**
 * @fileoverview 上传系统处理器和策略接口定义
 * @description CoserEden上传系统的处理器和策略相关接口
 * @author Augment AI
 * @date 2025-01-05
 * @version 1.0.0
 */

import { UploadType } from './base-types';
import { UnifiedUploadRequest, UnifiedUploadResult, FileAnalysis, SystemStatus } from './core-interfaces';
import { UploadProgress } from './progress-config';

/**
 * 处理器接口
 */
export interface UploadProcessor {
  readonly processorName: string;
  readonly supportedTypes: UploadType[];

  processUpload(request: UnifiedUploadRequest): Promise<UnifiedUploadResult>;
  validateFile(buffer: Buffer, filename: string, mimeType: string): Promise<boolean>;
  estimateProcessingTime(fileSize: number): number;
}

/**
 * 策略接口
 */
export interface UploadStrategyInterface {
  readonly strategyName: string;
  readonly description: string;

  upload(request: UnifiedUploadRequest, onProgress?: (progress: UploadProgress) => void): Promise<UnifiedUploadResult>;
  canHandle(analysis: FileAnalysis, systemStatus: SystemStatus): boolean;
  getEstimatedTime(fileSize: number): number;
}
