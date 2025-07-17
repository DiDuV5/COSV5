/**
 * @fileoverview 用户资料管理功能
 * @description 处理用户资料相关操作
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import * as bcrypt from 'bcryptjs';
import { TRPCErrorHandler, BusinessErrorType } from '@/lib/errors/trpc-error-handler';
import type { ProfileUpdateResult, PasswordChangeResult } from './types';

/**
 * 获取当前用户信息
 */
export async function getCurrentUserInfo(prisma: any, userId: string): Promise<any> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      bannerUrl: true,
      location: true,
      website: true,
      userLevel: true,
      isVerified: true,
      isActive: true,
      canPublish: true,
      postsCount: true,
      followersCount: true,
      followingCount: true,
      likeCount: true,
      points: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw TRPCErrorHandler.requireResource(user, '用户', userId);
  }

  // 获取实时罐头余额
  const cansAccount = await prisma.userCansAccount.findUnique({
    where: { userId },
    select: {
      availableCans: true,
      totalCans: true,
    },
  });

  return {
    ...user,
    // 使用实时罐头余额覆盖 points 字段
    points: cansAccount?.availableCans || 0,
    // 添加罐头账户信息
    cansAccount: cansAccount
      ? {
          availableCans: cansAccount.availableCans,
          totalCans: cansAccount.totalCans,
        }
      : null,
  };
}

/**
 * 获取用户会话信息（兼容旧版本）
 */
export async function getUserSessionInfo(prisma: any, userId: string): Promise<any> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      bannerUrl: true,
      location: true,
      website: true,
      userLevel: true,
      isVerified: true,
      isActive: true,
      canPublish: true,
      postsCount: true,
      followersCount: true,
      followingCount: true,
      likeCount: true,
      points: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw TRPCErrorHandler.requireResource(user, '用户', userId);
  }

  return user;
}

/**
 * 更新用户资料
 */
export async function updateUserProfile(
  prisma: any,
  userId: string,
  input: {
    displayName?: string;
    bio?: string;
    location?: string;
    website?: string;
    birthday?: Date;
  }
): Promise<ProfileUpdateResult> {
  // 获取更新前的用户信息
  const oldUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      displayName: true,
      bio: true,
      location: true,
      website: true,
      birthday: true,
    },
  });

  // 更新用户信息
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...input,
      website: input.website || null,
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      location: true,
      website: true,
      birthday: true,
      updatedAt: true,
    },
  });

  // 记录更新日志 (简化版本，暂时只在控制台输出)
  console.log(`用户资料更新: ${userId}, 更新内容:`, input);

  return {
    success: true,
    message: '资料更新成功',
    user: updatedUser,
  };
}

/**
 * 修改用户密码
 */
export async function changeUserPassword(
  prisma: any,
  userId: string,
  input: {
    currentPassword: string;
    newPassword: string;
  }
): Promise<PasswordChangeResult> {
  const { currentPassword, newPassword } = input;

  // 获取用户当前密码
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) {
    throw TRPCErrorHandler.businessError(BusinessErrorType.INVALID_INPUT, '用户密码未设置');
  }

  // 验证当前密码
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!isCurrentPasswordValid) {
    throw TRPCErrorHandler.businessError(BusinessErrorType.INVALID_INPUT, '当前密码错误');
  }

  // 加密新密码
  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  // 更新密码
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  // 记录密码修改日志 (简化版本，暂时只在控制台输出)
  console.log(`用户密码修改: ${userId}`);

  return {
    success: true,
    message: '密码修改成功',
  };
}
