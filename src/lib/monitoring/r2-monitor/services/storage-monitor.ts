/**
 * @fileoverview R2存储监控器
 * @description 监控R2存储的使用情况和存储指标
 */

import {
  S3Client,
  ListObjectsV2Command,
  HeadBucketCommand,
  GetBucketVersioningCommand,
  GetBucketEncryptionCommand,
  GetBucketLifecycleConfigurationCommand,
} from '@aws-sdk/client-s3';
import {
  type R2MonitorConfig,
  type R2StorageMetrics,
  formatStorageSize
} from '../types/r2-monitor-types';

/**
 * R2存储监控器
 */
export class StorageMonitor {
  private s3Client: S3Client;
  private config: R2MonitorConfig;
  private storageCache: Map<string, any> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5分钟缓存

  constructor(s3Client: S3Client, config: R2MonitorConfig) {
    this.s3Client = s3Client;
    this.config = config;
  }

  /**
   * 获取存储指标
   */
  async getStorageMetrics(): Promise<R2StorageMetrics> {
    try {
      // 检查存储桶是否存在
      const bucketExists = await this.checkBucketExists();

      if (!bucketExists) {
        return {
          objectCount: 0,
          totalSize: 0,
          bucketExists: false,
          storageClass: 'STANDARD',
          versioning: false,
          encryption: false,
          lifecycle: false,
        };
      }

      // 获取对象统计
      const objectStats = await this.getObjectStatistics();

      // 获取存储桶配置
      const bucketConfig = await this.getBucketConfiguration();

      return {
        objectCount: objectStats.count,
        totalSize: objectStats.totalSize,
        bucketExists: true,
        lastModified: objectStats.lastModified,
        storageClass: bucketConfig.storageClass,
        versioning: bucketConfig.versioning,
        encryption: bucketConfig.encryption,
        lifecycle: bucketConfig.lifecycle,
      };
    } catch (error) {
      console.error('获取存储指标失败:', error);
      return {
        objectCount: 0,
        totalSize: 0,
        bucketExists: false,
        storageClass: 'STANDARD',
        versioning: false,
        encryption: false,
        lifecycle: false,
      };
    }
  }

  /**
   * 检查存储桶是否存在
   */
  private async checkBucketExists(): Promise<boolean> {
    const cacheKey = 'bucketExists';
    const cached = this.getFromCache(cacheKey);

    if (cached !== null) {
      return cached;
    }

    try {
      const command = new HeadBucketCommand({
        Bucket: this.config.bucketName,
      });

      await this.s3Client.send(command);
      this.setCache(cacheKey, true);
      return true;
    } catch (error) {
      this.setCache(cacheKey, false);
      return false;
    }
  }

  /**
   * 获取对象统计信息
   */
  private async getObjectStatistics(): Promise<{
    count: number;
    totalSize: number;
    lastModified?: Date;
  }> {
    const cacheKey = 'objectStats';
    const cached = this.getFromCache(cacheKey);

    if (cached !== null) {
      return cached;
    }

    let objectCount = 0;
    let totalSize = 0;
    let lastModified: Date | undefined;
    let continuationToken: string | undefined;

    try {
      do {
        const command = new ListObjectsV2Command({
          Bucket: this.config.bucketName,
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        });

        const response = await this.s3Client.send(command);

        if (response.Contents) {
          for (const object of response.Contents) {
            objectCount++;
            totalSize += object.Size || 0;

            if (object.LastModified) {
              if (!lastModified || object.LastModified > lastModified) {
                lastModified = object.LastModified;
              }
            }
          }
        }

        continuationToken = response.NextContinuationToken;

        // 避免无限循环，限制最大对象数
        if (objectCount > 100000) {
          console.warn('对象数量过多，停止统计');
          break;
        }
      } while (continuationToken);

      const result = { count: objectCount, totalSize, lastModified };
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('获取对象统计失败:', error);
      return { count: 0, totalSize: 0 };
    }
  }

  /**
   * 获取存储桶配置
   */
  private async getBucketConfiguration(): Promise<{
    storageClass: string;
    versioning: boolean;
    encryption: boolean;
    lifecycle: boolean;
  }> {
    const cacheKey = 'bucketConfig';
    const cached = this.getFromCache(cacheKey);

    if (cached !== null) {
      return cached;
    }

    const config = {
      storageClass: 'STANDARD',
      versioning: false,
      encryption: false,
      lifecycle: false,
    };

    try {
      // 检查版本控制
      try {
        const versioningCommand = new GetBucketVersioningCommand({
          Bucket: this.config.bucketName,
        });
        const versioningResponse = await this.s3Client.send(versioningCommand);
        config.versioning = versioningResponse.Status === 'Enabled';
      } catch {
        // 忽略版本控制检查错误
      }

      // 检查加密
      try {
        const encryptionCommand = new GetBucketEncryptionCommand({
          Bucket: this.config.bucketName,
        });
        await this.s3Client.send(encryptionCommand);
        config.encryption = true;
      } catch {
        // 忽略加密检查错误
      }

      // 检查生命周期
      try {
        const lifecycleCommand = new GetBucketLifecycleConfigurationCommand({
          Bucket: this.config.bucketName,
        });
        const lifecycleResponse = await this.s3Client.send(lifecycleCommand);
        config.lifecycle = !!(lifecycleResponse.Rules && lifecycleResponse.Rules.length > 0);
      } catch {
        // 忽略生命周期检查错误
      }

      this.setCache(cacheKey, config);
      return config;
    } catch (error) {
      console.error('获取存储桶配置失败:', error);
      return config;
    }
  }

  /**
   * 获取存储使用趋势
   */
  async getStorageUsageTrend(days: number = 30): Promise<{
    dates: string[];
    objectCounts: number[];
    sizes: number[];
  }> {
    // 简化实现：返回模拟数据
    // 实际实现中可能需要从历史数据或CloudWatch获取
    const dates: string[] = [];
    const objectCounts: number[] = [];
    const sizes: number[] = [];

    const currentStats = await this.getObjectStatistics();
    const baseCount = Math.max(1, currentStats.count);
    const baseSize = Math.max(1024, currentStats.totalSize);

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);

      // 模拟增长趋势
      const growthFactor = 1 + (days - i) * 0.02;
      objectCounts.push(Math.floor(baseCount * growthFactor));
      sizes.push(Math.floor(baseSize * growthFactor));
    }

    return { dates, objectCounts, sizes };
  }

  /**
   * 分析存储使用情况
   */
  async analyzeStorageUsage(): Promise<{
    summary: {
      totalObjects: number;
      totalSize: string;
      averageObjectSize: string;
      largestObject: string;
      storageEfficiency: number;
    };
    recommendations: string[];
    warnings: string[];
  }> {
    const metrics = await this.getStorageMetrics();
    const recommendations: string[] = [];
    const warnings: string[] = [];

    const averageObjectSize = metrics.objectCount > 0 ? metrics.totalSize / metrics.objectCount : 0;
    const storageEfficiency = this.calculateStorageEfficiency(metrics);

    // 分析和建议
    if (metrics.totalSize > 100 * 1024 * 1024 * 1024) { // 100GB
      recommendations.push('考虑实施数据生命周期管理策略');
    }

    if (averageObjectSize < 1024) { // 小于1KB
      recommendations.push('考虑合并小文件以提高存储效率');
    }

    if (!metrics.versioning && metrics.objectCount > 1000) {
      recommendations.push('考虑启用版本控制以保护重要数据');
    }

    if (!metrics.encryption) {
      warnings.push('存储桶未启用加密，建议启用以提高安全性');
    }

    if (!metrics.lifecycle && metrics.totalSize > 10 * 1024 * 1024 * 1024) { // 10GB
      recommendations.push('配置生命周期规则以自动管理旧数据');
    }

    if (storageEfficiency < 0.7) {
      warnings.push('存储效率较低，可能存在大量重复或无用数据');
    }

    return {
      summary: {
        totalObjects: metrics.objectCount,
        totalSize: formatStorageSize(metrics.totalSize),
        averageObjectSize: formatStorageSize(averageObjectSize),
        largestObject: formatStorageSize(0), // 简化实现
        storageEfficiency,
      },
      recommendations,
      warnings,
    };
  }

  /**
   * 计算存储效率
   */
  private calculateStorageEfficiency(metrics: R2StorageMetrics): number {
    // 简化的存储效率计算
    // 实际实现可能需要更复杂的算法
    let efficiency = 1.0;

    // 基于对象数量和大小的比例
    if (metrics.objectCount > 0) {
      const averageSize = metrics.totalSize / metrics.objectCount;

      // 小文件过多会降低效率
      if (averageSize < 1024) {
        efficiency *= 0.7;
      } else if (averageSize < 10240) {
        efficiency *= 0.9;
      }
    }

    // 基于配置的效率
    if (metrics.versioning) efficiency *= 1.1;
    if (metrics.encryption) efficiency *= 1.05;
    if (metrics.lifecycle) efficiency *= 1.1;

    return Math.min(1.0, efficiency);
  }

  /**
   * 获取存储配额使用情况
   */
  async getQuotaUsage(): Promise<{
    used: number;
    total: number;
    percentage: number;
    warning: boolean;
    critical: boolean;
  }> {
    const metrics = await this.getStorageMetrics();

    // R2没有硬性配额限制，这里使用配置的阈值
    const totalQuota = 1024 * 1024 * 1024 * 1024; // 1TB 默认配额
    const percentage = (metrics.totalSize / totalQuota) * 100;

    return {
      used: metrics.totalSize,
      total: totalQuota,
      percentage,
      warning: percentage > 80,
      critical: percentage > 95,
    };
  }

  /**
   * 清理存储缓存
   */
  clearCache(): void {
    this.storageCache.clear();
  }

  /**
   * 从缓存获取数据
   */
  private getFromCache(key: string): any {
    const cached = this.storageCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  /**
   * 设置缓存数据
   */
  private setCache(key: string, data: any): void {
    this.storageCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * 获取存储健康状态
   */
  async getStorageHealth(): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      const metrics = await this.getStorageMetrics();

      if (!metrics.bucketExists) {
        issues.push('存储桶不存在或无法访问');
        recommendations.push('检查存储桶名称和访问权限');
      }

      const quotaUsage = await this.getQuotaUsage();
      if (quotaUsage.critical) {
        issues.push('存储使用量接近配额限制');
        recommendations.push('清理不必要的文件或增加存储配额');
      } else if (quotaUsage.warning) {
        recommendations.push('监控存储使用量，考虑清理策略');
      }

      if (!metrics.encryption) {
        issues.push('存储桶未启用加密');
        recommendations.push('启用存储桶加密以提高安全性');
      }

      const analysis = await this.analyzeStorageUsage();
      if (analysis.summary.storageEfficiency < 0.7) {
        issues.push('存储效率较低');
        recommendations.push(...analysis.recommendations);
      }

      return {
        healthy: issues.length === 0,
        issues,
        recommendations,
      };
    } catch (error) {
      return {
        healthy: false,
        issues: [`存储健康检查失败: ${error instanceof Error ? error.message : String(error)}`],
        recommendations: ['检查R2服务配置和网络连接'],
      };
    }
  }
}
