/**
 * @fileoverview 存储监控服务
 * @description 负责监控R2存储、CDN和文件上传相关指标
 */

import { S3Client, HeadBucketCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import type { StorageMetrics } from '../types/monitoring-types';

/**
 * 存储监控服务
 */
export class StorageMonitoringService {
  private s3Client: S3Client;
  private prisma: PrismaClient;

  constructor(s3Client: S3Client, prisma: PrismaClient) {
    this.s3Client = s3Client;
    this.prisma = prisma;
  }

  /**
   * 收集存储相关指标
   */
  public async collectStorageMetrics(): Promise<StorageMetrics> {
    try {
      console.log('📦 收集存储监控指标...');

      const [
        r2Metrics,
        cdnMetrics,
        uploadMetrics,
        storageUsage,
        fileCount
      ] = await Promise.all([
        this.checkR2Connection(),
        this.checkCdnResponseTime(),
        this.calculateUploadSuccessRate(),
        this.calculateStorageUsage(),
        this.getFileCount(),
      ]);

      const metrics: StorageMetrics = {
        r2Connection: r2Metrics.connected,
        r2ResponseTime: r2Metrics.responseTime,
        cdnResponseTime: cdnMetrics.responseTime,
        uploadSuccessRate: uploadMetrics.successRate,
        storageUsage: storageUsage.usageGB,
        fileCount: fileCount.total,
      };

      console.log('✅ 存储监控指标收集完成:', {
        r2Connection: metrics.r2Connection,
        r2ResponseTime: `${metrics.r2ResponseTime}ms`,
        uploadSuccessRate: `${metrics.uploadSuccessRate}%`,
        storageUsage: `${metrics.storageUsage}GB`,
        fileCount: metrics.fileCount,
      });

      return metrics;
    } catch (error) {
      console.error('❌ 存储指标收集失败:', error);
      throw error;
    }
  }

  /**
   * 检查R2连接状态和响应时间
   */
  private async checkR2Connection(): Promise<{ connected: boolean; responseTime: number }> {
    const startTime = Date.now();

    try {
      const headCommand = new HeadBucketCommand({
        Bucket: process.env.COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME || 'tut',
      });

      await this.s3Client.send(headCommand);
      const responseTime = Date.now() - startTime;

      console.log(`🔗 R2连接正常，响应时间: ${responseTime}ms`);
      return { connected: true, responseTime };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.warn(`⚠️ R2连接失败，响应时间: ${responseTime}ms`, error);
      return { connected: false, responseTime };
    }
  }

  /**
   * 检查CDN响应时间
   */
  private async checkCdnResponseTime(): Promise<{ responseTime: number }> {
    const startTime = Date.now();

    try {
      // 测试CDN端点
      const cdnUrl = process.env.COSEREEDEN_CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-xxx.r2.dev';
      const testUrl = `${cdnUrl}/test-file.txt`;

      const response = await fetch(testUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000), // 5秒超时
      });

      const responseTime = Date.now() - startTime;
      console.log(`🌐 CDN响应时间: ${responseTime}ms`);
      return { responseTime };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.warn(`⚠️ CDN响应时间测试失败: ${responseTime}ms`, error);
      return { responseTime };
    }
  }

  /**
   * 计算上传成功率
   */
  private async calculateUploadSuccessRate(): Promise<{ successRate: number }> {
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // 获取最近24小时的上传统计
      const [totalUploads, successfulUploads] = await Promise.all([
        this.prisma.postMedia.count({
          where: {
            createdAt: { gte: yesterday },
          },
        }),
        this.prisma.postMedia.count({
          where: {
            createdAt: { gte: yesterday },
            url: { not: null as any }, // 有URL说明上传成功
          },
        }),
      ]);

      const successRate = totalUploads > 0 ? (successfulUploads / totalUploads) * 100 : 100;
      console.log(`📊 上传成功率: ${successRate.toFixed(1)}% (${successfulUploads}/${totalUploads})`);

      return { successRate: Math.round(successRate * 100) / 100 };
    } catch (error) {
      console.error('❌ 上传成功率计算失败:', error);
      return { successRate: 0 };
    }
  }

  /**
   * 计算存储使用量
   */
  private async calculateStorageUsage(): Promise<{ usageGB: number; usagePercentage: number }> {
    try {
      // 从数据库获取文件大小总和
      const result = await this.prisma.postMedia.aggregate({
        _sum: {
          fileSize: true,
        },
      });

      const totalBytes = result._sum.fileSize || 0;
      const usageGB = totalBytes / (1024 * 1024 * 1024); // 转换为GB

      // 假设存储限制为1TB
      const storageLimitGB = 1024;
      const usagePercentage = (usageGB / storageLimitGB) * 100;

      console.log(`💾 存储使用量: ${usageGB.toFixed(2)}GB (${usagePercentage.toFixed(1)}%)`);

      return {
        usageGB: Math.round(usageGB * 100) / 100,
        usagePercentage: Math.round(usagePercentage * 100) / 100,
      };
    } catch (error) {
      console.error('❌ 存储使用量计算失败:', error);
      return { usageGB: 0, usagePercentage: 0 };
    }
  }

  /**
   * 获取文件数量统计
   */
  private async getFileCount(): Promise<{
    total: number;
    images: number;
    videos: number;
    others: number;
  }> {
    try {
      const [total, images, videos] = await Promise.all([
        this.prisma.postMedia.count(),
        this.prisma.postMedia.count({
          where: {
            mediaType: { startsWith: 'image/' },
          },
        }),
        this.prisma.postMedia.count({
          where: {
            mediaType: { startsWith: 'video/' },
          },
        }),
      ]);

      const others = total - images - videos;

      console.log(`📁 文件统计: 总计 ${total}, 图片 ${images}, 视频 ${videos}, 其他 ${others}`);

      return { total, images, videos, others };
    } catch (error) {
      console.error('❌ 文件数量统计失败:', error);
      return { total: 0, images: 0, videos: 0, others: 0 };
    }
  }

  /**
   * 获取存储增长趋势
   */
  public async getStorageGrowthTrend(days: number = 7): Promise<Array<{
    date: string;
    totalSize: number;
    fileCount: number;
  }>> {
    try {
      const results: Array<{ date: string; totalSize: number; fileCount: number }> = [];
      const now = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

        const [sizeResult, countResult] = await Promise.all([
          this.prisma.postMedia.aggregate({
            where: {
              createdAt: {
                gte: new Date(0), // 从开始到当前日期
                lt: nextDate,
              },
            },
            _sum: {
              fileSize: true,
            },
          }),
          this.prisma.postMedia.count({
            where: {
              createdAt: {
                gte: new Date(0),
                lt: nextDate,
              },
            },
          }),
        ]);

        results.push({
          date: date.toISOString().split('T')[0],
          totalSize: sizeResult._sum.fileSize || 0,
          fileCount: countResult,
        });
      }

      return results;
    } catch (error) {
      console.error('❌ 存储增长趋势获取失败:', error);
      return [];
    }
  }

  /**
   * 检查存储健康状态
   */
  public async checkStorageHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // 检查R2连接
      const r2Status = await this.checkR2Connection();
      if (!r2Status.connected) {
        issues.push('R2存储连接失败');
        recommendations.push('检查R2配置和网络连接');
      }

      // 检查存储使用量
      const storageUsage = await this.calculateStorageUsage();
      if (storageUsage.usagePercentage > 90) {
        issues.push(`存储使用率过高: ${storageUsage.usagePercentage}%`);
        recommendations.push('清理不必要的文件或扩展存储容量');
      } else if (storageUsage.usagePercentage > 80) {
        issues.push(`存储使用率较高: ${storageUsage.usagePercentage}%`);
        recommendations.push('监控存储使用情况，准备扩容');
      }

      // 检查上传成功率
      const uploadMetrics = await this.calculateUploadSuccessRate();
      if (uploadMetrics.successRate < 95) {
        issues.push(`上传成功率偏低: ${uploadMetrics.successRate}%`);
        recommendations.push('检查上传服务和网络稳定性');
      }

      // 确定整体状态
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (issues.some(issue => issue.includes('失败') || issue.includes('过高'))) {
        status = 'critical';
      } else if (issues.length > 0) {
        status = 'warning';
      }

      return { status, issues, recommendations };
    } catch (error) {
      console.error('❌ 存储健康检查失败:', error);
      return {
        status: 'critical',
        issues: ['存储健康检查失败'],
        recommendations: ['检查监控服务配置'],
      };
    }
  }

  /**
   * 获取存储性能报告
   */
  public async getStoragePerformanceReport(): Promise<{
    averageUploadTime: number;
    averageDownloadTime: number;
    throughput: number;
    errorRate: number;
  }> {
    try {
      // 这里应该从实际的性能日志中获取数据
      // 暂时返回模拟数据
      return {
        averageUploadTime: 2500, // ms
        averageDownloadTime: 150, // ms
        throughput: 50, // MB/s
        errorRate: 0.5, // %
      };
    } catch (error) {
      console.error('❌ 存储性能报告获取失败:', error);
      return {
        averageUploadTime: 0,
        averageDownloadTime: 0,
        throughput: 0,
        errorRate: 0,
      };
    }
  }
}
