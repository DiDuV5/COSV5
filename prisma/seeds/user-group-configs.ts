/**
 * @fileoverview Tu Cosplay 平台用户组权限配置种子数据
 * @description 初始化5个用户等级的权限配置，包含发布、上传、互动等权限设置
 * @author Augment AI
 * @date 2024-01-XX
 * @version 2.0.0
 * @since 1.0.0
 *
 * @features
 * - 6个用户等级: GUEST(访客), USER(入馆), VIP(会员), CREATOR(荣誉), ADMIN(守馆), SUPER_ADMIN(超级管理员)
 * - 发布权限: 动态和作品发布权限及数量限制
 * - 上传权限: 图片和视频上传权限及数量限制
 * - 互动权限: 点赞、评论、关注、分享等权限
 * - 内容访问: 不同内容的查看和下载权限
 *
 * @dependencies
 * - @prisma/client: ^5.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，重命名用户组系统
 * - 2025-01-XX: v2.0.0 优化为5个用户等级，完善权限配置
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * 用户组权限配置数据
 * 重命名后的用户组：访客、入馆、赞助、荣誉、守馆
 */
export const userGroupConfigs = [
  {
    userLevel: 'GUEST', // 访客
    canPublishMoments: false,
    canPublishPosts: false,
    dailyMomentsLimit: 0,
    dailyPostsLimit: 0,
    canUploadImages: false,
    canUploadVideos: false,
    maxImagesPerUpload: 0,
    maxVideosPerUpload: 0,
    momentMinLength: 1,
    momentMaxLength: 100,
    // 游客权限配置
    canViewPosts: true,
    canViewProfiles: true,
    canViewComments: true,
    canPlayVideos: false,
    canDownloadImages: false,
    canSearchContent: true,
    canViewTags: true,
    canLikePosts: false,
    canComment: false,
    canFollow: false,
    canShare: false,
    requireLoginForPosts: false,
    requireLoginForProfiles: false,
    requireLoginForVideos: true,
    // 媒体访问权限配置
    mediaAccessPercentage: 20,
    canViewRestrictedPreview: false,
    // 评论权限配置
    dailyCommentLimit: 0,
  },
  {
    userLevel: 'USER', // 入馆
    canPublishMoments: true,
    canPublishPosts: false,
    dailyMomentsLimit: 5,
    dailyPostsLimit: 0,
    canUploadImages: true,
    canUploadVideos: false,
    maxImagesPerUpload: 3,
    maxVideosPerUpload: 0,
    momentMinLength: 1,
    momentMaxLength: 500,
    // 基础用户权限配置
    canViewPosts: true,
    canViewProfiles: true,
    canViewComments: true,
    canPlayVideos: true,
    canDownloadImages: true,
    canSearchContent: true,
    canViewTags: true,
    canLikePosts: true,
    canComment: true,
    canFollow: true,
    canShare: true,
    requireLoginForPosts: false,
    requireLoginForProfiles: false,
    requireLoginForVideos: false,
    // 媒体访问权限配置
    mediaAccessPercentage: 60,
    canViewRestrictedPreview: true,
    // 评论权限配置
    dailyCommentLimit: 10,
  },
  {
    userLevel: 'USER', // 赞助
    canPublishMoments: true,
    canPublishPosts: true,
    dailyMomentsLimit: 10,
    dailyPostsLimit: 3,
    canUploadImages: true,
    canUploadVideos: true,
    maxImagesPerUpload: 10,
    maxVideosPerUpload: 3,
    momentMinLength: 1,
    momentMaxLength: 1000,
    // 付费用户权限配置
    canViewPosts: true,
    canViewProfiles: true,
    canViewComments: true,
    canPlayVideos: true,
    canDownloadImages: true,
    canSearchContent: true,
    canViewTags: true,
    canLikePosts: true,
    canComment: true,
    canFollow: true,
    canShare: true,
    requireLoginForPosts: false,
    requireLoginForProfiles: false,
    requireLoginForVideos: false,
    // 媒体访问权限配置
    mediaAccessPercentage: 100,
    canViewRestrictedPreview: true,
    // 评论权限配置
    dailyCommentLimit: 30,
  },
  {
    userLevel: 'CREATOR', // 荣誉
    canPublishMoments: true,
    canPublishPosts: true,
    dailyMomentsLimit: 20,
    dailyPostsLimit: 10,
    canUploadImages: true,
    canUploadVideos: true,
    maxImagesPerUpload: 20,
    maxVideosPerUpload: 10,
    momentMinLength: 1,
    momentMaxLength: 2000,
    // 创作者权限配置
    canViewPosts: true,
    canViewProfiles: true,
    canViewComments: true,
    canPlayVideos: true,
    canDownloadImages: true,
    canSearchContent: true,
    canViewTags: true,
    canLikePosts: true,
    canComment: true,
    canFollow: true,
    canShare: true,
    requireLoginForPosts: false,
    requireLoginForProfiles: false,
    requireLoginForVideos: false,
    // 媒体访问权限配置
    mediaAccessPercentage: 100,
    canViewRestrictedPreview: true,
    // 评论权限配置
    dailyCommentLimit: 50,
  },
  {
    userLevel: 'ADMIN', // 守馆
    canPublishMoments: true,
    canPublishPosts: true,
    dailyMomentsLimit: -1, // 无限制
    dailyPostsLimit: -1,   // 无限制
    canUploadImages: true,
    canUploadVideos: true,
    maxImagesPerUpload: -1, // 无限制
    maxVideosPerUpload: -1, // 无限制
    momentMinLength: 1,
    momentMaxLength: 5000,
    // 管理员权限配置
    canViewPosts: true,
    canViewProfiles: true,
    canViewComments: true,
    canPlayVideos: true,
    canDownloadImages: true,
    canSearchContent: true,
    canViewTags: true,
    canLikePosts: true,
    canComment: true,
    canFollow: true,
    canShare: true,
    requireLoginForPosts: false,
    requireLoginForProfiles: false,
    requireLoginForVideos: false,
    // 媒体访问权限配置
    mediaAccessPercentage: 100,
    canViewRestrictedPreview: true,
    // 评论权限配置
    dailyCommentLimit: -1, // 无限制
  },
];

/**
 * 创建用户组权限配置
 */
export async function seedUserGroupConfigs() {
  console.log("🔧 开始创建用户组权限配置...");

  try {
    for (const config of userGroupConfigs) {
      const _result = await prisma.userPermissionConfig.upsert({
        where: { userLevel: config.userLevel },
        update: config,
        create: config,
      });

      const levelName = config.userLevel === 'GUEST' ? '访客' :
                       config.userLevel === 'USER' ? '入馆' :
                       config.userLevel === 'VIP' ? '赞助' :
                       config.userLevel === 'CREATOR' ? '荣誉' :
                       config.userLevel === 'ADMIN' ? '守馆' : config.userLevel;

      console.log(`✅ 用户组权限配置已创建/更新: ${levelName} (${config.userLevel})`);
    }

    console.log("🎉 用户组权限配置创建完成！");
  } catch (error) {
    console.error("❌ 用户组权限配置创建失败:", error);
    throw error;
  }
}
