/**
 * @fileoverview CDN域名健康检查服务
 * @description 监控CDN域名的可用性、响应时间和错误率
 * @author Augment AI
 * @date 2025-06-16
 * @version 1.0.0
 */

export type DomainStatus = 'healthy' | 'degraded' | 'failed' | 'unknown';

export interface DomainHealthResult {
  url: string;
  status: DomainStatus;
  responseTime: number;
  error?: string;
  timestamp: Date;
}

export interface HealthCheckConfig {
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  userAgent: string;
  testPath: string;
  expectedStatus: number[];
  maxResponseTime: number;
}

export interface HealthCheckStats {
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  averageResponseTime: number;
  uptime: number;
  lastCheckTime: Date;
}

/**
 * CDN域名健康检查器
 */
export class CDNHealthChecker {
  private config: HealthCheckConfig;
  private stats: Map<string, HealthCheckStats> = new Map();

  constructor(config?: Partial<HealthCheckConfig>) {
    this.config = {
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      userAgent: 'CoserEden-CDN-HealthChecker/1.0',
      testPath: '/favicon.ico',
      expectedStatus: [200, 301, 302, 304],
      maxResponseTime: 5000,
      ...config,
    };
  }

  /**
   * 检查单个域名的健康状态
   */
  public async checkDomainHealth(url: string): Promise<DomainHealthResult> {
    const startTime = Date.now();
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const testUrl = this.buildTestUrl(url);
        const response = await this.performHealthCheck(testUrl);
        const responseTime = Date.now() - startTime;

        this.updateStats(url, true, responseTime);
        const status = this.determineHealthStatus(response.status, responseTime);

        return {
          url,
          status,
          responseTime,
          timestamp: new Date(),
        };

      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        
        if (attempt < this.config.retryAttempts) {
          await this.sleep(this.config.retryDelay);
        }
      }
    }

    const responseTime = Date.now() - startTime;
    this.updateStats(url, false, responseTime);

    return {
      url,
      status: 'failed',
      responseTime,
      error: lastError,
      timestamp: new Date(),
    };
  }

  private async performHealthCheck(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': this.config.userAgent,
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;

    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private buildTestUrl(baseUrl: string): string {
    const url = new URL(baseUrl);
    url.pathname = this.config.testPath;
    url.search = `?t=${Date.now()}`;
    return url.toString();
  }

  private determineHealthStatus(statusCode: number, responseTime: number): DomainStatus {
    if (!this.config.expectedStatus.includes(statusCode)) {
      return 'failed';
    }

    if (responseTime > this.config.maxResponseTime) {
      return 'degraded';
    }

    return 'healthy';
  }

  private updateStats(url: string, success: boolean, responseTime: number): void {
    const stats = this.stats.get(url) || {
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      averageResponseTime: 0,
      uptime: 0,
      lastCheckTime: new Date(),
    };

    stats.totalChecks++;
    stats.lastCheckTime = new Date();

    if (success) {
      stats.successfulChecks++;
      stats.averageResponseTime = 
        (stats.averageResponseTime * (stats.successfulChecks - 1) + responseTime) / stats.successfulChecks;
    } else {
      stats.failedChecks++;
    }

    stats.uptime = (stats.successfulChecks / stats.totalChecks) * 100;
    this.stats.set(url, stats);
  }

  public getStats(url: string): HealthCheckStats | undefined {
    return this.stats.get(url);
  }

  public getAllStats(): Map<string, HealthCheckStats> {
    return new Map(this.stats);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
