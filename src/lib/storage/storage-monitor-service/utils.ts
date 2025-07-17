/**
 * @fileoverview 存储监控服务工具函数
 * @description 提供存储监控相关的工具函数
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import {
  type MonitorConfig,
  type DiskSpaceInfo,
  type StorageAlert,
  type StorageTrendPoint,
  DEFAULT_MONITOR_CONFIG,
  AlertLevel
} from './types';

/**
 * 创建默认配置
 */
export function createDefaultConfig(config?: Partial<MonitorConfig>): MonitorConfig {
  return {
    checkInterval: 5 * 60 * 1000, // 5分钟
    warningThreshold: 75,
    criticalThreshold: 85,
    emergencyThreshold: 95,
    alertCooldown: 30 * 60 * 1000, // 30分钟
    enableEmailNotification: true,
    enableWebhookNotification: false,
    adminEmails: [process.env.COSEREEDEN_INITIAL_ADMIN_EMAIL].filter(Boolean) as string[],
    ...config,
  };
}

/**
 * 确定预警级别
 */
export function determineAlertLevel(
  usage: number,
  config: MonitorConfig
): AlertLevel | null {
  if (usage >= config.emergencyThreshold) {
    return AlertLevel.EMERGENCY;
  } else if (usage >= config.criticalThreshold) {
    return AlertLevel.CRITICAL;
  } else if (usage >= config.warningThreshold) {
    return AlertLevel.WARNING;
  }
  return null;
}

/**
 * 生成预警消息
 */
export function generateAlertMessage(level: AlertLevel, diskInfo: DiskSpaceInfo): string {
  const usage = diskInfo.usage.toFixed(1);
  const freeGB = (Number(diskInfo.free) / (1024 * 1024 * 1024)).toFixed(1);

  const levelMessages = {
    [AlertLevel.WARNING]: `存储空间警告：磁盘使用率已达到 ${usage}%，剩余空间 ${freeGB}GB`,
    [AlertLevel.CRITICAL]: `存储空间严重警告：磁盘使用率已达到 ${usage}%，剩余空间 ${freeGB}GB，请立即清理`,
    [AlertLevel.EMERGENCY]: `存储空间紧急警告：磁盘使用率已达到 ${usage}%，剩余空间 ${freeGB}GB，系统可能即将无法正常运行`,
  };

  return levelMessages[level];
}

/**
 * 检查预警冷却时间
 */
export function isAlertCooldownExpired(
  lastAlert: Date | undefined,
  cooldownMs: number
): boolean {
  if (!lastAlert) return true;

  const now = new Date();
  return (now.getTime() - lastAlert.getTime()) > cooldownMs;
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * 格式化使用率百分比
 */
export function formatUsagePercentage(usage: number): string {
  return `${usage.toFixed(1)}%`;
}

/**
 * 计算目录大小（字节）
 */
export function calculateDirectorySize(files: Array<{ size: number }>): number {
  return files.reduce((total, file) => total + file.size, 0);
}

/**
 * 获取最新修改时间
 */
export function getLatestModificationTime(files: Array<{ mtime: Date }>): Date {
  if (files.length === 0) return new Date(0);

  return files.reduce((latest, file) =>
    file.mtime > latest ? file.mtime : latest,
    new Date(0)
  );
}

/**
 * 验证配置参数
 */
export function validateConfig(config: Partial<MonitorConfig>): string[] {
  const errors: string[] = [];

  if (config.checkInterval !== undefined && config.checkInterval < 60000) {
    errors.push('检查间隔不能少于1分钟');
  }

  if (config.warningThreshold !== undefined &&
      (config.warningThreshold < 0 || config.warningThreshold > 100)) {
    errors.push('警告阈值必须在0-100之间');
  }

  if (config.criticalThreshold !== undefined &&
      (config.criticalThreshold < 0 || config.criticalThreshold > 100)) {
    errors.push('严重阈值必须在0-100之间');
  }

  if (config.emergencyThreshold !== undefined &&
      (config.emergencyThreshold < 0 || config.emergencyThreshold > 100)) {
    errors.push('紧急阈值必须在0-100之间');
  }

  if (config.warningThreshold !== undefined &&
      config.criticalThreshold !== undefined &&
      config.warningThreshold >= config.criticalThreshold) {
    errors.push('警告阈值必须小于严重阈值');
  }

  if (config.criticalThreshold !== undefined &&
      config.emergencyThreshold !== undefined &&
      config.criticalThreshold >= config.emergencyThreshold) {
    errors.push('严重阈值必须小于紧急阈值');
  }

  if (config.alertCooldown !== undefined && config.alertCooldown < 60000) {
    errors.push('预警冷却时间不能少于1分钟');
  }

  if (config.enableWebhookNotification && !config.webhookUrl) {
    errors.push('启用Webhook通知时必须提供Webhook URL');
  }

  if (config.webhookUrl && !isValidUrl(config.webhookUrl)) {
    errors.push('Webhook URL格式无效');
  }

  if (config.adminEmails && config.adminEmails.some(email => !isValidEmail(email))) {
    errors.push('管理员邮箱格式无效');
  }

  return errors;
}

/**
 * 验证URL格式
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证邮箱格式
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 创建模拟磁盘空间数据
 */
export function createMockDiskSpaceInfo(path: string): DiskSpaceInfo {
  return {
    path,
    total: 100 * 1024 * 1024 * 1024, // 100GB
    used: 20 * 1024 * 1024 * 1024,   // 20GB
    free: 80 * 1024 * 1024 * 1024,   // 80GB
    usage: 20,
    timestamp: new Date(),
  };
}

/**
 * 解析df命令输出
 */
export function parseDfOutput(output: string, path: string): DiskSpaceInfo {
  const lines = output.trim().split('\n');
  const dataLine = lines[1]; // 第二行是数据
  const parts = dataLine.split(/\s+/);

  const total = parseInt(parts[1]);
  const used = parseInt(parts[2]);
  const free = parseInt(parts[3]);
  const usage = (used / total) * 100;

  return {
    path,
    total,
    used,
    free,
    usage,
    timestamp: new Date(),
  };
}

/**
 * 计算存储趋势
 */
export function calculateStorageTrend(
  data: StorageTrendPoint[]
): { trend: 'increasing' | 'decreasing' | 'stable'; rate: number } {
  if (data.length < 2) {
    return { trend: 'stable', rate: 0 };
  }

  const first = data[0];
  const last = data[data.length - 1];
  const timeDiff = last.timestamp.getTime() - first.timestamp.getTime();
  const usageDiff = last.usage - first.usage;

  if (timeDiff === 0) {
    return { trend: 'stable', rate: 0 };
  }

  const rate = (usageDiff / timeDiff) * (24 * 60 * 60 * 1000); // 每天的变化率

  if (Math.abs(rate) < 0.1) {
    return { trend: 'stable', rate };
  } else if (rate > 0) {
    return { trend: 'increasing', rate };
  } else {
    return { trend: 'decreasing', rate };
  }
}

/**
 * 生成清理建议
 */
export function generateCleanupSuggestions(
  directoryInfos: Array<{ path: string; size: number; fileCount: number }>
): string[] {
  const suggestions: string[] = [];

  // 找出最大的目录
  const sortedDirs = directoryInfos.sort((a, b) => b.size - a.size);
  const largestDir = sortedDirs[0];

  if (largestDir && largestDir.size > 1024 * 1024 * 1024) { // 大于1GB
    suggestions.push(`考虑清理 ${largestDir.path} 目录，当前大小: ${formatFileSize(largestDir.size)}`);
  }

  // 检查临时文件目录
  const tempDirs = directoryInfos.filter(dir =>
    dir.path.includes('temp') || dir.path.includes('tmp') || dir.path.includes('cache')
  );

  tempDirs.forEach(dir => {
    if (dir.size > 100 * 1024 * 1024) { // 大于100MB
      suggestions.push(`清理临时目录 ${dir.path}，当前大小: ${formatFileSize(dir.size)}`);
    }
  });

  return suggestions;
}
