/**
 * @fileoverview 管理员服务工厂
 * @description 统一导出管理员相关的服务实例
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { UserQueryService } from './admin-user-query-service';
import { UserManagementService } from './admin-user-management-service';

/**
 * 创建用户查询服务实例
 */
export const userQueryService = (db: PrismaClient) => new UserQueryService(db);

/**
 * 创建用户管理服务实例
 */
export const userManagementService = (db: PrismaClient) => new UserManagementService(db);

/**
 * 导出所有服务类型
 */
export type {
  UserQueryParams,
  UserQueryResult,
  UserDetail,
} from './admin-user-query-service';

export type {
  CreateUserParams,
  UpdateUserParams,
  BatchCreateUsersParams,
} from './admin-user-management-service';
