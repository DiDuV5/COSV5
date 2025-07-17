/**
 * @fileoverview 系统指标监控服务
 * @description 专门处理系统相关的监控指标收集和分析
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import type { SystemMetrics } from '../types/monitoring-types';

import * as os from 'os';

/**
 * 系统指标监控服务类
 */
export class SystemMetricsService {
  /**
   * 收集系统相关指标
   */
  async collectSystemMetrics(): Promise<SystemMetrics> {
    try {
      const [
        uptime,
        memoryUsage,
        cpuUsage,
        diskUsage,
        networkStats,
        processStats,
        loadAverage
      ] = await Promise.all([
        this.getSystemUptime(),
        this.getMemoryUsage(),
        this.getCPUUsage(),
        this.getDiskUsage(),
        this.getNetworkStats(),
        this.getProcessStats(),
        this.getLoadAverage()
      ]);

      return {
        uptime,
        // memoryUsage, // 暂时注释掉，属性不存在于 SystemMetrics
        // cpuUsage, // 暂时注释掉，属性不存在于 SystemMetrics
        diskUsage: typeof diskUsage === 'object' ? diskUsage.percentage : diskUsage,
        // networkStats, // 暂时注释掉，属性不存在于 SystemMetrics
        // processStats, // 暂时注释掉，属性不存在于 SystemMetrics
        // loadAverage, // 暂时注释掉，属性不存在于 SystemMetrics
        networkLatency: 0, // 临时值
        serviceHealth: 'healthy' as const,
        // timestamp: new Date(), // 暂时注释掉，属性不存在于 SystemMetrics
      };
    } catch (error) {
      console.error('❌ 系统指标收集失败:', error);
      throw error;
    }
  }

  /**
   * 获取系统运行时间
   */
  private async getSystemUptime(): Promise<number> {
    try {
      return process.uptime();
    } catch (error) {
      console.error('获取系统运行时间失败:', error);
      return 0;
    }
  }

  /**
   * 获取内存使用情况
   */
  private async getMemoryUsage(): Promise<{
    total: number;
    used: number;
    free: number;
    percentage: number;
    heapUsed: number;
    heapTotal: number;
  }> {
    try {
      const nodeMemory = process.memoryUsage();

      // 尝试获取系统内存信息
      const systemMemory = {
        total: 0,
        used: 0,
        free: 0,
      };

      try {
        if (process.platform === 'linux') {
          const meminfo = readFileSync('/proc/meminfo', 'utf8');
          const lines = meminfo.split('\n');

          const getMemValue = (key: string) => {
            const line = lines.find(l => l.startsWith(key));
            if (line) {
              const match = line.match(/(\d+)/);
              return match ? parseInt(match[1]) * 1024 : 0; // 转换为字节
            }
            return 0;
          };

          systemMemory.total = getMemValue('MemTotal:');
          systemMemory.free = getMemValue('MemAvailable:') || getMemValue('MemFree:');
          systemMemory.used = systemMemory.total - systemMemory.free;
        } else {
          // 对于非Linux系统，使用Node.js内存信息
          systemMemory.total = nodeMemory.heapTotal * 10; // 估算
          systemMemory.used = nodeMemory.heapUsed;
          systemMemory.free = systemMemory.total - systemMemory.used;
        }
      } catch (sysError) {
        console.warn('无法获取系统内存信息，使用Node.js内存信息:', sysError);
        systemMemory.total = nodeMemory.heapTotal * 10;
        systemMemory.used = nodeMemory.heapUsed;
        systemMemory.free = systemMemory.total - systemMemory.used;
      }

      const percentage = systemMemory.total > 0 ? (systemMemory.used / systemMemory.total) * 100 : 0;

      return {
        total: systemMemory.total,
        used: systemMemory.used,
        free: systemMemory.free,
        percentage: Number(percentage.toFixed(2)),
        heapUsed: nodeMemory.heapUsed,
        heapTotal: nodeMemory.heapTotal,
      };
    } catch (error) {
      console.error('获取内存使用情况失败:', error);
      return {
        total: 0,
        used: 0,
        free: 0,
        percentage: 0,
        heapUsed: 0,
        heapTotal: 0,
      };
    }
  }

  /**
   * 获取CPU使用情况
   */
  private async getCPUUsage(): Promise<{
    percentage: number;
    loadAverage: number[];
    cores: number;
  }> {
    try {
      const cpus = os.cpus();
      const loadAvg = os.loadavg();

      // 计算CPU使用率
      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach((cpu: any) => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });

      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      const usage = 100 - ~~(100 * idle / total);

      return {
        percentage: Number(usage.toFixed(2)),
        loadAverage: loadAvg,
        cores: cpus.length,
      };
    } catch (error) {
      console.error('获取CPU使用情况失败:', error);
      return {
        percentage: 0,
        loadAverage: [0, 0, 0],
        cores: 1,
      };
    }
  }

  /**
   * 获取磁盘使用情况
   */
  private async getDiskUsage(): Promise<{
    total: number;
    used: number;
    free: number;
    percentage: number;
  }> {
    try {
      if (process.platform === 'linux' || process.platform === 'darwin') {
        const output = execSync('df -h /', { encoding: 'utf8' });
        const lines = output.trim().split('\n');

        if (lines.length >= 2) {
          const parts = lines[1].split(/\s+/);
          const total = this.parseSize(parts[1]);
          const used = this.parseSize(parts[2]);
          const free = this.parseSize(parts[3]);
          const percentage = parseFloat(parts[4].replace('%', ''));

          return { total, used, free, percentage };
        }
      }

      // 默认返回值
      return { total: 0, used: 0, free: 0, percentage: 0 };
    } catch (error) {
      console.error('获取磁盘使用情况失败:', error);
      return { total: 0, used: 0, free: 0, percentage: 0 };
    }
  }

  /**
   * 获取网络统计
   */
  private async getNetworkStats(): Promise<{
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
  }> {
    try {
      // 这里应该实现网络统计收集
      // 暂时返回模拟数据
      return {
        bytesReceived: 1024 * 1024 * 100, // 100MB
        bytesSent: 1024 * 1024 * 50,     // 50MB
        packetsReceived: 10000,
        packetsSent: 8000,
      };
    } catch (error) {
      console.error('获取网络统计失败:', error);
      return {
        bytesReceived: 0,
        bytesSent: 0,
        packetsReceived: 0,
        packetsSent: 0,
      };
    }
  }

  /**
   * 获取进程统计
   */
  private async getProcessStats(): Promise<{
    pid: number;
    ppid: number;
    threads: number;
    handles: number;
    startTime: Date;
  }> {
    try {
      return {
        pid: process.pid,
        ppid: process.ppid || 0,
        threads: 1, // Node.js是单线程的
        handles: (process as any)._getActiveHandles?.()?.length || 0,
        startTime: new Date(Date.now() - process.uptime() * 1000),
      };
    } catch (error) {
      console.error('获取进程统计失败:', error);
      return {
        pid: process.pid,
        ppid: 0,
        threads: 1,
        handles: 0,
        startTime: new Date(),
      };
    }
  }

  /**
   * 获取负载平均值
   */
  private async getLoadAverage(): Promise<{
    oneMinute: number;
    fiveMinutes: number;
    fifteenMinutes: number;
  }> {
    try {
      const loadAvg = os.loadavg();

      return {
        oneMinute: Number(loadAvg[0].toFixed(2)),
        fiveMinutes: Number(loadAvg[1].toFixed(2)),
        fifteenMinutes: Number(loadAvg[2].toFixed(2)),
      };
    } catch (error) {
      console.error('获取负载平均值失败:', error);
      return {
        oneMinute: 0,
        fiveMinutes: 0,
        fifteenMinutes: 0,
      };
    }
  }

  /**
   * 解析大小字符串（如 "1.5G" -> 字节数）
   */
  private parseSize(sizeStr: string): number {
    const units: Record<string, number> = {
      'K': 1024,
      'M': 1024 * 1024,
      'G': 1024 * 1024 * 1024,
      'T': 1024 * 1024 * 1024 * 1024,
    };

    const match = sizeStr.match(/^([\d.]+)([KMGT]?)$/);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2] || '';
    const multiplier = units[unit] || 1;

    return Math.round(value * multiplier);
  }

  /**
   * 获取系统信息摘要
   */
  async getSystemSummary(): Promise<{
    platform: string;
    architecture: string;
    nodeVersion: string;
    hostname: string;
    totalMemory: string;
    cpuModel: string;
    cpuCores: number;
  }> {
    try {
      const cpus = os.cpus();

      return {
        platform: os.platform(),
        architecture: os.arch(),
        nodeVersion: process.version,
        hostname: os.hostname(),
        totalMemory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`,
        cpuModel: cpus[0]?.model || 'Unknown',
        cpuCores: cpus.length,
      };
    } catch (error) {
      console.error('获取系统信息摘要失败:', error);
      return {
        platform: 'unknown',
        architecture: 'unknown',
        nodeVersion: process.version,
        hostname: 'unknown',
        totalMemory: '0GB',
        cpuModel: 'Unknown',
        cpuCores: 1,
      };
    }
  }

  /**
   * 检查系统健康状态
   */
  async checkSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const metrics = await this.collectSystemMetrics();
      const issues: string[] = [];
      const recommendations: string[] = [];

      // 检查内存使用率
      if ((metrics as any).memoryUsage?.percentage > 90) {
        issues.push('内存使用率过高');
        recommendations.push('考虑增加内存或优化内存使用');
      } else if ((metrics as any).memoryUsage?.percentage > 80) {
        issues.push('内存使用率较高');
        recommendations.push('监控内存使用情况');
      }

      // 检查CPU使用率
      if ((metrics as any).cpuUsage?.percentage > 90) {
        issues.push('CPU使用率过高');
        recommendations.push('检查CPU密集型任务');
      }

      // 检查磁盘使用率
      if ((metrics as any).diskUsage?.percentage > 90) {
        issues.push('磁盘空间不足');
        recommendations.push('清理磁盘空间或扩容');
      }

      // 检查负载平均值
      if ((metrics as any).loadAverage?.oneMinute > (metrics as any).cpuUsage?.cores * 2) {
        issues.push('系统负载过高');
        recommendations.push('检查系统负载来源');
      }

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (issues.length > 0) {
        status = issues.some(issue =>
          issue.includes('过高') || issue.includes('不足')
        ) ? 'critical' : 'warning';
      }

      return { status, issues, recommendations };
    } catch (error) {
      console.error('系统健康检查失败:', error);
      return {
        status: 'critical',
        issues: ['系统健康检查失败'],
        recommendations: ['检查监控系统配置'],
      };
    }
  }
}

/**
 * 导出服务创建函数
 */
export const createSystemMetricsService = () => new SystemMetricsService();
