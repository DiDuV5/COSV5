/**
 * @fileoverview 权限缓存管理模块
 * @description 管理权限配置和用户信息缓存
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { UserLevel } from '@/types/user-level';
import { prisma } from '@/lib/prisma';
import {
  type CacheItem,
  type UserPermissionConfig,
  type UserInfo,
  type CacheStats,
  type CacheConfig,
  DEFAULT_PERMISSION_CONFIG,
} from './types';


/**
 * 权限缓存管理器
 */
export class PermissionCacheManager {
  private permissionConfigCache = new Map<string, CacheItem<UserPermissionConfig>>();
  private userPermissionCache = new Map<string, CacheItem<UserInfo>>();
  private config: CacheConfig;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config?: CacheConfig) {
    this.config = config || {
      permissionConfigTTL: 5 * 60 * 1000, // 5分钟
      userPermissionTTL: 2 * 60 * 1000, // 2分钟
      cleanupInterval: 60000, // 1分钟
      enabled: true,
    };

    if (this.config.enabled) {
      this.startCleanupTask();
    }
  }

  /**
   * 获取用户权限配置（带缓存）
   */
  async getUserPermissionConfig(userLevel: UserLevel): Promise<UserPermissionConfig | null> {
    if (!this.config.enabled) {
      return await this.fetchUserPermissionConfig(userLevel);
    }

    const cacheKey = `permission_${userLevel}`;
    const cached = this.permissionConfigCache.get(cacheKey);

    if (cached && this.isCacheValid(cached, this.config.permissionConfigTTL)) {
      return cached.data;
    }

    const config = await this.fetchUserPermissionConfig(userLevel);

    if (config) {
      this.permissionConfigCache.set(cacheKey, {
        data: config,
        timestamp: Date.now(),
      });
    }

    return config;
  }

  /**
   * 获取用户完整信息（带缓存）
   */
  async getCachedUserInfo(userId: string, db: any): Promise<UserInfo | null> {
    if (!this.config.enabled) {
      return await this.fetchUserInfo(userId, db);
    }

    const cacheKey = `user_${userId}`;
    const cached = this.userPermissionCache.get(cacheKey);

    if (cached && this.isCacheValid(cached, this.config.userPermissionTTL)) {
      return cached.data;
    }

    const user = await this.fetchUserInfo(userId, db);

    if (user) {
      this.userPermissionCache.set(cacheKey, {
        data: user,
        timestamp: Date.now(),
      });
    }

    return user;
  }

  /**
   * 从数据库获取用户权限配置
   */
  private async fetchUserPermissionConfig(userLevel: UserLevel): Promise<UserPermissionConfig | null> {
    try {
      const config = await prisma.userPermissionConfig.findUnique({
        where: { userLevel },
      });

      return config as UserPermissionConfig | null;
    } catch (error) {
      console.error('获取用户权限配置失败:', error);
      return null;
    }
  }

  /**
   * 从数据库获取用户信息
   */
  private async fetchUserInfo(userId: string, db: any): Promise<UserInfo | null> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          userLevel: true,
          isVerified: true,
          canPublish: true,
          isActive: true,
          approvalStatus: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });

      return user as UserInfo | null;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid<T>(cached: CacheItem<T>, ttl: number): boolean {
    return Date.now() - cached.timestamp < ttl;
  }

  /**
   * 清除用户相关缓存
   */
  clearUserCache(userId: string): void {
    const userCacheKey = `user_${userId}`;
    this.userPermissionCache.delete(userCacheKey);
  }

  /**
   * 清除权限配置缓存
   */
  clearPermissionConfigCache(userLevel?: UserLevel): void {
    if (userLevel) {
      const configCacheKey = `permission_${userLevel}`;
      this.permissionConfigCache.delete(configCacheKey);
    } else {
      this.permissionConfigCache.clear();
    }
  }

  /**
   * 清除所有缓存
   */
  clearAllCache(): void {
    this.permissionConfigCache.clear();
    this.userPermissionCache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): CacheStats {
    return {
      permissionConfigCacheSize: this.permissionConfigCache.size,
      userPermissionCacheSize: this.userPermissionCache.size,
      auditLogBufferSize: 0, // 这个在audit-logger中管理
    };
  }

  /**
   * 清理过期的缓存
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();

    // 清理权限配置缓存
    for (const [key, value] of this.permissionConfigCache.entries()) {
      if (!this.isCacheValid(value, this.config.permissionConfigTTL)) {
        this.permissionConfigCache.delete(key);
      }
    }

    // 清理用户权限缓存
    for (const [key, value] of this.userPermissionCache.entries()) {
      if (!this.isCacheValid(value, this.config.userPermissionTTL)) {
        this.userPermissionCache.delete(key);
      }
    }
  }

  /**
   * 启动定期清理任务
   */
  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredCache();
    }, this.config.cleanupInterval);
  }

  /**
   * 停止清理任务
   */
  stopCleanupTask(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * 更新缓存配置
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (this.config.enabled && !this.cleanupInterval) {
      this.startCleanupTask();
    } else if (!this.config.enabled && this.cleanupInterval) {
      this.stopCleanupTask();
    }
  }

  /**
   * 预热缓存
   */
  async warmupCache(userLevels: UserLevel[] = ['GUEST', 'USER', 'VIP', 'CREATOR', 'ADMIN', 'SUPER_ADMIN']): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      // 预热权限配置缓存
      const promises = userLevels.map(level => this.getUserPermissionConfig(level));
      await Promise.all(promises);

      console.log(`权限配置缓存预热完成，加载了 ${userLevels.length} 个用户等级的配置`);
    } catch (error) {
      console.error('权限配置缓存预热失败:', error);
    }
  }

  /**
   * 获取缓存命中率统计
   */
  getCacheHitRateStats(): { permissionConfigHitRate: number; userPermissionHitRate: number } {
    // 这里可以添加命中率统计逻辑
    // 需要在每次缓存访问时记录命中和未命中次数
    return {
      permissionConfigHitRate: 0, // 实际实现中需要统计
      userPermissionHitRate: 0,   // 实际实现中需要统计
    };
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    this.stopCleanupTask();
    this.clearAllCache();
  }
}

// 创建默认的缓存管理器实例
export const permissionCacheManager = new PermissionCacheManager();

/**
 * 兼容性函数 - 保持向后兼容
 */
export function clearUserCache(userId: string): void {
  permissionCacheManager.clearUserCache(userId);
}

export function clearPermissionConfigCache(userLevel?: UserLevel): void {
  permissionCacheManager.clearPermissionConfigCache(userLevel);
}

export function getCacheStats(): CacheStats {
  return permissionCacheManager.getCacheStats();
}

/**
 * 获取用户权限配置（兼容性函数）
 */
export async function getUserPermissionConfig(userLevel: UserLevel): Promise<UserPermissionConfig | null> {
  return permissionCacheManager.getUserPermissionConfig(userLevel);
}

/**
 * 获取用户完整信息（兼容性函数）
 */
export async function getCachedUserInfo(userId: string, db: any): Promise<UserInfo | null> {
  return permissionCacheManager.getCachedUserInfo(userId, db);
}
