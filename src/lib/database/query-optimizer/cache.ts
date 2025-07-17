/**
 * @fileoverview 查询优化器缓存管理
 * @description 提供查询结果的缓存管理功能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { CacheOptions, CACHE_KEYS, CACHE_TAGS, CACHE_TTL } from './types';

/**
 * 缓存管理器接口
 */
interface CacheManager {
  get(key: string): Promise<any>;
  set(key: string, value: any, options?: number | CacheOptions): Promise<void>;
  del(key: string): Promise<void>;
  delete(key: string): Promise<void>;
  deleteByTag(tag: string): Promise<void>;
  invalidateByTag(tag: string): Promise<void>;
}

/**
 * 临时模拟缓存管理器
 * 在实际应用中应该替换为真实的Redis缓存管理器
 */
const mockCacheManager: CacheManager = {
  get: async (key: string) => null,
  set: async (key: string, value: any, options?: number | CacheOptions) => {},
  del: async (key: string) => {},
  delete: async (key: string) => {},
  deleteByTag: async (tag: string) => {},
  invalidateByTag: async (tag: string) => {},
};

/**
 * 查询缓存管理器
 */
export class QueryCacheManager {
  private cacheManager: CacheManager;
  private enableCache: boolean;

  constructor(cacheManager?: CacheManager, enableCache: boolean = true) {
    this.cacheManager = cacheManager || mockCacheManager;
    this.enableCache = enableCache;
  }

  /**
   * 获取缓存数据
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.enableCache) {
      return null;
    }

    try {
      return await this.cacheManager.get(key);
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  }

  /**
   * 设置缓存数据
   */
  async set(key: string, value: any, options?: CacheOptions): Promise<void> {
    if (!this.enableCache) {
      return;
    }

    try {
      await this.cacheManager.set(key, value, options);
    } catch (error) {
      console.warn('Cache set error:', error);
    }
  }

  /**
   * 删除缓存数据
   */
  async delete(key: string): Promise<void> {
    try {
      await this.cacheManager.delete(key);
    } catch (error) {
      console.warn('Cache delete error:', error);
    }
  }

  /**
   * 按标签删除缓存
   */
  async deleteByTag(tag: string): Promise<void> {
    try {
      await this.cacheManager.deleteByTag(tag);
    } catch (error) {
      console.warn('Cache deleteByTag error:', error);
    }
  }

  /**
   * 缓存用户信息
   */
  async cacheUserInfo(userId: string, userInfo: any, ttl?: number): Promise<void> {
    const cacheKey = CACHE_KEYS.USER_INFO(userId);
    await this.set(cacheKey, userInfo, {
      ttl: ttl || CACHE_TTL.USER_INFO,
      tags: [CACHE_TAGS.USER],
    });
  }

  /**
   * 获取用户信息缓存
   */
  async getUserInfoCache(userId: string): Promise<any | null> {
    const cacheKey = CACHE_KEYS.USER_INFO(userId);
    return await this.get(cacheKey);
  }

  /**
   * 缓存用户权限
   */
  async cacheUserPermissions(userId: string, permissions: any, ttl?: number): Promise<void> {
    const cacheKey = CACHE_KEYS.USER_PERMISSIONS(userId);
    await this.set(cacheKey, permissions, {
      ttl: ttl || CACHE_TTL.USER_PERMISSIONS,
      tags: [CACHE_TAGS.USER, CACHE_TAGS.PERMISSION],
    });
  }

  /**
   * 获取用户权限缓存
   */
  async getUserPermissionsCache(userId: string): Promise<any | null> {
    const cacheKey = CACHE_KEYS.USER_PERMISSIONS(userId);
    return await this.get(cacheKey);
  }

  /**
   * 缓存作品列表
   */
  async cachePostsList(params: string, posts: any, ttl?: number): Promise<void> {
    const cacheKey = CACHE_KEYS.POST_LIST(params);
    await this.set(cacheKey, posts, {
      ttl: ttl || CACHE_TTL.POST_LIST,
      tags: [CACHE_TAGS.POST],
    });
  }

  /**
   * 获取作品列表缓存
   */
  async getPostsListCache(params: string): Promise<any | null> {
    const cacheKey = CACHE_KEYS.POST_LIST(params);
    return await this.get(cacheKey);
  }

  /**
   * 缓存热门作品
   */
  async cacheHotPosts(
    period: 'day' | 'week' | 'month',
    limit: number,
    posts: any
  ): Promise<void> {
    const cacheKey = CACHE_KEYS.HOT_POSTS(`${period}_${limit}`);
    const ttl = CACHE_TTL.HOT_POSTS[period];
    
    await this.set(cacheKey, posts, {
      ttl,
      tags: [CACHE_TAGS.POST],
    });
  }

  /**
   * 获取热门作品缓存
   */
  async getHotPostsCache(period: 'day' | 'week' | 'month', limit: number): Promise<any | null> {
    const cacheKey = CACHE_KEYS.HOT_POSTS(`${period}_${limit}`);
    return await this.get(cacheKey);
  }

  /**
   * 批量缓存用户信息
   */
  async batchCacheUserInfo(users: any[]): Promise<void> {
    const cachePromises = users.map(user => 
      this.cacheUserInfo(user.id, user)
    );
    
    await Promise.all(cachePromises);
  }

  /**
   * 清理用户相关缓存
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.delete(CACHE_KEYS.USER_INFO(userId)),
      this.delete(CACHE_KEYS.USER_PERMISSIONS(userId)),
      this.delete(CACHE_KEYS.USER_PROFILE(userId)),
    ]);
  }

  /**
   * 清理作品相关缓存
   */
  async invalidatePostCache(postId?: string): Promise<void> {
    if (postId) {
      await this.delete(CACHE_KEYS.POST_DETAILS(postId));
    }

    // 清理列表缓存
    await this.deleteByTag(CACHE_TAGS.POST);
  }

  /**
   * 清理评论相关缓存
   */
  async invalidateCommentCache(postId?: string): Promise<void> {
    if (postId) {
      await this.delete(CACHE_KEYS.COMMENT_THREAD(postId));
    }

    // 清理评论相关缓存
    await this.deleteByTag(CACHE_TAGS.COMMENT);
  }

  /**
   * 清理权限相关缓存
   */
  async invalidatePermissionCache(): Promise<void> {
    await this.deleteByTag(CACHE_TAGS.PERMISSION);
  }

  /**
   * 清理所有缓存
   */
  async clearAllCache(): Promise<void> {
    await Promise.all([
      this.deleteByTag(CACHE_TAGS.USER),
      this.deleteByTag(CACHE_TAGS.POST),
      this.deleteByTag(CACHE_TAGS.COMMENT),
      this.deleteByTag(CACHE_TAGS.PERMISSION),
    ]);
  }

  /**
   * 生成缓存键
   */
  generateCacheKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);

    return `${prefix}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * 检查缓存是否启用
   */
  isCacheEnabled(): boolean {
    return this.enableCache;
  }

  /**
   * 启用缓存
   */
  enableCaching(): void {
    this.enableCache = true;
  }

  /**
   * 禁用缓存
   */
  disableCaching(): void {
    this.enableCache = false;
  }
}
