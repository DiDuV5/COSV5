/**
 * @fileoverview 配置健康检查系统
 * @description 提供配置健康检查、监控和告警功能，支持运行时配置验证
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

import { logger } from '@/lib/logging/log-deduplicator';
import { ConfigValidator, ConfigValidationResult, ConfigPriority } from './config-validator';

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  isHealthy: boolean;
  category: string;
  priority: ConfigPriority;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  message: string;
  details?: Record<string, any>;
  timestamp: number;
  responseTime?: number;
}

/**
 * 健康检查配置
 */
export interface HealthCheckConfig {
  enabled: boolean;
  interval: number; // 检查间隔（毫秒）
  timeout: number; // 超时时间（毫秒）
  retries: number; // 重试次数
  alertThreshold: number; // 告警阈值（连续失败次数）
}

/**
 * 配置健康检查系统
 */
export class ConfigHealthChecker {
  private static instance: ConfigHealthChecker;
  private validator: ConfigValidator;
  private healthCheckResults: Map<string, HealthCheckResult[]> = new Map();
  private healthCheckTimers: Map<string, NodeJS.Timeout> = new Map();
  private alertCallbacks: Map<string, (result: HealthCheckResult) => void> = new Map();
  
  private readonly defaultConfig: HealthCheckConfig = {
    enabled: process.env.COSEREEDEN_HEALTH_CHECK_ENABLED !== 'false',
    interval: parseInt(process.env.COSEREEDEN_HEALTH_CHECK_INTERVAL || '300000'), // 5分钟
    timeout: parseInt(process.env.COSEREEDEN_HEALTH_CHECK_TIMEOUT || '10000'), // 10秒
    retries: parseInt(process.env.COSEREEDEN_HEALTH_CHECK_RETRIES || '3'),
    alertThreshold: parseInt(process.env.COSEREEDEN_HEALTH_CHECK_ALERT_THRESHOLD || '3'),
  };

  private constructor() {
    this.validator = ConfigValidator.getInstance();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): ConfigHealthChecker {
    if (!ConfigHealthChecker.instance) {
      ConfigHealthChecker.instance = new ConfigHealthChecker();
    }
    return ConfigHealthChecker.instance;
  }

  /**
   * 启动健康检查
   */
  async startHealthChecks(categories?: string[]): Promise<void> {
    if (!this.defaultConfig.enabled) {
      logger.info('配置健康检查已禁用');
      return;
    }

    const categoriesToCheck = categories || ['redis', 'database', 'storage', 'email', 'security', 'auth'];
    
    for (const category of categoriesToCheck) {
      await this.startCategoryHealthCheck(category);
    }

    logger.info(`已启动 ${categoriesToCheck.length} 个配置类别的健康检查`);
  }

  /**
   * 停止健康检查
   */
  stopHealthChecks(): void {
    for (const [category, timer] of this.healthCheckTimers) {
      clearInterval(timer);
      logger.info(`已停止 ${category} 的健康检查`);
    }
    this.healthCheckTimers.clear();
  }

  /**
   * 启动特定类别的健康检查
   */
  private async startCategoryHealthCheck(category: string): Promise<void> {
    // 立即执行一次检查
    await this.performHealthCheck(category);

    // 设置定期检查
    const timer = setInterval(async () => {
      await this.performHealthCheck(category);
    }, this.defaultConfig.interval);

    this.healthCheckTimers.set(category, timer);
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck(category: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // 执行配置验证
      const validationResult = await Promise.race([
        this.validator.validateCategory(category),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('健康检查超时')), this.defaultConfig.timeout)
        )
      ]);

      const responseTime = Date.now() - startTime;
      const result = this.createHealthCheckResult(category, validationResult, responseTime);
      
      // 记录结果
      this.recordHealthCheckResult(category, result);
      
      // 检查是否需要告警
      await this.checkAlertConditions(category, result);
      
      return result;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const result: HealthCheckResult = {
        isHealthy: false,
        category,
        priority: ConfigPriority.P0, // 默认为P0优先级
        status: 'critical',
        message: `健康检查失败: ${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: Date.now(),
        responseTime,
      };
      
      this.recordHealthCheckResult(category, result);
      await this.checkAlertConditions(category, result);
      
      return result;
    }
  }

  /**
   * 创建健康检查结果
   */
  private createHealthCheckResult(
    category: string,
    validationResult: ConfigValidationResult,
    responseTime: number
  ): HealthCheckResult {
    let status: HealthCheckResult['status'] = 'healthy';
    let message = '配置健康';

    if (validationResult.errors.length > 0) {
      status = 'critical';
      message = `发现 ${validationResult.errors.length} 个配置错误`;
    } else if (validationResult.warnings.length > 0) {
      status = 'warning';
      message = `发现 ${validationResult.warnings.length} 个配置警告`;
    }

    return {
      isHealthy: validationResult.isValid,
      category,
      priority: validationResult.priority,
      status,
      message,
      details: {
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        suggestions: validationResult.suggestions,
      },
      timestamp: Date.now(),
      responseTime,
    };
  }

  /**
   * 记录健康检查结果
   */
  private recordHealthCheckResult(category: string, result: HealthCheckResult): void {
    if (!this.healthCheckResults.has(category)) {
      this.healthCheckResults.set(category, []);
    }

    const results = this.healthCheckResults.get(category)!;
    results.push(result);

    // 保留最近100次结果
    if (results.length > 100) {
      results.splice(0, results.length - 100);
    }

    logger.debug(`记录 ${category} 健康检查结果`, {
      status: result.status,
      responseTime: result.responseTime,
      isHealthy: result.isHealthy,
    });
  }

  /**
   * 检查告警条件
   */
  private async checkAlertConditions(category: string, result: HealthCheckResult): Promise<void> {
    const results = this.healthCheckResults.get(category) || [];
    const recentResults = results.slice(-this.defaultConfig.alertThreshold);

    // 检查连续失败
    const consecutiveFailures = recentResults.filter(r => !r.isHealthy).length;
    
    if (consecutiveFailures >= this.defaultConfig.alertThreshold) {
      await this.triggerAlert(category, result, `连续 ${consecutiveFailures} 次健康检查失败`);
    }

    // 检查响应时间异常
    if (result.responseTime && result.responseTime > this.defaultConfig.timeout * 0.8) {
      await this.triggerAlert(category, result, `响应时间过长: ${result.responseTime}ms`);
    }

    // 检查关键错误
    if (result.status === 'critical' && result.priority === ConfigPriority.P0) {
      await this.triggerAlert(category, result, 'P0级配置出现关键错误');
    }
  }

  /**
   * 触发告警
   */
  private async triggerAlert(category: string, result: HealthCheckResult, reason: string): Promise<void> {
    const alertMessage = `配置健康检查告警 - ${category}: ${reason}`;
    
    logger.error(alertMessage, {
      category,
      status: result.status,
      priority: result.priority,
      message: result.message,
      details: result.details,
    });

    // 调用注册的告警回调
    const callback = this.alertCallbacks.get(category);
    if (callback) {
      try {
        callback(result);
      } catch (error) {
        logger.error(`告警回调执行失败: ${category}`, { error });
      }
    }
  }

  /**
   * 注册告警回调
   */
  registerAlertCallback(category: string, callback: (result: HealthCheckResult) => void): void {
    this.alertCallbacks.set(category, callback);
  }

  /**
   * 获取健康检查历史
   */
  getHealthCheckHistory(category: string, limit = 10): HealthCheckResult[] {
    const results = this.healthCheckResults.get(category) || [];
    return results.slice(-limit);
  }

  /**
   * 获取所有类别的健康状态摘要
   */
  getHealthSummary(): Record<string, {
    status: HealthCheckResult['status'];
    lastCheck: number;
    consecutiveFailures: number;
    averageResponseTime: number;
  }> {
    const summary: Record<string, any> = {};

    for (const [category, results] of this.healthCheckResults) {
      if (results.length === 0) continue;

      const latestResult = results[results.length - 1];
      const recentResults = results.slice(-10);
      const failures = recentResults.filter(r => !r.isHealthy);
      const responseTimes = recentResults
        .map(r => r.responseTime)
        .filter((time): time is number => time !== undefined);

      summary[category] = {
        status: latestResult.status,
        lastCheck: latestResult.timestamp,
        consecutiveFailures: failures.length,
        averageResponseTime: responseTimes.length > 0 
          ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
          : 0,
      };
    }

    return summary;
  }

  /**
   * 清除健康检查历史
   */
  clearHistory(category?: string): void {
    if (category) {
      this.healthCheckResults.delete(category);
    } else {
      this.healthCheckResults.clear();
    }
  }
}
