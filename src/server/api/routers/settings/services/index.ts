/**
 * @fileoverview 设置服务工厂
 * @description 统一导出设置相关的服务实例
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { SettingsBaseService } from './settings-base-service';
import { AuthSettingsService } from './auth-settings-service';
import { EmailSettingsService } from './email-settings-service';

/**
 * 创建基础设置服务实例
 */
export const settingsBaseService = (db: PrismaClient) => new SettingsBaseService(db);

/**
 * 创建认证设置服务实例
 */
export const authSettingsService = (db: PrismaClient) => new AuthSettingsService(db);

/**
 * 创建邮箱设置服务实例
 */
export const emailSettingsService = (db: PrismaClient) => new EmailSettingsService(db);

/**
 * 导出所有服务类型和常量
 */
export {
  SETTING_CATEGORIES,
  SETTING_KEYS,
} from './settings-base-service';

export type {
  SettingItem,
} from './settings-base-service';

export type {
  AuthSettings,
  AuthSettingsUpdateParams,
} from './auth-settings-service';

export type {
  EmailSettings,
  EmailSettingsUpdateParams,
  EmailTestResult,
} from './email-settings-service';
