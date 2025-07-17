/**
 * @fileoverview 健康检查器 - CoserEden平台
 * @description 系统服务健康状态监控
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import type {
  HealthCheckResult,
  HealthCheckConfig,
  IHealthChecker,
  MonitoringConfig,
} from './monitoring-types';

/**
 * 健康检查器类
 * 负责监控各种服务的健康状态
 */
export class HealthChecker extends EventEmitter implements IHealthChecker {
  private healthChecks = new Map<string, HealthCheckResult>();
  private healthCheckConfigs = new Map<string, HealthCheckConfig>();
  private _isRunning = false;
  private checkInterval?: NodeJS.Timeout;
  private config: MonitoringConfig;

  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
    this.setupDefaultHealthChecks();
  }

  /**
   * 初始化健康检查器
   */
  public async initialize(): Promise<void> {
    this.log('INFO', '初始化健康检查器...');

    if (!this.config.enableHealthChecks) {
      this.log('INFO', '健康检查已禁用');
      return;
    }

    this.log('INFO', '✅ 健康检查器初始化完成');
  }

  /**
   * 启动健康检查
   */
  public start(): void {
    if (this._isRunning) {
      this.log('WARN', '健康检查器已在运行');
      return;
    }

    if (!this.config.enableHealthChecks) {
      this.log('INFO', '健康检查已禁用，跳过启动');
      return;
    }

    this._isRunning = true;
    this.startHealthChecks();
    this.log('INFO', '✅ 健康检查器已启动');
  }

  /**
   * 停止健康检查
   */
  public stop(): void {
    if (!this._isRunning) {
      this.log('WARN', '健康检查器未在运行');
      return;
    }

    this._isRunning = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }

    this.log('INFO', '✅ 健康检查器已停止');
  }

  /**
   * 检查是否正在运行
   */
  public isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * 获取状态
   */
  public getStatus(): string {
    return this._isRunning ? 'running' : 'stopped';
  }

  /**
   * 执行健康检查
   */
  public async checkHealth(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const config of Array.from(this.healthCheckConfigs.values())) {
      if (config.enabled) {
        promises.push(this.performHealthCheck(config));
      }
    }

    await Promise.allSettled(promises);
  }

  /**
   * 添加健康检查配置
   */
  public addHealthCheck(config: HealthCheckConfig): void {
    this.healthCheckConfigs.set(config.service, config);
    this.log('INFO', `添加健康检查: ${config.service}`, { config });
  }

  /**
   * 移除健康检查
   */
  public removeHealthCheck(service: string): void {
    this.healthCheckConfigs.delete(service);
    this.healthChecks.delete(service);
    this.log('INFO', `移除健康检查: ${service}`);
  }

  /**
   * 获取健康状态
   */
  public getHealthStatus(service?: string): HealthCheckResult | HealthCheckResult[] {
    if (service) {
      const result = this.healthChecks.get(service);
      if (!result) {
        throw new Error(`健康检查服务不存在: ${service}`);
      }
      return result;
    }

    return Array.from(this.healthChecks.values());
  }

  /**
   * 记录健康检查结果
   */
  public recordHealthCheck(result: HealthCheckResult): void {
    this.healthChecks.set(result.service, result);
    this.emit('healthCheck', result);
    this.log('DEBUG', `健康检查: ${result.service} - ${result.status} (${result.responseTime}ms)`);
  }

  /**
   * 获取整体健康状态
   */
  public getOverallHealth(): { status: 'healthy' | 'degraded' | 'unhealthy'; details: HealthCheckResult[] } {
    const services = Array.from(this.healthChecks.values());
    const healthyServices = services.filter(s => s.status === 'healthy').length;
    const totalServices = services.length;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (totalServices > 0) {
      const healthyRatio = healthyServices / totalServices;
      if (healthyRatio < 0.5) {
        status = 'unhealthy';
      } else if (healthyRatio < 0.8) {
        status = 'degraded';
      }
    }

    return { status, details: services };
  }

  // 私有方法

  private startHealthChecks(): void {
    const interval = this.config.healthCheckInterval || 60000;

    this.checkInterval = setInterval(async () => {
      await this.checkHealth();
    }, interval);

    this.log('INFO', `启动健康检查，间隔: ${interval}ms`);
  }

  private async performHealthCheck(config: HealthCheckConfig): Promise<void> {
    const startTime = Date.now();

    try {
      let isHealthy = false;

      if (config.customCheck) {
        // 使用自定义检查函数
        isHealthy = await this.executeWithTimeout(config.customCheck(), config.timeout || 5000);
      } else if (config.endpoint) {
        // HTTP端点检查
        isHealthy = await this.checkHttpEndpoint(config);
      } else {
        // 默认检查逻辑
        isHealthy = await this.performDefaultCheck(config.service);
      }

      const responseTime = Date.now() - startTime;

      this.recordHealthCheck({
        service: config.service,
        status: isHealthy ? 'healthy' : 'degraded',
        responseTime,
        timestamp: Date.now(),
        details: { type: this.getServiceType(config.service) },
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.recordHealthCheck({
        service: config.service,
        status: 'unhealthy',
        responseTime,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : `${config.service}健康检查失败`,
      });

      this.log('ERROR', `健康检查失败: ${config.service}`, { error });
    }
  }

  private async checkHttpEndpoint(config: HealthCheckConfig): Promise<boolean> {
    if (!config.endpoint) return false;

    try {
      const response = await fetch(config.endpoint, {
        method: 'GET',
        signal: AbortSignal.timeout(config.timeout || 5000),
      });

      const expectedStatus = config.expectedStatus || 200;
      return response.status === expectedStatus;
    } catch (error) {
      return false;
    }
  }

  private async performDefaultCheck(service: string): Promise<boolean> {
    switch (service) {
      case 'database':
        return this.checkDatabaseHealth();
      case 'storage':
        return this.checkStorageHealth();
      case 'cdn':
        return this.checkCdnHealth();
      default:
        this.log('WARN', `未知的服务类型: ${service}`);
        return true; // 默认认为健康
    }
  }

  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      // 这里应该实际检查数据库连接
      // await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      return false;
    }
  }

  private async checkStorageHealth(): Promise<boolean> {
    try {
      // 这里应该实际检查存储服务
      // 例如：尝试列出存储桶或上传小文件
      return true;
    } catch (error) {
      return false;
    }
  }

  private async checkCdnHealth(): Promise<boolean> {
    try {
      // 这里应该实际检查CDN服务
      // 例如：请求CDN上的健康检查端点
      return true;
    } catch (error) {
      return false;
    }
  }

  private getServiceType(service: string): string {
    const serviceTypes: Record<string, string> = {
      'database': 'postgresql',
      'storage': 'cloudflare-r2',
      'cdn': 'cloudflare-cdn',
      'redis': 'redis',
      'elasticsearch': 'elasticsearch',
    };

    return serviceTypes[service] || 'unknown';
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('健康检查超时')), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  private setupDefaultHealthChecks(): void {
    const defaultChecks: HealthCheckConfig[] = [
      {
        service: 'database',
        enabled: true,
        interval: 60000,
        timeout: 5000,
        retries: 3,
      },
      {
        service: 'storage',
        enabled: true,
        interval: 120000,
        timeout: 10000,
        retries: 2,
      },
      {
        service: 'cdn',
        enabled: true,
        interval: 300000,
        timeout: 15000,
        retries: 1,
      },
    ];

    defaultChecks.forEach(check => this.addHealthCheck(check));
    this.log('INFO', '设置默认健康检查配置');
  }

  private log(level: string, message: string, metadata?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level}: ${message}`;

    switch (level) {
      case 'ERROR':
        console.error(logMessage, metadata);
        break;
      case 'WARN':
        console.warn(logMessage, metadata);
        break;
      case 'INFO':
        console.info(logMessage, metadata);
        break;
      case 'DEBUG':
        console.debug(logMessage, metadata);
        break;
    }

    this.emit('log', { timestamp, level, message, metadata, service: 'health-checker' });
  }
}
