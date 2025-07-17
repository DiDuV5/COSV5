/**
 * @fileoverview 设置管理基础服务
 * @description 处理系统设置的基础CRUD操作
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { TRPCErrorHandler, BusinessErrorType } from '@/lib/errors/trpc-error-handler';

/**
 * 系统设置分类
 */
export const SETTING_CATEGORIES = {
  AUTH: "auth",
  EMAIL: "email",
  SECURITY: "security",
  GENERAL: "general",
} as const;

/**
 * 设置键定义
 */
export const SETTING_KEYS = {
  // 认证设置
  ENABLE_EMAIL_VERIFICATION: "auth.enable_email_verification",
  USERNAME_MIN_LENGTH: "auth.username_min_length",
  PASSWORD_MIN_LENGTH: "auth.password_min_length",
  PASSWORD_REQUIRE_UPPERCASE: "auth.password_require_uppercase",
  PASSWORD_REQUIRE_LOWERCASE: "auth.password_require_lowercase",
  PASSWORD_REQUIRE_NUMBERS: "auth.password_require_numbers",
  PASSWORD_REQUIRE_SYMBOLS: "auth.password_require_symbols",
  LOGIN_PAGE_NOTICE: "auth.login_page_notice",
  REGISTER_PAGE_NOTICE: "auth.register_page_notice",

  // 邮箱设置
  SMTP_HOST: "email.smtp_host",
  SMTP_PORT: "email.smtp_port",
  SMTP_USER: "email.smtp_user",
  SMTP_PASSWORD: "email.smtp_password",
  SMTP_FROM_NAME: "email.smtp_from_name",
  SMTP_FROM_EMAIL: "email.smtp_from_email",

  // 安全设置
  MAX_LOGIN_ATTEMPTS: "security.max_login_attempts",
  LOGIN_LOCKOUT_DURATION: "security.login_lockout_duration",
  SESSION_TIMEOUT: "security.session_timeout",
  ENABLE_TWO_FACTOR: "security.enable_two_factor",

  // 通用设置
  SITE_NAME: "general.site_name",
  SITE_DESCRIPTION: "general.site_description",
  MAINTENANCE_MODE: "general.maintenance_mode",
  MAINTENANCE_MESSAGE: "general.maintenance_message",
} as const;

/**
 * 设置项接口
 */
export interface SettingItem {
  key: string;
  value: any;
  description?: string;
  category?: string;
  isPublic?: boolean;
}

/**
 * 设置管理基础服务类
 */
export class SettingsBaseService {
  constructor(private db: PrismaClient) {}

  /**
   * 获取所有系统设置
   */
  async getAllSettings(category?: string): Promise<any[]> {
    const settings = await this.db.systemSetting.findMany({
      where: category ? { category } : undefined,
      orderBy: [
        { category: "asc" },
        { key: "asc" },
      ],
    });

    return settings;
  }

  /**
   * 获取单个设置
   */
  async getSetting(key: string): Promise<any> {
    const setting = await this.db.systemSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      return null;
    }

    try {
      return JSON.parse(setting.value);
    } catch {
      return setting.value;
    }
  }

  /**
   * 获取多个设置
   */
  async getSettings(keys: string[]): Promise<Record<string, any>> {
    const settings = await this.db.systemSetting.findMany({
      where: { key: { in: keys } },
    });

    const result: Record<string, any> = {};
    settings.forEach(setting => {
      try {
        result[setting.key] = JSON.parse(setting.value);
      } catch {
        result[setting.key] = setting.value;
      }
    });

    return result;
  }

  /**
   * 获取分类设置
   */
  async getCategorySettings(category: string): Promise<Record<string, any>> {
    const settings = await this.db.systemSetting.findMany({
      where: { category },
    });

    const result: Record<string, any> = {};
    settings.forEach(setting => {
      try {
        result[setting.key] = JSON.parse(setting.value);
      } catch {
        result[setting.key] = setting.value;
      }
    });

    return result;
  }

  /**
   * 更新单个设置
   */
  async updateSetting(params: SettingItem): Promise<any> {
    const { key, value, description, category, isPublic } = params;

    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    const setting = await this.db.systemSetting.upsert({
      where: { key },
      update: {
        value: stringValue,
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(isPublic !== undefined && { isPublic }),
        updatedAt: new Date(),
      },
      create: {
        key,
        value: stringValue,
        description: description || '',
        category: category || 'general',
        isPublic: isPublic ?? false,
      },
    });

    return setting;
  }

  /**
   * 批量更新设置
   */
  async updateSettings(settings: SettingItem[]): Promise<any[]> {
    const results = await Promise.all(
      settings.map(setting => this.updateSetting(setting))
    );

    return results;
  }

  /**
   * 删除设置
   */
  async deleteSetting(key: string): Promise<void> {
    const setting = await this.db.systemSetting.findUnique({
      where: { key },
    });

    TRPCErrorHandler.requireResource(setting, '设置项', key);

    await this.db.systemSetting.delete({
      where: { key },
    });
  }

  /**
   * 重置设置为默认值
   */
  async resetSetting(key: string): Promise<any> {
    const defaultValue = this.getDefaultValue(key);

    if (defaultValue === undefined) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.VALIDATION_FAILED,
        '未找到该设置项的默认值'
      );
    }

    return await this.updateSetting({
      key,
      value: defaultValue,
    });
  }

  /**
   * 获取公开设置（不需要管理员权限）
   */
  async getPublicSettings(): Promise<Record<string, any>> {
    const settings = await this.db.systemSetting.findMany({
      where: { isPublic: true },
    });

    const result: Record<string, any> = {};
    settings.forEach(setting => {
      try {
        result[setting.key] = JSON.parse(setting.value);
      } catch {
        result[setting.key] = setting.value;
      }
    });

    // 为前端提供友好的字段名映射（保持向后兼容）
    const fieldMappings: Record<string, string> = {
      [SETTING_KEYS.LOGIN_PAGE_NOTICE]: 'loginPageNotice',
      [SETTING_KEYS.REGISTER_PAGE_NOTICE]: 'registerPageNotice',
      [SETTING_KEYS.USERNAME_MIN_LENGTH]: 'usernameMinLength',
      [SETTING_KEYS.PASSWORD_MIN_LENGTH]: 'passwordMinLength',
      [SETTING_KEYS.ENABLE_EMAIL_VERIFICATION]: 'enableEmailVerification',
    };

    // 添加映射字段
    Object.entries(fieldMappings).forEach(([originalKey, mappedKey]) => {
      if (result[originalKey] !== undefined) {
        result[mappedKey] = result[originalKey];
      }
    });

    return result;
  }

  /**
   * 验证设置值
   */
  validateSettingValue(key: string, value: any): boolean {
    // 根据设置键验证值的有效性
    switch (key) {
      case SETTING_KEYS.USERNAME_MIN_LENGTH:
      case SETTING_KEYS.PASSWORD_MIN_LENGTH:
        return typeof value === 'number' && value >= 1 && value <= 50;

      case SETTING_KEYS.SMTP_PORT:
        return typeof value === 'number' && value >= 1 && value <= 65535;

      case SETTING_KEYS.ENABLE_EMAIL_VERIFICATION:
      case SETTING_KEYS.PASSWORD_REQUIRE_UPPERCASE:
      case SETTING_KEYS.PASSWORD_REQUIRE_LOWERCASE:
      case SETTING_KEYS.PASSWORD_REQUIRE_NUMBERS:
      case SETTING_KEYS.PASSWORD_REQUIRE_SYMBOLS:
      case SETTING_KEYS.MAINTENANCE_MODE:
        return typeof value === 'boolean';

      case SETTING_KEYS.SMTP_HOST:
      case SETTING_KEYS.SMTP_USER:
      case SETTING_KEYS.SMTP_FROM_EMAIL:
        return typeof value === 'string' && value.length > 0;

      default:
        return true; // 默认允许所有值
    }
  }

  /**
   * 获取设置的默认值
   */
  private getDefaultValue(key: string): any {
    const defaults: Record<string, any> = {
      [SETTING_KEYS.ENABLE_EMAIL_VERIFICATION]: false,
      [SETTING_KEYS.USERNAME_MIN_LENGTH]: 5,
      [SETTING_KEYS.PASSWORD_MIN_LENGTH]: 6,
      [SETTING_KEYS.PASSWORD_REQUIRE_UPPERCASE]: false,
      [SETTING_KEYS.PASSWORD_REQUIRE_LOWERCASE]: false,
      [SETTING_KEYS.PASSWORD_REQUIRE_NUMBERS]: false,
      [SETTING_KEYS.PASSWORD_REQUIRE_SYMBOLS]: false,
      [SETTING_KEYS.LOGIN_PAGE_NOTICE]: "当前仅作为体验测试，所有测试数据会定期清空\n请勿上传重要个人信息或敏感内容\n如有问题请联系管理员",
      [SETTING_KEYS.REGISTER_PAGE_NOTICE]: "当前仅作为体验测试，所有测试数据会定期清空\n请勿上传重要个人信息或敏感内容\n如有问题请联系管理员",
      [SETTING_KEYS.SMTP_PORT]: 587,
      [SETTING_KEYS.SMTP_FROM_NAME]: "Cosplay Platform",
      [SETTING_KEYS.MAX_LOGIN_ATTEMPTS]: 5,
      [SETTING_KEYS.LOGIN_LOCKOUT_DURATION]: 15,
      [SETTING_KEYS.SESSION_TIMEOUT]: 24,
      [SETTING_KEYS.ENABLE_TWO_FACTOR]: false,
      [SETTING_KEYS.SITE_NAME]: "CoserEden",
      [SETTING_KEYS.SITE_DESCRIPTION]: "专业cosplay创作者平台",
      [SETTING_KEYS.MAINTENANCE_MODE]: false,
      [SETTING_KEYS.MAINTENANCE_MESSAGE]: "系统维护中，请稍后再试",
    };

    return defaults[key];
  }
}

/**
 * 导出服务创建函数
 */
export const createSettingsBaseService = (db: PrismaClient) => new SettingsBaseService(db);
