/**
 * @fileoverview CDN增强功能模块
 * @description 提供健康检查、故障转移等增强功能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import {
  CDNConfig,
  EnhancedCDNConfig,
  CDNDomainInfo,
  CDNDomainStatus,
  DEFAULT_CDN_CONFIG,
} from './types';

/**
 * CDN增强管理器类
 */
export class CDNEnhancedManager {
  private baseConfig: CDNConfig;
  private enhancedConfig: EnhancedCDNConfig;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(baseConfig: CDNConfig) {
    this.baseConfig = baseConfig;
    this.enhancedConfig = this.createEnhancedConfig();
  }

  /**
   * 创建增强配置
   */
  private createEnhancedConfig(): EnhancedCDNConfig {
    // 将基础配置转换为增强配置
    const domains: CDNDomainInfo[] = [
      {
        url: this.baseConfig.primaryDomain,
        status: 'healthy',
        responseTime: null,
        lastChecked: null,
        isActive: true,
        priority: 100,
        errorCount: 0,
      },
      ...this.baseConfig.backupDomains.map((domain, index) => ({
        url: domain,
        status: 'healthy' as CDNDomainStatus,
        responseTime: null,
        lastChecked: null,
        isActive: false,
        priority: 90 - index * 10,
        errorCount: 0,
      })),
    ];

    return {
      ...this.baseConfig,
      domains,
      activeDomainIndex: 0,
      healthCheck: {
        enabled: true,
        interval: DEFAULT_CDN_CONFIG.HEALTH_CHECK_INTERVAL,
        timeout: DEFAULT_CDN_CONFIG.HEALTH_CHECK_TIMEOUT,
        retryAttempts: DEFAULT_CDN_CONFIG.RETRY_ATTEMPTS,
        failureThreshold: DEFAULT_CDN_CONFIG.FAILURE_THRESHOLD,
      },
      failover: {
        enabled: true,
        strategy: 'immediate',
        autoRecovery: true,
        recoveryDelay: DEFAULT_CDN_CONFIG.RECOVERY_DELAY,
      },
    };
  }

  /**
   * 获取增强配置
   */
  getConfig(): EnhancedCDNConfig {
    return { ...this.enhancedConfig };
  }

  /**
   * 更新增强配置
   */
  updateConfig(newConfig: Partial<EnhancedCDNConfig>): boolean {
    try {
      this.enhancedConfig = { ...this.enhancedConfig, ...newConfig };

      // 同步更新基础配置
      if (newConfig.primaryDomain || newConfig.backupDomains) {
        if (newConfig.primaryDomain) {
          this.baseConfig.primaryDomain = newConfig.primaryDomain;
        }
        if (newConfig.backupDomains) {
          this.baseConfig.backupDomains = newConfig.backupDomains;
        }
      }

      return true;
    } catch (error) {
      console.error('增强CDN配置更新失败:', error);
      return false;
    }
  }

  /**
   * 获取当前活跃CDN域名
   */
  async getActiveCDNDomain(): Promise<string> {
    const activeDomain = this.enhancedConfig.domains.find(d => d.isActive);
    return activeDomain?.url || this.enhancedConfig.primaryDomain;
  }

  /**
   * 获取所有CDN域名
   */
  getAllCDNDomains(): string[] {
    return this.enhancedConfig.domains.map(d => d.url);
  }

  /**
   * 检查域名健康状态
   */
  async checkDomainHealth(domain: CDNDomainInfo): Promise<{
    status: CDNDomainStatus;
    responseTime: number | null;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // 构建健康检查URL
      const healthCheckUrl = `${domain.url}/health`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.enhancedConfig.healthCheck.timeout);

      const response = await fetch(healthCheckUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          status: responseTime > 2000 ? 'degraded' : 'healthy',
          responseTime,
        };
      } else {
        return {
          status: 'failed',
          responseTime,
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'failed',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck(): Promise<void> {
    if (!this.enhancedConfig.healthCheck.enabled) {
      return;
    }

    const checkPromises = this.enhancedConfig.domains.map(async (domain, index) => {
      const result = await this.checkDomainHealth(domain);

      // 更新域名状态
      this.enhancedConfig.domains[index] = {
        ...domain,
        status: result.status,
        responseTime: result.responseTime,
        lastChecked: new Date(),
        errorCount: result.status === 'failed' ? (domain.errorCount || 0) + 1 : 0,
      };

      // 如果当前活跃域名失败，触发故障转移
      if (domain.isActive && result.status === 'failed') {
        await this.handleFailover(index);
      }
    });

    await Promise.all(checkPromises);
  }

  /**
   * 处理故障转移
   */
  private async handleFailover(failedDomainIndex: number): Promise<void> {
    if (!this.enhancedConfig.failover.enabled) {
      return;
    }

    console.warn(`CDN域名故障，开始故障转移: ${this.enhancedConfig.domains[failedDomainIndex].url}`);

    // 将失败的域名标记为非活跃
    this.enhancedConfig.domains[failedDomainIndex].isActive = false;

    // 根据故障转移策略选择新的活跃域名
    const newActiveDomain = this.selectNextActiveDomain();

    if (newActiveDomain !== -1) {
      this.enhancedConfig.domains[newActiveDomain].isActive = true;
      this.enhancedConfig.activeDomainIndex = newActiveDomain;

      console.log(`故障转移完成，新活跃域名: ${this.enhancedConfig.domains[newActiveDomain].url}`);
    } else {
      console.error('故障转移失败：没有可用的备用域名');
    }
  }

  /**
   * 选择下一个活跃域名
   */
  private selectNextActiveDomain(): number {
    // 按优先级排序，选择状态健康且优先级最高的域名
    const availableDomains = this.enhancedConfig.domains
      .map((domain, index) => ({ domain, index }))
      .filter(({ domain }) => domain.status !== 'failed')
      .sort((a, b) => b.domain.priority - a.domain.priority);

    return availableDomains.length > 0 ? availableDomains[0].index : -1;
  }

  /**
   * 启动健康检查
   */
  startHealthCheck(): void {
    if (this.healthCheckInterval) {
      this.stopHealthCheck();
    }

    if (this.enhancedConfig.healthCheck.enabled) {
      this.healthCheckInterval = setInterval(
        () => this.performHealthCheck(),
        this.enhancedConfig.healthCheck.interval
      );

      // 立即执行一次健康检查
      this.performHealthCheck();
    }
  }

  /**
   * 停止健康检查
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * 手动故障转移到指定域名
   */
  async manualFailover(targetDomainIndex: number): Promise<boolean> {
    if (targetDomainIndex < 0 || targetDomainIndex >= this.enhancedConfig.domains.length) {
      return false;
    }

    const targetDomain = this.enhancedConfig.domains[targetDomainIndex];

    // 检查目标域名的健康状态
    const healthResult = await this.checkDomainHealth(targetDomain);

    if (healthResult.status === 'failed') {
      console.error(`无法故障转移到不健康的域名: ${targetDomain.url}`);
      return false;
    }

    // 将所有域名标记为非活跃
    this.enhancedConfig.domains.forEach(domain => {
      domain.isActive = false;
    });

    // 激活目标域名
    this.enhancedConfig.domains[targetDomainIndex].isActive = true;
    this.enhancedConfig.activeDomainIndex = targetDomainIndex;

    console.log(`手动故障转移完成: ${targetDomain.url}`);
    return true;
  }

  /**
   * 获取域名状态报告
   */
  getDomainStatusReport(): {
    activeDomain: string;
    totalDomains: number;
    healthyDomains: number;
    degradedDomains: number;
    failedDomains: number;
    domains: CDNDomainInfo[];
  } {
    const domains = this.enhancedConfig.domains;
    const activeDomain = domains.find(d => d.isActive)?.url || 'None';

    return {
      activeDomain,
      totalDomains: domains.length,
      healthyDomains: domains.filter(d => d.status === 'healthy').length,
      degradedDomains: domains.filter(d => d.status === 'degraded').length,
      failedDomains: domains.filter(d => d.status === 'failed').length,
      domains: [...domains],
    };
  }

  /**
   * 重置域名错误计数
   */
  resetDomainErrors(): void {
    this.enhancedConfig.domains.forEach(domain => {
      domain.errorCount = 0;
    });
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.stopHealthCheck();
  }
}
