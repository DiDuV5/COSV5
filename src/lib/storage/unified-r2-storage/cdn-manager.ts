/**
 * @fileoverview CDN域名管理器
 * @description 管理CDN域名和URL生成
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import type { Environment, EnvironmentConfig } from './types';
import { HealthChecker } from './health-checker';
import { normalizeKey } from './utils';

/**
 * CDN管理器
 */
export class CDNManager {
  private currentEnvironment: Environment;
  private environmentConfig: EnvironmentConfig;
  private healthChecker: HealthChecker;

  constructor(environment: Environment, environmentConfig: EnvironmentConfig) {
    this.currentEnvironment = environment;
    this.environmentConfig = environmentConfig;
    this.healthChecker = new HealthChecker(environmentConfig);
  }

  /**
   * 启动CDN管理器
   */
  public start(): void {
    if (this.environmentConfig.enableFailover) {
      this.healthChecker.start();
    }
  }

  /**
   * 停止CDN管理器
   */
  public stop(): void {
    this.healthChecker.stop();
  }

  /**
   * 切换环境
   */
  public switchEnvironment(newEnvironment: Environment, newConfig: EnvironmentConfig): void {
    if (this.currentEnvironment === newEnvironment) {
      return;
    }

    this.currentEnvironment = newEnvironment;
    this.environmentConfig = newConfig;
    this.healthChecker.restart(newConfig);

    console.log(`🔄 CDN环境切换: ${newEnvironment}`);
  }

  /**
   * 获取最佳CDN域名
   */
  public async getBestCDNDomain(): Promise<string> {
    return this.healthChecker.getBestDomain();
  }

  /**
   * 生成CDN URL
   */
  public async generateCDNUrl(key: string): Promise<string> {
    let bestDomain = await this.getBestCDNDomain();

    // 修复重复的https://问题
    if (bestDomain.startsWith('https://https://')) {
      bestDomain = bestDomain.replace('https://https://', 'https://');
    }

    const normalizedKey = normalizeKey(key);
    return `${bestDomain}/${normalizedKey}`;
  }

  /**
   * 获取当前环境
   */
  public getCurrentEnvironment(): Environment {
    return this.currentEnvironment;
  }

  /**
   * 获取环境配置
   */
  public getEnvironmentConfig(): EnvironmentConfig {
    return { ...this.environmentConfig };
  }

  /**
   * 获取健康状态报告
   */
  public getHealthReport() {
    return {
      environment: this.currentEnvironment,
      domains: this.healthChecker.getAllDomains(),
      bestDomain: this.healthChecker.getBestDomain(),
    };
  }
}
