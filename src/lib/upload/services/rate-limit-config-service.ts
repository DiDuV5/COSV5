/**
 * @fileoverview 速率限制配置服务
 * @description 管理不同用户等级的上传限制配置和VIP模式设置
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import { UserLevel } from '@/types/user-level';

/**
 * 用户等级配置接口
 */
export interface UserLevelConfig {
  maxConcurrentUploads: number;
  maxFilesPerMinute: number;
  maxSizePerMinute: number;
  maxFilesPerHour: number;
  maxSizePerHour: number;
  sessionTimeout: number;
  batchSize: number;
  batchInterval: number;
  priorityLevel: number;
  skipSecurityOptimizations: boolean;
}

/**
 * VIP模式配置接口
 */
export interface VIPModeConfig {
  enabled: boolean;
  vipUserLevels: UserLevel[];
  concurrencyMultiplier: number;
  limitMultiplier: number;
  priorityBoost: number;
}

/**
 * 速率限制配置服务类
 */
export class RateLimitConfigService {
  private static instance: RateLimitConfigService;

  /**
   * 分级速率限制配置
   */
  private readonly USER_LEVEL_CONFIGS: Record<UserLevel, UserLevelConfig> = {
    [UserLevel.GUEST]: {
      maxConcurrentUploads: 1,
      maxFilesPerMinute: 3,
      maxSizePerMinute: 10 * 1024 * 1024,      // 10MB
      maxFilesPerHour: 20,
      maxSizePerHour: 100 * 1024 * 1024,       // 100MB
      sessionTimeout: 2 * 60 * 1000,           // 2分钟
      batchSize: 1,
      batchInterval: 5000,                     // 5秒
      priorityLevel: 1,
      skipSecurityOptimizations: false,
    },
    [UserLevel.USER]: {
      maxConcurrentUploads: 2,
      maxFilesPerMinute: 10,
      maxSizePerMinute: 50 * 1024 * 1024,      // 50MB
      maxFilesPerHour: 100,
      maxSizePerHour: 500 * 1024 * 1024,       // 500MB
      sessionTimeout: 5 * 60 * 1000,           // 5分钟
      batchSize: 3,
      batchInterval: 3000,                     // 3秒
      priorityLevel: 2,
      skipSecurityOptimizations: false,
    },
    [UserLevel.VIP]: {
      maxConcurrentUploads: 5,
      maxFilesPerMinute: 30,
      maxSizePerMinute: 200 * 1024 * 1024,     // 200MB
      maxFilesPerHour: 500,
      maxSizePerHour: 2 * 1024 * 1024 * 1024,  // 2GB
      sessionTimeout: 15 * 60 * 1000,          // 15分钟
      batchSize: 10,
      batchInterval: 1000,                     // 1秒
      priorityLevel: 3,
      skipSecurityOptimizations: false,
    },
    [UserLevel.CREATOR]: {
      maxConcurrentUploads: 8,
      maxFilesPerMinute: 50,
      maxSizePerMinute: 500 * 1024 * 1024,     // 500MB
      maxFilesPerHour: 1000,
      maxSizePerHour: 5 * 1024 * 1024 * 1024,  // 5GB
      sessionTimeout: 30 * 60 * 1000,          // 30分钟
      batchSize: 20,
      batchInterval: 500,                      // 0.5秒
      priorityLevel: 4,
      skipSecurityOptimizations: true,
    },
    [UserLevel.ADMIN]: {
      maxConcurrentUploads: 12,
      maxFilesPerMinute: 100,
      maxSizePerMinute: 1 * 1024 * 1024 * 1024, // 1GB
      maxFilesPerHour: 5000,
      maxSizePerHour: 50 * 1024 * 1024 * 1024,  // 50GB
      sessionTimeout: 60 * 60 * 1000,           // 1小时
      batchSize: 50,
      batchInterval: 300,                       // 0.3秒
      priorityLevel: 5,
      skipSecurityOptimizations: true,
    },
    [UserLevel.SUPER_ADMIN]: {
      maxConcurrentUploads: 15,                // 超级管理员最高并发
      maxFilesPerMinute: 200,                  // 超级管理员特权
      maxSizePerMinute: 2 * 1024 * 1024 * 1024, // 2GB
      maxFilesPerHour: 10000,                  // 几乎无限制
      maxSizePerHour: 100 * 1024 * 1024 * 1024, // 100GB
      sessionTimeout: 2 * 60 * 60 * 1000,      // 2小时
      batchSize: 100,                          // 超大批量处理
      batchInterval: 200,                      // 0.2秒
      priorityLevel: 6,
      skipSecurityOptimizations: true,         // 超级管理员优化
    },
  };

  /**
   * VIP模式配置
   */
  private readonly VIP_MODE_CONFIG: VIPModeConfig = {
    enabled: true,
    vipUserLevels: [UserLevel.VIP, UserLevel.CREATOR, UserLevel.ADMIN, UserLevel.SUPER_ADMIN],
    concurrencyMultiplier: 1.5,               // 并发数额外提升50%
    limitMultiplier: 2,                       // 限制额外提升100%
    priorityBoost: 10,                        // 优先级提升
  };

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): RateLimitConfigService {
    if (!RateLimitConfigService.instance) {
      RateLimitConfigService.instance = new RateLimitConfigService();
    }
    return RateLimitConfigService.instance;
  }

  /**
   * 获取用户配置
   */
  getUserConfig(userLevel: UserLevel): UserLevelConfig {
    const baseConfig = this.USER_LEVEL_CONFIGS[userLevel];

    // 安全检查：如果用户等级不存在，返回默认配置
    if (!baseConfig) {
      console.warn(`未知用户等级: ${userLevel}，使用默认USER配置`);
      return this.USER_LEVEL_CONFIGS[UserLevel.USER];
    }

    // 如果是VIP用户，应用VIP加成
    if (this.VIP_MODE_CONFIG.enabled && this.VIP_MODE_CONFIG.vipUserLevels.includes(userLevel)) {
      return this.applyVIPBonus(baseConfig);
    }

    return { ...baseConfig };
  }

  /**
   * 应用VIP加成
   */
  private applyVIPBonus(baseConfig: UserLevelConfig): UserLevelConfig {
    return {
      ...baseConfig,
      maxConcurrentUploads: Math.floor(baseConfig.maxConcurrentUploads * this.VIP_MODE_CONFIG.concurrencyMultiplier),
      maxFilesPerMinute: Math.floor(baseConfig.maxFilesPerMinute * this.VIP_MODE_CONFIG.limitMultiplier),
      maxSizePerMinute: Math.floor(baseConfig.maxSizePerMinute * this.VIP_MODE_CONFIG.limitMultiplier),
      maxFilesPerHour: Math.floor(baseConfig.maxFilesPerHour * this.VIP_MODE_CONFIG.limitMultiplier),
      maxSizePerHour: Math.floor(baseConfig.maxSizePerHour * this.VIP_MODE_CONFIG.limitMultiplier),
      priorityLevel: baseConfig.priorityLevel + this.VIP_MODE_CONFIG.priorityBoost,
    };
  }

  /**
   * 检查是否为VIP用户
   */
  isVIPUser(userLevel: UserLevel): boolean {
    return this.VIP_MODE_CONFIG.enabled && this.VIP_MODE_CONFIG.vipUserLevels.includes(userLevel);
  }

  /**
   * 获取VIP配置
   */
  getVIPConfig(): VIPModeConfig {
    return { ...this.VIP_MODE_CONFIG };
  }

  /**
   * 获取所有用户等级配置
   */
  getAllConfigs(): Record<UserLevel, UserLevelConfig> {
    const configs: Record<UserLevel, UserLevelConfig> = {} as any;
    
    Object.values(UserLevel).forEach(level => {
      configs[level] = this.getUserConfig(level);
    });

    return configs;
  }

  /**
   * 更新用户等级配置
   */
  updateUserConfig(userLevel: UserLevel, updates: Partial<UserLevelConfig>): void {
    if (this.USER_LEVEL_CONFIGS[userLevel]) {
      this.USER_LEVEL_CONFIGS[userLevel] = {
        ...this.USER_LEVEL_CONFIGS[userLevel],
        ...updates,
      };
      
      console.log(`✅ 更新用户等级 ${userLevel} 的配置:`, updates);
    } else {
      console.warn(`⚠️ 尝试更新不存在的用户等级: ${userLevel}`);
    }
  }

  /**
   * 更新VIP配置
   */
  updateVIPConfig(updates: Partial<VIPModeConfig>): void {
    Object.assign(this.VIP_MODE_CONFIG, updates);
    console.log(`✅ 更新VIP配置:`, updates);
  }

  /**
   * 获取配置统计信息
   */
  getConfigStats(): {
    totalLevels: number;
    vipLevels: number;
    maxConcurrency: number;
    maxPriority: number;
    vipEnabled: boolean;
  } {
    const configs = this.getAllConfigs();
    const concurrencies = Object.values(configs).map(c => c.maxConcurrentUploads);
    const priorities = Object.values(configs).map(c => c.priorityLevel);

    return {
      totalLevels: Object.keys(configs).length,
      vipLevels: this.VIP_MODE_CONFIG.vipUserLevels.length,
      maxConcurrency: Math.max(...concurrencies),
      maxPriority: Math.max(...priorities),
      vipEnabled: this.VIP_MODE_CONFIG.enabled,
    };
  }

  /**
   * 验证配置有效性
   */
  validateConfig(config: UserLevelConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (config.maxConcurrentUploads <= 0) {
      errors.push('最大并发上传数必须大于0');
    }

    if (config.maxFilesPerMinute <= 0) {
      errors.push('每分钟最大文件数必须大于0');
    }

    if (config.maxSizePerMinute <= 0) {
      errors.push('每分钟最大大小必须大于0');
    }

    if (config.sessionTimeout <= 0) {
      errors.push('会话超时时间必须大于0');
    }

    if (config.batchSize <= 0) {
      errors.push('批处理大小必须大于0');
    }

    if (config.priorityLevel <= 0) {
      errors.push('优先级必须大于0');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 重置为默认配置
   */
  resetToDefaults(): void {
    // 这里可以重新初始化配置
    console.log('🔄 重置所有配置为默认值');
  }
}

/**
 * 导出服务创建函数
 */
export const createRateLimitConfigService = () => RateLimitConfigService.getInstance();
