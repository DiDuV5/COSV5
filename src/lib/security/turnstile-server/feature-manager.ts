/**
 * @fileoverview Turnstile功能管理器
 * @description Turnstile功能管理的核心协调器，整合各个子模块
 * @author Augment AI
 * @date 2025-07-14
 * @version 1.0.0
 */

import type { TurnstileFeatureId } from '@/types/turnstile';
import { getServerConfig } from '../turnstile-env-config';
import { TurnstileCacheManager } from './cache-manager';
import { TurnstileDatabaseOperations } from './database-operations';
import { TurnstileFallbackHandler } from './fallback-handler';
import { TurnstileBatchOperations } from './batch-operations';
import type { 
  ICacheManager, 
  IDatabaseOperations, 
  IFallbackHandler, 
  IBatchOperations,
  BatchOperationResult,
  CacheStatus
} from './types';

/**
 * Turnstile功能管理器（服务端专用）
 */
export class TurnstileFeatureManager {
  private static instance: TurnstileFeatureManager;
  private initialized = false;

  // 子模块
  private cacheManager: ICacheManager;
  private databaseOps: IDatabaseOperations;
  private fallbackHandler: IFallbackHandler;
  private batchOps: IBatchOperations;

  private constructor() {
    // 初始化子模块
    this.cacheManager = new TurnstileCacheManager();
    this.databaseOps = new TurnstileDatabaseOperations();
    this.fallbackHandler = new TurnstileFallbackHandler();
    
    // 批量操作需要依赖其他模块
    this.batchOps = new TurnstileBatchOperations(
      this.databaseOps,
      this.cacheManager,
      this.isFeatureEnabled.bind(this)
    );
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): TurnstileFeatureManager {
    if (!TurnstileFeatureManager.instance) {
      TurnstileFeatureManager.instance = new TurnstileFeatureManager();
    }
    return TurnstileFeatureManager.instance;
  }

  /**
   * 检查是否已初始化
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 初始化功能状态
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.databaseOps.initializeFeatureConfigs();
      this.initialized = true;
      console.log('✅ Turnstile功能管理器初始化完成 - 所有功能默认禁用');
      console.log('💡 提示：可通过管理后台 /admin/settings (人机验证标签) 启用需要的验证功能');
    } catch (error) {
      console.error('❌ Turnstile功能管理器初始化失败:', error);
      throw new Error('Turnstile功能管理器初始化失败');
    }
  }

  /**
   * 确保已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * 检查功能是否启用（异步版本）
   */
  public async isFeatureEnabled(featureId: TurnstileFeatureId): Promise<boolean> {
    try {
      // 确保已初始化
      await this.ensureInitialized();

      const envConfig = getServerConfig();

      // 如果全局禁用，则所有功能都禁用
      if (!envConfig.enabled) {
        return false;
      }

      // 检查缓存
      const cached = this.cacheManager.get(featureId);
      if (cached) {
        return cached.enabled;
      }

      // 从数据库获取配置
      const config = await this.databaseOps.getFeatureConfig(featureId);
      const enabled = config?.enabled ?? false;

      // 更新缓存
      this.cacheManager.set(featureId, {
        enabled,
        lastUpdated: new Date()
      });

      return enabled;
    } catch (error) {
      console.error(`检查功能状态失败 ${featureId}:`, error);

      // 使用降级处理器
      return await this.fallbackHandler.handleDatabaseError(featureId, error as Error);
    }
  }

  /**
   * 启用功能
   */
  public async enableFeature(featureId: TurnstileFeatureId, adminId: string): Promise<void> {
    try {
      await this.ensureInitialized();
      await this.databaseOps.updateFeatureConfig(featureId, true, adminId);

      // 更新缓存
      this.cacheManager.set(featureId, {
        enabled: true,
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error(`启用Turnstile功能失败: ${featureId}`, error);
      throw new Error('启用功能失败');
    }
  }

  /**
   * 禁用功能
   */
  public async disableFeature(featureId: TurnstileFeatureId, adminId: string): Promise<void> {
    try {
      await this.ensureInitialized();
      await this.databaseOps.updateFeatureConfig(featureId, false, adminId);

      // 更新缓存
      this.cacheManager.set(featureId, {
        enabled: false,
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error(`禁用Turnstile功能失败: ${featureId}`, error);
      throw new Error('禁用功能失败');
    }
  }

  /**
   * 获取所有功能状态
   */
  public async getAllFeatureStates(): Promise<Record<TurnstileFeatureId, boolean>> {
    try {
      await this.ensureInitialized();
      return await this.databaseOps.getAllFeatureConfigs();
    } catch (error) {
      console.error('获取功能状态失败:', error);
      // 返回默认状态（全部禁用）
      const defaultStates: Record<string, boolean> = {};
      const { TURNSTILE_FEATURES } = await import('@/types/turnstile');
      for (const featureId of Object.keys(TURNSTILE_FEATURES) as TurnstileFeatureId[]) {
        defaultStates[featureId] = false;
      }
      return defaultStates as Record<TurnstileFeatureId, boolean>;
    }
  }

  /**
   * 批量更新功能状态
   */
  public async updateFeatureStates(
    updates: Partial<Record<TurnstileFeatureId, boolean>>, 
    adminId: string
  ): Promise<void> {
    await this.batchOps.updateFeatureStates(updates, adminId);
  }

  /**
   * 批量启用所有功能
   */
  public async enableAllFeatures(adminId: string): Promise<BatchOperationResult> {
    return await this.batchOps.enableAllFeatures(adminId);
  }

  /**
   * 批量禁用所有功能
   */
  public async disableAllFeatures(adminId: string): Promise<BatchOperationResult> {
    return await this.batchOps.disableAllFeatures(adminId);
  }

  /**
   * 清理过期缓存
   */
  public clearExpiredCache(): void {
    this.cacheManager.clearExpired();
  }

  /**
   * 清理所有缓存
   */
  public clearAllCache(): void {
    this.cacheManager.clear();
  }

  /**
   * 获取缓存状态
   */
  public getCacheStatus(): CacheStatus {
    return this.cacheManager.getStatus();
  }
}
