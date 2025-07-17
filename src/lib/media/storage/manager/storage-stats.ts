/**
 * @fileoverview 存储统计信息管理
 * @description 管理存储相关的统计信息和性能指标
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

import type { StorageStats, HealthStatus } from '../base-storage-provider';
import type { UploadStats, ProviderStats } from './storage-types';
import type { StorageProviderManager } from './storage-providers';

/**
 * 存储统计信息管理器
 */
export class StorageStatsManager {
  private uploadStats: UploadStats;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(private providerManager: StorageProviderManager) {
    this.uploadStats = {
      totalUploads: 0,
      successfulUploads: 0,
      failedUploads: 0,
      totalSize: 0,
      averageUploadTime: 0,
      providerStats: {},
    };

    // 初始化提供商统计
    this.initializeProviderStats();
  }

  /**
   * 初始化提供商统计
   */
  private initializeProviderStats(): void {
    const providers = this.providerManager.getAllProviders();
    for (const [name] of providers) {
      this.uploadStats.providerStats[name] = {
        uploads: 0,
        successes: 0,
        failures: 0,
        totalSize: 0,
        averageUploadTime: 0,
      };
    }
  }

  /**
   * 更新上传统计
   */
  updateUploadStats(
    providerName: string,
    success: boolean,
    fileSize: number,
    uploadTime: number
  ): void {
    this.uploadStats.totalUploads++;
    this.uploadStats.totalSize += fileSize;

    if (success) {
      this.uploadStats.successfulUploads++;
    } else {
      this.uploadStats.failedUploads++;
    }

    // 更新平均上传时间
    this.uploadStats.averageUploadTime =
      (this.uploadStats.averageUploadTime * (this.uploadStats.totalUploads - 1) + uploadTime) /
      this.uploadStats.totalUploads;

    // 更新提供商统计
    const providerStats = this.uploadStats.providerStats[providerName];
    if (providerStats) {
      providerStats.uploads++;
      providerStats.totalSize += fileSize;

      if (success) {
        providerStats.successes++;
      } else {
        providerStats.failures++;
      }

      // 更新提供商平均上传时间
      providerStats.averageUploadTime =
        (providerStats.averageUploadTime * (providerStats.uploads - 1) + uploadTime) /
        providerStats.uploads;
    }
  }

  /**
   * 获取上传统计
   */
  getUploadStats(): UploadStats {
    return { ...this.uploadStats };
  }

  /**
   * 获取提供商统计
   */
  getProviderStats(providerName: string): ProviderStats | undefined {
    return this.uploadStats.providerStats[providerName]
      ? { ...this.uploadStats.providerStats[providerName] }
      : undefined;
  }

  /**
   * 获取所有提供商的存储统计信息
   */
  async getAllStorageStats(): Promise<Record<string, StorageStats>> {
    const results: Record<string, StorageStats> = {};
    const providers = this.providerManager.getAllProviders();

    for (const [name, provider] of providers) {
      try {
        results[name] = await provider.getStats();
      } catch (error) {
        console.error(`Failed to get stats for ${name}:`, error);
        results[name] = {
          totalFiles: 0,
          totalSize: 0,
          timestamp: new Date(),
        };
      }
    }

    return results;
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck(): Promise<Record<string, HealthStatus>> {
    const results: Record<string, HealthStatus> = {};
    const providers = this.providerManager.getAllProviders();

    for (const [name, provider] of providers) {
      try {
        const health = await provider.healthCheck();
        results[name] = health;

        // 如果健康检查成功，可以在这里更新相关统计
        if (health.healthy) {
          console.log(`✅ Health check passed for ${name}`);
        } else {
          console.warn(`⚠️ Health check failed for ${name}: ${health.error || 'Unknown error'}`);
        }
      } catch (error) {
        results[name] = {
          healthy: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          lastCheck: new Date(),
        };
        console.error(`❌ Health check error for ${name}:`, error);
      }
    }

    return results;
  }

  /**
   * 开始健康检查
   */
  startHealthCheck(intervalMs: number = 5 * 60 * 1000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('Health check interval error:', error);
      }
    }, intervalMs);

    console.log(`🔄 Health check started with ${intervalMs}ms interval`);
  }

  /**
   * 停止健康检查
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      console.log('🛑 Health check stopped');
    }
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): {
    overall: {
      successRate: number;
      averageUploadTime: number;
      totalUploads: number;
      totalSize: number;
    };
    providers: Record<string, {
      name: string;
      successRate: number;
      averageUploadTime: number;
      uploads: number;
      totalSize: number;
    }>;
  } {
    const overall = {
      successRate: this.uploadStats.totalUploads > 0
        ? (this.uploadStats.successfulUploads / this.uploadStats.totalUploads) * 100
        : 0,
      averageUploadTime: this.uploadStats.averageUploadTime,
      totalUploads: this.uploadStats.totalUploads,
      totalSize: this.uploadStats.totalSize,
    };

    const providers: Record<string, any> = {};
    for (const [name, stats] of Object.entries(this.uploadStats.providerStats)) {
      providers[name] = {
        name,
        successRate: stats.uploads > 0 ? (stats.successes / stats.uploads) * 100 : 0,
        averageUploadTime: stats.averageUploadTime,
        uploads: stats.uploads,
        totalSize: stats.totalSize,
      };
    }

    return { overall, providers };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.uploadStats = {
      totalUploads: 0,
      successfulUploads: 0,
      failedUploads: 0,
      totalSize: 0,
      averageUploadTime: 0,
      providerStats: {},
    };

    this.initializeProviderStats();
    console.log('📊 Statistics reset');
  }

  /**
   * 获取统计摘要
   */
  getStatsSummary(): {
    totalUploads: number;
    successRate: number;
    failureRate: number;
    averageUploadTime: number;
    totalSize: string;
    topProvider: string | null;
  } {
    const successRate = this.uploadStats.totalUploads > 0
      ? (this.uploadStats.successfulUploads / this.uploadStats.totalUploads) * 100
      : 0;

    const failureRate = this.uploadStats.totalUploads > 0
      ? (this.uploadStats.failedUploads / this.uploadStats.totalUploads) * 100
      : 0;

    // 找出使用最多的提供商
    let topProvider: string | null = null;
    let maxUploads = 0;
    for (const [name, stats] of Object.entries(this.uploadStats.providerStats)) {
      if (stats.uploads > maxUploads) {
        maxUploads = stats.uploads;
        topProvider = name;
      }
    }

    return {
      totalUploads: this.uploadStats.totalUploads,
      successRate: Math.round(successRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
      averageUploadTime: Math.round(this.uploadStats.averageUploadTime),
      totalSize: this.formatFileSize(this.uploadStats.totalSize),
      topProvider,
    };
  }

  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.stopHealthCheck();
  }
}
