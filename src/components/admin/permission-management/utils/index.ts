/**
 * @fileoverview 权限管理工具函数
 * @description 包含权限管理相关的辅助函数
 */

import type { PermissionConfig, PermissionConfigForm, UserLevelConfig } from "../types";

/**
 * 获取权限配置的显示状态
 */
export const getPermissionStatus = (config: PermissionConfig | undefined) => {
  if (!config) {
    return {
      hasConfig: false,
      statusText: "未配置",
      statusColor: "text-red-600",
      icon: "XCircle",
    };
  }

  return {
    hasConfig: true,
    statusText: "已配置",
    statusColor: "text-green-600",
    icon: "CheckCircle",
  };
};

/**
 * 获取权限配置的摘要信息
 */
export const getPermissionSummary = (config: PermissionConfig) => {
  return {
    canPublishMoments: config.canPublishMoments ? "允许" : "禁止",
    canPublishPosts: config.canPublishPosts ? "允许" : "禁止",
    dailyMomentsLimit: config.dailyMomentsLimit === -1 ? "无限制" : config.dailyMomentsLimit,
    dailyPostsLimit: config.dailyPostsLimit === -1 ? "无限制" : config.dailyPostsLimit,
    canUploadImages: config.canUploadImages ? "允许" : "禁止",
    canUploadVideos: config.canUploadVideos ? "允许" : "禁止",
  };
};

/**
 * 验证权限配置数据
 */
export const validatePermissionConfig = (data: PermissionConfigForm): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  // 验证数字字段的合理性
  if (data.dailyMomentsLimit < -1) {
    errors.push("每日动态限制不能小于-1");
  }

  if (data.dailyPostsLimit < -1) {
    errors.push("每日作品限制不能小于-1");
  }

  if (data.maxImagesPerUpload < -1) {
    errors.push("每次最大图片数量不能小于-1");
  }

  if (data.maxVideosPerUpload < -1) {
    errors.push("每次最大视频数量不能小于-1");
  }

  if (data.momentMinLength < 1) {
    errors.push("动态最短字符数不能小于1");
  }

  if (data.momentMaxLength < 1) {
    errors.push("动态最长字符数不能小于1");
  }

  if (data.momentMinLength > data.momentMaxLength) {
    errors.push("动态最短字符数不能大于最长字符数");
  }

  // 验证评论权限
  if (data.dailyCommentLimit !== undefined && data.dailyCommentLimit < -1) {
    errors.push("每日评论限制不能小于-1");
  }

  // 验证社交账号权限
  if (data.maxSocialLinks !== undefined && data.maxSocialLinks < 0) {
    errors.push("最大社交账号数量不能小于0");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * 格式化权限配置数据用于保存
 */
export const formatPermissionConfigForSave = (
  data: PermissionConfigForm,
  userLevel: string
): any => {
  return {
    userLevel,
    ...data,
    // 确保数字字段为整数
    dailyMomentsLimit: Math.floor(data.dailyMomentsLimit),
    dailyPostsLimit: Math.floor(data.dailyPostsLimit),
    maxImagesPerUpload: Math.floor(data.maxImagesPerUpload),
    maxVideosPerUpload: Math.floor(data.maxVideosPerUpload),
    momentMinLength: Math.floor(data.momentMinLength),
    momentMaxLength: Math.floor(data.momentMaxLength),
    dailyCommentLimit: data.dailyCommentLimit ? Math.floor(data.dailyCommentLimit) : undefined,
    maxSocialLinks: data.maxSocialLinks ? Math.floor(data.maxSocialLinks) : undefined,
  };
};

/**
 * 获取用户等级的显示信息
 */
export const getUserLevelInfo = (userLevel: string, configs: UserLevelConfig[]) => {
  return configs.find(config => config.value === userLevel) || {
    value: userLevel,
    label: userLevel,
    description: "未知用户等级",
    color: "bg-gray-100 text-gray-800",
  };
};

/**
 * 检查是否为游客用户等级
 */
export const isGuestLevel = (userLevel: string): boolean => {
  return userLevel === "GUEST";
};

/**
 * 获取权限配置的变更摘要
 */
export const getConfigChangeSummary = (
  oldConfig: PermissionConfig | undefined,
  newConfig: PermissionConfigForm
): string[] => {
  const changes: string[] = [];

  if (!oldConfig) {
    changes.push("创建新的权限配置");
    return changes;
  }

  // 检查发布权限变更
  if (oldConfig.canPublishMoments !== newConfig.canPublishMoments) {
    changes.push(`动态发布权限: ${oldConfig.canPublishMoments ? "允许" : "禁止"} → ${newConfig.canPublishMoments ? "允许" : "禁止"}`);
  }

  if (oldConfig.canPublishPosts !== newConfig.canPublishPosts) {
    changes.push(`作品发布权限: ${oldConfig.canPublishPosts ? "允许" : "禁止"} → ${newConfig.canPublishPosts ? "允许" : "禁止"}`);
  }

  // 检查限制变更
  if (oldConfig.dailyMomentsLimit !== newConfig.dailyMomentsLimit) {
    const oldLimit = oldConfig.dailyMomentsLimit === -1 ? "无限制" : oldConfig.dailyMomentsLimit;
    const newLimit = newConfig.dailyMomentsLimit === -1 ? "无限制" : newConfig.dailyMomentsLimit;
    changes.push(`每日动态限制: ${oldLimit} → ${newLimit}`);
  }

  if (oldConfig.dailyPostsLimit !== newConfig.dailyPostsLimit) {
    const oldLimit = oldConfig.dailyPostsLimit === -1 ? "无限制" : oldConfig.dailyPostsLimit;
    const newLimit = newConfig.dailyPostsLimit === -1 ? "无限制" : newConfig.dailyPostsLimit;
    changes.push(`每日作品限制: ${oldLimit} → ${newLimit}`);
  }

  // 检查上传权限变更
  if (oldConfig.canUploadImages !== newConfig.canUploadImages) {
    changes.push(`图片上传权限: ${oldConfig.canUploadImages ? "允许" : "禁止"} → ${newConfig.canUploadImages ? "允许" : "禁止"}`);
  }

  if (oldConfig.canUploadVideos !== newConfig.canUploadVideos) {
    changes.push(`视频上传权限: ${oldConfig.canUploadVideos ? "允许" : "禁止"} → ${newConfig.canUploadVideos ? "允许" : "禁止"}`);
  }

  return changes;
};

/**
 * 生成权限配置的导出数据
 */
export const exportPermissionConfig = (config: PermissionConfig) => {
  return {
    userLevel: config.userLevel,
    permissions: {
      publishing: {
        canPublishMoments: config.canPublishMoments,
        canPublishPosts: config.canPublishPosts,
        dailyMomentsLimit: config.dailyMomentsLimit,
        dailyPostsLimit: config.dailyPostsLimit,
      },
      upload: {
        canUploadImages: config.canUploadImages,
        canUploadVideos: config.canUploadVideos,
        maxImagesPerUpload: config.maxImagesPerUpload,
        maxVideosPerUpload: config.maxVideosPerUpload,
      },
      content: {
        momentMinLength: config.momentMinLength,
        momentMaxLength: config.momentMaxLength,
      },
      access: {
        canViewPosts: config.canViewPosts,
        canViewProfiles: config.canViewProfiles,
        canViewComments: config.canViewComments,
        canPlayVideos: config.canPlayVideos,
        canDownloadImages: config.canDownloadImages,
        canSearchContent: config.canSearchContent,
        canViewTags: config.canViewTags,
        canLikePosts: config.canLikePosts,
        canComment: config.canComment,
        canFollow: config.canFollow,
        canShare: config.canShare,
      },
      comment: {
        requiresCommentApproval: config.requiresCommentApproval,
        canCommentWithImages: config.canCommentWithImages,
        dailyCommentLimit: config.dailyCommentLimit,
      },
      social: {
        canUseSocialLinks: config.canUseSocialLinks,
        maxSocialLinks: config.maxSocialLinks,
        canUseCustomLinks: config.canUseCustomLinks,
      },
    },
    metadata: {
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    },
  };
};

/**
 * 检查权限配置是否完整
 */
export const isPermissionConfigComplete = (config: PermissionConfig): boolean => {
  const requiredFields = [
    'canPublishMoments',
    'canPublishPosts',
    'dailyMomentsLimit',
    'dailyPostsLimit',
    'canUploadImages',
    'canUploadVideos',
    'maxImagesPerUpload',
    'maxVideosPerUpload',
    'momentMinLength',
    'momentMaxLength',
  ];

  return requiredFields.every(field => config[field as keyof PermissionConfig] !== undefined);
};

/**
 * 获取权限配置的风险等级
 */
export const getPermissionRiskLevel = (config: PermissionConfig): {
  level: 'low' | 'medium' | 'high';
  reasons: string[];
} => {
  const reasons: string[] = [];
  let riskScore = 0;

  // 检查发布权限风险
  if (config.canPublishPosts && config.dailyPostsLimit === -1) {
    reasons.push("允许无限制发布作品");
    riskScore += 2;
  }

  if (config.canUploadVideos && config.maxVideosPerUpload === -1) {
    reasons.push("允许无限制上传视频");
    riskScore += 2;
  }

  // 检查评论权限风险
  if (config.canComment && !config.requiresCommentApproval) {
    reasons.push("允许评论且无需审核");
    riskScore += 1;
  }

  if (config.dailyCommentLimit === -1) {
    reasons.push("无评论数量限制");
    riskScore += 1;
  }

  // 确定风险等级
  let level: 'low' | 'medium' | 'high' = 'low';
  if (riskScore >= 4) {
    level = 'high';
  } else if (riskScore >= 2) {
    level = 'medium';
  }

  return { level, reasons };
};
