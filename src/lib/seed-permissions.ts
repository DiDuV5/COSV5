/**
 * @fileoverview 权限配置种子数据
 * @description 初始化默认的用户权限配置
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @prisma/client: ^5.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedPermissions() {
  console.log('开始初始化权限配置...');

  const defaultConfigs = [
    {
      userLevel: 'GUEST',
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
    },
    {
      userLevel: 'USER',
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
    },
    {
      userLevel: 'USER',
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
    },
    {
      userLevel: 'CREATOR',
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
    },
    {
      userLevel: 'ADMIN',
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
    },
  ];

  for (const config of defaultConfigs) {
    try {
      await prisma.userPermissionConfig.upsert({
        where: { userLevel: config.userLevel },
        update: config,
        create: config,
      });
      console.log(`✅ 权限配置已创建/更新: ${config.userLevel}`);
    } catch (error) {
      console.error(`❌ 创建权限配置失败 (${config.userLevel}):`, error);
    }
  }

  console.log('权限配置初始化完成！');
}

// 如果直接运行此文件，则执行种子数据
if (require.main === module) {
  seedPermissions()
    .catch((e) => {
      console.error('权限配置初始化失败:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
