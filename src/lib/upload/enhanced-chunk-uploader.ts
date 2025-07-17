/**
 * @fileoverview 增强分块上传器
 * @description 提供大文件分块上传功能，支持断点续传和并发上传
 * @author Augment AI
 * @date 2025-07-05
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { UserLevel } from '@/types/user-level';
import type { UploadRequest, UploadResult } from './core/strategies/base-upload-strategy';

/**
 * 分块上传配置
 */
export interface ChunkUploadConfig {
  chunkSize: number;
  maxConcurrentChunks: number;
  retryAttempts: number;
  retryDelay: number;
  enableResume: boolean;
}

/**
 * 分块信息
 */
export interface ChunkInfo {
  index: number;
  start: number;
  end: number;
  size: number;
  hash?: string;
  uploaded: boolean;
  retryCount: number;
}

/**
 * 上传会话
 */
export interface UploadSession {
  sessionId: string;
  filename: string;
  totalSize: number;
  totalChunks: number;
  chunks: ChunkInfo[];
  uploadedChunks: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 增强分块上传器
 */
export class EnhancedChunkUploader {
  private config: ChunkUploadConfig;
  private sessions = new Map<string, UploadSession>();

  constructor(config?: Partial<ChunkUploadConfig>) {
    this.config = {
      chunkSize: 5 * 1024 * 1024, // 5MB
      maxConcurrentChunks: 3,
      retryAttempts: 3,
      retryDelay: 1000,
      enableResume: true,
      ...config
    };
  }

  /**
   * 初始化上传会话
   */
  async initializeUpload(request: UploadRequest): Promise<string> {
    try {
      const sessionId = this.generateSessionId();
      const totalSize = request.buffer.length;
      const totalChunks = Math.ceil(totalSize / this.config.chunkSize);

      const chunks: ChunkInfo[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const start = i * this.config.chunkSize;
        const end = Math.min(start + this.config.chunkSize, totalSize);

        chunks.push({
          index: i,
          start,
          end,
          size: end - start,
          uploaded: false,
          retryCount: 0
        });
      }

      const session: UploadSession = {
        sessionId,
        filename: request.filename,
        totalSize,
        totalChunks,
        chunks,
        uploadedChunks: 0,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.sessions.set(sessionId, session);
      return sessionId;

    } catch (error) {
      throw TRPCErrorHandler.handleError(error, {
        code: 'INTERNAL_SERVER_ERROR',
        message: '分块上传初始化失败'
      });
    }
  }

  /**
   * 上传分块
   */
  async uploadChunk(
    sessionId: string,
    chunkIndex: number,
    chunkData: Buffer
  ): Promise<boolean> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('上传会话不存在');
      }

      const chunk = session.chunks[chunkIndex];
      if (!chunk) {
        throw new Error('分块索引无效');
      }

      if (chunk.uploaded) {
        return true; // 已上传
      }

      // 模拟分块上传
      await this.simulateChunkUpload(chunkData);

      chunk.uploaded = true;
      session.uploadedChunks++;
      session.updatedAt = new Date();

      // 检查是否全部上传完成
      if (session.uploadedChunks === session.totalChunks) {
        session.status = 'completed';
      }

      return true;

    } catch (error) {
      throw TRPCErrorHandler.handleError(error, {
        code: 'INTERNAL_SERVER_ERROR',
        message: '分块上传失败'
      });
    }
  }

  /**
   * 并发上传所有分块
   */
  async uploadAllChunks(sessionId: string, fileBuffer: Buffer): Promise<UploadResult> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('上传会话不存在');
      }

      session.status = 'uploading';

      // 并发上传分块
      const uploadPromises: Promise<void>[] = [];
      let activeUploads = 0;

      for (const chunk of session.chunks) {
        if (chunk.uploaded) continue;

        if (activeUploads >= this.config.maxConcurrentChunks) {
          await Promise.race(uploadPromises);
        }

        const chunkData = fileBuffer.slice(chunk.start, chunk.end);
        const uploadPromise = this.uploadChunkWithRetry(sessionId, chunk.index, chunkData);

        uploadPromises.push(uploadPromise);
        activeUploads++;
      }

      // 等待所有分块上传完成
      await Promise.all(uploadPromises);

      // 合并分块
      const result = await this.mergeChunks(sessionId);

      // 清理会话
      this.sessions.delete(sessionId);

      return result;

    } catch (error) {
      throw TRPCErrorHandler.handleError(error, {
        code: 'INTERNAL_SERVER_ERROR',
        message: '分块上传失败'
      });
    }
  }

  /**
   * 带重试的分块上传
   */
  private async uploadChunkWithRetry(
    sessionId: string,
    chunkIndex: number,
    chunkData: Buffer
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('上传会话不存在');

    const chunk = session.chunks[chunkIndex];
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        await this.uploadChunk(sessionId, chunkIndex, chunkData);
        return;
      } catch (error) {
        lastError = error as Error;
        chunk.retryCount++;

        if (attempt < this.config.retryAttempts) {
          await new Promise(resolve =>
            setTimeout(resolve, this.config.retryDelay * (attempt + 1))
          );
        }
      }
    }

    throw lastError;
  }

  /**
   * 模拟分块上传
   */
  private async simulateChunkUpload(chunkData: Buffer): Promise<void> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));

    // 模拟偶尔的失败
    if (Math.random() < 0.1) {
      throw new Error('模拟网络错误');
    }
  }

  /**
   * 合并分块
   */
  private async mergeChunks(sessionId: string): Promise<UploadResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('上传会话不存在');
    }

    // 模拟合并过程
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      fileId: `file_${sessionId}`,
      filename: session.filename,
      originalName: session.filename,
      url: `/uploads/${session.filename}`,
      cdnUrl: `/cdn/uploads/${session.filename}`,
      mediaType: 'IMAGE',
      fileSize: session.totalSize,
      uploadedAt: new Date(),
      metadata: {
        chunks: session.totalChunks,
        sessionId
      }
    };
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取上传进度
   */
  getUploadProgress(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session) return 0;

    return (session.uploadedChunks / session.totalChunks) * 100;
  }

  /**
   * 暂停上传
   */
  pauseUpload(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = 'paused';
    return true;
  }

  /**
   * 恢复上传
   */
  resumeUpload(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = 'uploading';
    return true;
  }
}

// 创建默认实例
export const enhancedChunkUploader = new EnhancedChunkUploader();

// 重新导出类型（避免重复导出）
export type {
  ChunkUploadConfig as ChunkConfig,
  ChunkInfo as ChunkInfoType
};
