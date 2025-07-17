/**
 * @fileoverview 基准测试器 - CoserEden平台
 * @description 性能基准测试和比较分析
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import type {
  BenchmarkResult,
  BenchmarkOptions,
  BenchmarkComparison,
  IBenchmarkRunner,
} from './performance-types';

/**
 * 基准测试器类
 * 负责执行性能基准测试和结果比较
 */
export class BenchmarkRunner extends EventEmitter implements IBenchmarkRunner {
  private benchmarks = new Map<string, BenchmarkResult[]>();

  /**
   * 执行基准测试
   */
  public async runBenchmark(
    name: string,
    testFunction: () => Promise<any> | any,
    options: BenchmarkOptions = {}
  ): Promise<BenchmarkResult> {
    const {
      iterations = 100,
      warmupIterations = 10,
      timeout = 30000
    } = options;

    console.log(`🏃 运行基准测试: ${name} (${iterations} 次迭代)`);

    // 预热
    await this.warmup(testFunction, warmupIterations);

    // 强制垃圾回收
    this.forceGarbageCollection();

    const times: number[] = [];
    const memoryBefore = process.memoryUsage().heapUsed;
    let peakMemory = memoryBefore;

    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const iterationStart = performance.now();

      try {
        await testFunction();
      } catch (error) {
        console.error(`基准测试迭代 ${i + 1} 失败:`, error);
        throw error;
      }

      const iterationEnd = performance.now();
      times.push(iterationEnd - iterationStart);

      // 监控内存使用
      const currentMemory = process.memoryUsage().heapUsed;
      if (currentMemory > peakMemory) {
        peakMemory = currentMemory;
      }

      // 检查超时
      if (performance.now() - startTime > timeout) {
        console.warn(`基准测试 ${name} 超时，已完成 ${i + 1} 次迭代`);
        break;
      }
    }

    const memoryAfter = process.memoryUsage().heapUsed;
    const result = this.calculateBenchmarkResult(name, times, memoryBefore, memoryAfter, peakMemory);

    // 存储基准测试结果
    this.storeBenchmarkResult(name, result);

    console.log(`✅ 基准测试完成: ${name}`);
    console.log(`   平均时间: ${result.averageTime.toFixed(2)}ms`);
    console.log(`   操作/秒: ${result.operationsPerSecond.toFixed(2)}`);

    this.emit('benchmarkCompleted', result);
    return result;
  }

  /**
   * 比较基准测试结果
   */
  public compareBenchmarks(name: string): BenchmarkComparison | null {
    const results = this.benchmarks.get(name);
    if (!results || results.length === 0) {
      return null;
    }

    const current = results[results.length - 1];
    const previous = results.length > 1 ? results[results.length - 2] : undefined;

    if (!previous) {
      return {
        current,
        improvement: { responseTime: 0, throughput: 0, memoryEfficiency: 0 },
        trend: 'unknown'
      };
    }

    const improvement = this.calculateImprovement(current, previous);
    const trend = this.determineTrend(improvement);

    return {
      current,
      previous,
      improvement,
      trend
    };
  }

  /**
   * 获取基准测试历史
   */
  public getBenchmarkHistory(name: string): BenchmarkResult[] {
    return this.benchmarks.get(name) || [];
  }

  /**
   * 获取所有基准测试名称
   */
  public getBenchmarkNames(): string[] {
    return Array.from(this.benchmarks.keys());
  }

  /**
   * 删除基准测试结果
   */
  public deleteBenchmark(name: string): boolean {
    return this.benchmarks.delete(name);
  }

  /**
   * 清理旧的基准测试结果
   */
  public cleanupOldResults(maxResults: number = 50): void {
    for (const [name, results] of Array.from(this.benchmarks)) {
      if (results.length > maxResults) {
        const trimmedResults = results.slice(-maxResults);
        this.benchmarks.set(name, trimmedResults);
      }
    }
    console.log('完成基准测试数据清理');
  }

  /**
   * 导出基准测试结果
   */
  public exportResults(name?: string): Record<string, BenchmarkResult[]> {
    if (name) {
      const results = this.benchmarks.get(name);
      return results ? { [name]: results } : {};
    }

    const exported: Record<string, BenchmarkResult[]> = {};
    for (const [benchmarkName, results] of Array.from(this.benchmarks)) {
      exported[benchmarkName] = results;
    }
    return exported;
  }

  /**
   * 导入基准测试结果
   */
  public importResults(data: Record<string, BenchmarkResult[]>): void {
    for (const [name, results] of Object.entries(data)) {
      this.benchmarks.set(name, results);
    }
    console.log(`导入了 ${Object.keys(data).length} 个基准测试结果`);
  }

  /**
   * 获取基准测试统计
   */
  public getStatistics(): {
    totalBenchmarks: number;
    totalResults: number;
    averageIterations: number;
    fastestBenchmark: { name: string; time: number } | null;
    slowestBenchmark: { name: string; time: number } | null;
  } {
    let totalResults = 0;
    let totalIterations = 0;
    let fastestBenchmark: { name: string; time: number } | null = null;
    let slowestBenchmark: { name: string; time: number } | null = null;

    for (const [name, results] of Array.from(this.benchmarks)) {
      totalResults += results.length;

      for (const result of results) {
        totalIterations += result.iterations;

        if (!fastestBenchmark || result.averageTime < fastestBenchmark.time) {
          fastestBenchmark = { name, time: result.averageTime };
        }

        if (!slowestBenchmark || result.averageTime > slowestBenchmark.time) {
          slowestBenchmark = { name, time: result.averageTime };
        }
      }
    }

    return {
      totalBenchmarks: this.benchmarks.size,
      totalResults,
      averageIterations: totalResults > 0 ? totalIterations / totalResults : 0,
      fastestBenchmark,
      slowestBenchmark,
    };
  }

  // 私有方法

  private async warmup(testFunction: () => Promise<any> | any, iterations: number): Promise<void> {
    console.log(`🔥 预热 ${iterations} 次迭代...`);
    for (let i = 0; i < iterations; i++) {
      await testFunction();
    }
  }

  private forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
    }
  }

  private calculateBenchmarkResult(
    name: string,
    times: number[],
    memoryBefore: number,
    memoryAfter: number,
    peakMemory: number
  ): BenchmarkResult {
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    // 计算标准差
    const variance = times.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / times.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      name,
      iterations: times.length,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      standardDeviation,
      operationsPerSecond: 1000 / averageTime,
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peak: peakMemory
      }
    };
  }

  private storeBenchmarkResult(name: string, result: BenchmarkResult): void {
    if (!this.benchmarks.has(name)) {
      this.benchmarks.set(name, []);
    }
    this.benchmarks.get(name)!.push(result);
  }

  private calculateImprovement(current: BenchmarkResult, previous: BenchmarkResult): {
    responseTime: number;
    throughput: number;
    memoryEfficiency: number;
  } {
    const responseTimeImprovement = ((previous.averageTime - current.averageTime) / previous.averageTime) * 100;
    const throughputImprovement = ((current.operationsPerSecond - previous.operationsPerSecond) / previous.operationsPerSecond) * 100;
    const memoryEfficiencyImprovement = ((previous.memoryUsage.peak - current.memoryUsage.peak) / previous.memoryUsage.peak) * 100;

    return {
      responseTime: responseTimeImprovement,
      throughput: throughputImprovement,
      memoryEfficiency: memoryEfficiencyImprovement
    };
  }

  private determineTrend(improvement: { responseTime: number; throughput: number; memoryEfficiency: number }): 'improving' | 'degrading' | 'stable' | 'unknown' {
    if (improvement.responseTime > 5 && improvement.throughput > 5) {
      return 'improving';
    } else if (improvement.responseTime < -5 || improvement.throughput < -5) {
      return 'degrading';
    }
    return 'stable';
  }
}
