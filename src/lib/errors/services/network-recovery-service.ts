/**
 * @fileoverview 网络恢复服务
 * @description 专门处理网络状态监控、网络中断检测和网络恢复等待
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import { EventEmitter } from 'events';

import dns from 'dns';

/**
 * 网络状态接口
 */
export interface NetworkStatus {
  online: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  lastChecked: number;
}

/**
 * 网络检查结果接口
 */
export interface NetworkCheckResult {
  online: boolean;
  latency?: number;
  speed?: number;
  timestamp: number;
}

/**
 * 网络恢复服务类
 */
export class NetworkRecoveryService extends EventEmitter {
  private networkStatus: NetworkStatus = {
    online: true,
    lastChecked: Date.now(),
  };

  private checkInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  constructor() {
    super();
    this.initializeNetworkMonitoring();
  }

  /**
   * 获取当前网络状态
   */
  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  /**
   * 等待网络恢复
   */
  async waitForNetworkRecovery(timeout: number = 30000): Promise<boolean> {
    if (this.networkStatus.online) {
      return true;
    }

    console.log(`🔍 等待网络恢复，超时时间: ${timeout}ms`);

    return new Promise((resolve) => {
      const startTime = Date.now();

      const checkNetwork = async () => {
        // 检查网络状态
        const isOnline = await this.checkNetworkConnectivity();

        if (isOnline) {
          console.log('✅ 网络已恢复');
          resolve(true);
          return;
        }

        // 检查超时
        if (Date.now() - startTime >= timeout) {
          console.log('⏰ 等待网络恢复超时');
          resolve(false);
          return;
        }

        // 继续等待
        setTimeout(checkNetwork, 1000);
      };

      checkNetwork();
    });
  }

  /**
   * 检查网络连接性
   */
  async checkNetworkConnectivity(): Promise<boolean> {
    try {
      // 在浏览器环境中
      if (typeof window !== 'undefined') {
        // 首先检查基本的在线状态
        if (!navigator.onLine) {
          this.updateNetworkStatus(false);
          return false;
        }

        // 尝试发送一个小的网络请求来验证连接
        const startTime = Date.now();
        const response = await fetch('/api/health', {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000),
        });

        const latency = Date.now() - startTime;
        const isOnline = response.ok;

        this.updateNetworkStatus(isOnline, latency);
        return isOnline;

      } else {
        // 在Node.js环境中
        return await this.checkServerConnectivity();
      }
    } catch (error) {
      console.warn('网络连接检查失败:', error);
      this.updateNetworkStatus(false);
      return false;
    }
  }

  /**
   * 检查服务器连接性
   */
  private async checkServerConnectivity(): Promise<boolean> {
    try {
      // 尝试DNS解析
      await dns.promises.lookup('google.com');

      this.updateNetworkStatus(true);
      return true;
    } catch (error) {
      this.updateNetworkStatus(false);
      return false;
    }
  }

  /**
   * 开始网络监控
   */
  startMonitoring(interval: number = 10000): void {
    if (this.isMonitoring) {
      return;
    }

    console.log(`🔍 开始网络监控，检查间隔: ${interval}ms`);
    this.isMonitoring = true;

    this.checkInterval = setInterval(async () => {
      await this.checkNetworkConnectivity();
    }, interval);
  }

  /**
   * 停止网络监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    console.log('🛑 停止网络监控');
    this.isMonitoring = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * 测试网络速度
   */
  async testNetworkSpeed(): Promise<{
    downloadSpeed: number; // Mbps
    latency: number; // ms
  }> {
    try {
      const testUrl = '/api/speed-test'; // 假设有一个速度测试端点
      const testSize = 1024 * 1024; // 1MB

      // 测试延迟
      const latencyStart = Date.now();
      await fetch(testUrl, { method: 'HEAD' });
      const latency = Date.now() - latencyStart;

      // 测试下载速度
      const downloadStart = Date.now();
      const response = await fetch(`${testUrl}?size=${testSize}`);
      await response.blob();
      const downloadTime = Date.now() - downloadStart;

      const downloadSpeed = (testSize * 8) / (downloadTime / 1000) / 1000000; // Mbps

      return { downloadSpeed, latency };
    } catch (error) {
      console.warn('网络速度测试失败:', error);
      return { downloadSpeed: 0, latency: 0 };
    }
  }

  /**
   * 获取网络质量评估
   */
  getNetworkQuality(): 'excellent' | 'good' | 'fair' | 'poor' | 'offline' {
    if (!this.networkStatus.online) {
      return 'offline';
    }

    const { rtt, downlink } = this.networkStatus;

    // 基于RTT和下行速度评估网络质量
    if (rtt && downlink) {
      if (rtt < 100 && downlink > 10) {
        return 'excellent';
      } else if (rtt < 300 && downlink > 5) {
        return 'good';
      } else if (rtt < 500 && downlink > 1) {
        return 'fair';
      } else {
        return 'poor';
      }
    }

    // 如果没有详细信息，基于基本在线状态
    return this.networkStatus.online ? 'good' : 'offline';
  }

  /**
   * 初始化网络监控
   */
  private initializeNetworkMonitoring(): void {
    if (typeof window !== 'undefined') {
      // 监听在线/离线状态
      window.addEventListener('online', () => {
        console.log('🌐 网络连接已恢复');
        this.updateNetworkStatus(true);
        this.emit('networkRecovered');
      });

      window.addEventListener('offline', () => {
        console.log('📵 网络连接已断开');
        this.updateNetworkStatus(false);
        this.emit('networkLost');
      });

      // 监听网络信息变化
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          this.updateNetworkInfo(connection);
          connection.addEventListener('change', () => {
            this.updateNetworkInfo(connection);
            this.emit('networkChanged', this.networkStatus);
          });
        }
      }

      // 初始状态
      this.networkStatus.online = navigator.onLine;
    }
  }

  /**
   * 更新网络状态
   */
  private updateNetworkStatus(online: boolean, latency?: number): void {
    const wasOnline = this.networkStatus.online;

    this.networkStatus = {
      ...this.networkStatus,
      online,
      lastChecked: Date.now(),
    };

    // 触发状态变化事件
    if (wasOnline !== online) {
      this.emit('statusChanged', this.networkStatus);

      if (online) {
        this.emit('networkRecovered');
      } else {
        this.emit('networkLost');
      }
    }
  }

  /**
   * 更新网络信息
   */
  private updateNetworkInfo(connection: any): void {
    this.networkStatus = {
      ...this.networkStatus,
      online: navigator.onLine,
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      lastChecked: Date.now(),
    };
  }

  /**
   * 等待网络质量改善
   */
  async waitForBetterNetwork(
    minQuality: 'good' | 'fair' = 'fair',
    timeout: number = 30000
  ): Promise<boolean> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const checkQuality = () => {
        const quality = this.getNetworkQuality();

        // 检查是否达到要求的质量
        if (quality === 'excellent' || quality === 'good' ||
           (minQuality === 'fair' && quality === 'fair')) {
          resolve(true);
          return;
        }

        // 检查超时
        if (Date.now() - startTime >= timeout) {
          resolve(false);
          return;
        }

        // 继续等待
        setTimeout(checkQuality, 2000);
      };

      checkQuality();
    });
  }

  /**
   * 获取网络统计信息
   */
  getNetworkStats(): {
    status: NetworkStatus;
    quality: string;
    isMonitoring: boolean;
    uptime: number;
  } {
    return {
      status: this.getNetworkStatus(),
      quality: this.getNetworkQuality(),
      isMonitoring: this.isMonitoring,
      uptime: this.networkStatus.online ? Date.now() - this.networkStatus.lastChecked : 0,
    };
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    this.stopMonitoring();
    this.removeAllListeners();
  }
}

/**
 * 导出服务创建函数
 */
export const createNetworkRecoveryService = () => new NetworkRecoveryService();
