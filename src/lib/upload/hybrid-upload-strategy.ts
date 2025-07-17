/**
 * @fileoverview 混合上传策略
 * @description 结合多种上传策略的智能选择器
 * @author Augment AI
 * @date 2025-07-05
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { UserLevel } from '@/types/user-level';
import {
  BaseUploadStrategy,
  UploadRequest,
  UploadResult,
  type UploadProgress
} from './core/strategies/base-upload-strategy';
import { DirectUploadStrategy } from './core/strategies/direct-upload-strategy';
import { StreamUploadStrategy } from './core/strategies/stream-upload-strategy';
import { MemorySafeStrategy } from './core/strategies/memory-safe-strategy';

/**
 * 混合上传策略配置
 */
export interface HybridStrategyConfig {
  // 文件大小阈值（字节）
  smallFileThreshold: number;
  mediumFileThreshold: number;
  largeFileThreshold: number;

  // 内存使用阈值
  memoryThreshold: number;

  // 用户级别策略映射
  userLevelStrategies: Record<UserLevel, string>;

  // 启用的策略
  enabledStrategies: string[];
}

/**
 * 混合上传策略类
 */
export class HybridUploadStrategy extends BaseUploadStrategy {
  // 策略名称
  readonly strategyName = 'hybrid';

  private strategies: Map<string, BaseUploadStrategy> = new Map();
  private hybridConfig: HybridStrategyConfig;

  constructor(config?: Partial<HybridStrategyConfig>) {
    super();

    this.hybridConfig = {
      smallFileThreshold: 5 * 1024 * 1024, // 5MB
      mediumFileThreshold: 50 * 1024 * 1024, // 50MB
      largeFileThreshold: 500 * 1024 * 1024, // 500MB
      memoryThreshold: 100 * 1024 * 1024, // 100MB
      userLevelStrategies: {
        [UserLevel.GUEST]: 'direct',
        [UserLevel.USER]: 'direct',
        [UserLevel.VIP]: 'stream',
        [UserLevel.CREATOR]: 'stream',
        [UserLevel.ADMIN]: 'memory-safe',
        [UserLevel.SUPER_ADMIN]: 'memory-safe'
      },
      enabledStrategies: ['direct', 'stream', 'memory-safe'],
      ...config
    };

    this.initializeStrategies();
  }

  /**
   * 初始化所有策略
   */
  private initializeStrategies(): void {
    try {
      this.strategies.set('direct', new DirectUploadStrategy());
      this.strategies.set('stream', new StreamUploadStrategy());
      this.strategies.set('memory-safe', new MemorySafeStrategy());
    } catch (error) {
      throw TRPCErrorHandler.handleError(error, {
        code: 'INTERNAL_SERVER_ERROR',
        message: '混合上传策略初始化失败'
      });
    }
  }

  /**
   * 选择最佳上传策略
   */
  private selectStrategy(request: UploadRequest): BaseUploadStrategy {
    const fileSize = request.buffer.length;
    const userLevel = request.userLevel;

    // 根据文件大小选择策略
    let strategyName: string;

    if (fileSize <= this.hybridConfig.smallFileThreshold) {
      strategyName = 'direct';
    } else if (fileSize <= this.hybridConfig.mediumFileThreshold) {
      strategyName = 'stream';
    } else {
      strategyName = 'memory-safe';
    }

    // 根据用户级别调整策略
    const userPreferredStrategy = this.hybridConfig.userLevelStrategies[userLevel];
    if (userPreferredStrategy && this.hybridConfig.enabledStrategies.includes(userPreferredStrategy)) {
      strategyName = userPreferredStrategy;
    }

    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw TRPCErrorHandler.handleError(new Error(`策略 ${strategyName} 不可用`), {
        code: 'INTERNAL_SERVER_ERROR',
        message: '上传策略选择失败'
      });
    }

    return strategy;
  }

  /**
   * 执行上传
   */
  async execute(request: UploadRequest): Promise<UploadResult> {
    try {
      const strategy = this.selectStrategy(request);
      const result = await strategy.upload(request);

      // 添加策略信息
      const fileSize = request.buffer.length;
      let strategyName: string;
      let isAsync = false;

      if (fileSize <= this.hybridConfig.smallFileThreshold) {
        strategyName = 'direct';
        isAsync = false;
      } else if (fileSize <= this.hybridConfig.mediumFileThreshold) {
        strategyName = 'stream';
        isAsync = false;
      } else {
        strategyName = 'chunked';
        isAsync = true;
      }

      return {
        ...result,
        strategy: strategyName,
        isAsync,
        size: fileSize,
        uploadedAt: new Date(),
        metadata: result.metadata || {},
        sessionId: isAsync ? `session_${Date.now()}` : undefined,
      };
    } catch (error) {
      throw TRPCErrorHandler.handleError(error, {
        code: 'INTERNAL_SERVER_ERROR',
        message: '混合上传策略执行失败'
      });
    }
  }

  /**
   * 上传文件（兼容性方法 - 多参数版本）
   */
  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options: {
      userId: string;
      userLevel: UserLevel;
      postId?: string;
    }
  ): Promise<UploadResult>;

  /**
   * 上传文件（兼容性方法 - 单参数版本）
   */
  async uploadFile(request: UploadRequest): Promise<UploadResult>;

  /**
   * 上传文件实现
   */
  async uploadFile(
    bufferOrRequest: Buffer | UploadRequest,
    filename?: string,
    mimeType?: string,
    options?: {
      userId: string;
      userLevel: UserLevel;
      postId?: string;
    }
  ): Promise<UploadResult> {
    let request: UploadRequest;

    // 判断是单参数还是多参数调用
    if (bufferOrRequest instanceof Buffer) {
      if (!filename || !mimeType || !options) {
        throw TRPCErrorHandler.handleError(new Error('缺少必要参数'), {
          code: 'BAD_REQUEST',
          message: '上传文件参数不完整'
        });
      }

      request = {
        filename,
        buffer: bufferOrRequest,
        mimeType,
        userId: options.userId,
        userLevel: options.userLevel,
        postId: options.postId
      };
    } else {
      // 单参数调用
      request = bufferOrRequest as UploadRequest;
    }

    return await this.execute(request);
  }

  /**
   * 验证请求
   */
  override async validateRequest(request: UploadRequest): Promise<boolean> {
    try {
      // 调用基类的验证方法
      super.validateRequest(request);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 实现BaseUploadStrategy的upload方法
   */
  async upload(
    request: UploadRequest,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    return await this.execute(request);
  }

  /**
   * 获取策略描述
   */
  protected getStrategyDescription(): string {
    return '混合上传策略，根据文件大小和用户级别自动选择最优策略';
  }

  /**
   * 获取支持的功能
   */
  protected getSupportedFeatures(): string[] {
    return [
      '自动策略选择',
      '多种上传方式',
      '用户级别适配',
      '性能优化'
    ];
  }

  /**
   * 获取限制条件
   */
  protected getLimitations(): string[] {
    return [
      '需要多个策略支持',
      '配置相对复杂'
    ];
  }

  /**
   * 获取策略信息
   */
  public override getStrategyInfo(): {
    name: string;
    description: string;
    supportedFeatures: string[];
    limitations: string[];
  } {
    return {
      name: this.strategyName,
      description: this.getStrategyDescription(),
      supportedFeatures: this.getSupportedFeatures(),
      limitations: this.getLimitations(),
    };
  }
}

// 创建默认实例
export const hybridUploadStrategy = new HybridUploadStrategy();
