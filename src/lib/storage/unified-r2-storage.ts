/**
 * @fileoverview 统一Cloudflare R2存储配置管理器
 * @description 实现环境自适应CDN域名配置，统一存储系统，智能故障转移 - 重构为模块化架构
 * @author Augment AI
 * @date 2025-06-22
 * @version 2.0.0 - 模块化重构
 *
 * @example
 * import { UnifiedR2Storage } from './unified-r2-storage'
 * const storage = UnifiedR2Storage.getInstance()
 * const result = await storage.uploadFile(buffer, 'test.jpg')
 *
 * @dependencies
 * - @aws-sdk/client-s3: ^3.490.0
 * - @aws-sdk/lib-storage: ^3.490.0
 *
 * @changelog
 * - 2025-06-16: 初始版本创建，统一R2存储配置
 * - 2025-06-22: 重构为模块化架构，拆分大文件
 */

import { S3Client, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// 导入模块化组件
import type {
  Environment,
  UploadParams,
  StreamUploadParams,
  UploadResult,
  HealthReport,
  EnvironmentConfig
} from './unified-r2-storage/types';
import { getR2Config, detectEnvironment, getEnvironmentConfigs } from './unified-r2-storage/config';
import { generateTaskId } from './unified-r2-storage/utils';
import { CDNManager } from './unified-r2-storage/cdn-manager';
import { UploadStrategies } from './unified-r2-storage/upload-strategies';

// 重新导出类型以保持向后兼容
export type { Environment, CDNDomainConfig, EnvironmentConfig, UploadParams, StreamUploadParams, UploadResult } from './unified-r2-storage/types';





/**
 * 统一Cloudflare R2存储管理器
 */
export class UnifiedR2Storage {
  private static instance: UnifiedR2Storage | null = null;
  private s3Client: S3Client | null = null;
  private currentEnvironment: Environment;
  private environmentConfig: EnvironmentConfig;
  private environmentConfigs: Record<Environment, EnvironmentConfig>;
  private isInitialized = false;
  private cdnManager: CDNManager;
  private uploadStrategies: UploadStrategies | null = null;

  private constructor() {
    this.currentEnvironment = detectEnvironment();
    this.environmentConfigs = getEnvironmentConfigs();
    this.environmentConfig = this.environmentConfigs[this.currentEnvironment];
    this.cdnManager = new CDNManager(this.currentEnvironment, this.environmentConfig);
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): UnifiedR2Storage {
    if (!UnifiedR2Storage.instance) {
      UnifiedR2Storage.instance = new UnifiedR2Storage();
    }
    return UnifiedR2Storage.instance;
  }

  /**
   * 初始化存储客户端
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const r2Config = getR2Config();

      // 初始化S3客户端
      console.log(`🔧 初始化S3客户端配置:`, {
        region: r2Config.region,
        endpoint: r2Config.endpoint,
        bucket: r2Config.bucket,
        accessKeyId: r2Config.accessKeyId.substring(0, 8) + '...',
      });

      // 强制设置超时配置，解决30秒超时问题
      const requestHandlerConfig = {
        requestTimeout: 600000,    // 10分钟
        connectionTimeout: 120000, // 2分钟连接超时
        socketTimeout: 600000,     // 10分钟socket超时
      };

      console.log('🔧 强制设置S3Client超时配置:', requestHandlerConfig);

      this.s3Client = new S3Client({
        region: r2Config.region,
        endpoint: r2Config.endpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId: r2Config.accessKeyId,
          secretAccessKey: r2Config.secretAccessKey,
        },
        requestHandler: requestHandlerConfig,
        maxAttempts: 5, // 增加重试次数
      });

      // 测试R2连接
      console.log(`🔧 测试R2连接...`);
      try {
        const testCommand = new HeadObjectCommand({
          Bucket: r2Config.bucket,
          Key: 'test-connection-' + Date.now(),
        });
        await this.s3Client.send(testCommand);
        console.log(`✅ R2连接测试成功`);
      } catch (error: any) {
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
          console.log(`✅ R2连接正常 (测试文件不存在是正常的)`);
        } else {
          console.warn(`⚠️ R2连接测试失败，但继续初始化:`, error.message);
        }
      }

      // 初始化上传策略管理器
      this.uploadStrategies = new UploadStrategies(this.s3Client);

      // 启动CDN管理器
      this.cdnManager.start();

      this.isInitialized = true;
      console.log(`✅ 统一R2存储初始化成功 (环境: ${this.currentEnvironment})`);
    } catch (error) {
      console.error('❌ 统一R2存储初始化失败:', error);
      throw new Error(`R2存储初始化失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取当前环境
   */
  public getCurrentEnvironment(): Environment {
    return this.currentEnvironment;
  }

  /**
   * 获取环境配置
   */
  public getEnvironmentConfig(): EnvironmentConfig {
    return this.cdnManager.getEnvironmentConfig();
  }

  /**
   * 切换环境
   */
  public switchEnvironment(newEnvironment: Environment): void {
    if (this.currentEnvironment === newEnvironment) {
      return;
    }

    this.currentEnvironment = newEnvironment;
    this.environmentConfig = this.environmentConfigs[newEnvironment];
    this.cdnManager.switchEnvironment(newEnvironment, this.environmentConfig);

    console.log(`🔄 环境切换: ${newEnvironment}`);
  }

  /**
   * 获取最佳CDN域名
   */
  public async getBestCDNDomain(): Promise<string> {
    return this.cdnManager.getBestCDNDomain();
  }

  /**
   * 生成CDN URL
   */
  public async generateCDNUrl(key: string): Promise<string> {
    return this.cdnManager.generateCDNUrl(key);
  }

  /**
   * 上传文件（传统方法，保持向后兼容）
   */
  public async uploadFile(params: UploadParams): Promise<UploadResult> {
    return this.streamUploadFile({
      ...params,
      enableDirectUpload: true,
    });
  }

  /**
   * 流式上传文件（新的优化方法）
   */
  public async streamUploadFile(params: StreamUploadParams): Promise<UploadResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.uploadStrategies) {
      throw new Error('上传策略管理器未初始化');
    }

    try {
      // 选择上传策略
      const strategy = this.uploadStrategies.selectStrategy(params.size);
      let uploadResult;

      switch (strategy) {
        case 'direct':
          uploadResult = await this.uploadStrategies.directUpload(params);
          break;
        case 'multipart':
          uploadResult = await this.uploadStrategies.multipartUpload(params);
          break;
        case 'stream':
          uploadResult = await this.uploadStrategies.streamUpload(params);
          break;
        default:
          throw new Error(`未知的上传策略: ${strategy}`);
      }

      // 生成CDN URL
      const cdnUrl = await this.generateCDNUrl(params.key);
      const bestDomain = await this.getBestCDNDomain();

      const result: UploadResult = {
        key: params.key,
        url: cdnUrl,
        cdnUrl,
        size: params.size,
        etag: uploadResult.ETag,
        uploadedAt: new Date(),
        environment: this.currentEnvironment,
        usedDomain: bestDomain,
        uploadMethod: strategy,
      };

      console.log(`✅ 文件上传成功: ${params.key} (${strategy}, ${this.currentEnvironment})`);
      return result;
    } catch (error) {
      console.error('❌ 文件上传失败:', error);
      throw new Error(`文件上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 批量上传文件
   */
  public async batchUploadFiles(uploads: StreamUploadParams[]): Promise<UploadResult[]> {
    if (!this.uploadStrategies) {
      throw new Error('上传策略管理器未初始化');
    }

    return this.uploadStrategies.batchUpload(uploads);
  }

  /**
   * 异步上传文件（用于后台处理）
   */
  public async asyncUploadFile(params: StreamUploadParams): Promise<string> {
    // 返回一个任务ID，实际上传在后台进行
    const taskId = generateTaskId();

    // 在实际应用中，这里应该将任务加入队列
    // 这里简化为立即执行
    setImmediate(async () => {
      try {
        await this.streamUploadFile(params);
        console.log(`✅ 异步上传完成: ${params.key} (任务ID: ${taskId})`);
      } catch (error) {
        console.error(`❌ 异步上传失败: ${params.key} (任务ID: ${taskId})`, error);
      }
    });

    return taskId;
  }

  /**
   * 检查文件是否存在
   */
  public async fileExists(key: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.s3Client) {
      throw new Error('S3客户端未初始化');
    }

    try {
      const r2Config = getR2Config();

      const command = new HeadObjectCommand({
        Bucket: r2Config.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 删除文件
   */
  public async deleteFile(key: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.s3Client) {
      throw new Error('S3客户端未初始化');
    }

    try {
      const r2Config = getR2Config();

      const command = new DeleteObjectCommand({
        Bucket: r2Config.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      console.log(`✅ 文件删除成功: ${key}`);
    } catch (error) {
      console.error('❌ 文件删除失败:', error);
      throw new Error(`文件删除失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 生成预签名URL
   */
  public async generatePresignedUrl(
    key: string,
    operation: 'get' | 'put',
    expiresIn: number = 3600
  ): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.s3Client) {
      throw new Error('S3客户端未初始化');
    }

    try {
      const r2Config = getR2Config();
      let command;

      if (operation === 'get') {
        command = new GetObjectCommand({
          Bucket: r2Config.bucket,
          Key: key,
        });
      } else {
        command = new PutObjectCommand({
          Bucket: r2Config.bucket,
          Key: key,
        });
      }

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error('❌ 生成预签名URL失败:', error);
      throw new Error(`生成预签名URL失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取健康状态报告
   */
  public getHealthReport(): HealthReport {
    return this.cdnManager.getHealthReport();
  }

  /**
   * 销毁实例
   */
  public destroy(): void {
    this.cdnManager.stop();
    this.s3Client = null;
    this.uploadStrategies = null;
    this.isInitialized = false;
    UnifiedR2Storage.instance = null;
  }
}

// 导出单例实例
export const unifiedR2Storage = UnifiedR2Storage.getInstance();
