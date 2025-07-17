/**
 * @fileoverview 审批配置管理器 - 重构版本
 * @description 提供审批配置的统一管理接口
 * @author Augment AI
 * @date 2025-07-03
 * @version 3.0.0 - 重构版（模块化架构）
 */

import { prisma } from '@/lib/prisma';

// 导入重构后的模块
import {
  ApprovalConfig,
  ConfigUpdateResult,
  ConfigValidationResult,
  ConfigInitializationResult,
  ConfigHealthCheck,
  CONFIG_VALIDATION_RULES,
  CONFIG_KEY_MAPPING,
  DEFAULT_APPROVAL_CONFIG
} from './types/config-types';

import { configCache } from './cache/config-cache';
import { ConfigValidator } from './validators/config-validator';
import { ConfigUpdater } from './handlers/config-updater';

/**
 * 审批配置管理器主类 - 重构版
 */
export class ApprovalConfigManager {
  private static instance: ApprovalConfigManager;

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): ApprovalConfigManager {
    if (!ApprovalConfigManager.instance) {
      ApprovalConfigManager.instance = new ApprovalConfigManager();
    }
    return ApprovalConfigManager.instance;
  }

  /**
   * 获取审批配置
   */
  static async getConfig(): Promise<ApprovalConfig> {
    const cacheKey = 'approval_config';

    // 尝试从缓存获取
    const cached = configCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      console.log('📖 从数据库加载审批配置');

      const config = { ...DEFAULT_APPROVAL_CONFIG };

      // 从CansSystemConfig表获取ADMIN级别的配置
      const adminConfig = await prisma.cansSystemConfig.findUnique({
        where: { userLevel: 'ADMIN' }
      });

      if (adminConfig) {
        // 映射数据库字段到配置对象
        // 注意：这里需要根据实际业务逻辑来映射字段
        // 目前使用默认配置，后续可以扩展映射逻辑
        config.registrationApprovalEnabled = adminConfig.isActive;
        config.notificationEnabled = true; // 默认启用通知
        config.autoApproveAdmin = false; // 默认不自动审批
        config.timeoutHours = 72; // 默认72小时
        config.autoRejectTimeout = false; // 默认不自动拒绝
        config.batchSizeLimit = 50; // 默认批量限制50
      }

      // 缓存配置
      configCache.set(cacheKey, config);

      console.log('✅ 审批配置加载完成');
      return config;

    } catch (error) {
      console.error('❌ 获取审批配置失败:', error);

      // 返回默认配置作为降级方案
      console.log('🔄 使用默认配置作为降级方案');
      return DEFAULT_APPROVAL_CONFIG;
    }
  }

  /**
   * 更新审批配置
   */
  static async updateConfig(
    updates: Partial<ApprovalConfig>,
    adminId: string
  ): Promise<ConfigUpdateResult> {
    try {
      console.log(`🔧 更新审批配置，管理员: ${adminId}`);

      // 验证管理员权限
      const hasPermission = await ConfigUpdater.validateAdminPermission(adminId);
      if (!hasPermission) {
        return {
          success: false,
          message: '权限不足，只有管理员可以更新配置'
        };
      }

      // 执行更新
      const result = await ConfigUpdater.updateConfig(updates, adminId);

      // 触发配置重新加载
      if (result.success) {
        await this.reloadConfig();
      }

      return result;

    } catch (error) {
      console.error('❌ 更新审批配置失败:', error);
      return {
        success: false,
        message: `更新配置失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 验证配置完整性
   */
  static async validateConfigIntegrity(): Promise<ConfigValidationResult> {
    try {
      return await ConfigValidator.validateConfigIntegrity();
    } catch (error) {
      console.error('❌ 验证配置完整性失败:', error);
      return {
        valid: false,
        missingKeys: [],
        invalidValues: [`验证失败: ${error instanceof Error ? error.message : '未知错误'}`]
      };
    }
  }

  /**
   * 初始化缺失的配置
   */
  static async initializeMissingConfigs(): Promise<ConfigInitializationResult> {
    try {
      const result = await ConfigUpdater.initializeMissingConfigs();

      // 重新加载配置
      if (result.success && result.initialized.length > 0) {
        await this.reloadConfig();
      }

      return result;

    } catch (error) {
      console.error('❌ 初始化配置失败:', error);
      return {
        success: false,
        initialized: [],
        errors: [error instanceof Error ? error.message : '未知错误']
      };
    }
  }

  /**
   * 重置配置为默认值
   */
  static async resetToDefaults(adminId: string): Promise<ConfigUpdateResult> {
    try {
      console.log(`🔄 重置配置为默认值，管理员: ${adminId}`);

      // 验证管理员权限
      const hasPermission = await ConfigUpdater.validateAdminPermission(adminId);
      if (!hasPermission) {
        return {
          success: false,
          message: '权限不足，只有管理员可以重置配置'
        };
      }

      const result = await ConfigUpdater.resetToDefaults(adminId);

      // 重新加载配置
      if (result.success) {
        await this.reloadConfig();
      }

      return result;

    } catch (error) {
      console.error('❌ 重置配置失败:', error);
      return {
        success: false,
        message: `重置配置失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 执行配置健康检查
   */
  static async performHealthCheck(): Promise<ConfigHealthCheck> {
    try {
      return await ConfigValidator.performHealthCheck();
    } catch (error) {
      console.error('❌ 配置健康检查失败:', error);
      return {
        healthy: false,
        issues: [{
          severity: 'critical',
          message: `健康检查失败: ${error instanceof Error ? error.message : '未知错误'}`,
          suggestion: '请检查数据库连接和配置表结构'
        }],
        lastCheck: new Date(),
        nextCheck: new Date(Date.now() + 60 * 60 * 1000) // 1小时后重试
      };
    }
  }

  /**
   * 重新加载配置
   */
  static async reloadConfig(): Promise<ApprovalConfig> {
    console.log('🔄 重新加载审批配置');

    // 清除缓存
    configCache.clear();

    // 重新获取配置
    return await this.getConfig();
  }

  /**
   * 获取配置统计信息
   */
  static async getConfigStatistics(): Promise<{
    totalConfigs: number;
    validConfigs: number;
    invalidConfigs: number;
    cacheStats: any;
    lastUpdate: Date | null;
  }> {
    try {
      const validation = await this.validateConfigIntegrity();
      const cacheStats = configCache.getStats();

      // 获取最后更新时间
      const lastConfigUpdate = await prisma.cansSystemConfig.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true }
      });

      return {
        totalConfigs: CONFIG_VALIDATION_RULES.length,
        validConfigs: CONFIG_VALIDATION_RULES.length - validation.missingKeys.length - validation.invalidValues.length,
        invalidConfigs: validation.missingKeys.length + validation.invalidValues.length,
        cacheStats,
        lastUpdate: lastConfigUpdate?.updatedAt || null
      };

    } catch (error) {
      console.error('❌ 获取配置统计失败:', error);
      return {
        totalConfigs: 0,
        validConfigs: 0,
        invalidConfigs: 0,
        cacheStats: {},
        lastUpdate: null
      };
    }
  }

  /**
   * 创建配置备份
   */
  static async createBackup(adminId: string, description?: string): Promise<string> {
    try {
      return await ConfigUpdater.createConfigBackup(adminId, description);
    } catch (error) {
      console.error('❌ 创建配置备份失败:', error);
      throw error;
    }
  }

  /**
   * 批量更新配置
   */
  static async batchUpdate(
    updates: Array<{ key: keyof ApprovalConfig; value: any }>,
    adminId: string
  ): Promise<ConfigUpdateResult> {
    try {
      return await ConfigUpdater.batchUpdateConfigs(updates, adminId);
    } catch (error) {
      console.error('❌ 批量更新配置失败:', error);
      return {
        success: false,
        message: `批量更新失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 获取配置变更历史
   */
  static async getConfigHistory(limit: number = 50): Promise<Array<{
    id: string;
    action: string;
    adminId: string | null;
    changes: any;
    timestamp: Date;
  }>> {
    try {
      const logs = await prisma.auditLog.findMany({
        where: {
          action: { in: ['CONFIG_UPDATED', 'CONFIG_RESET'] }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          action: true,
          userId: true,
          details: true,
          createdAt: true
        }
      });

      return logs.map(log => ({
        id: log.id,
        action: log.action,
        adminId: log.userId,
        changes: log.details ? JSON.parse(log.details) : {},
        timestamp: log.createdAt
      }));

    } catch (error) {
      console.error('❌ 获取配置历史失败:', error);
      return [];
    }
  }

  /**
   * 预热配置缓存
   */
  static async warmupCache(): Promise<void> {
    try {
      console.log('🔥 预热配置缓存');

      const config = await this.getConfig();
      configCache.set('approval_config', config);

      console.log('✅ 配置缓存预热完成');

    } catch (error) {
      console.error('❌ 配置缓存预热失败:', error);
    }
  }
}

/**
 * 配置热重载管理器 - 简化版
 */
export class ConfigHotReloadManager {
  private static watchers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * 启动配置监听
   */
  static startWatching(): void {
    console.log('👀 启动配置热重载监听');

    // 每30秒检查一次配置变更
    const watcher = setInterval(async () => {
      try {
        await ApprovalConfigManager.reloadConfig();
      } catch (error) {
        console.error('配置热重载失败:', error);
      }
    }, 30000);

    this.watchers.set('config_watcher', watcher);
  }

  /**
   * 停止配置监听
   */
  static stopWatching(): void {
    console.log('🛑 停止配置热重载监听');

    this.watchers.forEach((watcher) => {
      clearInterval(watcher);
    });

    this.watchers.clear();
  }

  /**
   * 获取监听状态
   */
  static getWatchingStatus(): {
    isWatching: boolean;
    watcherCount: number;
  } {
    return {
      isWatching: this.watchers.size > 0,
      watcherCount: this.watchers.size
    };
  }
}

// 导出单例实例
export const approvalConfigManager = ApprovalConfigManager.getInstance();
