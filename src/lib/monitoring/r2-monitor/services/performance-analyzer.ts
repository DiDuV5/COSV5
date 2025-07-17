/**
 * @fileoverview R2性能分析器
 * @description 分析R2存储服务的性能指标和趋势
 */

import {
  S3Client,
  HeadBucketCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import type {
  R2MonitorConfig,
  R2PerformanceMetrics,
  R2OperationStats,
} from '../types/r2-monitor-types';

/**
 * R2性能分析器
 */
export class PerformanceAnalyzer {
  private s3Client: S3Client;
  private config: R2MonitorConfig;
  private operationHistory: Map<string, number[]> = new Map();
  private errorHistory: Map<string, string[]> = new Map();

  constructor(s3Client: S3Client, config: R2MonitorConfig) {
    this.s3Client = s3Client;
    this.config = config;
  }

  /**
   * 测量R2性能指标
   */
  async measurePerformance(): Promise<R2PerformanceMetrics> {
    const metrics = {
      listObjectsTime: 0,
      headBucketTime: 0,
      averageResponseTime: 0,
      throughput: 0,
      operationsPerSecond: 0,
      errorRate: 0,
      latencyP95: 0,
      latencyP99: 0,
    };

    try {
      // 测量HeadBucket性能
      metrics.headBucketTime = await this.measureHeadBucketTime();
      
      // 测量ListObjects性能
      metrics.listObjectsTime = await this.measureListObjectsTime();
      
      // 计算平均响应时间
      metrics.averageResponseTime = (metrics.headBucketTime + metrics.listObjectsTime) / 2;
      
      // 测量吞吐量
      metrics.throughput = await this.measureThroughput();
      
      // 计算操作频率
      metrics.operationsPerSecond = await this.calculateOperationsPerSecond();
      
      // 计算错误率
      metrics.errorRate = await this.calculateErrorRate();
      
      // 计算延迟百分位数
      const latencyStats = await this.calculateLatencyPercentiles();
      metrics.latencyP95 = latencyStats.p95;
      metrics.latencyP99 = latencyStats.p99;

      return metrics;
    } catch (error) {
      console.error('性能测量失败:', error);
      return metrics;
    }
  }

  /**
   * 测量HeadBucket操作时间
   */
  private async measureHeadBucketTime(): Promise<number> {
    const startTime = Date.now();
    
    try {
      const command = new HeadBucketCommand({
        Bucket: this.config.bucketName,
      });
      
      await this.s3Client.send(command);
      const duration = Date.now() - startTime;
      
      this.recordOperation('HeadBucket', duration);
      return duration;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordError('HeadBucket', error instanceof Error ? error.message : String(error));
      return duration;
    }
  }

  /**
   * 测量ListObjects操作时间
   */
  private async measureListObjectsTime(): Promise<number> {
    const startTime = Date.now();
    
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucketName,
        MaxKeys: 10, // 限制返回数量以提高测试速度
      });
      
      await this.s3Client.send(command);
      const duration = Date.now() - startTime;
      
      this.recordOperation('ListObjects', duration);
      return duration;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordError('ListObjects', error instanceof Error ? error.message : String(error));
      return duration;
    }
  }

  /**
   * 测量吞吐量
   */
  private async measureThroughput(): Promise<number> {
    try {
      // 创建测试数据
      const testData = Buffer.alloc(1024 * 1024); // 1MB测试数据
      const testKey = `performance-test-${Date.now()}`;
      
      const startTime = Date.now();
      
      // 上传测试
      const putCommand = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: testKey,
        Body: testData,
      });
      
      await this.s3Client.send(putCommand);
      
      // 下载测试
      const getCommand = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: testKey,
      });
      
      const response = await this.s3Client.send(getCommand);
      if (response.Body) {
        // 读取响应体
        const chunks: Uint8Array[] = [];
        const reader = response.Body as any;
        
        if (reader.getReader) {
          const streamReader = reader.getReader();
          let done = false;
          
          while (!done) {
            const { value, done: streamDone } = await streamReader.read();
            done = streamDone;
            if (value) chunks.push(value);
          }
        }
      }
      
      const totalTime = Date.now() - startTime;
      const totalBytes = testData.length * 2; // 上传 + 下载
      const throughputMBps = (totalBytes / (1024 * 1024)) / (totalTime / 1000);
      
      // 清理测试文件
      try {
        const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
        await this.s3Client.send(new DeleteObjectCommand({
          Bucket: this.config.bucketName,
          Key: testKey,
        }));
      } catch {
        // 忽略清理错误
      }
      
      return throughputMBps;
    } catch (error) {
      console.warn('吞吐量测量失败:', error);
      return 0;
    }
  }

  /**
   * 计算每秒操作数
   */
  private async calculateOperationsPerSecond(): Promise<number> {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    let totalOperations = 0;
    
    for (const [operation, times] of this.operationHistory.entries()) {
      const recentOperations = times.filter(time => time > oneSecondAgo);
      totalOperations += recentOperations.length;
    }
    
    return totalOperations;
  }

  /**
   * 计算错误率
   */
  private async calculateErrorRate(): Promise<number> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    let totalOperations = 0;
    let totalErrors = 0;
    
    // 计算总操作数
    for (const [operation, times] of this.operationHistory.entries()) {
      const recentOperations = times.filter(time => time > oneMinuteAgo);
      totalOperations += recentOperations.length;
    }
    
    // 计算总错误数
    for (const [operation, errors] of this.errorHistory.entries()) {
      totalErrors += errors.length;
    }
    
    return totalOperations > 0 ? totalErrors / totalOperations : 0;
  }

  /**
   * 计算延迟百分位数
   */
  private async calculateLatencyPercentiles(): Promise<{
    p50: number;
    p95: number;
    p99: number;
  }> {
    const now = Date.now();
    const fiveMinutesAgo = now - 300000;
    
    const allLatencies: number[] = [];
    
    for (const [operation, times] of this.operationHistory.entries()) {
      const recentTimes = times.filter(time => time > fiveMinutesAgo);
      allLatencies.push(...recentTimes);
    }
    
    if (allLatencies.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }
    
    allLatencies.sort((a, b) => a - b);
    
    const p50Index = Math.floor(allLatencies.length * 0.5);
    const p95Index = Math.floor(allLatencies.length * 0.95);
    const p99Index = Math.floor(allLatencies.length * 0.99);
    
    return {
      p50: allLatencies[p50Index] || 0,
      p95: allLatencies[p95Index] || 0,
      p99: allLatencies[p99Index] || 0,
    };
  }

  /**
   * 记录操作时间
   */
  private recordOperation(operation: string, duration: number): void {
    if (!this.operationHistory.has(operation)) {
      this.operationHistory.set(operation, []);
    }
    
    const times = this.operationHistory.get(operation)!;
    times.push(duration);
    
    // 保持最近1000条记录
    if (times.length > 1000) {
      times.splice(0, times.length - 1000);
    }
  }

  /**
   * 记录错误
   */
  private recordError(operation: string, error: string): void {
    if (!this.errorHistory.has(operation)) {
      this.errorHistory.set(operation, []);
    }
    
    const errors = this.errorHistory.get(operation)!;
    errors.push(error);
    
    // 保持最近100条错误记录
    if (errors.length > 100) {
      errors.splice(0, errors.length - 100);
    }
  }

  /**
   * 获取操作统计
   */
  getOperationStats(): R2OperationStats[] {
    const stats: R2OperationStats[] = [];
    
    for (const [operation, times] of this.operationHistory.entries()) {
      const errors = this.errorHistory.get(operation) || [];
      const totalOperations = times.length + errors.length;
      
      if (totalOperations > 0) {
        stats.push({
          operation,
          count: totalOperations,
          totalTime: times.reduce((sum, time) => sum + time, 0),
          averageTime: times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0,
          successRate: times.length / totalOperations,
          errors: errors.slice(-10), // 最近10个错误
        });
      }
    }
    
    return stats;
  }

  /**
   * 清理历史数据
   */
  clearHistory(): void {
    this.operationHistory.clear();
    this.errorHistory.clear();
  }

  /**
   * 获取性能趋势
   */
  getPerformanceTrends(minutes: number = 60): {
    responseTime: number[];
    throughput: number[];
    errorRate: number[];
    operationsPerSecond: number[];
  } {
    const now = Date.now();
    const timeWindow = minutes * 60 * 1000;
    const startTime = now - timeWindow;
    const bucketSize = timeWindow / 60; // 60个数据点
    
    const responseTime: number[] = [];
    const throughput: number[] = [];
    const errorRate: number[] = [];
    const operationsPerSecond: number[] = [];
    
    for (let i = 0; i < 60; i++) {
      const bucketStart = startTime + (i * bucketSize);
      const bucketEnd = bucketStart + bucketSize;
      
      // 计算该时间段的指标
      let totalResponseTime = 0;
      let operationCount = 0;
      let errorCount = 0;
      
      for (const [operation, times] of this.operationHistory.entries()) {
        const bucketTimes = times.filter(time => time >= bucketStart && time < bucketEnd);
        totalResponseTime += bucketTimes.reduce((sum, time) => sum + time, 0);
        operationCount += bucketTimes.length;
      }
      
      for (const [operation, errors] of this.errorHistory.entries()) {
        // 简化：假设错误均匀分布
        errorCount += Math.floor(errors.length / 60);
      }
      
      responseTime.push(operationCount > 0 ? totalResponseTime / operationCount : 0);
      throughput.push(0); // 简化实现
      errorRate.push(operationCount > 0 ? errorCount / operationCount : 0);
      operationsPerSecond.push(operationCount / (bucketSize / 1000));
    }
    
    return {
      responseTime,
      throughput,
      errorRate,
      operationsPerSecond,
    };
  }

  /**
   * 分析性能瓶颈
   */
  analyzeBottlenecks(): {
    bottlenecks: string[];
    recommendations: string[];
  } {
    const bottlenecks: string[] = [];
    const recommendations: string[] = [];
    
    const stats = this.getOperationStats();
    
    for (const stat of stats) {
      if (stat.averageTime > 3000) {
        bottlenecks.push(`${stat.operation} 操作响应时间过长 (${stat.averageTime.toFixed(0)}ms)`);
        recommendations.push(`优化 ${stat.operation} 操作的实现或减少调用频率`);
      }
      
      if (stat.successRate < 0.95) {
        bottlenecks.push(`${stat.operation} 操作成功率过低 (${(stat.successRate * 100).toFixed(1)}%)`);
        recommendations.push(`检查 ${stat.operation} 操作的错误原因并进行修复`);
      }
    }
    
    return {
      bottlenecks,
      recommendations,
    };
  }
}
