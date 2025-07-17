/**
 * @fileoverview 模拟数据生成器
 * @description 负责生成模拟的查询性能数据
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { MOCK_DATA_CONFIG } from '../constants';
import { MetricsCollector } from './MetricsCollector';

/**
 * 模拟数据生成器类
 */
export class MockDataGenerator {
  private metricsCollector: MetricsCollector;

  constructor(metricsCollector: MetricsCollector) {
    this.metricsCollector = metricsCollector;
  }

  /**
   * 生成模拟数据用于演示
   */
  generateMockData(): void {
    const { MODELS, ACTIONS, COUNT, TIME_RANGE_HOURS, SUCCESS_RATE } = MOCK_DATA_CONFIG;
    const now = new Date();

    // 生成过去指定小时的模拟数据
    for (let i = 0; i < COUNT; i++) {
      const timestamp = new Date(
        now.getTime() - Math.random() * TIME_RANGE_HOURS * 60 * 60 * 1000
      );
      const model = MODELS[Math.floor(Math.random() * MODELS.length)];
      const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
      const duration = this.generateRealisticDuration(model, action);

      this.metricsCollector.recordQuery(model, action, duration, {
        timestamp,
        query: `${model}.${action}()`,
        success: Math.random() > (1 - SUCCESS_RATE),
      });
    }
  }

  /**
   * 生成真实的查询持续时间
   */
  private generateRealisticDuration(model: string, action: string): number {
    // 基础持续时间
    let baseDuration = 50;

    // 根据操作类型调整
    switch (action) {
      case 'findMany':
        baseDuration = 100 + Math.random() * 200; // 100-300ms
        break;
      case 'findUnique':
        baseDuration = 20 + Math.random() * 80; // 20-100ms
        break;
      case 'create':
        baseDuration = 80 + Math.random() * 120; // 80-200ms
        break;
      case 'update':
        baseDuration = 60 + Math.random() * 140; // 60-200ms
        break;
      case 'delete':
        baseDuration = 40 + Math.random() * 60; // 40-100ms
        break;
    }

    // 根据模型调整（某些模型可能更复杂）
    if (model === 'Post' || model === 'Comment') {
      baseDuration *= 1.5; // 内容相关的查询可能更慢
    }

    // 添加一些随机的慢查询
    if (Math.random() < 0.1) { // 10% 概率产生慢查询
      baseDuration += 1000 + Math.random() * 2000; // 额外增加1-3秒
    }

    return Math.round(baseDuration);
  }

  /**
   * 生成特定场景的模拟数据
   */
  generateScenarioData(scenario: 'normal' | 'heavy_load' | 'slow_queries'): void {
    const now = new Date();

    switch (scenario) {
      case 'normal':
        this.generateNormalScenario(now);
        break;
      case 'heavy_load':
        this.generateHeavyLoadScenario(now);
        break;
      case 'slow_queries':
        this.generateSlowQueriesScenario(now);
        break;
    }
  }

  /**
   * 生成正常场景数据
   */
  private generateNormalScenario(now: Date): void {
    for (let i = 0; i < 50; i++) {
      const timestamp = new Date(now.getTime() - Math.random() * 60 * 60 * 1000);
      this.metricsCollector.recordQuery(
        'User',
        'findMany',
        50 + Math.random() * 100,
        { timestamp, scenario: 'normal' }
      );
    }
  }

  /**
   * 生成高负载场景数据
   */
  private generateHeavyLoadScenario(now: Date): void {
    for (let i = 0; i < 200; i++) {
      const timestamp = new Date(now.getTime() - Math.random() * 30 * 60 * 1000);
      this.metricsCollector.recordQuery(
        'Post',
        'findMany',
        200 + Math.random() * 300,
        { timestamp, scenario: 'heavy_load' }
      );
    }
  }

  /**
   * 生成慢查询场景数据
   */
  private generateSlowQueriesScenario(now: Date): void {
    for (let i = 0; i < 20; i++) {
      const timestamp = new Date(now.getTime() - Math.random() * 60 * 60 * 1000);
      this.metricsCollector.recordQuery(
        'Comment',
        'findMany',
        1500 + Math.random() * 2000, // 1.5-3.5秒的慢查询
        { timestamp, scenario: 'slow_queries' }
      );
    }
  }
}
