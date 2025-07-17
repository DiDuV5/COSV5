/**
 * @fileoverview 认证设置服务
 * @description 处理认证相关的系统设置管理
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { SettingsBaseService, SETTING_CATEGORIES, SETTING_KEYS } from './settings-base-service';

/**
 * 认证设置接口
 */
export interface AuthSettings {
  enableEmailVerification: boolean;
  usernameMinLength: number;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
  loginPageNotice: string;
  registerPageNotice: string;
}

/**
 * 认证设置更新参数
 */
export interface AuthSettingsUpdateParams {
  enableEmailVerification?: boolean;
  usernameMinLength?: number;
  passwordMinLength?: number;
  passwordRequireUppercase?: boolean;
  passwordRequireLowercase?: boolean;
  passwordRequireNumbers?: boolean;
  passwordRequireSymbols?: boolean;
  loginPageNotice?: string;
  registerPageNotice?: string;
}

/**
 * 认证设置服务类
 */
export class AuthSettingsService extends SettingsBaseService {
  constructor(db: PrismaClient) {
    super(db);
  }

  /**
   * 获取认证设置
   */
  async getAuthSettings(): Promise<AuthSettings> {
    const dbSettings = await this.getCategorySettings(SETTING_CATEGORIES.AUTH);

    return {
      enableEmailVerification: dbSettings[SETTING_KEYS.ENABLE_EMAIL_VERIFICATION] ?? false,
      usernameMinLength: dbSettings[SETTING_KEYS.USERNAME_MIN_LENGTH] ?? 5,
      passwordMinLength: dbSettings[SETTING_KEYS.PASSWORD_MIN_LENGTH] ?? 6,
      passwordRequireUppercase: dbSettings[SETTING_KEYS.PASSWORD_REQUIRE_UPPERCASE] ?? false,
      passwordRequireLowercase: dbSettings[SETTING_KEYS.PASSWORD_REQUIRE_LOWERCASE] ?? false,
      passwordRequireNumbers: dbSettings[SETTING_KEYS.PASSWORD_REQUIRE_NUMBERS] ?? false,
      passwordRequireSymbols: dbSettings[SETTING_KEYS.PASSWORD_REQUIRE_SYMBOLS] ?? false,
      loginPageNotice: dbSettings[SETTING_KEYS.LOGIN_PAGE_NOTICE] ?? "当前仅作为体验测试，所有测试数据会定期清空\n请勿上传重要个人信息或敏感内容\n如有问题请联系管理员",
      registerPageNotice: dbSettings[SETTING_KEYS.REGISTER_PAGE_NOTICE] ?? "当前仅作为体验测试，所有测试数据会定期清空\n请勿上传重要个人信息或敏感内容\n如有问题请联系管理员",
    };
  }

  /**
   * 更新认证设置
   */
  async updateAuthSettings(params: AuthSettingsUpdateParams): Promise<AuthSettings> {
    const updates: any[] = [];

    if (params.enableEmailVerification !== undefined) {
      updates.push({
        key: SETTING_KEYS.ENABLE_EMAIL_VERIFICATION,
        value: params.enableEmailVerification,
        category: SETTING_CATEGORIES.AUTH,
        description: '是否启用邮箱验证',
      });
    }

    if (params.usernameMinLength !== undefined) {
      this.validateUsernameMinLength(params.usernameMinLength);
      updates.push({
        key: SETTING_KEYS.USERNAME_MIN_LENGTH,
        value: params.usernameMinLength,
        category: SETTING_CATEGORIES.AUTH,
        description: '用户名最小长度',
      });
    }

    if (params.passwordMinLength !== undefined) {
      this.validatePasswordMinLength(params.passwordMinLength);
      updates.push({
        key: SETTING_KEYS.PASSWORD_MIN_LENGTH,
        value: params.passwordMinLength,
        category: SETTING_CATEGORIES.AUTH,
        description: '密码最小长度',
      });
    }

    if (params.passwordRequireUppercase !== undefined) {
      updates.push({
        key: SETTING_KEYS.PASSWORD_REQUIRE_UPPERCASE,
        value: params.passwordRequireUppercase,
        category: SETTING_CATEGORIES.AUTH,
        description: '密码是否需要大写字母',
      });
    }

    if (params.passwordRequireLowercase !== undefined) {
      updates.push({
        key: SETTING_KEYS.PASSWORD_REQUIRE_LOWERCASE,
        value: params.passwordRequireLowercase,
        category: SETTING_CATEGORIES.AUTH,
        description: '密码是否需要小写字母',
      });
    }

    if (params.passwordRequireNumbers !== undefined) {
      updates.push({
        key: SETTING_KEYS.PASSWORD_REQUIRE_NUMBERS,
        value: params.passwordRequireNumbers,
        category: SETTING_CATEGORIES.AUTH,
        description: '密码是否需要数字',
      });
    }

    if (params.passwordRequireSymbols !== undefined) {
      updates.push({
        key: SETTING_KEYS.PASSWORD_REQUIRE_SYMBOLS,
        value: params.passwordRequireSymbols,
        category: SETTING_CATEGORIES.AUTH,
        description: '密码是否需要特殊字符',
      });
    }

    if (params.loginPageNotice !== undefined) {
      updates.push({
        key: SETTING_KEYS.LOGIN_PAGE_NOTICE,
        value: params.loginPageNotice,
        category: SETTING_CATEGORIES.AUTH,
        description: '登录页面通知',
        isPublic: true, // 设置为公开，以便前端可以获取
      });
    }

    if (params.registerPageNotice !== undefined) {
      updates.push({
        key: SETTING_KEYS.REGISTER_PAGE_NOTICE,
        value: params.registerPageNotice,
        category: SETTING_CATEGORIES.AUTH,
        description: '注册页面通知',
        isPublic: true, // 设置为公开，以便前端可以获取
      });
    }

    if (updates.length > 0) {
      await this.updateSettings(updates);
    }

    return await this.getAuthSettings();
  }

  /**
   * 验证密码复杂度设置
   */
  async validatePasswordComplexity(password: string): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const settings = await this.getAuthSettings();
    const errors: string[] = [];

    if (password.length < settings.passwordMinLength) {
      errors.push(`密码长度至少需要${settings.passwordMinLength}位`);
    }

    if (settings.passwordRequireUppercase && !/[A-Z]/.test(password)) {
      errors.push('密码需要包含大写字母');
    }

    if (settings.passwordRequireLowercase && !/[a-z]/.test(password)) {
      errors.push('密码需要包含小写字母');
    }

    if (settings.passwordRequireNumbers && !/\d/.test(password)) {
      errors.push('密码需要包含数字');
    }

    if (settings.passwordRequireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('密码需要包含特殊字符');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证用户名长度设置
   */
  async validateUsernameLength(username: string): Promise<{
    isValid: boolean;
    error?: string;
  }> {
    const settings = await this.getAuthSettings();

    if (username.length < settings.usernameMinLength) {
      return {
        isValid: false,
        error: `用户名长度至少需要${settings.usernameMinLength}位`,
      };
    }

    return { isValid: true };
  }

  /**
   * 重置认证设置为默认值
   */
  async resetAuthSettings(): Promise<AuthSettings> {
    const defaultSettings: AuthSettingsUpdateParams = {
      enableEmailVerification: false,
      usernameMinLength: 5,
      passwordMinLength: 6,
      passwordRequireUppercase: false,
      passwordRequireLowercase: false,
      passwordRequireNumbers: false,
      passwordRequireSymbols: false,
      loginPageNotice: "当前仅作为体验测试，所有测试数据会定期清空\n请勿上传重要个人信息或敏感内容\n如有问题请联系管理员",
      registerPageNotice: "当前仅作为体验测试，所有测试数据会定期清空\n请勿上传重要个人信息或敏感内容\n如有问题请联系管理员",
    };

    return await this.updateAuthSettings(defaultSettings);
  }

  /**
   * 验证用户名最小长度
   */
  private validateUsernameMinLength(length: number): void {
    if (typeof length !== 'number' || length < 1 || length > 20) {
      throw new Error('用户名最小长度必须在1-20之间');
    }
  }

  /**
   * 验证密码最小长度
   */
  private validatePasswordMinLength(length: number): void {
    if (typeof length !== 'number' || length < 1 || length > 50) {
      throw new Error('密码最小长度必须在1-50之间');
    }
  }
}

/**
 * 导出服务创建函数
 */
export const createAuthSettingsService = (db: PrismaClient) => new AuthSettingsService(db);
