/**
 * @fileoverview Turnstile服务端类型定义
 * @description 定义Turnstile服务端模块的共享类型和接口
 * @author Augment AI
 * @date 2025-07-14
 * @version 1.0.0
 */

import type { TurnstileFeatureId } from '@/types/turnstile';

/**
 * 功能状态缓存条目
 */
export interface FeatureStatusCacheEntry {
  enabled: boolean;
  lastUpdated: Date;
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult {
  success: boolean;
  enabledCount?: number;
  disabledCount?: number;
  totalCount: number;
  errors: string[];
}

/**
 * 缓存状态信息
 */
export interface CacheStatus {
  size: number;
  entries: Array<{
    featureId: TurnstileFeatureId;
    enabled: boolean;
    lastUpdated: Date;
  }>;
}

/**
 * 缓存管理器接口
 */
export interface ICacheManager {
  get(featureId: TurnstileFeatureId): FeatureStatusCacheEntry | undefined;
  set(featureId: TurnstileFeatureId, entry: FeatureStatusCacheEntry): void;
  delete(featureId: TurnstileFeatureId): boolean;
  clear(): void;
  clearExpired(): void;
  getStatus(): CacheStatus;
}

/**
 * 数据库操作接口
 */
export interface IDatabaseOperations {
  getValidUserId(preferredUserId?: string): Promise<string>;
  initializeFeatureConfigs(): Promise<void>;
  getFeatureConfig(featureId: TurnstileFeatureId): Promise<{ enabled: boolean } | null>;
  updateFeatureConfig(featureId: TurnstileFeatureId, enabled: boolean, adminId: string): Promise<void>;
  getAllFeatureConfigs(): Promise<Record<TurnstileFeatureId, boolean>>;
  batchUpdateFeatures(features: TurnstileFeatureId[], enabled: boolean, adminId: string): Promise<number>;
}

/**
 * 降级处理器接口
 */
export interface IFallbackHandler {
  getFallbackFeatureStatus(featureId: TurnstileFeatureId): boolean;
  shouldUseFallback(): boolean;
  handleDatabaseError(featureId: TurnstileFeatureId, error: Error): Promise<boolean>;
}

/**
 * 批量操作接口
 */
export interface IBatchOperations {
  enableAllFeatures(adminId: string): Promise<BatchOperationResult>;
  disableAllFeatures(adminId: string): Promise<BatchOperationResult>;
  verifyBatchOperation(features: TurnstileFeatureId[], expectedState: boolean): Promise<string[]>;
  updateFeatureStates(updates: Partial<Record<TurnstileFeatureId, boolean>>, adminId: string): Promise<void>;
}
