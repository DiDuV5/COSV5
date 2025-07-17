/**
 * @fileoverview Tu Cosplay 平台罐头系统配置种子数据
 * @description 为5个用户等级创建差异化的罐头系统配置，支持签到、任务、互动奖励
 * @author Augment AI
 * @date 2024-12-01
 * @version 2.0.0
 * @since 1.0.0
 *
 * @features
 * - 6个用户等级: GUEST(访客), USER(入馆), VIP(会员), CREATOR(荣誉), ADMIN(守馆), SUPER_ADMIN(超级管理员)
 * - 差异化奖励: 不同等级享受不同的罐头奖励和限制
 * - 社交权限: 社交账号链接数量和自定义链接权限
 * - 连续签到: 支持连续签到奖励机制
 *
 * @dependencies
 * - @prisma/client: ^5.0.0
 *
 * @changelog
 * - 2024-12-01: 初始版本创建，支持8个用户等级的差异化配置
 * - 2025-01-XX: v2.0.0 优化为5个用户等级，增强配置说明
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 罐头系统配置数据
 * CoserEden 6级权限体系：GUEST(访客), USER(入馆), VIP(会员), CREATOR(荣誉), ADMIN(守馆), SUPER_ADMIN(超级管理员)
 */
export const cansSystemConfigs = [
  {
    userLevel: 'GUEST',
    dailySigninCans: 0, // 访客无法签到
    consecutiveBonus: JSON.stringify({}),
    likeCans: 0,
    commentCans: 0,
    shareCans: 0,
    publishMomentCans: 0,
    publishPostCans: 0,
    dailyLikeLimit: 0,
    dailyCommentLimit: 0,
    dailyShareLimit: 0,
    dailyMomentLimit: 0,
    dailyPostLimit: 0,
    beLikedCans: 0,
    beCommentedCans: 0,
    beSharedCans: 0,
    dailyExperienceLimit: 0,
    cansToExperienceRatio: 0,
    // 社交账号权限配置
    canUseSocialLinks: false,
    maxSocialLinks: 0,
    canUseCustomLinks: false,
    // 表情权限配置
    allowedReactions: JSON.stringify([]),
  },
  {
    userLevel: 'USER', // 入馆
    dailySigninCans: 10,
    consecutiveBonus: JSON.stringify({ "3": 5, "7": 15, "15": 30, "30": 50 }),
    likeCans: 1,
    commentCans: 2,
    shareCans: 3,
    publishMomentCans: 10,
    publishPostCans: 20,
    dailyLikeLimit: 10,
    dailyCommentLimit: 5,
    dailyShareLimit: 3,
    dailyMomentLimit: 2,
    dailyPostLimit: 1,
    beLikedCans: 1,
    beCommentedCans: 2,
    beSharedCans: 3,
    dailyExperienceLimit: 50,
    cansToExperienceRatio: 1.0,
    // 社交账号权限配置
    canUseSocialLinks: true,
    maxSocialLinks: 5,
    canUseCustomLinks: false,
    // 表情权限配置
    allowedReactions: JSON.stringify(["HEART", "THUMBS_UP"]),
  },
  {
    userLevel: 'USER', // 用户级别
    dailySigninCans: 15,
    consecutiveBonus: JSON.stringify({ "3": 8, "7": 20, "15": 40, "30": 70 }),
    likeCans: 2,
    commentCans: 4,
    shareCans: 6,
    publishMomentCans: 15,
    publishPostCans: 30,
    dailyLikeLimit: 15,
    dailyCommentLimit: 8,
    dailyShareLimit: 5,
    dailyMomentLimit: 3,
    dailyPostLimit: 2,
    beLikedCans: 1,
    beCommentedCans: 3,
    beSharedCans: 5,
    dailyExperienceLimit: 80,
    cansToExperienceRatio: 1.0,
    // 社交账号权限配置
    canUseSocialLinks: true,
    maxSocialLinks: 8,
    canUseCustomLinks: true,
    // 表情权限配置
    allowedReactions: JSON.stringify(["HEART", "THUMBS_UP", "LOVE_EYES"]),
  },
  {
    userLevel: 'CREATOR', // 荣誉 (原STANDARD改为CREATOR)
    dailySigninCans: 20,
    consecutiveBonus: JSON.stringify({ "3": 10, "7": 25, "15": 50, "30": 90 }),
    likeCans: 2,
    commentCans: 5,
    shareCans: 8,
    publishMomentCans: 20,
    publishPostCans: 40,
    dailyLikeLimit: 20,
    dailyCommentLimit: 10,
    dailyShareLimit: 8,
    dailyMomentLimit: 5,
    dailyPostLimit: 3,
    beLikedCans: 2,
    beCommentedCans: 4,
    beSharedCans: 6,
    dailyExperienceLimit: 120,
    cansToExperienceRatio: 1.0,
    // 社交账号权限配置
    canUseSocialLinks: true,
    maxSocialLinks: 10,
    canUseCustomLinks: true,
    // 表情权限配置
    allowedReactions: JSON.stringify(["HEART", "THUMBS_UP", "LOVE_EYES", "FIRE"]),
  },
  {
    userLevel: 'ADMIN', // 守馆
    dailySigninCans: 100,
    consecutiveBonus: JSON.stringify({ "3": 50, "7": 100, "15": 200, "30": 300 }),
    likeCans: 10,
    commentCans: 20,
    shareCans: 30,
    publishMomentCans: 50,
    publishPostCans: 100,
    dailyLikeLimit: 100,
    dailyCommentLimit: 50,
    dailyShareLimit: 30,
    dailyMomentLimit: 20,
    dailyPostLimit: 15,
    beLikedCans: 5,
    beCommentedCans: 10,
    beSharedCans: 15,
    dailyExperienceLimit: 500,
    cansToExperienceRatio: 1.0,
    // 社交账号权限配置
    canUseSocialLinks: true,
    maxSocialLinks: 50,
    canUseCustomLinks: true,
    // 表情权限配置
    allowedReactions: JSON.stringify(["HEART", "THUMBS_UP", "LOVE_EYES", "FIRE", "HUNDRED", "CLAP", "STAR", "ROCKET"]),
  },
];

/**
 * 创建罐头系统配置种子数据
 */
export async function seedCansSystemConfig() {
  console.log('🌱 开始创建罐头系统配置种子数据...');

  try {
    // 清理现有配置数据
    await prisma.cansSystemConfig.deleteMany({});
    console.log('✅ 清理现有配置数据完成');

    // 创建新的配置数据
    for (const config of cansSystemConfigs) {
      await prisma.cansSystemConfig.upsert({
    where: { userLevel: config.userLevel },
    update: config,
    create: config,
  });
      console.log(`✅ 创建 ${config.userLevel} 等级配置完成`);
    }

    console.log('🎉 罐头系统配置种子数据创建完成！');
  } catch (error) {
    console.error('❌ 创建罐头系统配置种子数据失败:', error);
    throw error;
  }
}

/**
 * 如果直接运行此文件，则执行种子数据创建
 */
if (require.main === module) {
  seedCansSystemConfig()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
