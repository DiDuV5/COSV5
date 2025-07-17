/**
 * @fileoverview R2客户端管理器
 * @description 管理S3客户端的初始化、配置和连接
 * @author Augment AI
 * @date 2025-06-27
 * @version 1.0.0
 * @since 1.0.0
 */

import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import {
  type R2Config,
  type R2ClientConfig,
  type R2ErrorType,
  R2_DEFAULTS,
  validateR2Config
} from './r2-types';
import { StorageFactory } from '../object-storage/storage-factory';

/**
 * R2客户端管理器
 */
export class R2ClientManager {
  private s3Client: S3Client | null = null;
  private config: R2Config;
  private isInitialized = false;
  private connectionTestCache = new Map<string, { result: boolean; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  constructor(config: R2Config) {
    this.config = config;
  }

  /**
   * 初始化S3客户端
   */
  async initialize(): Promise<void> {
    try {
      // 验证配置
      this.validateConfig();

      // 如果配置不完整，尝试从环境变量获取配置
      if (!this.config.accessKeyId || !this.config.secretAccessKey || !this.config.bucket) {
        console.log('🔧 配置不完整，尝试从环境变量获取R2配置');
        try {
          const envConfig = StorageFactory.createCloudflareR2Config();
          this.config = { ...this.config, ...envConfig };
          console.log('✅ 成功从环境变量获取R2配置');
        } catch (error) {
          console.error('❌ 无法从环境变量获取R2配置:', error);
          throw new Error('R2配置不完整且无法从环境变量获取配置');
        }
      }

      // 创建客户端配置，强制设置超时时间
      const requestTimeout = 600000; // 强制10分钟超时
      console.log('🔧 R2客户端管理器设置超时时间:', requestTimeout);

      const clientConfig: R2ClientConfig = {
        region: this.config.region || R2_DEFAULTS.REGION,
        endpoint: this.config.endpoint,
        forcePathStyle: this.config.forcePathStyle ?? R2_DEFAULTS.FORCE_PATH_STYLE,
        credentials: {
          accessKeyId: this.config.accessKeyId!,
          secretAccessKey: this.config.secretAccessKey!,
        },
        requestHandler: {
          requestTimeout: requestTimeout,
          connectionTimeout: 120000, // 2分钟连接超时
        },
      };

      // 创建S3客户端
      this.s3Client = new S3Client(clientConfig);

      // 测试连接
      await this.testConnection();

      this.isInitialized = true;
      console.log('✅ R2客户端初始化成功');
    } catch (error) {
      console.error('❌ R2客户端初始化失败:', error);
      throw new Error(`R2客户端初始化失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取S3客户端
   */
  getClient(): S3Client {
    if (!this.s3Client || !this.isInitialized) {
      throw new Error('R2客户端未初始化，请先调用initialize()');
    }
    return this.s3Client;
  }

  /**
   * 获取配置
   */
  getConfig(): R2Config {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  async updateConfig(newConfig: Partial<R2Config>): Promise<void> {
    this.config = { ...this.config, ...newConfig };

    // 重新初始化客户端
    this.isInitialized = false;
    this.s3Client = null;
    await this.initialize();
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized && this.s3Client !== null;
  }

  /**
   * 测试连接
   */
  async testConnection(useCache = true): Promise<boolean> {
    if (!this.s3Client) {
      throw new Error('R2客户端未初始化');
    }

    const cacheKey = `${this.config.bucket}-${this.config.endpoint}`;

    // 检查缓存
    if (useCache) {
      const cached = this.connectionTestCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.result;
      }
    }

    try {
      const command = new HeadBucketCommand({
        Bucket: this.config.bucket!,
      });

      await this.s3Client.send(command);

      // 缓存结果
      this.connectionTestCache.set(cacheKey, {
        result: true,
        timestamp: Date.now(),
      });

      console.log('✅ R2连接测试成功');
      return true;
    } catch (error) {
      console.error('❌ R2连接测试失败:', error);

      // 缓存失败结果（较短时间）
      this.connectionTestCache.set(cacheKey, {
        result: false,
        timestamp: Date.now(),
      });

      return false;
    }
  }

  /**
   * 验证配置
   */
  private validateConfig(): void {
    const errors = validateR2Config(this.config);
    if (errors.length > 0) {
      throw new Error(`R2配置验证失败: ${errors.join(', ')}`);
    }
  }

  /**
   * 销毁客户端
   */
  async destroy(): Promise<void> {
    if (this.s3Client) {
      try {
        // S3Client没有显式的destroy方法，但我们可以清理引用
        this.s3Client = null;
        this.isInitialized = false;
        this.connectionTestCache.clear();
        console.log('🗑️ R2客户端已销毁');
      } catch (error) {
        console.error('❌ 销毁R2客户端时出错:', error);
      }
    }
  }

  /**
   * 获取客户端状态
   */
  getStatus(): {
    isInitialized: boolean;
    hasClient: boolean;
    config: {
      bucket: string;
      region: string;
      endpoint?: string;
    };
    lastConnectionTest?: Date;
  } {
    const cacheKey = `${this.config.bucket}-${this.config.endpoint}`;
    const cached = this.connectionTestCache.get(cacheKey);

    return {
      isInitialized: this.isInitialized,
      hasClient: this.s3Client !== null,
      config: {
        bucket: this.config.bucket || '',
        region: this.config.region || R2_DEFAULTS.REGION,
        endpoint: this.config.endpoint,
      },
      lastConnectionTest: cached ? new Date(cached.timestamp) : undefined,
    };
  }

  /**
   * 清理连接测试缓存
   */
  clearConnectionCache(): void {
    this.connectionTestCache.clear();
    console.log('🧹 已清理R2连接测试缓存');
  }

  /**
   * 重新连接
   */
  async reconnect(): Promise<void> {
    console.log('🔄 重新连接R2...');

    // 清理现有连接
    await this.destroy();

    // 清理缓存
    this.clearConnectionCache();

    // 重新初始化
    await this.initialize();
  }

  /**
   * 获取连接统计信息
   */
  getConnectionStats(): {
    cacheSize: number;
    cacheHits: number;
    cacheMisses: number;
    lastTestResults: Array<{
      bucket: string;
      endpoint?: string;
      success: boolean;
      timestamp: Date;
    }>;
  } {
    const lastTestResults = Array.from(this.connectionTestCache.entries()).map(([key, value]) => {
      const [bucket, endpoint] = key.split('-');
      return {
        bucket,
        endpoint: endpoint !== 'undefined' ? endpoint : undefined,
        success: value.result,
        timestamp: new Date(value.timestamp),
      };
    });

    return {
      cacheSize: this.connectionTestCache.size,
      cacheHits: 0, // 这里需要实际的统计逻辑
      cacheMisses: 0, // 这里需要实际的统计逻辑
      lastTestResults,
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    details: {
      clientInitialized: boolean;
      connectionTest: boolean;
      configValid: boolean;
      lastError?: string;
    };
  }> {
    const details = {
      clientInitialized: this.isInitialized,
      connectionTest: false,
      configValid: true,
      lastError: undefined as string | undefined,
    };

    try {
      // 验证配置
      this.validateConfig();
    } catch (error) {
      details.configValid = false;
      details.lastError = error instanceof Error ? error.message : '配置验证失败';
    }

    // 测试连接
    if (this.isInitialized) {
      try {
        details.connectionTest = await this.testConnection(false);
      } catch (error) {
        details.connectionTest = false;
        details.lastError = error instanceof Error ? error.message : '连接测试失败';
      }
    }

    // 确定状态
    let status: 'healthy' | 'unhealthy' | 'degraded';
    if (details.clientInitialized && details.connectionTest && details.configValid) {
      status = 'healthy';
    } else if (details.clientInitialized && details.configValid) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return { status, details };
  }
}

/**
 * 创建R2客户端管理器实例
 */
export function createR2ClientManager(config: R2Config): R2ClientManager {
  return new R2ClientManager(config);
}
