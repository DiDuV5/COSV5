/**
 * @fileoverview 权限服务工厂
 * @description 统一导出权限相关的服务实例
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { PermissionConfigService } from './permission-config-service';
import { PermissionCheckService } from './permission-check-service';

/**
 * 创建权限配置服务实例
 */
export const permissionConfigService = (db: PrismaClient) => new PermissionConfigService(db);

/**
 * 创建权限检查服务实例
 */
export const permissionCheckService = (db: PrismaClient) => new PermissionCheckService(db);

/**
 * 导出所有服务类型
 */
export type {
  PermissionConfigUpdateParams,
  BatchPermissionUpdateParams,
} from './permission-config-service';

export type {
  PermissionAction,
  PermissionCheckResult,
  DailyLimitCheckResult,
} from './permission-check-service';
