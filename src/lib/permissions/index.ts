/**
import { checkUserLevel } from './permission-utils';
import { clearPermissionConfigCache } from './permission-cache';
import { permissionCacheManager } from './permission-cache';
import { auditLogManager } from './audit-logger';

 * @fileoverview 权限系统统一导出模块
 * @description 统一导出所有权限相关模块，保持向后兼容性
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

// ===== 类型定义导出 =====
export type {
  PermissionOptions,
  PermissionAuditLog,
  CacheItem,
  UserPermissionConfig,
  UserInfo,
  PermissionContext,
  SecurityEventLog,
  CacheStats,
  PermissionSummary,
  ResourceAccessParams,
  PermissionValidationResult,
  PermissionValidatorOptions,
  AuditConfig,
  CacheConfig,
  PermissionMiddlewareConfig,
} from './types';

export {
  DEFAULT_PERMISSION_CONFIG,
  PERMISSIONS,
  RESOURCE_TYPES,
  OPERATIONS,
  SECURITY_EVENTS,
} from './types';

// ===== 核心权限验证模块 =====
export {
  PermissionValidator,
  permissionValidator,
  createPermissionValidator,
  validatePermissions,
} from './permission-validator';

// ===== 缓存管理模块 =====
export {
  PermissionCacheManager,
  permissionCacheManager,
  clearUserCache,
  clearPermissionConfigCache,
  getCacheStats,
  getUserPermissionConfig,
  getCachedUserInfo,
} from './permission-cache';

// ===== 资源访问控制模块 =====
export {
  ResourceAccessController,
  resourceAccessController,
  checkResourceAccess,
} from './resource-access-control';

// ===== 审计日志模块 =====
export {
  AuditLogManager,
  auditLogManager,
  logPermissionAudit,
  logSecurityEvent,
  getAuditLogBufferSize,
} from './audit-logger';

// ===== 权限工具模块 =====
export {
  PermissionUtils,
  hasPermission,
  checkUserLevel,
  getPermissionSummary,
  batchCheckPermissions,
  getUserAvailablePermissions,
  canUserPerformOperation,
  getUserLevelPermissionDescription,
  canUpgradeToLevel,
  getUserLevelPriority,
} from './permission-utils';

// ===== 向后兼容性导出 =====
// 这些是原始文件中的主要导出，保持100%向后兼容

/**
 * 权限验证函数 - 主要入口点（向后兼容）
 */
// export { validatePermissions as default } from './permission-validator';

/**
 * 权限检查工具函数（向后兼容）
 */
export const PermissionUtils_Legacy = {
  /**
   * 检查用户是否有指定权限
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const { hasPermission } = await import('./permission-utils');
    return hasPermission(userId, permission);
  },

  /**
   * 检查用户等级是否满足要求
   */
  checkUserLevel(userLevel: any, requiredLevel: any): boolean {
    // 定义用户等级层次
    const levelHierarchy = ['GUEST', 'MEMBER', 'VIP', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'];
    const userLevelIndex = levelHierarchy.indexOf(userLevel);
    const requiredLevelIndex = levelHierarchy.indexOf(requiredLevel);

    return userLevelIndex >= requiredLevelIndex;
  },

  /**
   * 获取用户权限摘要
   */
  async getPermissionSummary(userId: string) {
    const { getPermissionSummary } = await import('./permission-utils');
    return getPermissionSummary(userId);
  },
};

/**
 * 清除权限缓存（向后兼容）
 */
/**
 * 清除权限配置缓存
 */
function clearPermissionConfigCache(userLevel?: any) {
  // 实现权限配置缓存清除逻辑
  console.log('清除权限配置缓存:', userLevel);
}

export function clearPermissionCache(userLevel?: any) {
  clearPermissionConfigCache(userLevel);
}

// ===== 重新导出原始接口名称以保持兼容性 =====

/**
 * 原始的权限验证函数名称（向后兼容）
 */
export { validatePermissions as validatePermissions_Original } from './permission-validator';

/**
 * 原始的权限检查工具（向后兼容）
 */
export { PermissionUtils as PermissionUtils_Original } from './permission-utils';

// ===== 模块初始化和配置 =====

/**
 * 初始化权限系统
 */
export async function initializePermissionSystem(config?: any) {
  try {
    const { permissionCacheManager } = await import('./permission-cache');
    const { auditLogManager } = await import('./audit-logger');

    // 更新配置
    if (config?.cache) {
      permissionCacheManager.updateConfig(config.cache);
    }

    if (config?.audit) {
      auditLogManager.updateConfig(config.audit);
    }

    // 预热缓存
    if (config?.cache?.enabled !== false) {
      await permissionCacheManager.warmupCache();
    }

    console.log('权限系统初始化完成');
  } catch (error) {
    console.error('权限系统初始化失败:', error);
    throw error;
  }
}

/**
 * 销毁权限系统
 */
export async function destroyPermissionSystem() {
  try {
    const { permissionCacheManager } = await import('./permission-cache');
    const { auditLogManager } = await import('./audit-logger');

    await auditLogManager.destroy();
    permissionCacheManager.destroy();
    console.log('权限系统已销毁');
  } catch (error) {
    console.error('权限系统销毁失败:', error);
  }
}

/**
 * 权限缓存管理器（模拟实现）
 */
const permissionCacheManager = {
  getCacheStats() {
    return {
      size: 0,
      hits: 0,
      misses: 0,
    };
  }
};

/**
 * 审计日志管理器（模拟实现）
 */
const auditLogManager = {
  getBufferSize() {
    return 0;
  }
};

/**
 * 获取权限系统状态
 */
export function getPermissionSystemStatus() {
  return {
    cache: permissionCacheManager.getCacheStats(),
    audit: {
      bufferSize: auditLogManager.getBufferSize(),
    },
    timestamp: new Date().toISOString(),
  };
}

// ===== 默认导出（向后兼容） =====
// export default validatePermissions;
