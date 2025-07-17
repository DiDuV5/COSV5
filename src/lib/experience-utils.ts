/**
 * @fileoverview 经验值系统工具函数
 * @description 提供经验值重置、计算和管理的核心工具函数
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * import { resetUserDailyExperience, checkExperienceReset } from './experience-utils'
 *
 * @dependencies
 * - prisma: ^5.0.0
 * - @prisma/client: ^5.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，包含经验值重置和管理功能
 */

import { PrismaClient } from '@prisma/client';
import { getTodayStart, shouldResetDailyExperience, getHoursUntilReset } from './utils';

export interface ExperienceResetResult {
  success: boolean;
  resetCount: number;
  errors: string[];
  timestamp: Date;
}

export interface UserExperienceStatus {
  userId: string;
  dailyExperienceEarned: number;
  dailyExperienceLimit: number;
  lastExperienceReset: Date;
  needsReset: boolean;
  hoursUntilReset: number;
  canEarnMore: boolean;
  remainingExperience: number;
}

/**
 * 重置单个用户的每日经验值
 * @param prisma Prisma客户端实例或事务客户端
 * @param userId 用户ID
 * @returns 重置结果
 */
export async function resetUserDailyExperience(
  prisma: any, // 支持 PrismaClient 或事务客户端
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const account = await prisma.userCansAccount.findUnique({
      where: { userId },
    });

    if (!account) {
      return { success: false, error: '用户账户不存在' };
    }

    // 检查是否需要重置
    if (!shouldResetDailyExperience(account.lastExperienceReset)) {
      return { success: false, error: '今日已重置，无需再次重置' };
    }

    // 执行重置
    await prisma.userCansAccount.update({
      where: { userId },
      data: {
        dailyExperienceEarned: 0,
        lastExperienceReset: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error(`重置用户 ${userId} 经验值失败:`, error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 批量重置所有用户的每日经验值
 * @param prisma Prisma客户端实例
 * @param forceReset 是否强制重置（忽略时间检查）
 * @returns 重置结果统计
 */
export async function resetAllUsersDailyExperience(
  prisma: PrismaClient,
  forceReset: boolean = false
): Promise<ExperienceResetResult> {
  const result: ExperienceResetResult = {
    success: false,
    resetCount: 0,
    errors: [],
    timestamp: new Date(),
  };

  try {
    // 获取所有需要重置的用户账户
    const accounts = await prisma.userCansAccount.findMany({
      select: {
        userId: true,
        lastExperienceReset: true,
        dailyExperienceEarned: true,
      },
    });

    const accountsToReset = forceReset 
      ? accounts 
      : accounts.filter(account => shouldResetDailyExperience(account.lastExperienceReset));

    if (accountsToReset.length === 0) {
      result.success = true;
      result.errors.push('没有需要重置的用户账户');
      return result;
    }

    // 批量重置
    const resetTime = new Date();
    const updateResult = await prisma.userCansAccount.updateMany({
      where: {
        userId: {
          in: accountsToReset.map(account => account.userId),
        },
      },
      data: {
        dailyExperienceEarned: 0,
        lastExperienceReset: resetTime,
      },
    });

    result.success = true;
    result.resetCount = updateResult.count;

    console.log(`✅ 成功重置 ${result.resetCount} 个用户的每日经验值`);
    
  } catch (error) {
    console.error('批量重置经验值失败:', error);
    result.errors.push(error instanceof Error ? error.message : '未知错误');
  }

  return result;
}

/**
 * 检查用户经验值状态并自动重置
 * @param prisma Prisma客户端实例或事务客户端
 * @param userId 用户ID
 * @returns 用户经验值状态
 */
export async function checkAndResetUserExperience(
  prisma: any, // 支持 PrismaClient 或事务客户端
  userId: string
): Promise<UserExperienceStatus | null> {
  try {
    const account = await prisma.userCansAccount.findUnique({
      where: { userId },
    });

    if (!account) {
      return null;
    }

    const needsReset = shouldResetDailyExperience(account.lastExperienceReset);
    
    // 如果需要重置，自动执行重置
    if (needsReset) {
      await resetUserDailyExperience(prisma, userId);
      // 重新获取更新后的账户信息
      const updatedAccount = await prisma.userCansAccount.findUnique({
        where: { userId },
      });
      
      if (updatedAccount) {
        return {
          userId,
          dailyExperienceEarned: 0,
          dailyExperienceLimit: updatedAccount.dailyExperienceLimit,
          lastExperienceReset: updatedAccount.lastExperienceReset,
          needsReset: false,
          hoursUntilReset: getHoursUntilReset(),
          canEarnMore: true,
          remainingExperience: updatedAccount.dailyExperienceLimit,
        };
      }
    }

    // 返回当前状态
    const remainingExperience = Math.max(0, account.dailyExperienceLimit - account.dailyExperienceEarned);
    
    return {
      userId,
      dailyExperienceEarned: account.dailyExperienceEarned,
      dailyExperienceLimit: account.dailyExperienceLimit,
      lastExperienceReset: account.lastExperienceReset,
      needsReset: false,
      hoursUntilReset: getHoursUntilReset(),
      canEarnMore: remainingExperience > 0,
      remainingExperience,
    };
    
  } catch (error) {
    console.error(`检查用户 ${userId} 经验值状态失败:`, error);
    return null;
  }
}

/**
 * 计算经验值奖励（考虑每日上限）
 * @param baseReward 基础奖励
 * @param currentEarned 当前已获得经验值
 * @param dailyLimit 每日上限
 * @param ratio 转换比例
 * @returns 实际可获得的经验值
 */
export function calculateExperienceReward(
  baseReward: number,
  currentEarned: number,
  dailyLimit: number,
  ratio: number = 1.0
): number {
  const potentialReward = baseReward * ratio;
  const remainingLimit = Math.max(0, dailyLimit - currentEarned);
  return Math.min(potentialReward, remainingLimit);
}

/**
 * 获取经验值重置统计信息
 * @param prisma Prisma客户端实例
 * @returns 重置统计信息
 */
export async function getExperienceResetStats(prisma: PrismaClient) {
  try {
    const todayStart = getTodayStart();
    
    // 获取总用户数
    const totalUsers = await prisma.userCansAccount.count();
    
    // 获取今日已重置用户数
    const resetToday = await prisma.userCansAccount.count({
      where: {
        lastExperienceReset: {
          gte: todayStart,
        },
      },
    });
    
    // 获取需要重置的用户数
    const needsReset = await prisma.userCansAccount.count({
      where: {
        lastExperienceReset: {
          lt: todayStart,
        },
      },
    });
    
    // 获取今日经验值统计
    const experienceStats = await prisma.userCansAccount.aggregate({
      _sum: {
        dailyExperienceEarned: true,
        totalExperience: true,
      },
      _avg: {
        dailyExperienceEarned: true,
        dailyExperienceLimit: true,
      },
    });
    
    return {
      totalUsers,
      resetToday,
      needsReset,
      resetRate: totalUsers > 0 ? (resetToday / totalUsers) * 100 : 0,
      experienceStats: {
        totalDailyEarned: experienceStats._sum.dailyExperienceEarned || 0,
        totalExperience: experienceStats._sum.totalExperience || 0,
        avgDailyEarned: experienceStats._avg.dailyExperienceEarned || 0,
        avgDailyLimit: experienceStats._avg.dailyExperienceLimit || 0,
      },
    };
  } catch (error) {
    console.error('获取经验值重置统计失败:', error);
    return null;
  }
}
