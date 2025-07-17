/**
 * @fileoverview 存储管理器核心
 * @description 核心存储管理器类和主要功能
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

import type { BaseStorageProvider, UploadResult, HealthStatus, StorageStats } from '../base-storage-provider';
import { StorageProviderManager } from './storage-providers';
import { FailoverManager } from './failover-manager';
import { StorageStatsManager } from './storage-stats';
import type { 
  StorageManagerOptions, 
  UploadOptions, 
  ExtendedUploadResult, 
  UploadStats, 
  FailoverState 
} from './storage-types';

/**
 * 存储管理器
 * 统一管理多个存储提供商，支持故障转移和负载均衡
 */
export class StorageManager {
  private providerManager: StorageProviderManager;
  private failoverManager: FailoverManager;
  private statsManager: StorageStatsManager;
  private isInitialized = false;
  private options: StorageManagerOptions;

  constructor(options: StorageManagerOptions = {}) {
    this.options = {
      enableHealthCheck: true,
      healthCheckInterval: 5 * 60 * 1000, // 5分钟
      failoverThreshold: 3,
      blacklistDuration: 5 * 60 * 1000, // 5分钟
      ...options,
    };

    this.providerManager = new StorageProviderManager();
    this.failoverManager = new FailoverManager(this.providerManager);
    this.statsManager = new StorageStatsManager(this.providerManager);
  }

  /**
   * 初始化存储管理器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // 初始化存储提供商
      await this.providerManager.initializeProviders();

      // 启动健康检查
      if (this.options.enableHealthCheck) {
        this.statsManager.startHealthCheck(this.options.healthCheckInterval);
      }

      this.isInitialized = true;
      console.log('✅ Storage manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize storage manager:', error);
      throw error;
    }
  }

  /**
   * 带故障转移的上传
   */
  async uploadWithFallback(
    file: Buffer,
    filename: string,
    options?: UploadOptions
  ): Promise<ExtendedUploadResult> {
    if (!this.isInitialized) {
      throw new Error('Storage manager not initialized. Call initialize() first.');
    }

    const startTime = Date.now();

    try {
      const result = await this.failoverManager.uploadWithFallback(file, filename, options);

      // 更新统计信息
      this.statsManager.updateUploadStats(
        result.provider,
        result.success,
        file.length,
        result.uploadTime
      );

      return result;
    } catch (error) {
      // 更新失败统计
      this.statsManager.updateUploadStats(
        'unknown',
        false,
        file.length,
        Date.now() - startTime
      );

      throw error;
    }
  }

  /**
   * 直接使用指定提供商上传
   */
  async uploadWithProvider(
    providerName: string,
    file: Buffer,
    filename: string,
    options?: UploadOptions
  ): Promise<ExtendedUploadResult> {
    if (!this.isInitialized) {
      throw new Error('Storage manager not initialized. Call initialize() first.');
    }

    const provider = this.providerManager.getProvider(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    if (!this.providerManager.isProviderAvailable(providerName)) {
      throw new Error(`Provider ${providerName} is not available`);
    }

    const startTime = Date.now();

    try {
      const result = await provider.upload(file, filename, options);
      const uploadTime = Date.now() - startTime;

      // 更新统计信息
      this.statsManager.updateUploadStats(
        providerName,
        result.success,
        file.length,
        uploadTime
      );

      return {
        ...result,
        provider: providerName,
        uploadTime,
      };
    } catch (error) {
      // 更新失败统计
      this.statsManager.updateUploadStats(
        providerName,
        false,
        file.length,
        Date.now() - startTime
      );

      throw error;
    }
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck(): Promise<Record<string, HealthStatus>> {
    if (!this.isInitialized) {
      throw new Error('Storage manager not initialized. Call initialize() first.');
    }

    return await this.statsManager.performHealthCheck();
  }

  /**
   * 获取所有提供商的统计信息
   */
  async getAllStats(): Promise<Record<string, StorageStats>> {
    if (!this.isInitialized) {
      throw new Error('Storage manager not initialized. Call initialize() first.');
    }

    return await this.statsManager.getAllStorageStats();
  }

  /**
   * 获取上传统计
   */
  getUploadStats(): UploadStats {
    return this.statsManager.getUploadStats();
  }

  /**
   * 获取故障转移状态
   */
  getFailoverStates(): Record<string, FailoverState> {
    const states: Record<string, FailoverState> = {};
    const failoverStates = this.providerManager.getAllFailoverStates();
    
    for (const [name, state] of failoverStates) {
      states[name] = { ...state };
    }
    
    return states;
  }

  /**
   * 获取可用的提供商列表
   */
  getAvailableProviders(): string[] {
    return this.providerManager.getAvailableProviders();
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport() {
    return this.statsManager.getPerformanceReport();
  }

  /**
   * 获取统计摘要
   */
  getStatsSummary() {
    return this.statsManager.getStatsSummary();
  }

  /**
   * 获取故障转移报告
   */
  getFailoverReport() {
    return this.failoverManager.getFailoverReport();
  }

  /**
   * 手动切换主存储提供商
   */
  async switchPrimaryProvider(providerName: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Storage manager not initialized. Call initialize() first.');
    }

    return await this.failoverManager.switchPrimaryProvider(providerName);
  }

  /**
   * 重置提供商状态
   */
  resetProviderState(providerName: string): void {
    this.failoverManager.resetProviderState(providerName);
  }

  /**
   * 重置所有提供商状态
   */
  resetAllProviderStates(): void {
    this.failoverManager.resetAllProviderStates();
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.statsManager.resetStats();
  }

  /**
   * 获取提供商
   */
  getProvider(name: string): BaseStorageProvider | undefined {
    return this.providerManager.getProvider(name);
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.statsManager.destroy();
    this.providerManager.destroy();
    this.isInitialized = false;
    
    console.log('🧹 Storage manager destroyed');
  }
}
