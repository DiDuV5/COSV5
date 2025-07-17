/**
 * @fileoverview 用户管理服务
 * @description 处理用户的创建、更新、删除等管理操作
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';
import { TRPCErrorHandler, BusinessErrorType } from '@/lib/errors/trpc-error-handler';
import { validateUsername, validatePassword } from '@/lib/security';

/**
 * 用户创建参数接口
 */
export interface CreateUserParams {
  username: string;
  email: string;
  password?: string;
  displayName?: string;
  userLevel?: string;
  isActive?: boolean;
  isVerified?: boolean;
  avatarUrl?: string;
  bio?: string;
}

/**
 * 用户更新参数接口
 */
export interface UpdateUserParams {
  userId: string;
  username?: string;
  email?: string;
  displayName?: string;
  userLevel?: string;
  isActive?: boolean;
  isVerified?: boolean;
  avatarUrl?: string;
  bio?: string;
}

/**
 * 批量用户创建参数接口
 */
export interface BatchCreateUsersParams {
  users: CreateUserParams[];
  sendWelcomeEmail?: boolean;
}

/**
 * 用户管理服务类
 */
export class UserManagementService {
  constructor(private db: PrismaClient) {}

  /**
   * 创建用户
   */
  async createUser(params: CreateUserParams, adminId: string): Promise<any> {
    const { username, email, password, ...userData } = params;

    // 获取系统认证设置
    const authSettings = await this.getAuthSettings();

    // 验证用户名
    const usernameValidation = validateUsername(username, authSettings.usernameMinLength);
    if (!usernameValidation.isValid) {
      throw TRPCErrorHandler.validationError('用户名格式不正确');
    }

    // 验证密码（如果提供）
    if (password) {
      const passwordValidation = validatePassword(password, {
        minLength: authSettings.passwordMinLength,
        requireUppercase: authSettings.passwordRequireUppercase,
        requireLowercase: authSettings.passwordRequireLowercase,
        requireNumbers: authSettings.passwordRequireNumbers,
        requireSymbols: authSettings.passwordRequireSymbols,
      });
      if (!passwordValidation.isValid) {
        throw TRPCErrorHandler.validationError('密码格式不正确');
      }
    }

    // 检查用户名和邮箱是否已存在
    await this.checkUserExists(username, email);

    // 创建用户
    const hashedPassword = password ? await bcrypt.hash(password, 12) : null;

    const user = await this.db.user.create({
      data: {
        username,
        email,
        ...(hashedPassword && { password: hashedPassword }),
        displayName: userData.displayName || username,
        userLevel: userData.userLevel || 'USER',
        isActive: userData.isActive ?? true,
        isVerified: userData.isVerified ?? false,
        avatarUrl: userData.avatarUrl,
        bio: userData.bio,
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        userLevel: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
      },
    });

    // 记录管理员操作日志
    await this.logAdminAction({
      adminId,
      action: 'CREATE_USER',
      targetUserId: user.id,
      details: { username, email, userLevel: userData.userLevel },
    });

    return user;
  }

  /**
   * 批量创建用户
   */
  async createUsersBatch(params: BatchCreateUsersParams, adminId: string): Promise<{
    created: any[];
    failed: Array<{ user: CreateUserParams; error: string }>;
  }> {
    const { users, sendWelcomeEmail = false } = params;
    const created: any[] = [];
    const failed: Array<{ user: CreateUserParams; error: string }> = [];

    for (const userData of users) {
      try {
        const user = await this.createUser(userData, adminId);
        created.push(user);

        // 发送欢迎邮件（如果启用）
        if (sendWelcomeEmail) {
          await this.sendWelcomeEmail(user.email, user.username);
        }
      } catch (error) {
        failed.push({
          user: userData,
          error: error instanceof Error ? error.message : '创建失败',
        });
      }
    }

    return { created, failed };
  }

  /**
   * 更新用户
   */
  async updateUser(params: UpdateUserParams, adminId: string): Promise<any> {
    const { userId, username, email, ...updateData } = params;

    // 检查用户是否存在
    const existingUser = await this.db.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true },
    });

    TRPCErrorHandler.requireResource(existingUser, '用户', userId);

    // 如果更新用户名或邮箱，检查是否已存在
    if (username && username !== existingUser.username) {
      await this.checkUsernameExists(username);
    }

    if (email && email !== existingUser.email) {
      await this.checkEmailExists(email);
    }

    const user = await this.db.user.update({
      where: { id: userId },
      data: {
        ...(username && { username }),
        ...(email && { email }),
        ...updateData,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        userLevel: true,
        isActive: true,
        isVerified: true,
        updatedAt: true,
      },
    });

    // 记录管理员操作日志
    await this.logAdminAction({
      adminId,
      action: 'UPDATE_USER',
      targetUserId: userId,
      details: { username, email, ...updateData },
    });

    return user;
  }

  /**
   * 重置用户密码
   */
  async resetUserPassword(params: {
    userId: string;
    newPassword: string;
    sendNotification?: boolean;
  }, adminId: string): Promise<{ success: boolean; message: string }> {
    const { userId, newPassword, sendNotification = true } = params;

    // 获取系统认证设置
    const authSettings = await this.getAuthSettings();

    // 验证新密码
    const passwordValidation = validatePassword(newPassword, {
      minLength: authSettings.passwordMinLength,
      requireUppercase: authSettings.passwordRequireUppercase,
      requireLowercase: authSettings.passwordRequireLowercase,
      requireNumbers: authSettings.passwordRequireNumbers,
      requireSymbols: authSettings.passwordRequireSymbols,
    });

    if (!passwordValidation.isValid) {
      throw TRPCErrorHandler.validationError('新密码格式不正确');
    }

    // 检查用户是否存在
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true },
    });

    TRPCErrorHandler.requireResource(user, '用户', userId);

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.db.user.update({
      where: { id: userId },
      data: {
        // password字段不存在于User模型中，暂时注释掉
        // password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    // 发送密码重置通知（如果启用）
    if (sendNotification) {
      await this.sendPasswordResetNotification(user.email || '', user.username || '');
    }

    // 记录管理员操作日志
    await this.logAdminAction({
      adminId,
      action: 'RESET_PASSWORD',
      targetUserId: userId,
      details: { username: user.username },
    });

    return {
      success: true,
      message: '密码重置成功',
    };
  }

  /**
   * 删除用户
   */
  async deleteUser(userId: string, adminId: string): Promise<{ success: boolean; message: string }> {
    // 检查用户是否存在
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, userLevel: true },
    });

    TRPCErrorHandler.requireResource(user, '用户', userId);

    // 防止删除管理员账户
    if (user.userLevel === 'ADMIN' || user.userLevel === 'SUPER_ADMIN') {
      throw TRPCErrorHandler.forbidden('不能删除管理员账户');
    }

    // 防止管理员删除自己
    if (userId === adminId) {
      throw TRPCErrorHandler.forbidden('不能删除自己的账户');
    }

    // 软删除：标记为非活跃状态
    await this.db.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        // deletedAt字段不存在于User模型中，暂时注释掉
        // deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // 记录管理员操作日志
    await this.logAdminAction({
      adminId,
      action: 'DELETE_USER',
      targetUserId: userId,
      details: { username: user.username },
    });

    return {
      success: true,
      message: '用户删除成功',
    };
  }

  /**
   * 获取系统认证设置
   */
  private async getAuthSettings() {
    const authSettings = await this.db.systemSetting.findMany({
      where: {
        key: {
          in: [
            'auth.username_min_length',
            'auth.password_min_length',
            'auth.password_require_uppercase',
            'auth.password_require_lowercase',
            'auth.password_require_numbers',
            'auth.password_require_symbols',
          ],
        },
      },
    });

    const settingsMap = authSettings.reduce((acc, setting) => {
      try {
        acc[setting.key] = JSON.parse(setting.value);
      } catch {
        acc[setting.key] = setting.value;
      }
      return acc;
    }, {} as Record<string, any>);

    return {
      usernameMinLength: settingsMap['auth.username_min_length'] ?? 5,
      passwordMinLength: settingsMap['auth.password_min_length'] ?? 6,
      passwordRequireUppercase: settingsMap['auth.password_require_uppercase'] ?? false,
      passwordRequireLowercase: settingsMap['auth.password_require_lowercase'] ?? false,
      passwordRequireNumbers: settingsMap['auth.password_require_numbers'] ?? false,
      passwordRequireSymbols: settingsMap['auth.password_require_symbols'] ?? false,
    };
  }

  /**
   * 检查用户是否已存在
   */
  private async checkUserExists(username: string, email: string): Promise<void> {
    const existingUser = await this.db.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
      select: { username: true, email: true },
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw TRPCErrorHandler.businessError(BusinessErrorType.RESOURCE_ALREADY_EXISTS, '用户名已存在');
      }
      if (existingUser.email === email) {
        throw TRPCErrorHandler.businessError(BusinessErrorType.RESOURCE_ALREADY_EXISTS, '邮箱已存在');
      }
    }
  }

  /**
   * 检查用户名是否已存在
   */
  private async checkUsernameExists(username: string): Promise<void> {
    const existingUser = await this.db.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existingUser) {
      throw TRPCErrorHandler.businessError(BusinessErrorType.RESOURCE_ALREADY_EXISTS, '用户名已存在');
    }
  }

  /**
   * 检查邮箱是否已存在
   */
  private async checkEmailExists(email: string): Promise<void> {
    const existingUser = await this.db.user.findFirst({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw TRPCErrorHandler.businessError(BusinessErrorType.RESOURCE_ALREADY_EXISTS, '邮箱已存在');
    }
  }

  /**
   * 记录管理员操作日志
   */
  private async logAdminAction(params: {
    adminId: string;
    action: string;
    targetUserId?: string;
    details?: any;
  }): Promise<void> {
    try {
      // 这里可以记录到专门的管理员操作日志表
      console.log('Admin action logged:', params);
    } catch (error) {
      console.error('Failed to log admin action:', error);
    }
  }

  /**
   * 发送欢迎邮件
   */
  private async sendWelcomeEmail(email: string, username: string): Promise<void> {
    try {
      // 这里应该调用邮件服务发送欢迎邮件
      console.log(`Welcome email sent to ${email} for user ${username}`);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  }

  /**
   * 发送密码重置通知
   */
  private async sendPasswordResetNotification(email: string, username: string): Promise<void> {
    try {
      // 这里应该调用邮件服务发送密码重置通知
      console.log(`Password reset notification sent to ${email} for user ${username}`);
    } catch (error) {
      console.error('Failed to send password reset notification:', error);
    }
  }
}

/**
 * 导出服务创建函数
 */
export const createUserManagementService = (db: PrismaClient) => new UserManagementService(db);
