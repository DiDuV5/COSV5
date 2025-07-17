/**
 * @fileoverview 磁盘空间监控器
 * @description 负责获取和监控磁盘空间使用情况
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { spawn } from 'child_process';
import type { DiskSpaceInfo, DiskSpaceQueryOptions } from './types';
import { createMockDiskSpaceInfo, parseDfOutput } from './utils';

/**
 * 磁盘空间监控器
 */
export class DiskSpaceMonitor {
  /**
   * 获取磁盘空间信息
   */
  public async getDiskSpaceInfo(
    path: string,
    options: DiskSpaceQueryOptions = {}
  ): Promise<DiskSpaceInfo> {
    try {
      if (options.useSystemCommand !== false) {
        return await this.getDiskSpaceFromSystem(path);
      } else {
        return this.getMockDiskSpaceInfo(path, options.fallbackData);
      }
    } catch (error) {
      console.error('获取磁盘空间信息失败:', error);
      return this.getMockDiskSpaceInfo(path, options.fallbackData);
    }
  }

  /**
   * 从系统获取磁盘空间信息
   */
  private async getDiskSpaceFromSystem(path: string): Promise<DiskSpaceInfo> {
    return new Promise((resolve, reject) => {
      const df = spawn('df', ['-B1', path]);
      let output = '';
      
      df.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      df.on('close', (code) => {
        if (code !== 0) {
          // 如果 df 命令失败，返回模拟数据
          resolve(createMockDiskSpaceInfo(path));
          return;
        }
        
        try {
          const diskInfo = parseDfOutput(output, path);
          resolve(diskInfo);
        } catch (error) {
          reject(new Error(`解析磁盘空间信息失败: ${error}`));
        }
      });
      
      df.on('error', (error) => {
        // 如果命令执行失败，返回模拟数据
        resolve(createMockDiskSpaceInfo(path));
      });
    });
  }

  /**
   * 获取模拟磁盘空间信息
   */
  private getMockDiskSpaceInfo(
    path: string, 
    fallbackData?: Partial<DiskSpaceInfo>
  ): DiskSpaceInfo {
    const mockData = createMockDiskSpaceInfo(path);
    
    if (fallbackData) {
      return {
        ...mockData,
        ...fallbackData,
        path,
        timestamp: new Date(),
      };
    }
    
    return mockData;
  }

  /**
   * 检查磁盘空间是否充足
   */
  public async checkDiskSpaceAvailable(
    path: string,
    requiredBytes: number
  ): Promise<boolean> {
    try {
      const diskInfo = await this.getDiskSpaceInfo(path);
      return diskInfo.free >= requiredBytes;
    } catch (error) {
      console.error('检查磁盘空间失败:', error);
      return false;
    }
  }

  /**
   * 获取磁盘使用率
   */
  public async getDiskUsagePercentage(path: string): Promise<number> {
    try {
      const diskInfo = await this.getDiskSpaceInfo(path);
      return diskInfo.usage;
    } catch (error) {
      console.error('获取磁盘使用率失败:', error);
      return 0;
    }
  }

  /**
   * 批量获取多个路径的磁盘空间信息
   */
  public async getBatchDiskSpaceInfo(
    paths: string[]
  ): Promise<Map<string, DiskSpaceInfo>> {
    const results = new Map<string, DiskSpaceInfo>();
    
    const promises = paths.map(async (path) => {
      try {
        const diskInfo = await this.getDiskSpaceInfo(path);
        results.set(path, diskInfo);
      } catch (error) {
        console.warn(`获取路径 ${path} 的磁盘空间信息失败:`, error);
        results.set(path, createMockDiskSpaceInfo(path));
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * 监控磁盘空间变化
   */
  public async monitorDiskSpaceChanges(
    path: string,
    callback: (diskInfo: DiskSpaceInfo) => void,
    intervalMs: number = 60000
  ): Promise<() => void> {
    let isMonitoring = true;
    
    const monitor = async () => {
      while (isMonitoring) {
        try {
          const diskInfo = await this.getDiskSpaceInfo(path);
          callback(diskInfo);
        } catch (error) {
          console.error('监控磁盘空间变化失败:', error);
        }
        
        // 等待指定间隔
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    };

    // 启动监控
    monitor();

    // 返回停止监控的函数
    return () => {
      isMonitoring = false;
    };
  }

  /**
   * 预测磁盘空间耗尽时间
   */
  public predictDiskFullTime(
    currentUsage: number,
    usageGrowthRate: number // 每天增长的百分比
  ): Date | null {
    if (usageGrowthRate <= 0) {
      return null; // 使用率不增长或在减少
    }

    const remainingPercentage = 100 - currentUsage;
    const daysUntilFull = remainingPercentage / usageGrowthRate;
    
    if (daysUntilFull <= 0) {
      return new Date(); // 已经满了
    }

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + Math.ceil(daysUntilFull));
    
    return futureDate;
  }

  /**
   * 获取磁盘健康状态
   */
  public async getDiskHealthStatus(path: string): Promise<{
    status: 'healthy' | 'warning' | 'critical' | 'emergency';
    usage: number;
    message: string;
  }> {
    try {
      const diskInfo = await this.getDiskSpaceInfo(path);
      const usage = diskInfo.usage;

      if (usage >= 95) {
        return {
          status: 'emergency',
          usage,
          message: '磁盘空间严重不足，系统可能无法正常运行',
        };
      } else if (usage >= 85) {
        return {
          status: 'critical',
          usage,
          message: '磁盘空间不足，需要立即清理',
        };
      } else if (usage >= 75) {
        return {
          status: 'warning',
          usage,
          message: '磁盘空间使用率较高，建议清理',
        };
      } else {
        return {
          status: 'healthy',
          usage,
          message: '磁盘空间充足',
        };
      }
    } catch (error) {
      console.error('获取磁盘健康状态失败:', error);
      return {
        status: 'critical',
        usage: 0,
        message: '无法获取磁盘状态信息',
      };
    }
  }
}
