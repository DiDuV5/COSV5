/**
 * @fileoverview 权限系统类型定义
 * @description 统一权限中间件的类型定义
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { UserLevel } from '@/types/user-level';

/**
 * 权限检查选项
 */
export interface PermissionOptions {
  /** 需要的最低用户等级 */
  requiredLevel?: UserLevel;
  /** 需要的具体权限 */
  requiredPermissions?: string[];
  /** 是否需要验证用户 */
  requireVerified?: boolean;
  /** 是否需要激活用户 */
  requireActive?: boolean;
  /** 是否需要发布权限 */
  requirePublishPermission?: boolean;
  /** 操作描述（用于错误消息） */
  operation?: string;
  /** 是否启用审计日志 */
  enableAudit?: boolean;
  /** 资源ID（用于细粒度权限控制） */
  resourceId?: string;
  /** 资源类型 */
  resourceType?: 'post' | 'comment' | 'user' | 'media' | 'system';
}

/**
 * 权限审计日志接口
 */
export interface PermissionAuditLog {
  userId: string;
  operation: string;
  resourceType?: string;
  resourceId?: string;
  result: 'GRANTED' | 'DENIED';
  reason?: string;
  userLevel: UserLevel;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * 缓存项接口
 */
export interface CacheItem<T> {
  data: T;
  timestamp: number;
}

/**
 * 用户权限配置接口
 */
export interface UserPermissionConfig {
  userLevel: UserLevel;
  canUploadImages?: boolean;
  canUploadVideos?: boolean;
  canPublishPosts?: boolean;
  canPublishMoments?: boolean;
  canLikePosts?: boolean;
  canComment?: boolean;
  canFollow?: boolean;
  canShare?: boolean;
  canSearchContent?: boolean;
  canViewTags?: boolean;
}

/**
 * 用户信息接口（权限检查用）
 */
export interface UserInfo {
  id: string;
  username: string;
  email: string;
  userLevel: UserLevel;
  isVerified: boolean;
  canPublish: boolean;
  isActive: boolean;
  approvalStatus: string;
  lastLoginAt?: Date;
  createdAt: Date;
}

/**
 * 权限验证上下文
 */
export interface PermissionContext {
  session?: {
    user?: {
      id: string;
      [key: string]: any;
    };
  };
  db: any;
  user?: UserInfo;
  permissionCheckDuration?: number;
}

/**
 * 安全事件日志接口
 */
export interface SecurityEventLog {
  timestamp: string;
  eventType: string;
  details: Record<string, any>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  permissionConfigCacheSize: number;
  userPermissionCacheSize: number;
  auditLogBufferSize: number;
}

/**
 * 权限摘要信息
 */
export interface PermissionSummary {
  userLevel: UserLevel;
  isActive: boolean;
  isVerified: boolean;
  permissions: UserPermissionConfig | null;
}

/**
 * 资源访问检查参数
 */
export interface ResourceAccessParams {
  userId: string;
  resourceType: string;
  resourceId: string;
  operation: string;
  db: any;
}

/**
 * 权限验证结果
 */
export interface PermissionValidationResult {
  success: boolean;
  user?: UserInfo;
  context?: PermissionContext;
  error?: string;
  duration?: number;
}

/**
 * 权限检查器工厂选项
 */
export interface PermissionValidatorOptions extends PermissionOptions {
  /** 自定义验证逻辑 */
  customValidator?: (ctx: PermissionContext) => Promise<boolean>;
  /** 错误处理器 */
  errorHandler?: (error: Error, ctx: PermissionContext) => void;
}

/**
 * 审计日志配置
 */
export interface AuditConfig {
  /** 是否启用审计日志 */
  enabled: boolean;
  /** 缓冲区大小 */
  bufferSize: number;
  /** 刷新间隔（毫秒） */
  flushInterval: number;
  /** 是否记录成功的操作 */
  logSuccessfulOperations: boolean;
  /** 是否记录失败的操作 */
  logFailedOperations: boolean;
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  /** 权限配置缓存TTL（毫秒） */
  permissionConfigTTL: number;
  /** 用户权限缓存TTL（毫秒） */
  userPermissionTTL: number;
  /** 缓存清理间隔（毫秒） */
  cleanupInterval: number;
  /** 是否启用缓存 */
  enabled: boolean;
}

/**
 * 权限中间件配置
 */
export interface PermissionMiddlewareConfig {
  /** 审计配置 */
  audit: AuditConfig;
  /** 缓存配置 */
  cache: CacheConfig;
  /** 慢查询阈值（毫秒） */
  slowQueryThreshold: number;
  /** 是否启用性能监控 */
  enablePerformanceMonitoring: boolean;
}

/**
 * 默认配置
 */
export const DEFAULT_PERMISSION_CONFIG: PermissionMiddlewareConfig = {
  audit: {
    enabled: true,
    bufferSize: 100,
    flushInterval: 60000, // 1分钟
    logSuccessfulOperations: true,
    logFailedOperations: true,
  },
  cache: {
    permissionConfigTTL: 5 * 60 * 1000, // 5分钟
    userPermissionTTL: 2 * 60 * 1000, // 2分钟
    cleanupInterval: 60000, // 1分钟
    enabled: true,
  },
  slowQueryThreshold: 100, // 100毫秒
  enablePerformanceMonitoring: true,
};

/**
 * 权限常量
 */
export const PERMISSIONS = {
  UPLOAD_IMAGES: 'UPLOAD_IMAGES',
  UPLOAD_VIDEOS: 'UPLOAD_VIDEOS',
  PUBLISH_POSTS: 'PUBLISH_POSTS',
  PUBLISH_MOMENTS: 'PUBLISH_MOMENTS',
  LIKE_POSTS: 'LIKE_POSTS',
  COMMENT: 'COMMENT',
  FOLLOW: 'FOLLOW',
  SHARE: 'SHARE',
  SEARCH_CONTENT: 'SEARCH_CONTENT',
  VIEW_TAGS: 'VIEW_TAGS',
} as const;

/**
 * 资源类型常量
 */
export const RESOURCE_TYPES = {
  POST: 'post',
  COMMENT: 'comment',
  USER: 'user',
  MEDIA: 'media',
  SYSTEM: 'system',
} as const;

/**
 * 操作类型常量
 */
export const OPERATIONS = {
  VIEW: 'view',
  EDIT: 'edit',
  DELETE: 'delete',
  CREATE: 'create',
  DOWNLOAD: 'download',
  VIEW_PROFILE: 'view_profile',
  EDIT_PROFILE: 'edit_profile',
  DELETE_ACCOUNT: 'delete_account',
} as const;

/**
 * 安全事件类型常量
 */
export const SECURITY_EVENTS = {
  UNAUTHORIZED_ACCESS_ATTEMPT: 'UNAUTHORIZED_ACCESS_ATTEMPT',
  INVALID_SESSION_FORMAT: 'INVALID_SESSION_FORMAT',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INACTIVE_USER_ACCESS_ATTEMPT: 'INACTIVE_USER_ACCESS_ATTEMPT',
  REJECTED_USER_ACCESS_ATTEMPT: 'REJECTED_USER_ACCESS_ATTEMPT',
  UNVERIFIED_USER_ACCESS_ATTEMPT: 'UNVERIFIED_USER_ACCESS_ATTEMPT',
  INSUFFICIENT_USER_LEVEL: 'INSUFFICIENT_USER_LEVEL',
  INVALID_USER_LEVEL: 'INVALID_USER_LEVEL',
} as const;
