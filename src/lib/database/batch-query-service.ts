/**
 * @fileoverview 批量查询服务
 * @description 解决N+1查询问题，提供批量数据加载功能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';
import { cacheService } from '@/lib/cache/redis-cache-service';
import { CACHE_KEYS, CACHE_TTL } from '@/lib/cache/cache-keys';

/**
 * 批量查询配置
 */
export interface BatchQueryConfig {
  /** 批量大小 */
  batchSize: number;
  /** 缓存TTL（秒） */
  cacheTTL: number;
  /** 是否启用缓存 */
  enableCache: boolean;
}

/**
 * 用户信息批量加载器
 */
export class UserBatchLoader {
  private userCache = new Map<string, any>();
  private pendingUserIds = new Set<string>();
  private batchTimeout: NodeJS.Timeout | null = null;

  constructor(
    private db: PrismaClient,
    private config: BatchQueryConfig = {
      batchSize: 50,
      cacheTTL: 300,
      enableCache: true,
    }
  ) {}

  /**
   * 批量加载用户信息
   */
  async loadUser(userId: string): Promise<any> {
    // 首先检查Redis缓存
    if (this.config.enableCache) {
      const cacheKey = CACHE_KEYS.USER.PROFILE(userId);
      const cachedUser = await cacheService.get(cacheKey);
      if (cachedUser) {
        return cachedUser;
      }
    }

    // 检查内存缓存
    if (this.userCache.has(userId)) {
      return this.userCache.get(userId);
    }

    // 添加到待处理队列
    this.pendingUserIds.add(userId);

    // 设置批量处理定时器
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.processBatchUsers();
      }, 10); // 10ms后批量处理
    }

    // 等待批量处理完成
    return new Promise((resolve) => {
      const checkResult = () => {
        if (this.userCache.has(userId)) {
          resolve(this.userCache.get(userId));
        } else {
          setTimeout(checkResult, 5);
        }
      };
      checkResult();
    });
  }

  /**
   * 处理批量用户查询
   */
  private async processBatchUsers(): Promise<void> {
    const userIds = Array.from(this.pendingUserIds);
    this.pendingUserIds.clear();
    this.batchTimeout = null;

    if (userIds.length === 0) return;

    try {
      const users = await this.db.user.findMany({
        where: {
          id: { in: userIds },
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          userLevel: true,
          isVerified: true,
          isActive: true,
          postsCount: true,
          followersCount: true,
          followingCount: true,
          likeCount: true,
          createdAt: true,
        },
      });

      // 缓存结果到内存和Redis
      const cachePromises: Promise<any>[] = [];

      users.forEach(user => {
        this.userCache.set(user.id, user);

        // 同时缓存到Redis
        if (this.config.enableCache) {
          const cacheKey = CACHE_KEYS.USER.PROFILE(user.id);
          cachePromises.push(
            cacheService.set(cacheKey, user, CACHE_TTL.USER_PROFILE)
          );
        }
      });

      // 为不存在的用户设置null
      userIds.forEach(id => {
        if (!this.userCache.has(id)) {
          this.userCache.set(id, null);

          // Redis中也设置null，但TTL较短
          if (this.config.enableCache) {
            const cacheKey = CACHE_KEYS.USER.PROFILE(id);
            cachePromises.push(
              cacheService.set(cacheKey, null, CACHE_TTL.SHORT)
            );
          }
        }
      });

      // 等待所有缓存操作完成
      await Promise.allSettled(cachePromises);

      // 设置内存缓存过期
      setTimeout(() => {
        userIds.forEach(id => {
          this.userCache.delete(id);
        });
      }, this.config.cacheTTL * 1000);
    } catch (error) {
      console.error('批量加载用户失败:', error);
      // 为失败的用户设置null
      userIds.forEach(id => {
        this.userCache.set(id, null);
      });
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.userCache.clear();
  }
}

/**
 * 帖子媒体批量加载器
 */
export class PostMediaBatchLoader {
  private mediaCache = new Map<string, any[]>();
  private pendingPostIds = new Set<string>();
  private batchTimeout: NodeJS.Timeout | null = null;

  constructor(
    private db: PrismaClient,
    private config: BatchQueryConfig = {
      batchSize: 50,
      cacheTTL: 300,
      enableCache: true,
    }
  ) {}

  /**
   * 批量加载帖子媒体
   */
  async loadPostMedia(postId: string): Promise<any[]> {
    // 检查缓存
    if (this.config.enableCache && this.mediaCache.has(postId)) {
      return this.mediaCache.get(postId) || [];
    }

    // 添加到待处理队列
    this.pendingPostIds.add(postId);

    // 设置批量处理定时器
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.processBatchMedia();
      }, 10);
    }

    // 等待批量处理完成
    return new Promise((resolve) => {
      const checkResult = () => {
        if (this.mediaCache.has(postId)) {
          resolve(this.mediaCache.get(postId) || []);
        } else {
          setTimeout(checkResult, 5);
        }
      };
      checkResult();
    });
  }

  /**
   * 处理批量媒体查询
   */
  private async processBatchMedia(): Promise<void> {
    const postIds = Array.from(this.pendingPostIds);
    this.pendingPostIds.clear();
    this.batchTimeout = null;

    if (postIds.length === 0) return;

    try {
      const mediaList = await this.db.postMedia.findMany({
        where: {
          postId: { in: postIds },
        },
        select: {
          id: true,
          postId: true,
          filename: true,
          mimeType: true,
          mediaType: true,
          url: true,
          cdnUrl: true,
          thumbnailUrl: true,
          width: true,
          height: true,
          order: true,
        },
        orderBy: { order: 'asc' },
      });

      // 按postId分组
      const mediaByPost = new Map<string, any[]>();
      mediaList.forEach(media => {
        if (media.postId) {
          if (!mediaByPost.has(media.postId)) {
            mediaByPost.set(media.postId, []);
          }
          mediaByPost.get(media.postId)!.push(media);
        }
      });

      // 缓存结果
      postIds.forEach(postId => {
        const media = mediaByPost.get(postId) || [];
        this.mediaCache.set(postId, media);
      });

      // 设置缓存过期
      if (this.config.enableCache) {
        setTimeout(() => {
          postIds.forEach(id => {
            this.mediaCache.delete(id);
          });
        }, this.config.cacheTTL * 1000);
      }
    } catch (error) {
      console.error('批量加载媒体失败:', error);
      // 为失败的帖子设置空数组
      postIds.forEach(id => {
        this.mediaCache.set(id, []);
      });
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.mediaCache.clear();
  }
}

/**
 * 统计数据批量加载器
 */
export class StatsBatchLoader {
  private statsCache = new Map<string, any>();
  private pendingPostIds = new Set<string>();
  private batchTimeout: NodeJS.Timeout | null = null;

  constructor(
    private db: PrismaClient,
    private config: BatchQueryConfig = {
      batchSize: 50,
      cacheTTL: 60,
      enableCache: true,
    }
  ) {}

  /**
   * 批量加载帖子统计
   */
  async loadPostStats(postId: string): Promise<any> {
    // 检查缓存
    if (this.config.enableCache && this.statsCache.has(postId)) {
      return this.statsCache.get(postId);
    }

    // 添加到待处理队列
    this.pendingPostIds.add(postId);

    // 设置批量处理定时器
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.processBatchStats();
      }, 10);
    }

    // 等待批量处理完成
    return new Promise((resolve) => {
      const checkResult = () => {
        if (this.statsCache.has(postId)) {
          resolve(this.statsCache.get(postId));
        } else {
          setTimeout(checkResult, 5);
        }
      };
      checkResult();
    });
  }

  /**
   * 处理批量统计查询
   */
  private async processBatchStats(): Promise<void> {
    const postIds = Array.from(this.pendingPostIds);
    this.pendingPostIds.clear();
    this.batchTimeout = null;

    if (postIds.length === 0) return;

    try {
      // 批量查询点赞数
      const likeCounts = await this.db.like.groupBy({
        by: ['postId'],
        where: { postId: { in: postIds } },
        _count: { id: true },
      });

      // 批量查询评论数
      const commentCounts = await this.db.comment.groupBy({
        by: ['postId'],
        where: {
          postId: { in: postIds },
          isDeleted: false,
        },
        _count: { id: true },
      });

      // 组织统计数据
      const likeMap = new Map(likeCounts.map(item => [item.postId, item._count.id]));
      const commentMap = new Map(commentCounts.map(item => [item.postId, item._count.id]));

      // 缓存结果
      postIds.forEach(postId => {
        const stats = {
          likeCount: likeMap.get(postId) || 0,
          commentCount: commentMap.get(postId) || 0,
        };
        this.statsCache.set(postId, stats);
      });

      // 设置缓存过期
      if (this.config.enableCache) {
        setTimeout(() => {
          postIds.forEach(id => {
            this.statsCache.delete(id);
          });
        }, this.config.cacheTTL * 1000);
      }
    } catch (error) {
      console.error('批量加载统计失败:', error);
      // 为失败的帖子设置默认统计
      postIds.forEach(id => {
        this.statsCache.set(id, { likeCount: 0, commentCount: 0 });
      });
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.statsCache.clear();
  }
}

/**
 * 批量查询服务管理器
 */
export class BatchQueryService {
  public userLoader: UserBatchLoader;
  public mediaLoader: PostMediaBatchLoader;
  public statsLoader: StatsBatchLoader;

  constructor(db: PrismaClient, config?: Partial<BatchQueryConfig>) {
    const finalConfig = {
      batchSize: 50,
      cacheTTL: 300,
      enableCache: true,
      ...config,
    };

    this.userLoader = new UserBatchLoader(db, finalConfig);
    this.mediaLoader = new PostMediaBatchLoader(db, finalConfig);
    this.statsLoader = new StatsBatchLoader(db, { ...finalConfig, cacheTTL: 60 });
  }

  /**
   * 清除所有缓存
   */
  clearAllCaches(): void {
    this.userLoader.clearCache();
    this.mediaLoader.clearCache();
    this.statsLoader.clearCache();
  }
}
