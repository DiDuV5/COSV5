/**
 * @fileoverview R2连接监控器
 * @description 监控R2存储服务的连接状态和可用性
 */

import {
  S3Client,
  HeadBucketCommand,
  GetBucketLocationCommand,
  ListBucketsCommand,
} from '@aws-sdk/client-s3';
import type {
  R2MonitorConfig,
  R2ConnectionMetrics,
} from '../types/r2-monitor-types';

/**
 * R2连接监控器
 */
export class ConnectionMonitor {
  private s3Client: S3Client;
  private config: R2MonitorConfig;

  constructor(s3Client: S3Client, config: R2MonitorConfig) {
    this.s3Client = s3Client;
    this.config = config;
  }

  /**
   * 检查R2连接状态
   */
  async checkConnection(): Promise<R2ConnectionMetrics> {
    const startTime = Date.now();
    let retryCount = 0;
    let lastError: string | undefined;

    for (let i = 0; i < this.config.maxRetries; i++) {
      try {
        // 使用HeadBucket检查连接
        const result = await this.performConnectionCheck();
        
        return {
          isConnected: true,
          connectionTime: Date.now() - startTime,
          retryCount,
          lastError: undefined,
          endpoint: this.config.endpoint,
          region: this.config.region,
        };
      } catch (error) {
        retryCount++;
        lastError = error instanceof Error ? error.message : String(error);

        if (i < this.config.maxRetries - 1) {
          await this.sleep(1000 * (i + 1)); // 递增延迟
        }
      }
    }

    return {
      isConnected: false,
      connectionTime: Date.now() - startTime,
      retryCount,
      lastError,
      endpoint: this.config.endpoint,
      region: this.config.region,
    };
  }

  /**
   * 执行连接检查
   */
  private async performConnectionCheck(): Promise<void> {
    const command = new HeadBucketCommand({
      Bucket: this.config.bucketName,
    });

    await this.s3Client.send(command);
  }

  /**
   * 检查存储桶是否存在
   */
  async checkBucketExists(): Promise<boolean> {
    try {
      const command = new HeadBucketCommand({
        Bucket: this.config.bucketName,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.warn('存储桶检查失败:', error);
      return false;
    }
  }

  /**
   * 获取存储桶位置
   */
  async getBucketLocation(): Promise<string | null> {
    try {
      const command = new GetBucketLocationCommand({
        Bucket: this.config.bucketName,
      });

      const response = await this.s3Client.send(command);
      return response.LocationConstraint || 'us-east-1';
    } catch (error) {
      console.warn('获取存储桶位置失败:', error);
      return null;
    }
  }

  /**
   * 测试连接延迟
   */
  async measureConnectionLatency(samples: number = 5): Promise<{
    average: number;
    min: number;
    max: number;
    samples: number[];
  }> {
    const latencies: number[] = [];

    for (let i = 0; i < samples; i++) {
      const startTime = Date.now();
      
      try {
        await this.performConnectionCheck();
        latencies.push(Date.now() - startTime);
      } catch (error) {
        // 连接失败时记录超时时间
        latencies.push(this.config.timeout);
      }

      // 避免过于频繁的请求
      if (i < samples - 1) {
        await this.sleep(100);
      }
    }

    return {
      average: latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length,
      min: Math.min(...latencies),
      max: Math.max(...latencies),
      samples: latencies,
    };
  }

  /**
   * 检查网络连通性
   */
  async checkNetworkConnectivity(): Promise<{
    reachable: boolean;
    dnsResolution: boolean;
    sslHandshake: boolean;
    responseTime: number;
  }> {
    const startTime = Date.now();
    let dnsResolution = false;
    let sslHandshake = false;
    let reachable = false;

    try {
      // 尝试DNS解析
      const url = new URL(this.config.endpoint);
      const hostname = url.hostname;
      
      // 简单的DNS检查（在实际环境中可能需要更复杂的实现）
      dnsResolution = hostname.length > 0;

      // 尝试SSL握手和连接
      const command = new ListBucketsCommand({});
      await this.s3Client.send(command);
      
      sslHandshake = true;
      reachable = true;
    } catch (error) {
      console.warn('网络连通性检查失败:', error);
    }

    return {
      reachable,
      dnsResolution,
      sslHandshake,
      responseTime: Date.now() - startTime,
    };
  }

  /**
   * 验证认证凭据
   */
  async validateCredentials(): Promise<{
    valid: boolean;
    permissions: string[];
    error?: string;
  }> {
    const permissions: string[] = [];
    
    try {
      // 测试ListBuckets权限
      try {
        await this.s3Client.send(new ListBucketsCommand({}));
        permissions.push('ListBuckets');
      } catch {
        // 忽略权限错误
      }

      // 测试HeadBucket权限
      try {
        await this.s3Client.send(new HeadBucketCommand({
          Bucket: this.config.bucketName,
        }));
        permissions.push('HeadBucket');
      } catch {
        // 忽略权限错误
      }

      // 测试GetBucketLocation权限
      try {
        await this.s3Client.send(new GetBucketLocationCommand({
          Bucket: this.config.bucketName,
        }));
        permissions.push('GetBucketLocation');
      } catch {
        // 忽略权限错误
      }

      return {
        valid: permissions.length > 0,
        permissions,
      };
    } catch (error) {
      return {
        valid: false,
        permissions: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 获取连接统计信息
   */
  getConnectionStats(): {
    endpoint: string;
    region: string;
    bucketName: string;
    maxRetries: number;
    timeout: number;
  } {
    return {
      endpoint: this.config.endpoint,
      region: this.config.region,
      bucketName: this.config.bucketName,
      maxRetries: this.config.maxRetries,
      timeout: this.config.timeout,
    };
  }

  /**
   * 重置连接
   */
  async resetConnection(): Promise<void> {
    // 重新创建S3客户端
    this.s3Client = new S3Client({
      region: this.config.region,
      endpoint: this.config.endpoint,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      requestHandler: {
        requestTimeout: this.config.timeout,
      },
    });
  }

  /**
   * 检查连接池状态
   */
  getConnectionPoolStatus(): {
    activeConnections: number;
    maxConnections: number;
    queuedRequests: number;
  } {
    // 简化实现，实际可能需要更复杂的连接池监控
    return {
      activeConnections: 1,
      maxConnections: 10,
      queuedRequests: 0,
    };
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 检查连接健康状态
   */
  async checkConnectionHealth(): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // 检查基本连接
      const connectionMetrics = await this.checkConnection();
      if (!connectionMetrics.isConnected) {
        issues.push('无法连接到R2服务');
        recommendations.push('检查网络连接和认证配置');
      }

      // 检查连接延迟
      if (connectionMetrics.connectionTime > 5000) {
        issues.push('连接延迟过高');
        recommendations.push('检查网络质量或考虑更换地区');
      }

      // 检查重试次数
      if (connectionMetrics.retryCount > 1) {
        issues.push('连接不稳定，需要多次重试');
        recommendations.push('检查网络稳定性');
      }

      // 检查网络连通性
      const networkStatus = await this.checkNetworkConnectivity();
      if (!networkStatus.dnsResolution) {
        issues.push('DNS解析失败');
        recommendations.push('检查DNS配置');
      }

      if (!networkStatus.sslHandshake) {
        issues.push('SSL握手失败');
        recommendations.push('检查SSL证书和TLS配置');
      }

      // 检查认证
      const credentialsStatus = await this.validateCredentials();
      if (!credentialsStatus.valid) {
        issues.push('认证凭据无效');
        recommendations.push('检查Access Key和Secret Key配置');
      }

      return {
        healthy: issues.length === 0,
        issues,
        recommendations,
      };
    } catch (error) {
      return {
        healthy: false,
        issues: [`连接健康检查失败: ${error instanceof Error ? error.message : String(error)}`],
        recommendations: ['检查R2服务配置和网络连接'],
      };
    }
  }
}
