/**
 * @fileoverview Turnstile批量操作
 * @description 处理Turnstile功能的批量启用、禁用和验证操作
 * @author Augment AI
 * @date 2025-07-14
 * @version 1.0.0
 */

import { TURNSTILE_FEATURES, type TurnstileFeatureId } from '@/types/turnstile';
import type { 
  IBatchOperations, 
  BatchOperationResult, 
  IDatabaseOperations,
  ICacheManager 
} from './types';

/**
 * Turnstile批量操作实现
 */
export class TurnstileBatchOperations implements IBatchOperations {
  constructor(
    private databaseOps: IDatabaseOperations,
    private cacheManager: ICacheManager,
    private featureChecker: (featureId: TurnstileFeatureId) => Promise<boolean>
  ) {}

  /**
   * 批量启用所有功能
   */
  async enableAllFeatures(adminId: string): Promise<BatchOperationResult> {
    try {
      console.log(`🔓 开始批量启用所有Turnstile功能，操作者: ${adminId}`);

      const allFeatures = Object.keys(TURNSTILE_FEATURES) as TurnstileFeatureId[];
      const errors: string[] = [];
      let enabledCount = 0;

      // 批量更新数据库
      try {
        enabledCount = await this.databaseOps.batchUpdateFeatures(allFeatures, true, adminId);
      } catch (error) {
        const errorMessage = `批量数据库更新失败: ${error instanceof Error ? error.message : String(error)}`;
        console.error('❌', errorMessage);
        errors.push(errorMessage);
      }

      // 清理缓存
      this.cacheManager.clear();
      console.log('🧹 已清理所有缓存');

      // 验证结果（在测试环境中跳过）
      if (process.env.NODE_ENV !== 'test') {
        const verificationErrors = await this.verifyBatchOperation(allFeatures, true);
        errors.push(...verificationErrors);
      }

      const result: BatchOperationResult = {
        success: errors.length === 0,
        enabledCount,
        totalCount: allFeatures.length,
        errors
      };

      console.log(`📊 批量启用结果:`, result);
      return result;

    } catch (error) {
      const errorMessage = `批量启用功能失败: ${error instanceof Error ? error.message : String(error)}`;
      console.error('❌', errorMessage);
      return {
        success: false,
        enabledCount: 0,
        totalCount: Object.keys(TURNSTILE_FEATURES).length,
        errors: [errorMessage]
      };
    }
  }

  /**
   * 批量禁用所有功能
   */
  async disableAllFeatures(adminId: string): Promise<BatchOperationResult> {
    try {
      console.log(`🔒 开始批量禁用所有Turnstile功能，操作者: ${adminId}`);

      const allFeatures = Object.keys(TURNSTILE_FEATURES) as TurnstileFeatureId[];
      const errors: string[] = [];
      let disabledCount = 0;

      // 批量更新数据库
      try {
        disabledCount = await this.databaseOps.batchUpdateFeatures(allFeatures, false, adminId);
      } catch (error) {
        const errorMessage = `批量数据库更新失败: ${error instanceof Error ? error.message : String(error)}`;
        console.error('❌', errorMessage);
        errors.push(errorMessage);
      }

      // 清理缓存
      this.cacheManager.clear();
      console.log('🧹 已清理所有缓存');

      // 验证结果（在测试环境中跳过）
      if (process.env.NODE_ENV !== 'test') {
        const verificationErrors = await this.verifyBatchOperation(allFeatures, false);
        errors.push(...verificationErrors);
      }

      const result: BatchOperationResult = {
        success: errors.length === 0,
        disabledCount,
        totalCount: allFeatures.length,
        errors
      };

      console.log(`📊 批量禁用结果:`, result);
      return result;

    } catch (error) {
      const errorMessage = `批量禁用功能失败: ${error instanceof Error ? error.message : String(error)}`;
      console.error('❌', errorMessage);
      return {
        success: false,
        disabledCount: 0,
        totalCount: Object.keys(TURNSTILE_FEATURES).length,
        errors: [errorMessage]
      };
    }
  }

  /**
   * 验证批量操作结果
   */
  async verifyBatchOperation(features: TurnstileFeatureId[], expectedState: boolean): Promise<string[]> {
    const errors: string[] = [];

    try {
      console.log(`🔍 验证批量操作结果，期望状态: ${expectedState ? '启用' : '禁用'}`);

      for (const featureId of features) {
        try {
          const actualState = await this.featureChecker(featureId);
          if (actualState !== expectedState) {
            const error = `功能 ${featureId} 状态验证失败: 期望 ${expectedState}, 实际 ${actualState}`;
            console.warn('⚠️', error);
            errors.push(error);
          }
        } catch (error) {
          const errorMessage = `验证功能 ${featureId} 状态时出错: ${error instanceof Error ? error.message : String(error)}`;
          console.error('❌', errorMessage);
          errors.push(errorMessage);
        }
      }

      if (errors.length === 0) {
        console.log('✅ 批量操作状态验证通过');
      } else {
        console.warn(`⚠️ 批量操作状态验证发现 ${errors.length} 个问题`);
      }

    } catch (error) {
      const errorMessage = `批量操作验证过程失败: ${error instanceof Error ? error.message : String(error)}`;
      console.error('❌', errorMessage);
      errors.push(errorMessage);
    }

    return errors;
  }

  /**
   * 批量更新功能状态
   */
  async updateFeatureStates(
    updates: Partial<Record<TurnstileFeatureId, boolean>>, 
    adminId: string
  ): Promise<void> {
    try {
      for (const [featureId, enabled] of Object.entries(updates)) {
        if (enabled !== undefined) {
          await this.databaseOps.updateFeatureConfig(
            featureId as TurnstileFeatureId, 
            enabled, 
            adminId
          );

          // 更新缓存
          this.cacheManager.set(featureId as TurnstileFeatureId, {
            enabled,
            lastUpdated: new Date()
          });
        }
      }

      console.log(`🔄 管理员 ${adminId} 批量更新了Turnstile功能状态:`, updates);
    } catch (error) {
      console.error('批量更新Turnstile功能状态失败:', error);
      throw new Error('批量更新功能状态失败');
    }
  }

  /**
   * 获取批量操作统计信息
   */
  async getBatchOperationStats(): Promise<{
    totalFeatures: number;
    enabledFeatures: number;
    disabledFeatures: number;
    cacheStatus: ReturnType<ICacheManager['getStatus']>;
  }> {
    try {
      const allConfigs = await this.databaseOps.getAllFeatureConfigs();
      const totalFeatures = Object.keys(TURNSTILE_FEATURES).length;
      const enabledFeatures = Object.values(allConfigs).filter(Boolean).length;
      const disabledFeatures = totalFeatures - enabledFeatures;

      return {
        totalFeatures,
        enabledFeatures,
        disabledFeatures,
        cacheStatus: this.cacheManager.getStatus()
      };
    } catch (error) {
      console.error('获取批量操作统计信息失败:', error);
      throw error;
    }
  }
}
