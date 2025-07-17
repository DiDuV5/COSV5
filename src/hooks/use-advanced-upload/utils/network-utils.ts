/**
 * @fileoverview 网络状态检查工具
 * @description 提供网络连接检查和状态监控功能
 */

import { DEFAULT_UPLOAD_CONFIG, NetworkStatus } from "@/lib/upload/core/index";

/**
 * 检查网络连接状态
 */
export async function checkNetworkStatus(): Promise<NetworkStatus> {
  const startTime = Date.now();

  try {
    // 使用更稳定的端点进行网络检查
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_UPLOAD_CONFIG.networkCheckTimeout);

    const response = await fetch('/api/auth/session', {
      method: 'HEAD',
      cache: 'no-cache',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    return {
      isOnline: response.ok,
      latency,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      isOnline: false,
      timestamp: Date.now(),
    };
  }
}

/**
 * 快速网络检查（简化版）
 */
export async function quickNetworkCheck(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时

    const response = await fetch('/api/auth/session', {
      method: 'HEAD',
      cache: 'no-cache',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 网络状态监控类
 */
export class NetworkMonitor {
  private isMonitoring = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private listeners: Array<(status: NetworkStatus) => void> = [];
  private lastStatus: NetworkStatus | null = null;

  /**
   * 开始监控网络状态
   */
  startMonitoring(intervalMs = 30000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // 立即检查一次
    this.performCheck();

    // 定期检查
    this.checkInterval = setInterval(() => {
      this.performCheck();
    }, intervalMs);

    // 监听在线/离线事件
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  /**
   * 添加状态变化监听器
   */
  addListener(listener: (status: NetworkStatus) => void): void {
    this.listeners.push(listener);
  }

  /**
   * 移除状态变化监听器
   */
  removeListener(listener: (status: NetworkStatus) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 获取最后的网络状态
   */
  getLastStatus(): NetworkStatus | null {
    return this.lastStatus;
  }

  /**
   * 手动触发网络检查
   */
  async checkNow(): Promise<NetworkStatus> {
    const status = await checkNetworkStatus();
    this.updateStatus(status);
    return status;
  }

  /**
   * 执行网络检查
   */
  private async performCheck(): Promise<void> {
    try {
      const status = await checkNetworkStatus();
      this.updateStatus(status);
    } catch (error) {
      console.error('网络状态检查失败:', error);
      this.updateStatus({
        isOnline: false,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 更新网络状态
   */
  private updateStatus(status: NetworkStatus): void {
    const statusChanged = !this.lastStatus ||
      this.lastStatus.isOnline !== status.isOnline;

    this.lastStatus = status;

    if (statusChanged) {
      this.notifyListeners(status);
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(status: NetworkStatus): void {
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('网络状态监听器执行失败:', error);
      }
    });
  }

  /**
   * 处理在线事件
   */
  private handleOnline = (): void => {
    console.log('🌐 网络连接已恢复');
    this.performCheck();
  };

  /**
   * 处理离线事件
   */
  private handleOffline = (): void => {
    console.log('🚫 网络连接已断开');
    this.updateStatus({
      isOnline: false,
      timestamp: Date.now(),
    });
  };
}

/**
 * 全局网络监控实例
 */
export const globalNetworkMonitor = new NetworkMonitor();

/**
 * 网络重连检查
 */
export async function waitForNetworkReconnection(
  maxWaitTime = 30000,
  checkInterval = 2000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const isOnline = await quickNetworkCheck();
    if (isOnline) {
      return true;
    }

    // 等待指定间隔后再次检查
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  return false;
}

/**
 * 检查网络连接质量
 */
export async function checkNetworkQuality(): Promise<{
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  latency: number;
  isStable: boolean;
}> {
  const checks: number[] = [];

  // 进行3次检查
  for (let i = 0; i < 3; i++) {
    const status = await checkNetworkStatus();
    if (status.latency !== undefined) {
      checks.push(status.latency);
    }

    // 间隔500ms
    if (i < 2) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  if (checks.length === 0) {
    return {
      quality: 'poor',
      latency: 0,
      isStable: false,
    };
  }

  const avgLatency = checks.reduce((sum, latency) => sum + latency, 0) / checks.length;
  const maxLatency = Math.max(...checks);
  const minLatency = Math.min(...checks);
  const latencyVariation = maxLatency - minLatency;

  // 判断连接质量
  let quality: 'excellent' | 'good' | 'fair' | 'poor';
  if (avgLatency < 100) {
    quality = 'excellent';
  } else if (avgLatency < 300) {
    quality = 'good';
  } else if (avgLatency < 1000) {
    quality = 'fair';
  } else {
    quality = 'poor';
  }

  // 判断连接稳定性（延迟变化小于50%）
  const isStable = latencyVariation < avgLatency * 0.5;

  return {
    quality,
    latency: Math.round(avgLatency),
    isStable,
  };
}

/**
 * 获取网络类型（如果支持）
 */
export function getNetworkType(): string {
  // @ts-ignore - 实验性API
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (connection) {
    return connection.effectiveType || connection.type || 'unknown';
  }

  return 'unknown';
}

/**
 * 检查是否为移动网络
 */
export function isMobileNetwork(): boolean {
  const networkType = getNetworkType();
  return ['slow-2g', '2g', '3g'].includes(networkType);
}

/**
 * 获取网络状态描述
 */
export function getNetworkDescription(status: NetworkStatus): string {
  if (!status.isOnline) {
    return '网络连接已断开';
  }

  if (status.latency === undefined) {
    return '网络连接正常';
  }

  if (status.latency < 100) {
    return `网络连接优秀 (${status.latency}ms)`;
  } else if (status.latency < 300) {
    return `网络连接良好 (${status.latency}ms)`;
  } else if (status.latency < 1000) {
    return `网络连接一般 (${status.latency}ms)`;
  } else {
    return `网络连接较慢 (${status.latency}ms)`;
  }
}
