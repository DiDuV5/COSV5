/**
 * @fileoverview Turnstile数据库操作
 * @description 处理Turnstile功能配置的数据库CRUD操作
 * @author Augment AI
 * @date 2025-07-14
 * @version 1.0.0
 */

import { TURNSTILE_FEATURES, type TurnstileFeatureId } from '@/types/turnstile';
import { prisma } from '@/lib/prisma';
import type { IDatabaseOperations } from './types';

/**
 * Turnstile数据库操作实现
 */
export class TurnstileDatabaseOperations implements IDatabaseOperations {
  /**
   * 获取有效的用户ID（用于外键约束）
   */
  async getValidUserId(preferredUserId?: string): Promise<string> {
    try {
      // 如果提供了用户ID，先验证是否存在
      if (preferredUserId) {
        const user = await prisma.user.findUnique({
          where: { id: preferredUserId }
        });
        if (user) {
          return user.id;
        }
      }

      // 尝试找到管理员用户
      const adminUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: 'douyu' },
            { userLevel: 'SUPER_ADMIN' },
            { userLevel: 'ADMIN' }
          ]
        }
      });

      if (adminUser) {
        return adminUser.id;
      }

      // 如果没有管理员，创建系统用户
      const systemUser = await prisma.user.create({
        data: {
          username: 'system-turnstile',
          displayName: 'Turnstile System',
          userLevel: 'SUPER_ADMIN',
          isVerified: true,
          isActive: true,
          canPublish: true,
        }
      });

      return systemUser.id;
    } catch (error) {
      console.error('获取有效用户ID失败:', error);
      throw new Error('无法获取有效的用户ID');
    }
  }

  /**
   * 初始化功能配置记录
   */
  async initializeFeatureConfigs(): Promise<void> {
    try {
      // 获取系统用户ID
      let systemUserId: string;

      try {
        // 尝试找到管理员用户
        const adminUser = await prisma.user.findFirst({
          where: {
            OR: [
              { username: 'douyu' },
              { userLevel: 'SUPER_ADMIN' },
              { userLevel: 'ADMIN' }
            ]
          }
        });

        if (adminUser) {
          systemUserId = adminUser.id;
        } else {
          // 创建系统用户
          const systemUser = await prisma.user.create({
            data: {
              username: 'system',
              displayName: 'System',
              userLevel: 'SUPER_ADMIN',
              isVerified: true,
              isActive: true,
              canPublish: true,
            }
          });
          systemUserId = systemUser.id;
        }
      } catch (error) {
        console.error('获取系统用户失败:', error);
        throw new Error('无法初始化系统用户');
      }

      // 为所有功能创建配置记录
      for (const featureId of Object.keys(TURNSTILE_FEATURES) as TurnstileFeatureId[]) {
        await prisma.turnstileConfig.upsert({
          where: { featureId },
          update: {}, // 不更新现有记录
          create: {
            featureId,
            enabled: false, // 默认禁用
            updatedBy: systemUserId,
          },
        });
      }

      console.log('✅ Turnstile功能配置初始化完成 - 所有功能默认禁用');
    } catch (error) {
      console.error('❌ Turnstile功能配置初始化失败:', error);
      throw new Error('Turnstile功能配置初始化失败');
    }
  }

  /**
   * 获取单个功能配置
   */
  async getFeatureConfig(featureId: TurnstileFeatureId): Promise<{ enabled: boolean } | null> {
    try {
      const config = await prisma.turnstileConfig.findUnique({
        where: { featureId },
        select: { enabled: true }
      });

      return config;
    } catch (error) {
      console.error(`获取功能配置失败 ${featureId}:`, error);
      throw error;
    }
  }

  /**
   * 更新单个功能配置
   */
  async updateFeatureConfig(
    featureId: TurnstileFeatureId, 
    enabled: boolean, 
    adminId: string
  ): Promise<void> {
    try {
      const validUserId = await this.getValidUserId(adminId);

      await prisma.turnstileConfig.upsert({
        where: { featureId },
        update: {
          enabled,
          updatedBy: validUserId,
        },
        create: {
          featureId,
          enabled,
          updatedBy: validUserId,
        },
      });

      console.log(`${enabled ? '🔓' : '🔒'} 管理员 ${adminId} ${enabled ? '启用' : '禁用'}了Turnstile功能: ${featureId}`);
    } catch (error) {
      console.error(`更新Turnstile功能配置失败: ${featureId}`, error);
      throw new Error('更新功能配置失败');
    }
  }

  /**
   * 获取所有功能配置
   */
  async getAllFeatureConfigs(): Promise<Record<TurnstileFeatureId, boolean>> {
    try {
      const configs = await prisma.turnstileConfig.findMany({
        select: {
          featureId: true,
          enabled: true
        }
      });

      const states: Record<string, boolean> = {};

      // 初始化所有功能为false
      for (const featureId of Object.keys(TURNSTILE_FEATURES) as TurnstileFeatureId[]) {
        states[featureId] = false;
      }

      // 更新数据库中的状态
      for (const config of configs) {
        if (config.featureId in TURNSTILE_FEATURES) {
          states[config.featureId] = config.enabled;
        }
      }

      return states as Record<TurnstileFeatureId, boolean>;
    } catch (error) {
      console.error('获取所有功能配置失败:', error);
      throw error;
    }
  }

  /**
   * 批量更新功能配置
   */
  async batchUpdateFeatures(
    features: TurnstileFeatureId[], 
    enabled: boolean, 
    adminId: string
  ): Promise<number> {
    try {
      const validUserId = await this.getValidUserId(adminId);

      const updateResult = await prisma.turnstileConfig.updateMany({
        where: {
          featureId: {
            in: features
          }
        },
        data: {
          enabled,
          updatedBy: validUserId,
          updatedAt: new Date()
        }
      });

      console.log(`✅ 批量${enabled ? '启用' : '禁用'}成功，更新了 ${updateResult.count} 个功能`);
      return updateResult.count;
    } catch (error) {
      console.error(`批量数据库更新失败:`, error);
      throw error;
    }
  }
}
