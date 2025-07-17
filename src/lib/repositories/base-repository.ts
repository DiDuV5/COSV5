/**
 * @fileoverview 基础数据访问层
 * @description 提供统一的数据访问抽象，减少代码重复
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { cacheService } from '@/lib/cache/redis-cache-service';
import { CACHE_TTL } from '@/lib/cache/cache-keys';

/**
 * 分页参数接口
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

/**
 * 分页结果接口
 */
export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  total?: number;
}

/**
 * 查询选项接口
 */
export interface QueryOptions {
  /** 是否启用缓存 */
  cache?: boolean;
  /** 缓存TTL（秒） */
  cacheTTL?: number;
  /** 缓存键 */
  cacheKey?: string;
  /** 是否包含软删除的记录 */
  includeSoftDeleted?: boolean;
}

/**
 * 排序选项接口
 */
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * 基础Repository抽象类
 */
export abstract class BaseRepository<T, TCreateInput, TUpdateInput, TWhereInput> {
  protected db: PrismaClient;
  protected modelName: string;
  protected defaultCacheTTL: number = CACHE_TTL.MEDIUM;

  constructor(db: PrismaClient, modelName: string) {
    this.db = db;
    this.modelName = modelName;
  }

  /**
   * 获取模型实例
   */
  protected abstract getModel(): any;

  /**
   * 生成缓存键
   */
  protected generateCacheKey(operation: string, params?: any): string {
    const paramsStr = params ? JSON.stringify(params) : '';
    return `${this.modelName}:${operation}:${Buffer.from(paramsStr).toString('base64')}`;
  }

  /**
   * 从缓存获取数据
   */
  protected async getFromCache<TResult>(key: string): Promise<TResult | null> {
    try {
      return await cacheService.get<TResult>(key);
    } catch (error) {
      console.warn('缓存获取失败:', error);
      return null;
    }
  }

  /**
   * 设置缓存数据
   */
  protected async setCache<TResult>(
    key: string,
    data: TResult,
    ttl: number = this.defaultCacheTTL
  ): Promise<void> {
    try {
      await cacheService.set(key, data, ttl);
    } catch (error) {
      console.warn('缓存设置失败:', error);
    }
  }

  /**
   * 删除缓存
   */
  protected async deleteCache(pattern: string): Promise<void> {
    try {
      await cacheService.delPattern(pattern);
    } catch (error) {
      console.warn('缓存删除失败:', error);
    }
  }

  /**
   * 处理软删除条件
   */
  protected applySoftDeleteFilter(where: any, includeSoftDeleted: boolean = false): any {
    if (!includeSoftDeleted && 'isDeleted' in where) {
      return {
        ...where,
        isDeleted: false,
      };
    }
    return where;
  }

  /**
   * 创建记录
   */
  async create(data: TCreateInput, options: QueryOptions = {}): Promise<T> {
    try {
      const model = this.getModel();
      const result = await model.create({ data });

      // 清除相关缓存
      await this.deleteCache(`${this.modelName}:*`);

      return result;
    } catch (error) {
      this.handleError(error, 'create');
      throw error;
    }
  }

  /**
   * 根据ID查找记录
   */
  async findById(id: string, options: QueryOptions = {}): Promise<T | null> {
    const cacheKey = this.generateCacheKey('findById', { id });

    // 尝试从缓存获取
    if (options.cache !== false) {
      const cached = await this.getFromCache<T>(cacheKey);
      if (cached) return cached;
    }

    try {
      const model = this.getModel();
      const result = await model.findUnique({
        where: { id },
      });

      // 设置缓存
      if (result && options.cache !== false) {
        await this.setCache(cacheKey, result, options.cacheTTL);
      }

      return result;
    } catch (error) {
      this.handleError(error, 'findById');
      throw error;
    }
  }

  /**
   * 查找多条记录
   */
  async findMany(
    where: TWhereInput = {} as TWhereInput,
    options: QueryOptions & {
      orderBy?: any;
      select?: any;
      include?: any;
      take?: number;
      skip?: number;
    } = {}
  ): Promise<T[]> {
    const cacheKey = this.generateCacheKey('findMany', { where, options });

    // 尝试从缓存获取
    if (options.cache !== false) {
      const cached = await this.getFromCache<T[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      const model = this.getModel();
      const whereWithSoftDelete = this.applySoftDeleteFilter(where, options.includeSoftDeleted);

      const result = await model.findMany({
        where: whereWithSoftDelete,
        orderBy: options.orderBy,
        select: options.select,
        include: options.include,
        take: options.take,
        skip: options.skip,
      });

      // 设置缓存
      if (options.cache !== false) {
        await this.setCache(cacheKey, result, options.cacheTTL);
      }

      return result;
    } catch (error) {
      this.handleError(error, 'findMany');
      throw error;
    }
  }

  /**
   * 分页查询
   */
  async findManyPaginated(
    where: TWhereInput = {} as TWhereInput,
    pagination: PaginationParams = {},
    options: QueryOptions & {
      orderBy?: any;
      select?: any;
      include?: any;
    } = {}
  ): Promise<PaginatedResult<T>> {
    const { page = 1, limit = 20, cursor } = pagination;
    const cacheKey = this.generateCacheKey('findManyPaginated', { where, pagination, options });

    // 尝试从缓存获取
    if (options.cache !== false) {
      const cached = await this.getFromCache<PaginatedResult<T>>(cacheKey);
      if (cached) return cached;
    }

    try {
      const model = this.getModel();
      const whereWithSoftDelete = this.applySoftDeleteFilter(where, options.includeSoftDeleted);

      // 查询数据（多取一条用于判断是否有更多数据）
      const items = await model.findMany({
        where: whereWithSoftDelete,
        orderBy: options.orderBy || { createdAt: 'desc' },
        select: options.select,
        include: options.include,
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : { skip: (page - 1) * limit }),
      });

      // 判断是否有更多数据
      const hasMore = items.length > limit;
      if (hasMore) {
        items.pop(); // 移除多取的那条记录
      }

      // 获取下一页游标
      const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : undefined;

      const result: PaginatedResult<T> = {
        items,
        nextCursor,
        hasMore,
      };

      // 设置缓存
      if (options.cache !== false) {
        await this.setCache(cacheKey, result, options.cacheTTL);
      }

      return result;
    } catch (error) {
      this.handleError(error, 'findManyPaginated');
      throw error;
    }
  }

  /**
   * 更新记录
   */
  async update(id: string, data: TUpdateInput, options: QueryOptions = {}): Promise<T> {
    try {
      const model = this.getModel();
      const result = await model.update({
        where: { id },
        data,
      });

      // 清除相关缓存
      await this.deleteCache(`${this.modelName}:*`);

      return result;
    } catch (error) {
      this.handleError(error, 'update');
      throw error;
    }
  }

  /**
   * 删除记录（物理删除）
   */
  async delete(id: string): Promise<T> {
    try {
      const model = this.getModel();
      const result = await model.delete({
        where: { id },
      });

      // 清除相关缓存
      await this.deleteCache(`${this.modelName}:*`);

      return result;
    } catch (error) {
      this.handleError(error, 'delete');
      throw error;
    }
  }

  /**
   * 软删除记录
   */
  async softDelete(id: string): Promise<T> {
    try {
      const model = this.getModel();
      const result = await model.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      // 清除相关缓存
      await this.deleteCache(`${this.modelName}:*`);

      return result;
    } catch (error) {
      this.handleError(error, 'softDelete');
      throw error;
    }
  }

  /**
   * 恢复软删除的记录
   */
  async restore(id: string): Promise<T> {
    try {
      const model = this.getModel();
      const result = await model.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
        },
      });

      // 清除相关缓存
      await this.deleteCache(`${this.modelName}:*`);

      return result;
    } catch (error) {
      this.handleError(error, 'restore');
      throw error;
    }
  }

  /**
   * 计数查询
   */
  async count(where: TWhereInput = {} as TWhereInput, options: QueryOptions = {}): Promise<number> {
    const cacheKey = this.generateCacheKey('count', { where });

    // 尝试从缓存获取
    if (options.cache !== false) {
      const cached = await this.getFromCache<number>(cacheKey);
      if (cached !== null) return cached;
    }

    try {
      const model = this.getModel();
      const whereWithSoftDelete = this.applySoftDeleteFilter(where, options.includeSoftDeleted);

      const result = await model.count({
        where: whereWithSoftDelete,
      });

      // 设置缓存
      if (options.cache !== false) {
        await this.setCache(cacheKey, result, options.cacheTTL);
      }

      return result;
    } catch (error) {
      this.handleError(error, 'count');
      throw error;
    }
  }

  /**
   * 检查记录是否存在
   */
  async exists(where: TWhereInput): Promise<boolean> {
    try {
      const count = await this.count(where);
      return count > 0;
    } catch (error) {
      this.handleError(error, 'exists');
      throw error;
    }
  }

  /**
   * 错误处理
   */
  protected handleError(error: any, operation: string): void {
    console.error(`${this.modelName} ${operation} 操作失败:`, error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          throw TRPCErrorHandler.validationError('记录已存在，违反唯一约束');
        case 'P2025':
          throw TRPCErrorHandler.validationError('记录不存在');
        case 'P2003':
          throw TRPCErrorHandler.validationError('外键约束违反');
        default:
          throw TRPCErrorHandler.internalError(`数据库操作失败: ${error.message}`);
      }
    }

    throw TRPCErrorHandler.internalError('数据库操作失败');
  }
}
