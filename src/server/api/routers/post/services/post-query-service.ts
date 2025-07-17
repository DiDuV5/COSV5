/**
 * @fileoverview Post查询服务
 * @description 处理Post的基础查询操作，包括列表查询、详情查询等
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { DuplicateDetector } from '@/lib/upload/deduplication/duplicate-detector';

/**
 * Post查询配置
 */
export const POST_QUERY_CONFIG = {
  // 默认查询包含的字段
  DEFAULT_INCLUDE: {
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
      orderBy: { order: 'asc' as const },
      // 移除take限制，显示所有关联的媒体文件
      select: {
        id: true,
        filename: true,
        originalName: true,
        mimeType: true,
        fileSize: true,
        fileHash: true,
        mediaType: true,
        url: true,
        cdnUrl: true,
        thumbnailUrl: true,
        smallUrl: true,
        mediumUrl: true,
        largeUrl: true,
        compressedUrl: true,
        width: true,
        height: true,
        duration: true,
        order: true,
        isProcessed: true,
        processingStatus: true,
        createdAt: true,
      },
    },
    _count: {
      select: {
        likes: true,
        comments: true,
      },
    },
  },

  // 排序选项
  SORT_OPTIONS: {
    latest: { publishedAt: 'desc' as const },
    popular: { likeCount: 'desc' as const },
    trending: { viewCount: 'desc' as const },
  },

  // 默认限制
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

/**
 * 查询参数接口
 */
export interface PostQueryParams {
  limit?: number;
  cursor?: string;
  authorId?: string;
  postType?: string;
  search?: string;
  tags?: string[];
  sortBy?: 'latest' | 'popular' | 'trending';
}

/**
 * 查询结果接口
 */
export interface PostQueryResult {
  posts: any[];
  nextCursor?: string;
}

/**
 * Post查询服务类
 */
export class PostQueryService {
  constructor(private db: PrismaClient) {}

  /**
   * 获取Post列表
   */
  async getPosts(params: PostQueryParams): Promise<PostQueryResult> {
    const { limit = POST_QUERY_CONFIG.DEFAULT_LIMIT, cursor, authorId, postType, search, tags, sortBy = 'latest' } = params;

    // 构建查询条件
    const where = this.buildWhereCondition({ authorId, postType, search, tags });

    // 获取排序配置
    const orderBy = POST_QUERY_CONFIG.SORT_OPTIONS[sortBy];

    const posts = await this.db.post.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      where,
      include: POST_QUERY_CONFIG.DEFAULT_INCLUDE,
      orderBy,
    });

    return this.formatQueryResult(posts, limit);
  }

  /**
   * 根据标签获取Post
   */
  async getPostsByTag(tag: string, params: Omit<PostQueryParams, 'tags'>): Promise<PostQueryResult> {
    const { limit = POST_QUERY_CONFIG.DEFAULT_LIMIT, cursor, sortBy = 'latest' } = params;

    const where = {
      ...this.buildBaseWhereCondition(),
      tags: { contains: tag },
    };

    const orderBy = POST_QUERY_CONFIG.SORT_OPTIONS[sortBy];

    const posts = await this.db.post.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      where,
      include: POST_QUERY_CONFIG.DEFAULT_INCLUDE,
      orderBy,
    });

    return this.formatQueryResult(posts, limit);
  }

  /**
   * 根据ID获取Post详情
   */
  async getPostById(id: string, userId?: string): Promise<any> {
    const post = await this.db.post.findUnique({
      where: {
        id,
        isDeleted: false, // 排除软删除的帖子
      },
      include: POST_QUERY_CONFIG.DEFAULT_INCLUDE,
    });

    TRPCErrorHandler.requireResource(post, '内容', id);

    // 检查访问权限
    if (!post.publishedAt || !post.isPublic) {
      const hasPermission = userId ? (userId === post.authorId || await this.checkAdminPermission(userId)) : false;
      TRPCErrorHandler.requirePermission(hasPermission, '访问此内容');
    }

    // 增加浏览量
    await this.incrementViewCount(id);

    // 检测重复文件
    const mediaWithDuplicateInfo = await DuplicateDetector.detectDuplicateMedia(post.media);

    return {
      ...post,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      media: mediaWithDuplicateInfo,
    };
  }

  /**
   * 构建基础查询条件
   */
  private buildBaseWhereCondition() {
    return {
      isPublic: true,
      publishedAt: { not: null },
      isDeleted: false, // 排除软删除的帖子
    };
  }

  /**
   * 构建查询条件
   */
  private buildWhereCondition(params: Pick<PostQueryParams, 'authorId' | 'postType' | 'search' | 'tags'>) {
    const { authorId, postType, search, tags } = params;

    return {
      ...this.buildBaseWhereCondition(),
      ...(authorId && { authorId }),
      ...(postType && { postType }),
      ...(search && {
        OR: [
          { title: { contains: search } },
          { content: { contains: search } }
        ],
      }),
      ...(tags && tags.length > 0 && {
        tags: { contains: tags.join(',') },
      }),
    };
  }

  /**
   * 格式化查询结果
   */
  private formatQueryResult(posts: any[], limit: number): PostQueryResult {
    let nextCursor: string | undefined = undefined;

    if (posts.length > limit) {
      const nextItem = posts.pop();
      nextCursor = nextItem!.id;
    }

    return {
      posts: posts.map(post => ({
        ...post,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        media: post.media,
      })),
      nextCursor,
    };
  }

  /**
   * 增加浏览量
   */
  private async incrementViewCount(postId: string): Promise<void> {
    await this.db.post.update({
      where: { id: postId },
      data: {
        viewCount: { increment: 1 },
      },
    });
  }

  /**
   * 检查管理员权限
   */
  private async checkAdminPermission(userId: string): Promise<boolean> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { userLevel: true },
    });

    return user?.userLevel === 'ADMIN' || user?.userLevel === 'SUPER_ADMIN';
  }

  /**
   * 获取用户发布的内容
   */
  async getUserPosts(params: {
    userId: string;
    contentType?: string;
    filter?: string;
    sort?: string;
    limit?: number;
    cursor?: string;
  }): Promise<PostQueryResult> {
    const { userId, contentType, filter, sort, limit = POST_QUERY_CONFIG.DEFAULT_LIMIT, cursor } = params;

    // 检查用户是否存在
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });

    TRPCErrorHandler.requireResource(user, '用户', userId);
    TRPCErrorHandler.requirePermission(user?.isActive, '用户已被禁用');

    // 构建查询条件
    const where = this.buildUserPostsWhereCondition(userId, contentType, filter);

    // 获取排序配置
    const orderBy = this.getUserPostsOrderBy(sort);

    const posts = await this.db.post.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      where,
      include: POST_QUERY_CONFIG.DEFAULT_INCLUDE,
      orderBy,
    });

    return this.formatQueryResult(posts, limit);
  }

  /**
   * 获取用户点赞的内容
   */
  async getUserLikedPosts(params: {
    userId: string;
    currentUserId: string;
    limit?: number;
    cursor?: string;
  }): Promise<PostQueryResult> {
    const { userId, currentUserId, limit = POST_QUERY_CONFIG.DEFAULT_LIMIT, cursor } = params;

    // 只有用户本人可以查看自己点赞的内容
    TRPCErrorHandler.requirePermission(userId === currentUserId, '查看他人的点赞记录');

    const likes = await this.db.like.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      where: {
        userId,
        post: {
          isDeleted: false, // 排除软删除的内容
          isPublic: true,   // 只显示公开内容
          publishedAt: { not: null }, // 只显示已发布内容
        },
      },
      include: {
        post: {
          include: POST_QUERY_CONFIG.DEFAULT_INCLUDE,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let nextCursor: string | undefined = undefined;
    if (likes.length > limit) {
      const nextItem = likes.pop();
      nextCursor = nextItem!.id;
    }

    return {
      posts: likes.map(like => ({
        ...like.post,
        likeCount: like.post._count.likes,
        commentCount: like.post._count.comments,
        media: like.post.media,
      })),
      nextCursor,
    };
  }

  /**
   * 构建用户Post查询条件
   */
  private buildUserPostsWhereCondition(userId: string, contentType?: string, filter?: string) {
    const whereClause: any = {
      authorId: userId,
      ...this.buildBaseWhereCondition(),
    };

    if (contentType && contentType !== 'all') {
      whereClause.contentType = contentType;
    }

    if (filter && filter !== 'all') {
      if (filter === 'images') {
        whereClause.media = {
          some: {
            mediaType: 'IMAGE',
          },
        };
      } else if (filter === 'videos') {
        whereClause.media = {
          some: {
            mediaType: 'VIDEO',
          },
        };
      } else if (filter === 'text') {
        whereClause.media = {
          none: {},
        };
      }
    }

    return whereClause;
  }

  /**
   * 获取用户Post排序配置
   */
  private getUserPostsOrderBy(sort?: string) {
    switch (sort) {
      case 'popular':
        return { likeCount: 'desc' as const };
      case 'oldest':
        return { publishedAt: 'asc' as const };
      default:
        return { publishedAt: 'desc' as const };
    }
  }
}

/**
 * 导出单例实例
 */
export const createPostQueryService = (db: PrismaClient) => new PostQueryService(db);
