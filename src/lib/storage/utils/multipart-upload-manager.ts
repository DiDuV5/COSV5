/**
 * @fileoverview 分片上传管理器（重构版）
 * @description 管理大文件的分片上传，支持断点续传和并发控制，采用模块化设计
 * @author Augment AI
 * @date 2025-06-29
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { StorageManager } from '../object-storage/storage-manager';
import { type UploadResult } from '../object-storage/base-storage-provider';

// 导入重构后的服务
import {
  multipartSessionService,
  multipartProcessorService,
  type MultipartUploadOptions,
  type UploadProgress,
  type UploadSession,
} from './services';

/**
 * 分片上传管理器类（重构版）
 */
export class MultipartUploadManager extends EventEmitter {
  private storageManager: StorageManager;
  private sessionService: ReturnType<typeof multipartSessionService>;
  private processorService: ReturnType<typeof multipartProcessorService>;

  constructor(storageManager: StorageManager) {
    super();
    this.storageManager = storageManager;
    this.sessionService = multipartSessionService();
    this.processorService = multipartProcessorService(storageManager);

    // 转发处理服务的事件
    this.processorService.on('uploadStarted', (data) => this.emit('uploadStarted', data));
    this.processorService.on('uploadCompleted', (data) => this.emit('uploadCompleted', data));
    this.processorService.on('uploadFailed', (data) => this.emit('uploadFailed', data));
    this.processorService.on('uploadCancelled', (data) => this.emit('uploadCancelled', data));
    this.processorService.on('chunkCompleted', (data) => this.emit('chunkCompleted', data));
    this.processorService.on('chunkFailed', (data) => this.emit('chunkFailed', data));

    // 转发会话服务的事件
    this.sessionService.on('sessionStatusChanged', (data) => this.emit('sessionStatusChanged', data));
    this.sessionService.on('progress', (data) => this.emit('progress', data));
  }

  /**
   * 上传大文件（重构版 - 使用会话和处理服务）
   */
  async uploadLargeFile(
    buffer: Buffer,
    key: string,
    options: MultipartUploadOptions = {}
  ): Promise<UploadResult> {
    // 检查是否已有相同文件的上传任务
    const existingUpload = this.sessionService.getQueuedUpload(key);
    if (existingUpload) {
      console.log(`📋 文件 ${key} 已在上传队列中，等待完成...`);
      return existingUpload;
    }

    const uploadPromise = this.performUpload(buffer, key, options);
    this.sessionService.addToQueue(key, uploadPromise);

    try {
      const result = await uploadPromise;
      return result;
    } finally {
      this.sessionService.removeFromQueue(key);
    }
  }

  /**
   * 恢复上传（重构版 - 使用会话和处理服务）
   */
  async resumeUpload(
    buffer: Buffer,
    key: string,
    uploadId: string,
    options: MultipartUploadOptions = {}
  ): Promise<UploadResult> {
    // 创建恢复会话
    const session = this.sessionService.createResumeSession(buffer, key, uploadId, options);

    try {
      this.sessionService.updateSessionStatus(session.sessionId, 'uploading');
      
      // 获取已上传的分片
      const uploadedParts = await this.processorService.listUploadedParts(session);
      uploadedParts.forEach(part => {
        this.sessionService.addCompletedChunk(session.sessionId, part);
      });

      const result = await this.processorService.continueUpload(buffer, session);
      
      this.sessionService.updateSessionStatus(session.sessionId, 'completed');
      return result;
    } catch (error) {
      this.sessionService.updateSessionStatus(session.sessionId, 'failed', error as Error);
      throw error;
    } finally {
      this.sessionService.removeSession(session.sessionId);
    }
  }

  /**
   * 取消上传（重构版 - 使用会话和处理服务）
   */
  async cancelUpload(key: string): Promise<void> {
    // 查找活动会话
    const session = this.sessionService.findSessionByKey(key);
    if (!session) {
      throw new Error(`未找到文件 ${key} 的上传会话`);
    }

    try {
      await this.processorService.cancelUpload(session);
      this.sessionService.updateSessionStatus(session.sessionId, 'cancelled');
    } finally {
      this.sessionService.removeSession(session.sessionId);
    }
  }

  /**
   * 暂停上传（重构版 - 使用会话服务）
   */
  pauseUpload(key: string): void {
    const session = this.sessionService.findSessionByKey(key);
    if (session) {
      this.sessionService.updateSessionStatus(session.sessionId, 'paused');
      console.log(`⏸️ 暂停上传: ${key}`);
    }
  }

  /**
   * 获取上传进度（重构版 - 使用会话服务）
   */
  getUploadProgress(key: string): UploadProgress | null {
    const session = this.sessionService.findSessionByKey(key);
    if (!session) return null;

    return this.sessionService.getProgress(session.sessionId);
  }

  /**
   * 获取所有活动上传（重构版 - 使用会话服务）
   */
  getActiveUploads(): Array<{
    key: string;
    sessionId: string;
    status: string;
    progress: UploadProgress | null;
    startTime: Date;
  }> {
    return this.sessionService.getActiveSessions().map(session => ({
      key: session.key,
      sessionId: session.sessionId,
      status: session.status,
      progress: this.sessionService.getProgress(session.sessionId),
      startTime: session.startTime,
    }));
  }

  /**
   * 清理过期会话（重构版 - 使用会话服务）
   */
  cleanupExpiredSessions(maxAge?: number): {
    cleanedCount: number;
    message: string;
  } {
    const cleanedCount = this.sessionService.cleanupExpiredSessions(maxAge);
    
    return {
      cleanedCount,
      message: `清理了 ${cleanedCount} 个过期会话`,
    };
  }

  /**
   * 验证上传完整性（重构版 - 使用处理服务）
   */
  async verifyUpload(buffer: Buffer, key: string): Promise<boolean> {
    const session = this.sessionService.findSessionByKey(key);
    if (!session) {
      throw new Error(`未找到文件 ${key} 的上传会话`);
    }

    return await this.processorService.verifyChunks(buffer, session);
  }

  /**
   * 获取上传统计信息
   */
  getUploadStats(): {
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    failedSessions: number;
    pausedSessions: number;
  } {
    const sessions = this.sessionService.getActiveSessions();
    
    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'uploading').length,
      completedSessions: sessions.filter(s => s.status === 'completed').length,
      failedSessions: sessions.filter(s => s.status === 'failed').length,
      pausedSessions: sessions.filter(s => s.status === 'paused').length,
    };
  }

  /**
   * 执行上传（私有方法）
   */
  private async performUpload(
    buffer: Buffer,
    key: string,
    options: MultipartUploadOptions
  ): Promise<UploadResult> {
    // 创建上传会话
    const session = this.sessionService.createSession(buffer, key, '', options);

    try {
      this.sessionService.updateSessionStatus(session.sessionId, 'uploading');
      
      const result = await this.processorService.performUpload(buffer, key, session);
      
      this.sessionService.updateSessionStatus(session.sessionId, 'completed');
      return result;
    } catch (error) {
      this.sessionService.updateSessionStatus(session.sessionId, 'failed', error as Error);
      throw error;
    } finally {
      this.sessionService.removeSession(session.sessionId);
    }
  }
}

/**
 * 导出类型
 */
export type {
  MultipartUploadOptions,
  UploadProgress,
  UploadSession,
} from './services';

/**
 * 导出服务创建函数
 */
export const createMultipartUploadManager = (storageManager: StorageManager) => 
  new MultipartUploadManager(storageManager);
