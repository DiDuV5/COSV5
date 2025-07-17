/**
 * @fileoverview 用户状态管理服务
 * @description 统一管理用户状态，确保数据一致性
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';
import { TRPCErrorHandler, BusinessErrorType } from '@/lib/errors/trpc-error-handler';
import { UserLevel } from '@/types/user-level';

/**
 * 用户状态字段定义
 */
export interface UserStateFields {
  isVerified?: boolean;
  emailVerified?: boolean;
  isActive?: boolean;
  canPublish?: boolean;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  registrationStatus?: 'PENDING_EMAIL' | 'COMPLETED' | 'FAILED';
  userLevel?: UserLevel;
}

/**
 * 状态更新选项
 */
export interface StateUpdateOptions {
  validateConsistency?: boolean;
  auditLog?: boolean;
  adminId?: string;
  reason?: string;
}

/**
 * 用户状态管理器
 */
export class UserStateManager {
  constructor(private db: PrismaClient) {}

  /**
   * 统一更新用户状态，确保一致性
   */
  async updateUserState(
    userId: string,
    updates: UserStateFields,
    options: StateUpdateOptions = {}
  ): Promise<void> {
    const { validateConsistency = true, auditLog = true } = options;

    await this.db.$transaction(async (tx) => {
      // 1. 获取当前用户状态
      const currentUser = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          isVerified: true,
          emailVerified: true,
          isActive: true,
          canPublish: true,
          approvalStatus: true,
          registrationStatus: true,
          userLevel: true,
        },
      });

      if (!currentUser) {
        throw TRPCErrorHandler.businessError(
          BusinessErrorType.RESOURCE_NOT_FOUND,
          '用户不存在'
        );
      }

      // 2. 验证状态一致性
      if (validateConsistency) {
        const validatedUpdates = this.validateStateConsistency(currentUser, updates);
        Object.assign(updates, validatedUpdates);
      }

      // 3. 记录状态变更（审计日志）
      if (auditLog) {
        await this.logStateChange(tx, userId, currentUser, updates, options);
      }

      // 4. 执行状态更新
      await tx.user.update({
        where: { id: userId },
        data: updates as any,
      });

      // 5. 触发状态变更后的处理
      await this.handleStateChangeEffects(tx, userId, currentUser, updates);
    });
  }

  /**
   * 验证状态一致性
   */
  private validateStateConsistency(
    currentState: any,
    updates: UserStateFields
  ): Partial<UserStateFields> {
    const validatedUpdates: Partial<UserStateFields> = {};

    // 规则1: 如果设置为已验证，确保邮箱也已验证
    if (updates.isVerified === true && currentState.email) {
      validatedUpdates.emailVerified = true;
    }

    // 规则2: 如果邮箱未验证，用户不能设置为已验证
    if (updates.emailVerified === false) {
      validatedUpdates.isVerified = false;
    }

    // 规则3: 如果用户被拒绝，不能设置为激活状态
    if (updates.approvalStatus === 'REJECTED') {
      validatedUpdates.isActive = false;
      validatedUpdates.canPublish = false;
    }

    // 规则4: 如果用户未激活，不能发布内容
    if (updates.isActive === false) {
      validatedUpdates.canPublish = false;
    }

    // 规则5: 注册状态与其他状态的一致性
    if (updates.registrationStatus === 'COMPLETED') {
      // 注册完成时，确保基本状态正确
      if (currentState.email) {
        validatedUpdates.emailVerified = true;
      }
      validatedUpdates.isVerified = true;
    }

    // 规则6: 用户等级与权限的一致性
    if (updates.userLevel) {
      const levelPermissions = this.getUserLevelPermissions(updates.userLevel);
      Object.assign(validatedUpdates, levelPermissions);
    }

    return validatedUpdates;
  }

  /**
   * 获取用户等级对应的权限
   */
  private getUserLevelPermissions(userLevel: UserLevel): Partial<UserStateFields> {
    const permissions: Partial<UserStateFields> = {};

    switch (userLevel) {
      case 'GUEST':
        permissions.canPublish = false;
        break;
      case 'USER':
        permissions.canPublish = false;
        break;
      case 'VIP':
        permissions.canPublish = false;
        break;
      case 'CREATOR':
        permissions.canPublish = true;
        break;
      case 'ADMIN':
        permissions.canPublish = true;
        permissions.isActive = true;
        permissions.isVerified = true;
        break;
      case 'SUPER_ADMIN':
        permissions.canPublish = true;
        permissions.isActive = true;
        permissions.isVerified = true;
        break;
    }

    return permissions;
  }

  /**
   * 记录状态变更日志
   */
  private async logStateChange(
    tx: any,
    userId: string,
    currentState: any,
    updates: UserStateFields,
    options: StateUpdateOptions
  ): Promise<void> {
    const changes: Record<string, { from: any; to: any }> = {};

    // 记录所有变更
    Object.keys(updates).forEach(key => {
      const currentValue = currentState[key];
      const newValue = updates[key as keyof UserStateFields];
      if (currentValue !== newValue) {
        changes[key] = { from: currentValue, to: newValue };
      }
    });

    if (Object.keys(changes).length > 0) {
      const logEntry = {
        userId,
        adminId: options.adminId,
        action: 'USER_STATE_UPDATE',
        changes,
        reason: options.reason,
        timestamp: new Date(),
      };

      // 记录到控制台（生产环境应该使用专业的审计日志系统）
      console.log('[USER_STATE_CHANGE]', JSON.stringify(logEntry, null, 2));

      // 如果有审计日志表，可以在这里记录
      // await tx.auditLog.create({ data: logEntry });
    }
  }

  /**
   * 处理状态变更后的效果
   */
  private async handleStateChangeEffects(
    tx: any,
    userId: string,
    currentState: any,
    updates: UserStateFields
  ): Promise<void> {
    // 效果1: 如果用户被激活，发送欢迎通知
    if (updates.isActive === true && currentState.isActive === false) {
      await this.sendWelcomeNotification(userId);
    }

    // 效果2: 如果用户被拒绝，发送拒绝通知
    if (updates.approvalStatus === 'REJECTED' && currentState.approvalStatus !== 'REJECTED') {
      await this.sendRejectionNotification(userId);
    }

    // 效果3: 如果用户获得发布权限，发送权限通知
    if (updates.canPublish === true && currentState.canPublish === false) {
      await this.sendPublishPermissionNotification(userId);
    }

    // 效果4: 如果用户等级提升，更新相关权限配置
    if (updates.userLevel && updates.userLevel !== currentState.userLevel) {
      await this.updateUserPermissionConfig(tx, userId, updates.userLevel);
    }
  }

  /**
   * 发送欢迎通知
   */
  private async sendWelcomeNotification(userId: string): Promise<void> {
    // 这里应该集成通知系统
    console.log(`[NOTIFICATION] Sending welcome notification to user ${userId}`);
  }

  /**
   * 发送拒绝通知
   */
  private async sendRejectionNotification(userId: string): Promise<void> {
    // 这里应该集成通知系统
    console.log(`[NOTIFICATION] Sending rejection notification to user ${userId}`);
  }

  /**
   * 发送发布权限通知
   */
  private async sendPublishPermissionNotification(userId: string): Promise<void> {
    // 这里应该集成通知系统
    console.log(`[NOTIFICATION] Sending publish permission notification to user ${userId}`);
  }

  /**
   * 更新用户权限配置
   */
  private async updateUserPermissionConfig(
    tx: any,
    userId: string,
    userLevel: UserLevel
  ): Promise<void> {
    // 确保用户有对应等级的权限配置
    const config = await tx.userPermissionConfig.findUnique({
      where: { userLevel },
    });

    if (!config) {
      console.warn(`[WARNING] No permission config found for user level: ${userLevel}`);
    }
  }

  /**
   * 批量状态同步 - 修复不一致的状态
   */
  async syncUserStates(userIds?: string[]): Promise<{ fixed: number; errors: string[] }> {
    const errors: string[] = [];
    let fixed = 0;

    const users = await this.db.user.findMany({
      where: userIds ? { id: { in: userIds } } : {},
      select: {
        id: true,
        username: true,
        email: true,
        isVerified: true,
        emailVerified: true,
        isActive: true,
        canPublish: true,
        approvalStatus: true,
        registrationStatus: true,
        userLevel: true,
      },
    });

    for (const user of users) {
      try {
        const inconsistencies = this.detectStateInconsistencies(user);
        if (Object.keys(inconsistencies).length > 0) {
          await this.updateUserState(user.id, inconsistencies, {
            validateConsistency: false, // 避免循环验证
            auditLog: true,
            reason: 'Automated state synchronization',
          });
          fixed++;
        }
      } catch (error) {
        errors.push(`User ${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { fixed, errors };
  }

  /**
   * 检测状态不一致
   */
  private detectStateInconsistencies(user: any): UserStateFields {
    const fixes: UserStateFields = {};

    // 检测1: 邮箱验证与用户验证不一致
    if (user.email && user.isVerified && !user.emailVerified) {
      fixes.emailVerified = true;
    }

    // 检测2: 被拒绝的用户仍然激活
    if (user.approvalStatus === 'REJECTED' && user.isActive) {
      fixes.isActive = false;
      fixes.canPublish = false;
    }

    // 检测3: 未激活用户有发布权限
    if (!user.isActive && user.canPublish) {
      fixes.canPublish = false;
    }

    // 检测4: 注册状态与验证状态不一致
    if (user.registrationStatus === 'COMPLETED' && user.email && !user.emailVerified) {
      fixes.emailVerified = true;
      fixes.isVerified = true;
    }

    return fixes;
  }
}
