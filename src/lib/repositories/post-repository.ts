/**
 * @fileoverview 帖子数据访问层
 * @description 提供帖子相关的数据访问方法
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { PrismaClient, Post, Prisma } from '@prisma/client';
import { BaseRepository, QueryOptions, PaginatedResult, PaginationParams } from './base-repository';
import { CACHE_KEYS, CACHE_TTL } from '@/lib/cache/cache-keys';

/**
 * 帖子创建输入类型
 */
export type PostCreateInput = Prisma.PostCreateInput;

/**
 * 帖子更新输入类型
 */
export type PostUpdateInput = Prisma.PostUpdateInput;

/**
 * 帖子查询条件类型
 */
export type PostWhereInput = Prisma.PostWhereInput;

/**
 * 帖子搜索参数
 */
export interface PostSearchParams {
  query?: string;
  category?: string;
  contentType?: string;
  userLevel?: string;
  authorId?: string;
  isPublic?: boolean;
  sortBy?: 'latest' | 'popular' | 'trending' | 'oldest';
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
}

/**
 * 帖子统计信息
 */
export interface PostStats {
  likeCount: number;
  commentCount: number;
  viewCount: number;
  shareCount: number;
}

/**
 * 帖子详细信息（包含关联数据）
 */
export interface PostWithDetails extends Post {
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    userLevel: string;
    isVerified: boolean;
  };
  media?: any[];
  stats: PostStats;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

/**
 * 帖子Repository类
 */
export class PostRepository extends BaseRepository<Post, PostCreateInput, PostUpdateInput, PostWhereInput> {
  constructor(db: PrismaClient) {
    super(db, 'post');
    this.defaultCacheTTL = CACHE_TTL.POST_DETAIL;
  }

  /**
   * 获取帖子模型
   */
  protected getModel() {
    return this.db.post;
  }

  /**
   * 获取帖子详细信息
   */
  async findByIdWithDetails(
    id: string,
    currentUserId?: string,
    options: QueryOptions = {}
  ): Promise<PostWithDetails | null> {
    const cacheKey = CACHE_KEYS.POST.DETAIL(id);

    try {
      const post = await this.db.post.findUnique({
        where: { id },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              userLevel: true,
              isVerified: true,
            },
          },
          media: {
            select: {
              id: true,
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
          },
          _count: {
            select: {
              likes: true,
              comments: {
                where: { isDeleted: false },
              },
            },
          },
        },
      });

      if (!post) return null;

      // 检查当前用户是否点赞和收藏
      let isLiked = false;
      let isBookmarked = false;

      if (currentUserId) {
        const [like] = await Promise.all([
          this.db.like.findFirst({
            where: {
              userId: currentUserId,
              postId: id,
            },
          }),
        ]);

        isLiked = !!like;
        isBookmarked = false; // TODO: 实现bookmark功能
      }

      const result: PostWithDetails = {
        ...post,
        media: post.media,
        stats: {
          likeCount: post._count.likes,
          commentCount: post._count.comments,
          viewCount: post.viewCount || 0,
          shareCount: (post as any).shareCount || 0,
        },
        isLiked,
        isBookmarked,
      };

      return result;
    } catch (error) {
      this.handleError(error, 'findByIdWithDetails');
      throw error;
    }
  }

  /**
   * 搜索帖子
   */
  async searchPosts(
    params: PostSearchParams,
    pagination: PaginationParams = {},
    currentUserId?: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<PostWithDetails>> {
    const {
      query,
      category,
      contentType,
      userLevel,
      authorId,
      isPublic = true,
      sortBy = 'latest',
      timeRange = 'all',
    } = params;

    // 构建查询条件
    const where: PostWhereInput = {
      isPublic,
      publishedAt: { not: null },
      ...(authorId && { authorId }),
      ...(category && { category }),
      ...(contentType && { contentType }),
      ...(userLevel && { userLevel }),
      ...(query && {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { excerpt: { contains: query, mode: 'insensitive' } },
        ],
      }),
    };

    // 时间范围过滤
    if (timeRange !== 'all') {
      const now = new Date();
      const timeRanges = {
        day: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
      };

      where.publishedAt = {
        gte: timeRanges[timeRange],
      };
    }

    // 构建排序条件
    let orderBy: any = { publishedAt: 'desc' };
    switch (sortBy) {
      case 'popular':
        orderBy = [
          { likeCount: 'desc' },
          { commentCount: 'desc' },
          { publishedAt: 'desc' },
        ];
        break;
      case 'trending':
        orderBy = [
          { viewCount: 'desc' },
          { likeCount: 'desc' },
          { publishedAt: 'desc' },
        ];
        break;
      case 'oldest':
        orderBy = { publishedAt: 'asc' };
        break;
    }

    return this.findManyPaginated(where, pagination, {
      ...options,
      orderBy,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            userLevel: true,
            isVerified: true,
          },
        },
        media: {
          select: {
            id: true,
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
          take: 1, // 只取第一张图作为封面
        },
        _count: {
          select: {
            likes: true,
            comments: {
              where: { isDeleted: false },
            },
          },
        },
      },
    }) as any;
  }

  /**
   * 获取用户的帖子
   */
  async findByAuthor(
    authorId: string,
    pagination: PaginationParams = {},
    currentUserId?: string,
    options: QueryOptions & { includePrivate?: boolean } = {}
  ): Promise<PaginatedResult<PostWithDetails>> {
    const where: PostWhereInput = {
      authorId,
      publishedAt: { not: null },
      ...(options.includePrivate ? {} : { isPublic: true }),
    };

    return this.findManyPaginated(where, pagination, {
      ...options,
      orderBy: { publishedAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            userLevel: true,
            isVerified: true,
          },
        },
        media: {
          select: {
            id: true,
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
          take: 1,
        },
        _count: {
          select: {
            likes: true,
            comments: {
              where: { isDeleted: false },
            },
          },
        },
      },
    }) as any;
  }

  /**
   * 获取热门帖子
   */
  async getPopularPosts(
    limit: number = 10,
    timeRange: 'day' | 'week' | 'month' = 'week',
    options: QueryOptions = {}
  ): Promise<PostWithDetails[]> {
    const cacheKey = CACHE_KEYS.POST.HOT(timeRange);

    // 尝试从缓存获取
    if (options.cache !== false) {
      const cached = await this.getFromCache<PostWithDetails[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      const now = new Date();
      const timeRanges = {
        day: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      };

      const posts = await this.db.post.findMany({
        where: {
          isPublic: true,
          publishedAt: {
            gte: timeRanges[timeRange],
            not: null,
          },
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              userLevel: true,
              isVerified: true,
            },
          },
          media: {
            select: {
              id: true,
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
            take: 1,
          },
          _count: {
            select: {
              likes: true,
              comments: {
                where: { isDeleted: false },
              },
            },
          },
        },
        orderBy: [
          { likeCount: 'desc' },
          { commentCount: 'desc' },
          { viewCount: 'desc' },
        ],
        take: limit,
      });

      const result = posts.map(post => ({
        ...post,
        media: post.media,
        stats: {
          likeCount: post._count.likes,
          commentCount: post._count.comments,
          viewCount: post.viewCount || 0,
          shareCount: (post as any).shareCount || 0,
        },
      })) as PostWithDetails[];

      // 设置缓存
      if (options.cache !== false) {
        await this.setCache(cacheKey, result, CACHE_TTL.POST_LIST);
      }

      return result;
    } catch (error) {
      this.handleError(error, 'getPopularPosts');
      throw error;
    }
  }

  /**
   * 增加浏览量
   */
  async incrementViewCount(id: string): Promise<void> {
    try {
      await this.db.post.update({
        where: { id },
        data: {
          viewCount: { increment: 1 },
        },
      });

      // 清除相关缓存
      await this.deleteCache(`post:*:${id}`);
    } catch (error) {
      // 浏览量更新失败不应该影响主要功能
      console.warn('更新浏览量失败:', error);
    }
  }

  /**
   * 更新帖子统计信息
   */
  async updateStats(id: string, stats: Partial<PostStats>): Promise<Post> {
    try {
      const post = await this.db.post.update({
        where: { id },
        data: {
          ...stats,
          updatedAt: new Date(),
        },
      });

      // 清除相关缓存
      await this.deleteCache(`post:*:${id}`);

      return post;
    } catch (error) {
      this.handleError(error, 'updateStats');
      throw error;
    }
  }
}
