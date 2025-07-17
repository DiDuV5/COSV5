/**
 * @fileoverview 权限配置CRUD操作
 * @description 提供权限配置的基础CRUD操作
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { TRPCErrorHandler, BusinessErrorType } from '@/lib/errors/trpc-error-handler';
import {
  PermissionConfigUpdateParams,
  BatchPermissionUpdateParams,
  PermissionConfigResponse,
  BatchPermissionConfigResponse,
  PermissionConfigStats,
  DEFAULT_PERMISSION_CONFIG,
} from './types';
import { PermissionConfigValidators } from './validators';
import { PermissionConfigLogger } from './logger';

/**
 * 权限配置CRUD操作类
 */
export class PermissionConfigCRUD {
  private validators: PermissionConfigValidators;
  private logger: PermissionConfigLogger;

  constructor(private db: PrismaClient) {
    this.validators = new PermissionConfigValidators(db);
    this.logger = new PermissionConfigLogger(db);
  }

  /**
   * 获取所有权限配置
   */
  async getAllConfigs(): Promise<any[]> {
    try {
      return await this.db.userPermissionConfig.findMany({
        orderBy: {
          userLevel: 'asc',
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      throw TRPCErrorHandler.businessError(
        BusinessErrorType.INTERNAL_SERVER_ERROR,
        '获取权限配置列表失败，请稍后重试',
        {
          context: {
            error: errorMessage,
            operation: 'getAllConfigs',
            timestamp: new Date().toISOString(),
          },
          recoveryActions: [
            '检查数据库连接状态',
            '刷新页面重试',
            '联系技术支持',
          ],
        }
      );
    }
  }

  /**
   * 根据用户等级获取权限配置
   */
  async getConfigByLevel(userLevel: string): Promise<any | null> {
    try {
      // 验证用户等级格式
      if (!userLevel || typeof userLevel !== 'string') {
        throw TRPCErrorHandler.businessError(
          BusinessErrorType.VALIDATION_FAILED,
          '用户等级参数无效',
          {
            context: { userLevel, operation: 'getConfigByLevel' },
            recoveryActions: ['检查用户等级参数格式', '使用有效的用户等级'],
          }
        );
      }

      return await this.db.userPermissionConfig.findUnique({
        where: { userLevel },
      });
    } catch (error: unknown) {
      // 如果已经是TRPCError，直接重新抛出
      if (error instanceof Error && 'code' in error) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);

      throw TRPCErrorHandler.businessError(
        BusinessErrorType.INTERNAL_SERVER_ERROR,
        '获取用户等级权限配置失败',
        {
          context: {
            error: errorMessage,
            userLevel,
            operation: 'getConfigByLevel',
            timestamp: new Date().toISOString(),
          },
          recoveryActions: [
            '确认用户等级是否存在',
            '检查数据库连接',
            '稍后重试',
          ],
        }
      );
    }
  }

  /**
   * 获取用户的权限配置
   */
  async getUserPermissions(userId: string): Promise<any | null> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { userLevel: true },
    });

    if (!user) {
      return null;
    }

    return await this.getConfigByLevel(user.userLevel);
  }

  /**
   * 更新权限配置
   */
  async updateConfig(
    params: PermissionConfigUpdateParams,
    adminId: string
  ): Promise<PermissionConfigResponse> {
    const { userLevel, ...updateData } = params;

    // 1. 验证管理员权限
    await this.validators.validateAdminPermission(adminId, 'UPDATE_PERMISSION_CONFIG');

    // 2. 验证用户等级
    this.validators.validateUserLevel(userLevel);

    // 3. 验证权限配置数据
    this.validators.validatePermissionConfig(updateData);

    // 4. 安全验证：检查权限配置是否会导致权限提升攻击
    await this.validators.validatePermissionSecurity(userLevel, updateData, adminId);

    // 5. 检查权限配置冲突
    this.validators.validatePermissionConflicts(updateData);

    // 6. 使用事务确保原子性
    const result = await this.db.$transaction(async (tx) => {
      // 获取当前配置用于审计
      const currentConfig = await tx.userPermissionConfig.findUnique({
        where: { userLevel },
      });

      // 更新配置
      const config = await tx.userPermissionConfig.upsert({
        where: { userLevel },
        update: updateData,
        create: {
          userLevel,
          ...updateData,
          // 设置默认值
          ...DEFAULT_PERMISSION_CONFIG,
          ...updateData, // 覆盖默认值
        },
      });

      // 记录详细的操作日志
      await this.logger.logPermissionChange({
        adminId,
        action: 'UPDATE_PERMISSION_CONFIG',
        userLevel,
        changes: updateData,
      });

      return config;
    });

    return {
      success: true,
      message: '权限配置更新成功',
      config: result,
    };
  }

  /**
   * 批量更新用户组权限配置
   */
  async batchUpdateUserGroupPermissions(
    params: BatchPermissionUpdateParams,
    adminId: string
  ): Promise<BatchPermissionConfigResponse> {
    const { updates, reason } = params;

    // 验证批量更新参数
    this.validators.validateBatchUpdateParams(updates);

    // 验证管理员权限
    await this.validators.validateAdminPermission(adminId, 'BATCH_UPDATE_PERMISSION_CONFIG');

    const results: any[] = [];

    // 使用事务确保原子性
    await this.db.$transaction(async (tx) => {
      for (const update of updates) {
        const { userLevel, ...updateData } = update;

        // 验证用户等级
        this.validators.validateUserLevel(userLevel);

        // 验证权限配置数据
        this.validators.validatePermissionConfig(updateData);

        const config = await tx.userPermissionConfig.upsert({
          where: { userLevel },
          update: updateData,
          create: {
            userLevel,
            ...updateData,
            // 设置其他默认值
            ...DEFAULT_PERMISSION_CONFIG,
            ...updateData, // 覆盖默认值
          },
        });

        results.push(config);
      }

      // 记录审计日志
      await this.logger.logBatchPermissionChange({
        adminId,
        updates,
        reason,
      });
    });

    return {
      success: true,
      message: `成功更新 ${results.length} 个用户组的权限配置`,
      configs: results,
    };
  }

  /**
   * 重置权限配置为默认值
   */
  async resetConfigToDefault(
    userLevel: string,
    adminId: string
  ): Promise<PermissionConfigResponse> {
    this.validators.validateUserLevel(userLevel);

    const defaultConfig = DEFAULT_PERMISSION_CONFIG;

    const config = await this.db.userPermissionConfig.upsert({
      where: { userLevel },
      update: defaultConfig,
      create: {
        userLevel,
        ...defaultConfig,
      },
    });

    // 记录操作日志
    await this.logger.logPermissionChange({
      adminId,
      action: 'RESET_PERMISSION_CONFIG',
      userLevel,
      changes: defaultConfig,
    });

    return {
      success: true,
      message: '权限配置已重置为默认值',
      config,
    };
  }

  /**
   * 删除权限配置
   */
  async deleteConfig(userLevel: string, adminId: string): Promise<PermissionConfigResponse> {
    this.validators.validateUserLevel(userLevel);

    // 验证是否可以删除
    await this.validators.validateUserLevelDeletion(userLevel);

    await this.db.userPermissionConfig.delete({
      where: { userLevel },
    });

    // 记录操作日志
    await this.logger.logPermissionChange({
      adminId,
      action: 'DELETE_PERMISSION_CONFIG',
      userLevel,
      changes: {},
    });

    return {
      success: true,
      message: '权限配置删除成功',
    };
  }

  /**
   * 获取权限配置统计
   */
  async getConfigStats(): Promise<PermissionConfigStats> {
    const [configs, userStats] = await Promise.all([
      this.db.userPermissionConfig.findMany({
        select: { userLevel: true },
      }),
      this.db.user.groupBy({
        by: ['userLevel'],
        _count: { id: true },
      }),
    ]);

    const configsByLevel: Record<string, number> = {};
    configs.forEach((config) => {
      configsByLevel[config.userLevel] = 1;
    });

    const usersByLevel: Record<string, number> = {};
    userStats.forEach((stat) => {
      usersByLevel[stat.userLevel] = stat._count.id;
    });

    return {
      totalConfigs: configs.length,
      configsByLevel,
      usersByLevel,
    };
  }
}
