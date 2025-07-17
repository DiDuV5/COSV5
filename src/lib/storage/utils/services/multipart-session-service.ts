/**
 * @fileoverview 分片上传会话管理服务
 * @description 管理分片上传会话的创建、状态跟踪和生命周期
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';

/**
 * 分片上传选项接口
 */
export interface MultipartUploadOptions {
  /** 分片大小（字节） */
  chunkSize?: number;
  /** 最大并发数 */
  maxConcurrency?: number;
  /** 重试次数 */
  retryCount?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 进度回调 */
  onProgress?: (progress: UploadProgress) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
  /** 完成回调 */
  onComplete?: (result: any) => void;
}

/**
 * 上传进度接口
 */
export interface UploadProgress {
  /** 已上传字节数 */
  uploadedBytes: number;
  /** 总字节数 */
  totalBytes: number;
  /** 上传百分比 */
  percentage: number;
  /** 已完成分片数 */
  completedChunks: number;
  /** 总分片数 */
  totalChunks: number;
  /** 上传速度（字节/秒） */
  speed: number;
  /** 预计剩余时间（秒） */
  estimatedTimeRemaining: number;
}

/**
 * 分片信息接口
 */
export interface ChunkInfo {
  /** 分片编号 */
  partNumber: number;
  /** ETag */
  etag: string;
  /** 分片大小 */
  size: number;
  /** 上传时间 */
  uploadTime: Date;
}

/**
 * 上传会话接口
 */
export interface UploadSession {
  /** 会话ID */
  sessionId: string;
  /** 上传ID */
  uploadId: string;
  /** 文件键名 */
  key: string;
  /** 文件大小 */
  fileSize: number;
  /** 分片大小 */
  chunkSize: number;
  /** 总分片数 */
  totalChunks: number;
  /** 已完成的分片 */
  completedChunks: Map<number, ChunkInfo>;
  /** 开始时间 */
  startTime: Date;
  /** 上传选项 */
  options: MultipartUploadOptions;
  /** 会话状态 */
  status: 'initializing' | 'uploading' | 'paused' | 'completed' | 'failed' | 'cancelled';
  /** 最后更新时间 */
  lastUpdateTime: Date;
  /** 错误信息 */
  error?: Error;
}

/**
 * 分片上传会话管理服务类
 */
export class MultipartSessionService extends EventEmitter {
  private activeSessions = new Map<string, UploadSession>();
  private uploadQueue = new Map<string, Promise<any>>();

  // 默认配置
  private static readonly DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly DEFAULT_MAX_CONCURRENCY = 3;
  private static readonly DEFAULT_RETRY_COUNT = 3;
  private static readonly DEFAULT_RETRY_DELAY = 1000; // 1秒

  /**
   * 创建新的上传会话
   */
  createSession(
    buffer: Buffer,
    key: string,
    uploadId: string,
    options: MultipartUploadOptions = {}
  ): UploadSession {
    const sessionId = crypto.randomUUID();
    const fileSize = buffer.length;
    const chunkSize = options.chunkSize || MultipartSessionService.DEFAULT_CHUNK_SIZE;
    const totalChunks = Math.ceil(fileSize / chunkSize);

    const session: UploadSession = {
      sessionId,
      uploadId,
      key,
      fileSize,
      chunkSize,
      totalChunks,
      completedChunks: new Map(),
      startTime: new Date(),
      options: {
        chunkSize,
        maxConcurrency: options.maxConcurrency || MultipartSessionService.DEFAULT_MAX_CONCURRENCY,
        retryCount: options.retryCount || MultipartSessionService.DEFAULT_RETRY_COUNT,
        retryDelay: options.retryDelay || MultipartSessionService.DEFAULT_RETRY_DELAY,
        ...options,
      },
      status: 'initializing',
      lastUpdateTime: new Date(),
    };

    this.activeSessions.set(sessionId, session);

    console.log(`🚀 创建分片上传会话: ${sessionId}`, {
      key,
      fileSize: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
      totalChunks,
      chunkSize: `${(chunkSize / 1024 / 1024).toFixed(2)}MB`,
    });

    return session;
  }

  /**
   * 创建恢复会话
   */
  createResumeSession(
    buffer: Buffer,
    key: string,
    uploadId: string,
    options: MultipartUploadOptions = {}
  ): UploadSession {
    const session = this.createSession(buffer, key, uploadId, options);
    session.status = 'uploading';
    
    console.log(`🔄 创建恢复上传会话: ${session.sessionId}`, {
      key,
      uploadId,
    });

    return session;
  }

  /**
   * 获取会话
   */
  getSession(sessionId: string): UploadSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * 更新会话状态
   */
  updateSessionStatus(
    sessionId: string,
    status: UploadSession['status'],
    error?: Error
  ): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = status;
      session.lastUpdateTime = new Date();
      if (error) {
        session.error = error;
      }

      this.emit('sessionStatusChanged', {
        sessionId,
        status,
        error,
      });
    }
  }

  /**
   * 添加完成的分片
   */
  addCompletedChunk(sessionId: string, chunkInfo: ChunkInfo): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.completedChunks.set(chunkInfo.partNumber, chunkInfo);
      session.lastUpdateTime = new Date();

      // 触发进度更新
      this.emitProgress(session);
    }
  }

  /**
   * 获取上传进度
   */
  getProgress(sessionId: string): UploadProgress | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    return this.calculateProgress(session);
  }

  /**
   * 检查是否有重复上传
   */
  hasActiveUpload(key: string): boolean {
    return this.uploadQueue.has(key);
  }

  /**
   * 添加到上传队列
   */
  addToQueue(key: string, uploadPromise: Promise<any>): void {
    this.uploadQueue.set(key, uploadPromise);
  }

  /**
   * 从上传队列移除
   */
  removeFromQueue(key: string): void {
    this.uploadQueue.delete(key);
  }

  /**
   * 获取队列中的上传任务
   */
  getQueuedUpload(key: string): Promise<any> | undefined {
    return this.uploadQueue.get(key);
  }

  /**
   * 删除会话
   */
  removeSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      this.activeSessions.delete(sessionId);
      this.removeFromQueue(session.key);

      console.log(`🗑️ 删除上传会话: ${sessionId}`);
    }
  }

  /**
   * 获取所有活动会话
   */
  getActiveSessions(): UploadSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * 根据key查找会话
   */
  findSessionByKey(key: string): UploadSession | undefined {
    for (const session of this.activeSessions.values()) {
      if (session.key === key) {
        return session;
      }
    }
    return undefined;
  }

  /**
   * 清理过期会话
   */
  cleanupExpiredSessions(maxAge: number = 24 * 60 * 60 * 1000): number {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.activeSessions.entries()) {
      const age = now.getTime() - session.lastUpdateTime.getTime();
      if (age > maxAge && (session.status === 'completed' || session.status === 'failed')) {
        this.activeSessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 清理了 ${cleanedCount} 个过期的上传会话`);
    }

    return cleanedCount;
  }

  /**
   * 计算上传进度
   */
  private calculateProgress(session: UploadSession): UploadProgress {
    const completedChunks = session.completedChunks.size;
    const uploadedBytes = Array.from(session.completedChunks.values())
      .reduce((total, chunk) => total + chunk.size, 0);
    
    const percentage = session.totalChunks > 0 ? (completedChunks / session.totalChunks) * 100 : 0;
    
    // 计算上传速度
    const elapsedTime = (Date.now() - session.startTime.getTime()) / 1000; // 秒
    const speed = elapsedTime > 0 ? uploadedBytes / elapsedTime : 0;
    
    // 计算预计剩余时间
    const remainingBytes = session.fileSize - uploadedBytes;
    const estimatedTimeRemaining = speed > 0 ? remainingBytes / speed : 0;

    return {
      uploadedBytes,
      totalBytes: session.fileSize,
      percentage: Math.round(percentage * 100) / 100,
      completedChunks,
      totalChunks: session.totalChunks,
      speed,
      estimatedTimeRemaining,
    };
  }

  /**
   * 触发进度事件
   */
  private emitProgress(session: UploadSession): void {
    const progress = this.calculateProgress(session);
    
    // 调用选项中的进度回调
    if (session.options.onProgress) {
      session.options.onProgress(progress);
    }

    // 触发事件
    this.emit('progress', {
      sessionId: session.sessionId,
      progress,
    });
  }
}

/**
 * 导出服务创建函数
 */
export const createMultipartSessionService = () => new MultipartSessionService();
