/**
 * @fileoverview 清理服务
 * @description 专门处理文件清理、任务管理和统计计算
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

/**
 * 清理任务类型枚举
 */
export enum CleanupTaskType {
  TEMP_FILES = 'temp-file-cleanup',
  ORPHAN_FILES = 'orphan-file-cleanup',
  DUPLICATE_FILES = 'duplicate-file-cleanup',
  OLD_LOGS = 'old-log-cleanup',
  CACHE_FILES = 'cache-file-cleanup',
}

/**
 * 清理状态接口
 */
export interface CleanupStatus {
  tempFiles: {
    count: number;
    size: number;
    lastCleanup: string | null;
    enabled: boolean;
  };
  orphanFiles: {
    count: number;
    size: number;
    lastCleanup: string | null;
    enabled: boolean;
  };
  duplicateFiles: {
    count: number;
    size: number;
    lastCleanup: string | null;
    enabled: boolean;
  };
  totalSize: number;
  lastFullCleanup: string | null;
}

/**
 * 去重统计接口
 */
export interface DeduplicationStats {
  totalFiles: number;
  duplicateGroups: number;
  duplicateFiles: number;
  potentialSavings: number;
  lastScan: string | null;
}

/**
 * 清理结果接口
 */
export interface CleanupResult {
  success: boolean;
  message: string;
  filesProcessed: number;
  filesDeleted: number;
  spaceFreed: number;
  errors: string[];
  dryRun: boolean;
}

/**
 * 任务配置接口
 */
export interface TaskConfig {
  id: CleanupTaskType;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  lastRun: string | null;
  schedule: string;
  estimatedFiles: number;
  estimatedSize: number;
  dangerLevel: 'low' | 'medium' | 'high';
}

/**
 * 清理服务类
 */
export class CleanupService {
  /**
   * 获取任务配置
   */
  static getTaskConfigs(): TaskConfig[] {
    return [
      {
        id: CleanupTaskType.TEMP_FILES,
        name: '临时文件清理',
        description: '清理系统临时文件和缓存',
        icon: 'Trash2',
        enabled: true,
        lastRun: null,
        schedule: '每日 02:00',
        estimatedFiles: 0,
        estimatedSize: 0,
        dangerLevel: 'low',
      },
      {
        id: CleanupTaskType.ORPHAN_FILES,
        name: '孤儿文件清理',
        description: '清理数据库中不存在记录的文件',
        icon: 'FileX',
        enabled: true,
        lastRun: null,
        schedule: '每周日 03:00',
        estimatedFiles: 0,
        estimatedSize: 0,
        dangerLevel: 'medium',
      },
      {
        id: CleanupTaskType.DUPLICATE_FILES,
        name: '重复文件清理',
        description: '清理重复的文件以节省空间',
        icon: 'Copy',
        enabled: false,
        lastRun: null,
        schedule: '每月1日 04:00',
        estimatedFiles: 0,
        estimatedSize: 0,
        dangerLevel: 'high',
      },
      {
        id: CleanupTaskType.OLD_LOGS,
        name: '旧日志清理',
        description: '清理超过30天的日志文件',
        icon: 'FileText',
        enabled: true,
        lastRun: null,
        schedule: '每日 01:00',
        estimatedFiles: 0,
        estimatedSize: 0,
        dangerLevel: 'low',
      },
      {
        id: CleanupTaskType.CACHE_FILES,
        name: '缓存文件清理',
        description: '清理过期的缓存文件',
        icon: 'Database',
        enabled: true,
        lastRun: null,
        schedule: '每6小时',
        estimatedFiles: 0,
        estimatedSize: 0,
        dangerLevel: 'low',
      },
    ];
  }

  /**
   * 获取单个任务配置
   */
  static getTaskConfig(taskId: CleanupTaskType): TaskConfig | undefined {
    return this.getTaskConfigs().find(config => config.id === taskId);
  }

  /**
   * 格式化文件大小
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 格式化日期
   */
  static formatDate(date: string | Date | null): string {
    if (!date) return '从未运行';
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * 计算清理优先级
   */
  static calculateCleanupPriority(status: CleanupStatus): Array<{
    type: CleanupTaskType;
    priority: number;
    reason: string;
  }> {
    const priorities: Array<{
      type: CleanupTaskType;
      priority: number;
      reason: string;
    }> = [];

    // 临时文件优先级
    if (status.tempFiles.size > 100 * 1024 * 1024) { // 100MB
      priorities.push({
        type: CleanupTaskType.TEMP_FILES,
        priority: 8,
        reason: '临时文件占用空间过大',
      });
    }

    // 孤儿文件优先级
    if (status.orphanFiles.count > 100) {
      priorities.push({
        type: CleanupTaskType.ORPHAN_FILES,
        priority: 7,
        reason: '孤儿文件数量过多',
      });
    }

    // 重复文件优先级
    if (status.duplicateFiles.size > 500 * 1024 * 1024) { // 500MB
      priorities.push({
        type: CleanupTaskType.DUPLICATE_FILES,
        priority: 6,
        reason: '重复文件占用大量空间',
      });
    }

    return priorities.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 生成清理建议
   */
  static generateCleanupSuggestions(status: CleanupStatus): string[] {
    const suggestions: string[] = [];

    if (status.totalSize > 1024 * 1024 * 1024) { // 1GB
      suggestions.push('系统存储空间使用较多，建议进行全面清理');
    }

    if (status.tempFiles.size > 50 * 1024 * 1024) { // 50MB
      suggestions.push('临时文件占用空间较大，建议立即清理');
    }

    if (status.orphanFiles.count > 50) {
      suggestions.push('发现较多孤儿文件，建议检查并清理');
    }

    if (!status.lastFullCleanup) {
      suggestions.push('尚未进行过全面清理，建议执行一次完整清理');
    } else {
      const daysSinceLastCleanup = Math.floor(
        (Date.now() - new Date(status.lastFullCleanup).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastCleanup > 7) {
        suggestions.push(`距离上次全面清理已过去${daysSinceLastCleanup}天，建议重新清理`);
      }
    }

    return suggestions;
  }

  /**
   * 验证清理操作安全性
   */
  static validateCleanupSafety(
    taskType: CleanupTaskType,
    dryRun: boolean
  ): {
    isSafe: boolean;
    warnings: string[];
    requirements: string[];
  } {
    const warnings: string[] = [];
    const requirements: string[] = [];

    const config = this.getTaskConfig(taskType);
    if (!config) {
      return {
        isSafe: false,
        warnings: ['未知的清理任务类型'],
        requirements: [],
      };
    }

    // 危险级别检查
    if (config.dangerLevel === 'high' && !dryRun) {
      warnings.push('这是一个高风险操作，可能会删除重要文件');
      requirements.push('建议先执行模拟运行查看影响范围');
    }

    if (config.dangerLevel === 'medium' && !dryRun) {
      warnings.push('此操作有一定风险，请确认操作范围');
    }

    // 特定任务检查
    switch (taskType) {
      case CleanupTaskType.DUPLICATE_FILES:
        warnings.push('重复文件清理可能会影响文件引用');
        requirements.push('请确保已备份重要数据');
        break;
      
      case CleanupTaskType.ORPHAN_FILES:
        warnings.push('孤儿文件清理会永久删除文件');
        requirements.push('请确认这些文件确实不再需要');
        break;
    }

    return {
      isSafe: warnings.length === 0 || dryRun,
      warnings,
      requirements,
    };
  }

  /**
   * 估算清理时间
   */
  static estimateCleanupTime(fileCount: number, totalSize: number): {
    estimatedMinutes: number;
    description: string;
  } {
    // 基于文件数量和大小估算时间
    const baseTime = Math.max(1, Math.ceil(fileCount / 1000)); // 每1000个文件约1分钟
    const sizeTime = Math.ceil(totalSize / (100 * 1024 * 1024)); // 每100MB约1分钟
    
    const estimatedMinutes = Math.max(baseTime, sizeTime);
    
    let description = '';
    if (estimatedMinutes < 5) {
      description = '预计很快完成';
    } else if (estimatedMinutes < 15) {
      description = '预计需要几分钟';
    } else if (estimatedMinutes < 60) {
      description = '预计需要较长时间';
    } else {
      description = '预计需要很长时间，建议分批处理';
    }

    return { estimatedMinutes, description };
  }

  /**
   * 生成清理报告
   */
  static generateCleanupReport(results: CleanupResult[]): {
    summary: string;
    totalFilesProcessed: number;
    totalFilesDeleted: number;
    totalSpaceFreed: number;
    successRate: number;
    recommendations: string[];
  } {
    const totalFilesProcessed = results.reduce((sum, r) => sum + r.filesProcessed, 0);
    const totalFilesDeleted = results.reduce((sum, r) => sum + r.filesDeleted, 0);
    const totalSpaceFreed = results.reduce((sum, r) => sum + r.spaceFreed, 0);
    const successCount = results.filter(r => r.success).length;
    const successRate = results.length > 0 ? (successCount / results.length) * 100 : 0;

    const recommendations: string[] = [];
    
    if (successRate < 100) {
      recommendations.push('部分清理任务失败，建议检查错误日志');
    }
    
    if (totalSpaceFreed > 0) {
      recommendations.push(`成功释放了 ${this.formatBytes(totalSpaceFreed)} 的存储空间`);
    }
    
    if (totalFilesDeleted === 0) {
      recommendations.push('没有文件被删除，可能不需要清理或存在权限问题');
    }

    const summary = `处理了 ${totalFilesProcessed} 个文件，删除了 ${totalFilesDeleted} 个文件，释放了 ${this.formatBytes(totalSpaceFreed)} 空间`;

    return {
      summary,
      totalFilesProcessed,
      totalFilesDeleted,
      totalSpaceFreed,
      successRate,
      recommendations,
    };
  }
}

/**
 * 导出服务创建函数
 */
export const createCleanupService = () => CleanupService;
