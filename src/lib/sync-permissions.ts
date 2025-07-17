/**
 * @fileoverview 权限同步工具
 * @description 同步旧的canPublish字段和新的UserPermissionConfig权限配置
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * // 同步所有用户权限
 * import { syncUserPermissions } from './sync-permissions'
 * await syncUserPermissions()
 *
 * @dependencies
 * - @prisma/client: ^5.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，权限系统同步工具
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 同步用户权限配置
 * @description 根据UserPermissionConfig更新User表的canPublish字段
 * @returns 同步结果统计
 */
export async function syncUserPermissions(): Promise<{
  success: boolean;
  updatedUsers: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let updatedUsers = 0;

  try {
    console.log('🔄 开始同步用户权限配置...');

    // 获取所有用户
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        userLevel: true,
        canPublish: true,
      },
    });

    console.log(`📊 找到 ${users.length} 个用户需要检查权限`);

    // 获取所有权限配置
    const permissionConfigs = await prisma.userPermissionConfig.findMany();
    const configMap = new Map(
      permissionConfigs.map(config => [config.userLevel, config])
    );

    // 同步每个用户的权限
    for (const user of users) {
      try {
        const config = configMap.get(user.userLevel);

        if (!config) {
          errors.push(`用户 ${user.username} 的等级 ${user.userLevel} 没有对应的权限配置`);
          continue;
        }

        // 计算新的canPublish值
        const newCanPublish = config.canPublishPosts || config.canPublishMoments;

        // 如果权限不一致，则更新
        if (user.canPublish !== newCanPublish) {
          await prisma.user.update({
            where: { id: user.id },
            data: { canPublish: newCanPublish },
          });

          console.log(`✅ 更新用户 ${user.username} 权限: ${user.canPublish} → ${newCanPublish}`);
          updatedUsers++;
        }
      } catch (error) {
        const errorMsg = `更新用户 ${user.username} 权限失败: ${error}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log(`🎉 权限同步完成！更新了 ${updatedUsers} 个用户的权限`);

    return {
      success: errors.length === 0,
      updatedUsers,
      errors,
    };
  } catch (error) {
    const errorMsg = `权限同步过程中发生错误: ${error}`;
    errors.push(errorMsg);
    console.error(`❌ ${errorMsg}`);

    return {
      success: false,
      updatedUsers,
      errors,
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 检查权限配置完整性
 * @description 检查是否所有用户等级都有对应的权限配置
 * @returns 检查结果
 */
export async function checkPermissionIntegrity(): Promise<{
  success: boolean;
  missingConfigs: string[];
  inconsistentUsers: Array<{
    username: string;
    userLevel: string;
    canPublish: boolean;
    shouldCanPublish: boolean;
  }>;
}> {
  try {
    console.log('🔍 检查权限配置完整性...');

    // 获取所有用户等级
    const userLevels = await prisma.user.findMany({
      select: { userLevel: true },
      distinct: ['userLevel'],
    });

    // 获取所有权限配置
    const permissionConfigs = await prisma.userPermissionConfig.findMany();
    const configLevels = new Set(permissionConfigs.map(config => config.userLevel));

    // 检查缺失的配置
    const missingConfigs = userLevels
      .map(user => user.userLevel)
      .filter(level => !configLevels.has(level));

    if (missingConfigs.length > 0) {
      console.log(`⚠️ 发现缺失的权限配置: ${missingConfigs.join(', ')}`);
    }

    // 检查权限不一致的用户
    const users = await prisma.user.findMany({
      select: {
        username: true,
        userLevel: true,
        canPublish: true,
      },
    });

    const configMap = new Map(
      permissionConfigs.map(config => [config.userLevel, config])
    );

    const inconsistentUsers: any[] = [];
    for (const user of users) {
      const config = configMap.get(user.userLevel);
      if (config) {
        const shouldCanPublish = config.canPublishPosts || config.canPublishMoments;
        if (user.canPublish !== shouldCanPublish) {
          inconsistentUsers.push({
            username: user.username,
            userLevel: user.userLevel,
            canPublish: user.canPublish,
            shouldCanPublish,
          });
        }
      }
    }

    if (inconsistentUsers.length > 0) {
      console.log(`⚠️ 发现 ${inconsistentUsers.length} 个用户权限不一致`);
      inconsistentUsers.forEach(user => {
        console.log(`  - ${user.username} (${user.userLevel}): ${user.canPublish} → ${user.shouldCanPublish}`);
      });
    }

    return {
      success: missingConfigs.length === 0 && inconsistentUsers.length === 0,
      missingConfigs,
      inconsistentUsers,
    };
  } catch (error) {
    console.error('❌ 检查权限配置完整性失败:', error);
    return {
      success: false,
      missingConfigs: [],
      inconsistentUsers: [],
    };
  }
}

/**
 * 初始化缺失的权限配置
 * @description 为缺失权限配置的用户等级创建默认配置
 * @param missingLevels 缺失配置的用户等级数组
 * @returns 初始化结果
 */
export async function initializeMissingConfigs(missingLevels: string[]): Promise<{
  success: boolean;
  createdConfigs: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let createdConfigs = 0;

  try {
    console.log(`🔧 初始化缺失的权限配置: ${missingLevels.join(', ')}`);

    // 默认权限配置模板
    const defaultConfig = {
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
      requiresCommentApproval: true,
      canCommentWithImages: false,
      dailyCommentLimit: 0,
    };

    for (const userLevel of missingLevels) {
      try {
        await prisma.userPermissionConfig.create({
          data: {
            userLevel,
            ...defaultConfig,
          },
        });

        console.log(`✅ 创建权限配置: ${userLevel}`);
        createdConfigs++;
      } catch (error) {
        const errorMsg = `创建权限配置失败 (${userLevel}): ${error}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    return {
      success: errors.length === 0,
      createdConfigs,
      errors,
    };
  } catch (error) {
    const errorMsg = `初始化权限配置过程中发生错误: ${error}`;
    errors.push(errorMsg);
    console.error(`❌ ${errorMsg}`);

    return {
      success: false,
      createdConfigs,
      errors,
    };
  }
}

/**
 * 完整的权限修复流程
 * @description 检查并修复所有权限相关问题
 * @returns 修复结果
 */
export async function fixAllPermissions(): Promise<{
  success: boolean;
  summary: string;
  details: {
    integrityCheck: any;
    missingConfigsInit: any;
    permissionSync: any;
  };
}> {
  console.log('🚀 开始完整的权限修复流程...');

  // 1. 检查权限配置完整性
  const integrityCheck = await checkPermissionIntegrity();

  // 2. 初始化缺失的权限配置
  let missingConfigsInit: any = null;
  if (integrityCheck.missingConfigs.length > 0) {
    missingConfigsInit = await initializeMissingConfigs(integrityCheck.missingConfigs);
  }

  // 3. 同步用户权限
  const permissionSync = await syncUserPermissions();

  const success = integrityCheck.success &&
                  (missingConfigsInit?.success ?? true) &&
                  permissionSync.success;

  const summary = success
    ? '✅ 权限修复完成！所有权限配置已同步。'
    : '⚠️ 权限修复过程中遇到一些问题，请检查详细信息。';

  console.log(summary);

  return {
    success,
    summary,
    details: {
      integrityCheck,
      missingConfigsInit,
      permissionSync,
    },
  };
}
