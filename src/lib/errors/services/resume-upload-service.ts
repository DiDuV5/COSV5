/**
 * @fileoverview 断点续传服务
 * @description 专门处理上传会话管理、断点续传和降级处理
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

/**
 * 上传会话接口
 */
export interface UploadSession {
  sessionId: string;
  fileName: string;
  fileSize: number;
  uploadedBytes: number;
  chunkSize: number;
  totalChunks: number;
  completedChunks: number[];
  createdAt: number;
  lastActivity: number;
  status: 'active' | 'paused' | 'completed' | 'failed';
  metadata?: Record<string, any>;
}

/**
 * 恢复结果接口
 */
export interface ResumeResult {
  success: boolean;
  session?: UploadSession;
  resumePoint?: number;
  error?: any;
}

/**
 * 降级策略枚举
 */
export enum FallbackStrategy {
  RETRY = 'RETRY',
  GRACEFUL_DEGRADATION = 'GRACEFUL_DEGRADATION',
  USER_INTERVENTION = 'USER_INTERVENTION',
  FALLBACK = 'FALLBACK',
}

/**
 * 断点续传服务类
 */
export class ResumeUploadService {
  private sessions = new Map<string, UploadSession>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * 创建上传会话
   */
  createSession(
    fileName: string,
    fileSize: number,
    chunkSize: number = 1024 * 1024 // 1MB
  ): UploadSession {
    const sessionId = this.generateSessionId();
    const totalChunks = Math.ceil(fileSize / chunkSize);

    const session: UploadSession = {
      sessionId,
      fileName,
      fileSize,
      uploadedBytes: 0,
      chunkSize,
      totalChunks,
      completedChunks: [],
      createdAt: Date.now(),
      lastActivity: Date.now(),
      status: 'active',
    };

    this.sessions.set(sessionId, session);

    console.log(`📝 创建上传会话: ${sessionId}`, {
      fileName,
      fileSize: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
      totalChunks,
    });

    return session;
  }

  /**
   * 恢复上传会话
   */
  async resumeUpload(
    sessionId: string,
    resumeOperation: (session: UploadSession) => Promise<any>
  ): Promise<ResumeResult> {
    try {
      const session = this.sessions.get(sessionId);
      
      if (!session) {
        return {
          success: false,
          error: new Error(`上传会话不存在: ${sessionId}`),
        };
      }

      if (session.status === 'completed') {
        return {
          success: true,
          session,
          resumePoint: session.fileSize,
        };
      }

      console.log(`🔄 恢复上传会话: ${sessionId}`, {
        fileName: session.fileName,
        progress: `${session.completedChunks.length}/${session.totalChunks}`,
        uploadedBytes: `${(session.uploadedBytes / 1024 / 1024).toFixed(2)}MB`,
      });

      // 更新会话状态
      session.status = 'active';
      session.lastActivity = Date.now();

      // 执行恢复操作
      const result = await resumeOperation(session);

      return {
        success: true,
        session,
        resumePoint: session.uploadedBytes,
      };

    } catch (error) {
      console.error(`❌ 恢复上传失败: ${sessionId}`, error);
      
      return {
        success: false,
        error,
      };
    }
  }

  /**
   * 更新会话进度
   */
  updateSessionProgress(
    sessionId: string,
    chunkIndex: number,
    chunkSize: number
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // 添加已完成的分片
    if (!session.completedChunks.includes(chunkIndex)) {
      session.completedChunks.push(chunkIndex);
      session.uploadedBytes += chunkSize;
    }

    // 更新活动时间
    session.lastActivity = Date.now();

    // 检查是否完成
    if (session.completedChunks.length === session.totalChunks) {
      session.status = 'completed';
      console.log(`✅ 上传完成: ${sessionId}`);
    }
  }

  /**
   * 暂停上传会话
   */
  pauseSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = 'paused';
    session.lastActivity = Date.now();

    console.log(`⏸️ 暂停上传: ${sessionId}`);
    return true;
  }

  /**
   * 获取会话信息
   */
  getSession(sessionId: string): UploadSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 获取下一个待上传的分片
   */
  getNextChunk(sessionId: string): number | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    for (let i = 0; i < session.totalChunks; i++) {
      if (!session.completedChunks.includes(i)) {
        return i;
      }
    }

    return null; // 所有分片都已完成
  }

  /**
   * 获取未完成的分片列表
   */
  getPendingChunks(sessionId: string): number[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    const pendingChunks: number[] = [];
    for (let i = 0; i < session.totalChunks; i++) {
      if (!session.completedChunks.includes(i)) {
        pendingChunks.push(i);
      }
    }

    return pendingChunks;
  }

  /**
   * 删除会话
   */
  removeSession(sessionId: string): boolean {
    const removed = this.sessions.delete(sessionId);
    if (removed) {
      console.log(`🗑️ 删除上传会话: ${sessionId}`);
    }
    return removed;
  }

  /**
   * 获取所有活动会话
   */
  getActiveSessions(): UploadSession[] {
    return Array.from(this.sessions.values()).filter(
      session => session.status === 'active'
    );
  }

  /**
   * 清理过期会话
   */
  cleanupExpiredSessions(maxAge: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > maxAge) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 清理了 ${cleanedCount} 个过期的上传会话`);
    }

    return cleanedCount;
  }

  /**
   * 获取恢复策略
   */
  getRecoveryStrategy(error: any): FallbackStrategy {
    const errorMessage = (error?.message || '').toLowerCase();
    const errorCode = error?.code;
    const errorStatus = error?.status;

    // 网络错误 - 重试
    if (this.isNetworkError(error, errorMessage, errorCode)) {
      return FallbackStrategy.RETRY;
    }

    // 服务器错误 - 重试
    if (errorStatus >= 500) {
      return FallbackStrategy.RETRY;
    }

    // 文件相关错误 - 降级处理
    if (this.isFileError(error, errorMessage, errorCode)) {
      return FallbackStrategy.GRACEFUL_DEGRADATION;
    }

    // 权限错误 - 需要用户干预
    if (errorStatus === 403 || errorMessage.includes('permission')) {
      return FallbackStrategy.USER_INTERVENTION;
    }

    // 认证错误 - 需要用户干预
    if (errorStatus === 401 || errorMessage.includes('unauthorized')) {
      return FallbackStrategy.USER_INTERVENTION;
    }

    // 限流错误 - 重试
    if (errorStatus === 429 || errorMessage.includes('rate limit')) {
      return FallbackStrategy.RETRY;
    }

    // 默认降级策略
    return FallbackStrategy.FALLBACK;
  }

  /**
   * 执行降级处理
   */
  async handleFallback(
    originalPath: string,
    fallbackOperation: () => Promise<any>
  ): Promise<{
    success: boolean;
    path: string;
    fallback: boolean;
  }> {
    try {
      console.log(`🔄 执行降级处理: ${originalPath}`);
      
      const result = await fallbackOperation();
      
      return {
        success: true,
        path: result.path || originalPath,
        fallback: true,
      };
    } catch (error) {
      console.error('降级处理失败:', error);
      
      return {
        success: false,
        path: originalPath,
        fallback: false,
      };
    }
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `upload_${timestamp}_${random}`;
  }

  /**
   * 检查是否为网络错误
   */
  private isNetworkError(error: any, message: string, code: string): boolean {
    const networkKeywords = ['network', 'connection', 'timeout', 'fetch failed'];
    const networkCodes = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'];
    
    return networkKeywords.some(keyword => message.includes(keyword)) ||
           networkCodes.includes(code) ||
           error?.name === 'NetworkError';
  }

  /**
   * 检查是否为文件错误
   */
  private isFileError(error: any, message: string, code: string): boolean {
    const fileCodes = ['ENOENT', 'EACCES', 'EISDIR', 'ENOTDIR'];
    return fileCodes.includes(code) ||
           message.includes('file not found') ||
           message.includes('permission denied');
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    // 每小时清理一次过期会话
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60 * 60 * 1000);
  }

  /**
   * 获取会话统计信息
   */
  getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    pausedSessions: number;
    completedSessions: number;
    failedSessions: number;
  } {
    const sessions = Array.from(this.sessions.values());
    
    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'active').length,
      pausedSessions: sessions.filter(s => s.status === 'paused').length,
      completedSessions: sessions.filter(s => s.status === 'completed').length,
      failedSessions: sessions.filter(s => s.status === 'failed').length,
    };
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.sessions.clear();
  }
}

/**
 * 导出服务创建函数
 */
export const createResumeUploadService = () => new ResumeUploadService();
