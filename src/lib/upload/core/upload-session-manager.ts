/**
 * @fileoverview 上传会话管理器
 * @description 管理活跃上传会话，防止内存泄漏，控制并发数量
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import { TRPCErrorHandler, BusinessErrorType } from '@/lib/errors/trpc-error-handler';
import { StructuredLogger } from './structured-logger';

/**
 * 上传会话接口
 */
export interface UploadSession {
  /** 会话ID */
  id: string;
  /** 用户ID */
  userId: string;
  /** 文件名 */
  filename: string;
  /** 文件大小 */
  fileSize: number;
  /** 开始时间 */
  startTime: number;
  /** 处理器名称 */
  processorName: string;
  /** 上传策略 */
  strategy: string;
  /** 当前状态 */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  /** 进度百分比 */
  progress: number;
  /** 清理函数 */
  cleanup?: () => Promise<void>;
  /** 取消函数 */
  cancel?: () => Promise<void>;
}

/**
 * 会话统计信息
 */
export interface SessionStats {
  /** 总会话数 */
  total: number;
  /** 活跃会话数 */
  active: number;
  /** 等待中的会话数 */
  pending: number;
  /** 处理中的会话数 */
  processing: number;
  /** 已完成的会话数 */
  completed: number;
  /** 失败的会话数 */
  failed: number;
  /** 按用户分组的会话数 */
  byUser: Record<string, number>;
  /** 按处理器分组的会话数 */
  byProcessor: Record<string, number>;
}

/**
 * 上传会话管理器配置
 */
export interface SessionManagerConfig {
  /** 最大并发上传数 */
  maxConcurrentUploads: number;
  /** 会话超时时间（毫秒） */
  sessionTimeout: number;
  /** 清理间隔（毫秒） */
  cleanupInterval: number;
  /** 每用户最大并发数 */
  maxConcurrentPerUser: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: SessionManagerConfig = {
  maxConcurrentUploads: 10,
  sessionTimeout: 30 * 60 * 1000, // 30分钟
  cleanupInterval: 5 * 60 * 1000,  // 5分钟
  maxConcurrentPerUser: 3,
};

/**
 * 上传会话管理器
 */
export class UploadSessionManager {
  private sessions = new Map<string, UploadSession>();
  private cleanupInterval: NodeJS.Timeout;
  private logger: StructuredLogger;
  private config: SessionManagerConfig;

  constructor(config: Partial<SessionManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = new StructuredLogger({ service: 'upload-session-manager' });

    // 启动定期清理
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.config.cleanupInterval);

    this.logger.info('上传会话管理器已启动', {
      config: this.config
    });
  }

  /**
   * 生成唯一会话ID
   */
  private generateSessionId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 创建新的上传会话
   */
  async createSession(
    userId: string,
    filename: string,
    fileSize: number,
    processorName: string,
    strategy: string
  ): Promise<string> {
    // 检查并发限制
    await this.checkConcurrencyLimits(userId);

    const sessionId = this.generateSessionId();
    const session: UploadSession = {
      id: sessionId,
      userId,
      filename,
      fileSize,
      startTime: Date.now(),
      processorName,
      strategy,
      status: 'pending',
      progress: 0,
    };

    this.sessions.set(sessionId, session);

    this.logger.info('创建上传会话', {
      sessionId,
      userId,
      filename,
      fileSize,
      processorName,
      strategy,
      activeSessionsCount: this.getActiveSessionsCount()
    });

    return sessionId;
  }

  /**
   * 检查并发限制
   */
  private async checkConcurrencyLimits(userId: string): Promise<void> {
    const activeCount = this.getActiveSessionsCount();
    const userActiveCount = this.getUserActiveSessionsCount(userId);

    // 检查全局并发限制
    if (activeCount >= this.config.maxConcurrentUploads) {
      this.logger.warn('达到全局并发上传限制', {
        activeCount,
        maxConcurrent: this.config.maxConcurrentUploads
      });
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.RATE_LIMIT_EXCEEDED,
        '系统繁忙，请稍后再试',
        {
          context: {
            activeCount,
            maxConcurrent: this.config.maxConcurrentUploads
          }
        }
      );
    }

    // 检查用户并发限制
    if (userActiveCount >= this.config.maxConcurrentPerUser) {
      this.logger.warn('达到用户并发上传限制', {
        userId,
        userActiveCount,
        maxConcurrentPerUser: this.config.maxConcurrentPerUser
      });
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.RATE_LIMIT_EXCEEDED,
        '您有太多正在进行的上传，请等待完成后再试',
        {
          context: {
            userActiveCount,
            maxConcurrentPerUser: this.config.maxConcurrentPerUser
          }
        }
      );
    }
  }

  /**
   * 更新会话状态
   */
  updateSession(
    sessionId: string,
    updates: Partial<Pick<UploadSession, 'status' | 'progress' | 'cleanup' | 'cancel'>>
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.logger.warn('尝试更新不存在的会话', { sessionId });
      return;
    }

    Object.assign(session, updates);

    this.logger.debug('更新会话状态', {
      sessionId,
      updates,
      currentStatus: session.status,
      currentProgress: session.progress
    });
  }

  /**
   * 完成会话
   */
  async completeSession(sessionId: string, success: boolean = true): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.logger.warn('尝试完成不存在的会话', { sessionId });
      return;
    }

    const duration = Date.now() - session.startTime;
    session.status = success ? 'completed' : 'failed';
    session.progress = success ? 100 : session.progress;

    this.logger.info('会话已完成', {
      sessionId,
      success,
      duration,
      filename: session.filename,
      fileSize: session.fileSize,
      processorName: session.processorName
    });

    // 执行清理
    if (session.cleanup) {
      try {
        await session.cleanup();
      } catch (error) {
        this.logger.error('会话清理失败', error as Error, { sessionId });
      }
    }

    // 延迟删除会话，保留一段时间用于查询
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, 60000); // 1分钟后删除
  }

  /**
   * 取消会话
   */
  async cancelSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.logger.warn('尝试取消不存在的会话', { sessionId });
      return;
    }

    this.logger.info('取消上传会话', {
      sessionId,
      filename: session.filename,
      progress: session.progress
    });

    // 执行取消操作
    if (session.cancel) {
      try {
        await session.cancel();
      } catch (error) {
        this.logger.error('会话取消失败', error as Error, { sessionId });
      }
    }

    // 执行清理
    if (session.cleanup) {
      try {
        await session.cleanup();
      } catch (error) {
        this.logger.error('会话清理失败', error as Error, { sessionId });
      }
    }

    session.status = 'failed';
    this.sessions.delete(sessionId);
  }

  /**
   * 获取会话信息
   */
  getSession(sessionId: string): UploadSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 获取活跃会话数量
   */
  private getActiveSessionsCount(): number {
    return Array.from(this.sessions.values())
      .filter(session => session.status === 'pending' || session.status === 'processing')
      .length;
  }

  /**
   * 获取用户活跃会话数量
   */
  private getUserActiveSessionsCount(userId: string): number {
    return Array.from(this.sessions.values())
      .filter(session =>
        session.userId === userId &&
        (session.status === 'pending' || session.status === 'processing')
      )
      .length;
  }

  /**
   * 获取会话统计信息
   */
  getStats(): SessionStats {
    const sessions = Array.from(this.sessions.values());
    const byUser: Record<string, number> = {};
    const byProcessor: Record<string, number> = {};

    let pending = 0, processing = 0, completed = 0, failed = 0;

    for (const session of sessions) {
      // 按状态统计
      switch (session.status) {
        case 'pending': pending++; break;
        case 'processing': processing++; break;
        case 'completed': completed++; break;
        case 'failed': failed++; break;
      }

      // 按用户统计
      byUser[session.userId] = (byUser[session.userId] || 0) + 1;

      // 按处理器统计
      byProcessor[session.processorName] = (byProcessor[session.processorName] || 0) + 1;
    }

    return {
      total: sessions.length,
      active: pending + processing,
      pending,
      processing,
      completed,
      failed,
      byUser,
      byProcessor
    };
  }

  /**
   * 清理过期会话
   */
  private async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      const age = now - session.startTime;

      // 检查是否超时
      if (age > this.config.sessionTimeout &&
          (session.status === 'pending' || session.status === 'processing')) {
        expiredSessions.push(sessionId);
      }
    }

    if (expiredSessions.length > 0) {
      this.logger.warn('清理过期会话', {
        expiredCount: expiredSessions.length,
        sessionIds: expiredSessions
      });

      for (const sessionId of expiredSessions) {
        await this.cancelSession(sessionId);
      }
    }
  }

  /**
   * 销毁会话管理器
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.logger.info('上传会话管理器已销毁', {
      remainingSessions: this.sessions.size
    });
  }
}

/**
 * 导出单例实例
 */
export const uploadSessionManager = new UploadSessionManager();
