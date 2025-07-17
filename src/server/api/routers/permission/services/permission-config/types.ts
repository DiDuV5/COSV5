/**
 * @fileoverview 权限配置类型定义
 * @description 权限配置服务相关的类型定义和接口
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

/**
 * 权限配置更新参数接口
 */
export interface PermissionConfigUpdateParams {
  userLevel: string;
  mediaAccessPercentage?: number;
  canPlayVideos?: boolean;
  canViewRestrictedPreview?: boolean;
  canDownloadImages?: boolean;
  canPublishMoments?: boolean;
  canPublishPosts?: boolean;
  dailyMomentsLimit?: number;
  dailyPostsLimit?: number;
  canUploadImages?: boolean;
  canUploadVideos?: boolean;
  maxImagesPerUpload?: number;
  maxVideosPerUpload?: number;
  momentMinLength?: number;
  momentMaxLength?: number;
}

/**
 * 批量权限更新参数接口
 */
export interface BatchPermissionUpdateParams {
  updates: Array<{
    userLevel: string;
    mediaAccessPercentage?: number;
    canPlayVideos?: boolean;
    canViewRestrictedPreview?: boolean;
    canDownloadImages?: boolean;
  }>;
  reason?: string;
}

/**
 * 权限配置响应接口
 */
export interface PermissionConfigResponse {
  success: boolean;
  message: string;
  config?: any;
}

/**
 * 批量权限配置响应接口
 */
export interface BatchPermissionConfigResponse {
  success: boolean;
  message: string;
  configs: any[];
}

/**
 * 权限配置统计接口
 */
export interface PermissionConfigStats {
  totalConfigs: number;
  configsByLevel: Record<string, number>;
  usersByLevel: Record<string, number>;
}

/**
 * 权限变更日志参数接口
 */
export interface PermissionChangeLogParams {
  adminId: string;
  action: string;
  userLevel: string;
  changes: any;
}

/**
 * 批量权限变更日志参数接口
 */
export interface BatchPermissionChangeLogParams {
  adminId: string;
  updates: any[];
  reason?: string;
}

/**
 * 默认权限配置接口
 */
export interface DefaultPermissionConfig {
  canPublishMoments: boolean;
  canPublishPosts: boolean;
  dailyMomentsLimit: number;
  dailyPostsLimit: number;
  canUploadImages: boolean;
  canUploadVideos: boolean;
  maxImagesPerUpload: number;
  maxVideosPerUpload: number;
  momentMinLength: number;
  momentMaxLength: number;
  mediaAccessPercentage: number;
  canPlayVideos: boolean;
  canViewRestrictedPreview: boolean;
  canDownloadImages: boolean;
}

/**
 * 用户等级枚举
 */
export enum UserLevel {
  GUEST = 'GUEST',
  USER = 'USER',
  VIP = 'VIP',
  CREATOR = 'CREATOR',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

/**
 * 权限操作类型枚举
 */
export enum PermissionAction {
  UPDATE_PERMISSION_CONFIG = 'UPDATE_PERMISSION_CONFIG',
  RESET_PERMISSION_CONFIG = 'RESET_PERMISSION_CONFIG',
  DELETE_PERMISSION_CONFIG = 'DELETE_PERMISSION_CONFIG',
  BATCH_UPDATE_PERMISSION_CONFIG = 'BATCH_UPDATE_PERMISSION_CONFIG',
}

/**
 * 有效的用户等级数组
 */
export const VALID_USER_LEVELS: string[] = [
  UserLevel.GUEST,
  UserLevel.USER,
  UserLevel.VIP,
  UserLevel.CREATOR,
  UserLevel.ADMIN,
  UserLevel.SUPER_ADMIN,
];

/**
 * 管理员等级数组
 */
export const ADMIN_LEVELS: string[] = [
  UserLevel.ADMIN,
  UserLevel.SUPER_ADMIN,
];

/**
 * 低级用户等级数组
 */
export const LOW_LEVEL_USERS: string[] = [
  UserLevel.GUEST,
  UserLevel.USER,
];

/**
 * 危险权限列表
 */
export const DANGEROUS_PERMISSIONS: string[] = [
  'canPublishPosts',
  'canUploadVideos',
];

/**
 * 权限配置限制常量
 */
export const PERMISSION_LIMITS = {
  MAX_IMAGES_PER_UPLOAD: 100,
  MAX_VIDEOS_PER_UPLOAD: 10,
  MAX_DAILY_POSTS_LIMIT: 1000,
  MIN_MEDIA_ACCESS_PERCENTAGE: 0,
  MAX_MEDIA_ACCESS_PERCENTAGE: 100,
} as const;

/**
 * 默认权限配置常量
 */
export const DEFAULT_PERMISSION_CONFIG: DefaultPermissionConfig = {
  canPublishMoments: false,
  canPublishPosts: false,
  dailyMomentsLimit: 0,
  dailyPostsLimit: 0,
  canUploadImages: false,
  canUploadVideos: false,
  maxImagesPerUpload: 0,
  maxVideosPerUpload: 0,
  momentMinLength: 1,
  momentMaxLength: 500,
  mediaAccessPercentage: 0,
  canPlayVideos: false,
  canViewRestrictedPreview: false,
  canDownloadImages: false,
};
