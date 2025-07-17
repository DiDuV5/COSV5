/**
 * @fileoverview 缓存键管理器
 * @description 统一管理缓存键的生成和标签
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

/**
 * 缓存键常量
 */
export const CACHE_KEYS = {
  // 用户相关缓存
  USER: {
    PROFILE: (userId: string) => `user:profile:${userId}`,
    STATS: (userId: string) => `user:stats:${userId}`,
    POSTS: (userId: string, page: number = 1) => `user:posts:${userId}:page:${page}`,
    FOLLOWERS: (userId: string) => `user:followers:${userId}`,
    FOLLOWING: (userId: string) => `user:following:${userId}`,
    PERMISSIONS: (userId: string) => `user:permissions:${userId}`,
    SOCIAL_LINKS: (userId: string) => `user:social:${userId}`,
  },

  // 帖子相关缓存
  POST: {
    DETAIL: (postId: string) => `post:detail:${postId}`,
    LIST: (page: number, filters: string = '') => `post:list:page:${page}:${filters}`,
    COMMENTS: (postId: string, page: number = 1) => `post:comments:${postId}:page:${page}`,
    LIKES: (postId: string) => `post:likes:${postId}`,
    MEDIA: (postId: string) => `post:media:${postId}`,
    STATS: (postId: string) => `post:stats:${postId}`,
    HOT: (category?: string) => `post:hot:${category || 'all'}`,
    TRENDING: (timeframe: string = '24h') => `post:trending:${timeframe}`,
  },

  // 评论相关缓存
  COMMENT: {
    DETAIL: (commentId: string) => `comment:detail:${commentId}`,
    REPLIES: (commentId: string) => `comment:replies:${commentId}`,
    TREE: (postId: string) => `comment:tree:${postId}`,
  },

  // 系统统计缓存
  STATS: {
    GLOBAL: () => 'stats:global',
    USER_COUNT: () => 'stats:user:count',
    POST_COUNT: () => 'stats:post:count',
    DAILY: (date: string) => `stats:daily:${date}`,
    WEEKLY: (week: string) => `stats:weekly:${week}`,
    MONTHLY: (month: string) => `stats:monthly:${month}`,
  },

  // 搜索相关缓存
  SEARCH: {
    USERS: (query: string, page: number = 1) => `search:users:${encodeURIComponent(query)}:page:${page}`,
    POSTS: (query: string, page: number = 1) => `search:posts:${encodeURIComponent(query)}:page:${page}`,
    SUGGESTIONS: (query: string) => `search:suggestions:${encodeURIComponent(query)}`,
  },

  // 推荐相关缓存
  RECOMMENDATION: {
    USERS: (userId: string) => `recommend:users:${userId}`,
    POSTS: (userId: string) => `recommend:posts:${userId}`,
    TRENDING: () => 'recommend:trending',
    FEATURED: () => 'recommend:featured',
  },

  // 配置相关缓存
  CONFIG: {
    SYSTEM: () => 'config:system',
    USER_LEVELS: () => 'config:user:levels',
    PERMISSIONS: () => 'config:permissions',
    EMAIL_TEMPLATES: () => 'config:email:templates',
  },

  // 会话相关缓存
  SESSION: {
    USER: (sessionId: string) => `session:user:${sessionId}`,
    PERMISSIONS: (sessionId: string) => `session:permissions:${sessionId}`,
  },
} as const;

/**
 * 缓存标签常量
 */
export const CACHE_TAGS = {
  USER: 'user',
  POST: 'post',
  COMMENT: 'comment',
  STATS: 'stats',
  SEARCH: 'search',
  RECOMMENDATION: 'recommendation',
  CONFIG: 'config',
  SESSION: 'session',
} as const;

/**
 * 缓存TTL常量（秒）
 */
export const CACHE_TTL = {
  // 短期缓存（1-5分钟）
  SHORT: 60,
  VERY_SHORT: 30,
  
  // 中期缓存（5-30分钟）
  MEDIUM: 300,
  MEDIUM_LONG: 1800,
  
  // 长期缓存（1-24小时）
  LONG: 3600,
  VERY_LONG: 86400,
  
  // 特定用途
  USER_PROFILE: 1800,      // 30分钟
  POST_DETAIL: 600,        // 10分钟
  POST_LIST: 300,          // 5分钟
  COMMENTS: 300,           // 5分钟
  STATS: 3600,             // 1小时
  SEARCH: 600,             // 10分钟
  RECOMMENDATIONS: 3600,   // 1小时
  CONFIG: 86400,           // 24小时
  SESSION: 1800,           // 30分钟
} as const;

/**
 * 缓存键生成器类
 */
export class CacheKeyGenerator {
  /**
   * 生成带时间戳的缓存键
   */
  static withTimestamp(baseKey: string, timestamp?: number): string {
    const ts = timestamp || Math.floor(Date.now() / 1000);
    return `${baseKey}:ts:${ts}`;
  }

  /**
   * 生成带版本的缓存键
   */
  static withVersion(baseKey: string, version: string): string {
    return `${baseKey}:v:${version}`;
  }

  /**
   * 生成带用户ID的缓存键
   */
  static withUser(baseKey: string, userId: string): string {
    return `${baseKey}:user:${userId}`;
  }

  /**
   * 生成带标签的缓存键
   */
  static withTag(baseKey: string, tag: string): string {
    return `${baseKey}:tag:${tag}`;
  }

  /**
   * 生成分页缓存键
   */
  static withPagination(baseKey: string, page: number, limit: number): string {
    return `${baseKey}:page:${page}:limit:${limit}`;
  }

  /**
   * 生成带过滤条件的缓存键
   */
  static withFilters(baseKey: string, filters: Record<string, any>): string {
    const filterStr = Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join(':');
    return `${baseKey}:filters:${filterStr}`;
  }

  /**
   * 生成哈希缓存键（用于长键名）
   */
  static hash(baseKey: string, data: string): string {
    // 简单的哈希函数，实际项目中可以使用更复杂的哈希算法
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return `${baseKey}:hash:${Math.abs(hash)}`;
  }
}

/**
 * 缓存失效策略
 */
export class CacheInvalidationStrategy {
  /**
   * 用户相关数据失效
   */
  static getUserInvalidationKeys(userId: string): string[] {
    return [
      CACHE_KEYS.USER.PROFILE(userId),
      CACHE_KEYS.USER.STATS(userId),
      CACHE_KEYS.USER.PERMISSIONS(userId),
      CACHE_KEYS.USER.SOCIAL_LINKS(userId),
      `${CACHE_KEYS.USER.POSTS(userId, 1).split(':page:')[0]}:*`,
      `${CACHE_KEYS.USER.FOLLOWERS(userId)}:*`,
      `${CACHE_KEYS.USER.FOLLOWING(userId)}:*`,
    ];
  }

  /**
   * 帖子相关数据失效
   */
  static getPostInvalidationKeys(postId: string, authorId?: string): string[] {
    const keys = [
      CACHE_KEYS.POST.DETAIL(postId),
      CACHE_KEYS.POST.STATS(postId),
      CACHE_KEYS.POST.MEDIA(postId),
      CACHE_KEYS.POST.LIKES(postId),
      `${CACHE_KEYS.POST.COMMENTS(postId, 1).split(':page:')[0]}:*`,
      `${CACHE_KEYS.POST.LIST(1).split(':page:')[0]}:*`,
    ];

    if (authorId) {
      keys.push(...this.getUserInvalidationKeys(authorId));
    }

    return keys;
  }

  /**
   * 评论相关数据失效
   */
  static getCommentInvalidationKeys(commentId: string, postId: string): string[] {
    return [
      CACHE_KEYS.COMMENT.DETAIL(commentId),
      CACHE_KEYS.COMMENT.REPLIES(commentId),
      CACHE_KEYS.COMMENT.TREE(postId),
      `${CACHE_KEYS.POST.COMMENTS(postId, 1).split(':page:')[0]}:*`,
      CACHE_KEYS.POST.STATS(postId),
    ];
  }

  /**
   * 统计数据失效
   */
  static getStatsInvalidationKeys(): string[] {
    return [
      CACHE_KEYS.STATS.GLOBAL(),
      CACHE_KEYS.STATS.USER_COUNT(),
      CACHE_KEYS.STATS.POST_COUNT(),
      `${CACHE_KEYS.STATS.DAILY('')}*`,
      `${CACHE_KEYS.STATS.WEEKLY('')}*`,
      `${CACHE_KEYS.STATS.MONTHLY('')}*`,
    ];
  }
}

/**
 * 缓存工具函数
 */
export class CacheUtils {
  /**
   * 检查缓存键是否有效
   */
  static isValidKey(key: string): boolean {
    return key.length > 0 && key.length <= 250 && !/\s/.test(key);
  }

  /**
   * 清理缓存键
   */
  static sanitizeKey(key: string): string {
    return key.replace(/\s+/g, '_').replace(/[^\w:.-]/g, '');
  }

  /**
   * 生成缓存键的过期时间
   */
  static getExpirationTime(ttl: number): Date {
    return new Date(Date.now() + ttl * 1000);
  }

  /**
   * 检查缓存是否过期
   */
  static isExpired(timestamp: number, ttl: number): boolean {
    return Date.now() - timestamp > ttl * 1000;
  }
}
