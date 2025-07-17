/**
 * @fileoverview 动态发布页面工具函数
 * @description 提供动态发布相关的工具函数
 */

import {
  type PermissionCheckResult,
  type PermissionInfo,
  type DailyLimit,
  type PublishConditionCheck,
  type MediaUploadPermission,
  type VisibilityOption,
  type UserLevel,
  type UserLevelDisplayConfig,
  type MomentVisibility,
  type ErrorMessageMap,
  MomentCreationError
} from '../types';

import { Globe, Users, Lock } from 'lucide-react';

/**
 * 从权限检查结果中提取权限信息
 */
export function getPermissionInfo(permissionCheck: PermissionCheckResult): PermissionInfo | null {
  if (!permissionCheck?.config) return null;

  const config = permissionCheck.config;
  return {
    canPublishMoments: config.canPublishMoments,
    canUploadImages: config.canUploadImages,
    canUploadVideos: config.canUploadVideos,
    maxImagesPerUpload: config.maxImagesPerUpload,
    maxVideosPerUpload: config.maxVideosPerUpload,
    momentMinLength: config.momentMinLength,
    momentMaxLength: config.momentMaxLength,
    userLevel: permissionCheck.userLevel,
  };
}

/**
 * 检查发布条件
 */
export function checkPublishConditions(
  content: string,
  permissionInfo: PermissionInfo,
  dailyLimit: DailyLimit
): PublishConditionCheck {
  const errors: string[] = [];

  // 检查内容长度
  const contentLengthValid =
    content.length >= permissionInfo.momentMinLength &&
    content.length <= permissionInfo.momentMaxLength;

  if (content.length < permissionInfo.momentMinLength) {
    errors.push(`内容长度不足，至少需要 ${permissionInfo.momentMinLength} 个字符`);
  }

  if (content.length > permissionInfo.momentMaxLength) {
    errors.push(`内容长度超限，最多允许 ${permissionInfo.momentMaxLength} 个字符`);
  }

  // 检查是否有内容
  const hasContent = content.trim().length > 0;
  if (!hasContent) {
    errors.push('请填写动态内容');
  }

  // 检查发布次数
  const hasRemainingPublishes = dailyLimit.remaining > 0 || dailyLimit.remaining === -1;
  if (dailyLimit.remaining === 0) {
    errors.push('今日发布次数已达上限，明日 00:00 后可继续发布');
  }

  const canPublish = contentLengthValid && hasContent && hasRemainingPublishes;

  return {
    contentLengthValid,
    hasRemainingPublishes,
    hasContent,
    canPublish,
    errors,
  };
}

/**
 * 获取媒体上传权限状态
 */
export function getMediaUploadPermission(permissionInfo: PermissionInfo): MediaUploadPermission {
  return {
    canUploadImages: permissionInfo.canUploadImages,
    canUploadVideos: permissionInfo.canUploadVideos,
    imageLimit: permissionInfo.maxImagesPerUpload,
    videoLimit: permissionInfo.maxVideosPerUpload,
    hasAnyUploadPermission: permissionInfo.canUploadImages || permissionInfo.canUploadVideos,
  };
}

/**
 * 获取可见性选项列表
 */
export function getVisibilityOptions(): VisibilityOption[] {
  return [
    {
      value: 'PUBLIC',
      label: '公开',
      icon: Globe,
      description: '所有人都可以看到这条动态',
    },
    {
      value: 'FOLLOWERS_ONLY',
      label: '仅关注者可见',
      icon: Users,
      description: '只有关注你的用户可以看到',
    },
    {
      value: 'PRIVATE',
      label: '私密',
      icon: Lock,
      description: '只有你自己可以看到',
    },
  ];
}

/**
 * 获取用户等级显示配置
 */
export function getUserLevelDisplayConfig(userLevel: UserLevel): UserLevelDisplayConfig {
  const configs: Record<UserLevel, UserLevelDisplayConfig> = {
    GUEST: {
      label: '游客',
      badgeVariant: 'destructive',
      colorClass: 'text-red-600',
    },
    USER: {
      label: '注册用户',
      badgeVariant: 'outline',
      colorClass: 'text-blue-600',
    },
    VIP: {
      label: 'VIP会员',
      badgeVariant: 'secondary',
      colorClass: 'text-purple-600',
    },
    CREATOR: {
      label: '创作者',
      badgeVariant: 'secondary',
      colorClass: 'text-green-600',
    },
    ADMIN: {
      label: '管理员',
      badgeVariant: 'default',
      colorClass: 'text-orange-600',
    },
    SUPER_ADMIN: {
      label: '超级管理员',
      badgeVariant: 'default',
      colorClass: 'text-red-700',
    },
  };

  // 安全检查：如果用户等级不存在，返回默认配置
  return configs[userLevel] || configs.USER;
}

/**
 * 计算重置时间
 */
export function calculateResetTime(): { tomorrow: Date; hoursUntilReset: number } {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const timeUntilReset = tomorrow.getTime() - now.getTime();
  const hoursUntilReset = Math.ceil(timeUntilReset / (1000 * 60 * 60));

  return { tomorrow, hoursUntilReset };
}

/**
 * 格式化文件大小限制显示
 */
export function formatFileLimit(limit: number): string {
  if (limit === -1) return '无限制';
  return `最多${limit}个`;
}

/**
 * 格式化剩余发布次数显示
 */
export function formatRemainingPublishes(remaining: number): string {
  if (remaining === -1) return '无限制';
  return `剩余 ${remaining} 次`;
}

/**
 * 验证内容长度
 */
export function validateContentLength(
  content: string,
  minLength: number,
  maxLength: number
): { valid: boolean; error?: string } {
  if (content.length < minLength) {
    return {
      valid: false,
      error: `内容长度不足，至少需要 ${minLength} 个字符`,
    };
  }

  if (content.length > maxLength) {
    return {
      valid: false,
      error: `内容长度超限，最多允许 ${maxLength} 个字符`,
    };
  }

  return { valid: true };
}

/**
 * 检查是否可以上传更多文件
 */
export function canUploadMoreFiles(
  currentCount: number,
  maxCount: number,
  fileType: 'image' | 'video'
): { canUpload: boolean; reason?: string } {
  if (maxCount === -1) {
    return { canUpload: true };
  }

  if (currentCount >= maxCount) {
    return {
      canUpload: false,
      reason: `${fileType === 'image' ? '图片' : '视频'}上传数量已达上限（${maxCount}个）`,
    };
  }

  return { canUpload: true };
}

/**
 * 获取可见性选项的显示信息
 */
export function getVisibilityDisplayInfo(visibility: MomentVisibility) {
  const options = getVisibilityOptions();
  return options.find(option => option.value === visibility);
}

/**
 * 生成动态发布成功的跳转URL
 */
export function generateSuccessRedirectUrl(
  postId?: string,
  username?: string
): string {
  if (postId) {
    return `/posts/${postId}`;
  }
  if (username) {
    return `/users/${username}`;
  }
  return '/moments';
}

/**
 * 错误信息映射
 */
export const ERROR_MESSAGES: ErrorMessageMap = {
  [MomentCreationError.PERMISSION_DENIED]: '您没有发布动态的权限',
  [MomentCreationError.DAILY_LIMIT_EXCEEDED]: '今日发布次数已达上限',
  [MomentCreationError.CONTENT_TOO_SHORT]: '动态内容长度不足',
  [MomentCreationError.CONTENT_TOO_LONG]: '动态内容长度超限',
  [MomentCreationError.UPLOAD_FAILED]: '文件上传失败',
  [MomentCreationError.NETWORK_ERROR]: '网络连接错误',
  [MomentCreationError.UNKNOWN_ERROR]: '发布失败，请稍后重试',
};

/**
 * 获取错误信息
 */
export function getErrorMessage(error: MomentCreationError | string): string {
  if (typeof error === 'string') {
    return error;
  }
  return ERROR_MESSAGES[error] || ERROR_MESSAGES[MomentCreationError.UNKNOWN_ERROR];
}

/**
 * 检查是否为有效的可见性值
 */
export function isValidVisibility(value: string): value is MomentVisibility {
  return ['PUBLIC', 'PRIVATE', 'FOLLOWERS_ONLY'].includes(value);
}

/**
 * 获取内容长度状态样式类名
 */
export function getContentLengthStatusClass(
  length: number,
  minLength: number,
  maxLength: number
): string {
  if (length < minLength || length > maxLength) {
    return 'text-red-500';
  }
  return 'text-gray-500';
}

/**
 * 计算上传文件的最大数量
 */
export function calculateMaxUploadFiles(permissionInfo: PermissionInfo): number {
  const imageLimit = permissionInfo.maxImagesPerUpload === -1 ? 20 : permissionInfo.maxImagesPerUpload;
  const videoLimit = permissionInfo.maxVideosPerUpload === -1 ? 20 : permissionInfo.maxVideosPerUpload;
  return Math.max(imageLimit, videoLimit);
}

/**
 * 检查用户是否有基本发布权限
 */
export function hasBasicPublishPermission(permissionCheck: PermissionCheckResult | undefined): boolean {
  if (!permissionCheck) {
    return false;
  }
  return permissionCheck.hasPermission && !!permissionCheck.config?.canPublishMoments;
}

/**
 * 检查是否达到每日发布限制
 */
export function hasReachedDailyLimit(dailyLimit: DailyLimit | undefined): boolean {
  if (!dailyLimit) {
    return true; // 如果没有限制信息，认为已达到限制
  }
  return !dailyLimit.canPublish || dailyLimit.remaining === 0;
}

/**
 * 格式化时间显示
 */
export function formatTimeDisplay(date: Date): string {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
