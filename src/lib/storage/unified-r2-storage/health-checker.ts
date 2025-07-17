/**
 * @fileoverview CDN健康检查服务
 * @description 管理CDN域名的健康状态检查
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import type { CDNDomainConfig, EnvironmentConfig } from './types';

/**
 * CDN健康检查器
 */
export class HealthChecker {
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private environmentConfig: EnvironmentConfig;

  constructor(environmentConfig: EnvironmentConfig) {
    this.environmentConfig = environmentConfig;
  }

  /**
   * 启动健康检查
   */
  public start(): void {
    if (this.healthCheckTimer) {
      return;
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.environmentConfig.healthCheckInterval);

    // 立即执行一次健康检查
    this.performHealthCheck().catch(console.error);
  }

  /**
   * 停止健康检查
   */
  public stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * 重启健康检查
   */
  public restart(newConfig: EnvironmentConfig): void {
    this.stop();
    this.environmentConfig = newConfig;
    if (this.environmentConfig.enableFailover) {
      this.start();
    }
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(): Promise<void> {
    const allDomains = [
      this.environmentConfig.primaryDomain, 
      ...this.environmentConfig.fallbackDomains
    ];

    for (const domain of allDomains) {
      try {
        const startTime = Date.now();
        const response = await fetch(domain.url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(10000), // 10秒超时
        });

        const responseTime = Date.now() - startTime;

        domain.healthStatus = response.ok ? 'healthy' : 'unhealthy';
        domain.lastChecked = new Date();
        domain.responseTime = responseTime;
      } catch (error) {
        domain.healthStatus = 'unhealthy';
        domain.lastChecked = new Date();
        domain.responseTime = undefined;
      }
    }
  }

  /**
   * 获取最佳CDN域名
   */
  public getBestDomain(): string {
    // 检查主域名健康状态
    const primaryDomain = this.environmentConfig.primaryDomain;
    
    if (primaryDomain.healthStatus === 'healthy') {
      return primaryDomain.url;
    }

    // 如果主域名不健康，检查备用域名
    for (const fallbackDomain of this.environmentConfig.fallbackDomains) {
      if (fallbackDomain.healthStatus === 'healthy') {
        return fallbackDomain.url;
      }
    }

    // 如果没有健康的域名，返回主域名（可能需要重新检查）
    return primaryDomain.url;
  }

  /**
   * 获取所有域名状态
   */
  public getAllDomains(): CDNDomainConfig[] {
    return [
      this.environmentConfig.primaryDomain,
      ...this.environmentConfig.fallbackDomains
    ];
  }
}
