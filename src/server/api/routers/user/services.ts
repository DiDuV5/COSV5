/**
 * @fileoverview 用户业务逻辑服务
 * @description 包含复杂的用户相关业务逻辑
 */

import type { PrismaClient } from "@prisma/client";
import { TransactionManager } from "@/lib/transaction-manager";
import { UserLevel } from '@/types/user-level';
import {
  validateAvatarData,
  generateAvatarFilename,
  handleAvatarUploadError,
  logUserOperation
} from "./utils";

/**
 * 用户头像上传服务
 */
export class UserAvatarService {
  static async updateAvatar(
    db: PrismaClient,
    userId: string,
    avatarData: string,
    filename: string
  ) {
    try {
      // 获取用户信息以获取userLevel
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { userLevel: true }
      });

      if (!user) {
        throw new Error("用户不存在");
      }

      // 验证头像数据
      const { mimeType, base64Data, sizeInBytes } = validateAvatarData(avatarData);

      // 生成文件名
      const avatarFilename = generateAvatarFilename(userId, mimeType);

      // 将base64数据转换为Buffer
      const buffer = Buffer.from(base64Data, 'base64');

      // 使用现有的上传管理器保存文件
      const { UnifiedUploadServiceV2 } = await import('@/lib/upload/core/unified-upload-service-v2');
      const uploadService = new UnifiedUploadServiceV2();
      await uploadService.initialize();
      const uploadResult = await uploadService.processUpload({
        filename: avatarFilename,
        buffer: buffer,
        mimeType: mimeType,
        userId: userId,
        userLevel: user.userLevel as UserLevel,
        enableDeduplication: false, // 头像不需要去重
        imageQuality: 90, // 高质量保存头像
        generateThumbnails: true,
        postId: undefined, // 头像不属于任何帖子
      });

      if (!uploadResult.success) {
        throw new Error("头像文件保存失败");
      }

      const avatarUrl = uploadResult.url;

      // 使用事务管理器更新用户头像
      const result = await TransactionManager.updateUserProfile(
        userId,
        { avatarUrl },
        {
          filename: uploadResult.filename,
          originalName: filename,
          mimeType,
          fileSize: sizeInBytes,
          fileHash: uploadResult.fileHash || '', // 添加必需的fileHash字段
          mediaType: 'IMAGE',
          url: avatarUrl,
          thumbnailUrl: uploadResult.thumbnailUrl,
          smallUrl: uploadResult.thumbnailUrl, // 使用thumbnailUrl作为smallUrl
          mediumUrl: uploadResult.thumbnailUrl, // 使用thumbnailUrl作为mediumUrl
          largeUrl: avatarUrl, // 使用原图作为largeUrl
          width: uploadResult.width,
          height: uploadResult.height,
          aspectRatio: uploadResult.width && uploadResult.height ? uploadResult.width / uploadResult.height : undefined,
          isProcessed: true,
          processingStatus: 'COMPLETED',
        }
      );

      if (!result.success) {
        throw new Error(result.error || "头像更新失败");
      }

      // 记录操作日志
      logUserOperation("头像更新", userId, { avatarUrl });

      return {
        success: true,
        message: "头像更新成功",
        avatarUrl: avatarUrl,
        user: result.data?.user,
      };
    } catch (error) {
      handleAvatarUploadError(error);
    }
  }
}

/**
 * 关注系统服务
 */
export class FollowService {
  /**
   * 创建关注关系
   */
  static async createFollow(
    db: PrismaClient,
    followerId: string,
    followingId: string
  ) {
    await db.$transaction(async (tx) => {
      // 创建关注记录
      await tx.follow.create({
        data: {
          followerId,
          followingId,
        },
      });

      // 更新关注者的关注数
      await tx.user.update({
        where: { id: followerId },
        data: {
          followingCount: {
            increment: 1,
          },
        },
      });

      // 更新被关注者的粉丝数
      await tx.user.update({
        where: { id: followingId },
        data: {
          followersCount: {
            increment: 1,
          },
        },
      });
    });
  }

  /**
   * 删除关注关系
   */
  static async removeFollow(
    db: PrismaClient,
    followerId: string,
    followingId: string
  ) {
    await db.$transaction(async (tx) => {
      // 删除关注记录
      await tx.follow.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
      });

      // 更新关注者的关注数
      await tx.user.update({
        where: { id: followerId },
        data: {
          followingCount: {
            decrement: 1,
          },
        },
      });

      // 更新被关注者的粉丝数
      await tx.user.update({
        where: { id: followingId },
        data: {
          followersCount: {
            decrement: 1,
          },
        },
      });
    });
  }
}

/**
 * 用户搜索服务
 */
export class UserSearchService {
  /**
   * 搜索用户用于@提及功能
   */
  static async searchUsersForMention(
    db: PrismaClient,
    query: string,
    limit: number,
    currentUserId?: string
  ) {
    const searchConditions = {
      isActive: true,
      OR: [
        { username: { contains: query } },
        { displayName: { contains: query } },
      ],
    };

    const mentionUserSelect = {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      userLevel: true,
      isVerified: true,
      followersCount: true,
    };

    let followingUsers: any[] = [];
    let otherUsers: any[] = [];

    if (currentUserId) {
      // 获取当前用户关注的匹配用户
      followingUsers = await db.user.findMany({
        where: {
          ...searchConditions,
          followers: {
            some: {
              followerId: currentUserId,
            },
          },
        },
        select: mentionUserSelect,
        take: Math.min(limit, 5), // 最多5个关注的用户
        orderBy: [
          { followersCount: "desc" },
          { username: "asc" },
        ],
      });

      // 获取其他匹配用户
      const remainingLimit = limit - followingUsers.length;
      if (remainingLimit > 0) {
        otherUsers = await db.user.findMany({
          where: {
            ...searchConditions,
            NOT: {
              id: {
                in: [currentUserId, ...followingUsers.map(u => u.id)],
              },
            },
          },
          select: mentionUserSelect,
          take: remainingLimit,
          orderBy: [
            { followersCount: "desc" },
            { username: "asc" },
          ],
        });
      }
    } else {
      // 没有当前用户ID，直接搜索
      otherUsers = await db.user.findMany({
        where: searchConditions,
        select: mentionUserSelect,
        take: limit,
        orderBy: [
          { followersCount: "desc" },
          { username: "asc" },
        ],
      });
    }

    // 合并结果，关注的用户在前
    const users = [
      ...followingUsers.map(user => ({ ...user, isFollowing: true })),
      ...otherUsers.map(user => ({ ...user, isFollowing: false })),
    ];

    return { users };
  }

  /**
   * 获取活跃用户用于@提及功能
   */
  static async getActiveUsersForMention(
    db: PrismaClient,
    limit: number,
    currentUserId?: string
  ) {
    const mentionUserSelect = {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      userLevel: true,
      isVerified: true,
      followersCount: true,
      postsCount: true,
    };

    let followingUsers: any[] = [];
    let activeUsers: any[] = [];

    if (currentUserId) {
      // 获取当前用户关注的活跃用户
      followingUsers = await db.user.findMany({
        where: {
          isActive: true,
          followers: {
            some: {
              followerId: currentUserId,
            },
          },
          postsCount: {
            gt: 0,
          },
        },
        select: mentionUserSelect,
        take: Math.min(limit, 5),
        orderBy: [
          { postsCount: "desc" },
          { followersCount: "desc" },
        ],
      });

      // 获取其他活跃用户
      const remainingLimit = limit - followingUsers.length;
      if (remainingLimit > 0) {
        activeUsers = await db.user.findMany({
          where: {
            isActive: true,
            postsCount: {
              gt: 0,
            },
            NOT: {
              id: {
                in: [currentUserId, ...followingUsers.map(u => u.id)],
              },
            },
          },
          select: mentionUserSelect,
          take: remainingLimit,
          orderBy: [
            { postsCount: "desc" },
            { followersCount: "desc" },
          ],
        });
      }
    } else {
      // 没有当前用户ID，直接获取活跃用户
      activeUsers = await db.user.findMany({
        where: {
          isActive: true,
          postsCount: {
            gt: 0,
          },
        },
        select: mentionUserSelect,
        take: limit,
        orderBy: [
          { postsCount: "desc" },
          { followersCount: "desc" },
        ],
      });
    }

    // 合并结果
    const users = [
      ...followingUsers.map(user => ({ ...user, isFollowing: true })),
      ...activeUsers.map(user => ({ ...user, isFollowing: false })),
    ];

    return { users };
  }
}
