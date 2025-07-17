/**
 * @fileoverview 错误恢复管理器（重构版）
 * @description 统一管理错误恢复策略、重试逻辑和断点续传，采用模块化架构
 * @author Augment AI
 * @date 2025-06-29
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import { ErrorType } from '@/lib/middleware/services/error-classification-service';

// 导入重构后的服务
import {
  retryStrategyService,
  networkRecoveryService,
  resumeUploadService,
  type RetryConfig,
  type RetryResult,
  type NetworkStatus,
  type UploadSession,
  type ResumeResult,
  type FallbackStrategy,
} from './services';

/**
 * 恢复策略枚举
 */
export enum RecoveryStrategy {
  RETRY = 'RETRY',
  GRACEFUL_DEGRADATION = 'GRACEFUL_DEGRADATION',
  USER_INTERVENTION = 'USER_INTERVENTION',
  FALLBACK = 'FALLBACK',
}

/**
 * 错误恢复管理器（重构版）
 */
export class RecoveryManager extends EventEmitter {
  private static instance: RecoveryManager;
  
  // 重构后的服务实例
  private retryService = retryStrategyService();
  private networkService = networkRecoveryService();
  private uploadService = resumeUploadService();

  private constructor() {
    super();
    this.setupEventListeners();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): RecoveryManager {
    if (!RecoveryManager.instance) {
      RecoveryManager.instance = new RecoveryManager();
    }
    return RecoveryManager.instance;
  }

  /**
   * 执行重试操作（重构版 - 使用重试服务）
   */
  async retry<T>(
    operation: () => Promise<T>,
    operationName: string,
    config?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    return await this.retryService.retry(operation, operationName, config);
  }

  /**
   * 等待网络恢复（重构版 - 使用网络服务）
   */
  async waitForNetworkRecovery(timeout?: number): Promise<boolean> {
    return await this.networkService.waitForNetworkRecovery(timeout);
  }

  /**
   * 创建上传会话（重构版 - 使用上传服务）
   */
  createUploadSession(
    fileName: string,
    fileSize: number,
    chunkSize?: number
  ): UploadSession {
    return this.uploadService.createSession(fileName, fileSize, chunkSize);
  }

  /**
   * 恢复上传（重构版 - 使用上传服务）
   */
  async resumeUpload(
    sessionId: string,
    resumeOperation: (session: UploadSession) => Promise<any>
  ): Promise<ResumeResult> {
    return await this.uploadService.resumeUpload(sessionId, resumeOperation);
  }

  /**
   * 获取恢复策略（重构版 - 使用上传服务）
   */
  getRecoveryStrategy(error: any): RecoveryStrategy {
    const fallbackStrategy = this.uploadService.getRecoveryStrategy(error);
    
    // 映射到恢复策略
    switch (fallbackStrategy) {
      case 'RETRY':
        return RecoveryStrategy.RETRY;
      case 'GRACEFUL_DEGRADATION':
        return RecoveryStrategy.GRACEFUL_DEGRADATION;
      case 'USER_INTERVENTION':
        return RecoveryStrategy.USER_INTERVENTION;
      case 'FALLBACK':
        return RecoveryStrategy.FALLBACK;
      default:
        return RecoveryStrategy.FALLBACK;
    }
  }

  /**
   * 执行网络恢复操作
   */
  async recoverFromNetworkError<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: {
      maxRetries?: number;
      waitForNetwork?: boolean;
      networkTimeout?: number;
    } = {}
  ): Promise<T> {
    const { maxRetries = 3, waitForNetwork = true, networkTimeout = 30000 } = options;

    // 检查网络状态
    const networkStatus = this.networkService.getNetworkStatus();
    if (!networkStatus.online && waitForNetwork) {
      console.log(`🔍 等待网络恢复后重试操作: ${operationName}`);
      
      const networkRecovered = await this.networkService.waitForNetworkRecovery(networkTimeout);
      if (!networkRecovered) {
        throw new Error('网络恢复超时，操作失败');
      }
    }

    // 使用重试策略执行操作
    const retryConfig: Partial<RetryConfig> = {
      maxRetries,
      retryableErrors: [ErrorType.NETWORK, ErrorType.SERVER],
    };

    const result = await this.retryService.retry(operation, operationName, retryConfig);
    
    if (!result.success) {
      throw result.error || new Error('操作失败');
    }

    return result.data!;
  }

  /**
   * 执行文件上传恢复
   */
  async recoverFileUpload(
    file: File,
    uploadFunction: (file: File, session?: UploadSession) => Promise<any>,
    options: {
      sessionId?: string;
      chunkSize?: number;
      maxRetries?: number;
    } = {}
  ): Promise<any> {
    const { sessionId, chunkSize = 1024 * 1024, maxRetries = 3 } = options;

    try {
      // 如果有会话ID，尝试恢复上传
      if (sessionId) {
        const resumeResult = await this.uploadService.resumeUpload(
          sessionId,
          async (session) => {
            return await uploadFunction(file, session);
          }
        );

        if (resumeResult.success) {
          return resumeResult;
        }
      }

      // 创建新的上传会话
      const session = this.uploadService.createSession(file.name, file.size, chunkSize);

      // 执行上传操作
      const retryConfig: Partial<RetryConfig> = {
        maxRetries,
        retryableErrors: [ErrorType.NETWORK, ErrorType.UPLOAD, ErrorType.SERVER],
      };

      const result = await this.retryService.retry(
        () => uploadFunction(file, session),
        `文件上传: ${file.name}`,
        retryConfig
      );

      if (result.success) {
        // 标记会话完成
        this.uploadService.updateSessionProgress(
          session.sessionId,
          session.totalChunks - 1,
          0
        );
      }

      return result;

    } catch (error) {
      console.error('文件上传恢复失败:', error);
      throw error;
    }
  }

  /**
   * 执行降级处理
   */
  async handleGracefulDegradation<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    operationName: string
  ): Promise<{
    success: boolean;
    data?: T;
    usedFallback: boolean;
    error?: any;
  }> {
    try {
      console.log(`🎯 尝试主要操作: ${operationName}`);
      const data = await primaryOperation();
      
      return {
        success: true,
        data,
        usedFallback: false,
      };

    } catch (primaryError) {
      console.warn(`⚠️ 主要操作失败，尝试降级处理: ${operationName}`, primaryError);

      try {
        const data = await fallbackOperation();
        
        console.log(`✅ 降级处理成功: ${operationName}`);
        return {
          success: true,
          data,
          usedFallback: true,
        };

      } catch (fallbackError) {
        console.error(`❌ 降级处理也失败: ${operationName}`, fallbackError);
        
        return {
          success: false,
          usedFallback: true,
          error: fallbackError,
        };
      }
    }
  }

  /**
   * 获取网络状态（重构版 - 使用网络服务）
   */
  getNetworkStatus(): NetworkStatus {
    return this.networkService.getNetworkStatus();
  }

  /**
   * 获取网络质量（重构版 - 使用网络服务）
   */
  getNetworkQuality(): string {
    return this.networkService.getNetworkQuality();
  }

  /**
   * 获取上传会话（重构版 - 使用上传服务）
   */
  getUploadSession(sessionId: string): UploadSession | undefined {
    return this.uploadService.getSession(sessionId);
  }

  /**
   * 获取活动上传会话（重构版 - 使用上传服务）
   */
  getActiveUploadSessions(): UploadSession[] {
    return this.uploadService.getActiveSessions();
  }

  /**
   * 暂停上传会话（重构版 - 使用上传服务）
   */
  pauseUploadSession(sessionId: string): boolean {
    return this.uploadService.pauseSession(sessionId);
  }

  /**
   * 删除上传会话（重构版 - 使用上传服务）
   */
  removeUploadSession(sessionId: string): boolean {
    return this.uploadService.removeSession(sessionId);
  }

  /**
   * 开始网络监控（重构版 - 使用网络服务）
   */
  startNetworkMonitoring(interval?: number): void {
    this.networkService.startMonitoring(interval);
  }

  /**
   * 停止网络监控（重构版 - 使用网络服务）
   */
  stopNetworkMonitoring(): void {
    this.networkService.stopMonitoring();
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    network: any;
    uploads: any;
  } {
    return {
      network: this.networkService.getNetworkStats(),
      uploads: this.uploadService.getSessionStats(),
    };
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听网络状态变化
    this.networkService.on('networkRecovered', () => {
      this.emit('networkRecovered');
    });

    this.networkService.on('networkLost', () => {
      this.emit('networkLost');
    });

    this.networkService.on('statusChanged', (status) => {
      this.emit('networkStatusChanged', status);
    });
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.uploadService.cleanupExpiredSessions();
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.networkService.destroy();
    this.uploadService.destroy();
    this.removeAllListeners();
    RecoveryManager.instance = null as any;
  }
}

/**
 * 导出类型
 */
export type {
  RetryConfig,
  RetryResult,
  NetworkStatus,
  UploadSession,
  ResumeResult,
  FallbackStrategy,
} from './services';

/**
 * 导出服务创建函数
 */
export const createRecoveryManager = () => RecoveryManager.getInstance();
