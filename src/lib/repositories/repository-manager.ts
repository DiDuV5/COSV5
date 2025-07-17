/**
 * @fileoverview Repository管理器
 * @description 统一管理所有Repository实例，提供依赖注入
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';
import { UserRepository } from './user-repository';
import { PostRepository } from './post-repository';
import { CommentRepository } from './comment-repository';

/**
 * Repository容器接口
 */
export interface RepositoryContainer {
  user: UserRepository;
  post: PostRepository;
  comment: CommentRepository;
}

/**
 * Repository管理器类
 */
export class RepositoryManager {
  private static instance: RepositoryManager;
  private repositories: RepositoryContainer;

  private constructor(db: PrismaClient) {
    this.repositories = {
      user: new UserRepository(db),
      post: new PostRepository(db),
      comment: new CommentRepository(db),
    };
  }

  /**
   * 获取Repository管理器实例（单例模式）
   */
  static getInstance(db: PrismaClient): RepositoryManager {
    if (!RepositoryManager.instance) {
      RepositoryManager.instance = new RepositoryManager(db);
    }
    return RepositoryManager.instance;
  }

  /**
   * 获取用户Repository
   */
  get user(): UserRepository {
    return this.repositories.user;
  }

  /**
   * 获取帖子Repository
   */
  get post(): PostRepository {
    return this.repositories.post;
  }

  /**
   * 获取评论Repository
   */
  get comment(): CommentRepository {
    return this.repositories.comment;
  }

  /**
   * 获取所有Repository
   */
  getAll(): RepositoryContainer {
    return this.repositories;
  }

  /**
   * 清除所有Repository的缓存
   */
  async clearAllCaches(): Promise<void> {
    const clearPromises = Object.values(this.repositories).map(repo => 
      repo['deleteCache']('*') // 调用protected方法
    );
    
    await Promise.allSettled(clearPromises);
  }

  /**
   * 获取Repository统计信息
   */
  getStats(): {
    repositoryCount: number;
    repositories: string[];
  } {
    return {
      repositoryCount: Object.keys(this.repositories).length,
      repositories: Object.keys(this.repositories),
    };
  }
}

/**
 * Repository工厂函数
 */
export function createRepositories(db: PrismaClient): RepositoryContainer {
  return RepositoryManager.getInstance(db).getAll();
}

/**
 * Repository装饰器
 * 自动注入Repository到tRPC上下文中
 */
export function withRepositories() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: any, params: { ctx: any; input: any }) {
      const { ctx } = params;
      
      // 如果上下文中还没有repositories，则创建
      if (!ctx.repositories) {
        ctx.repositories = createRepositories(ctx.db);
      }

      return await originalMethod.call(this, params);
    };

    return descriptor;
  };
}

/**
 * Repository辅助函数
 */
export class RepositoryHelpers {
  /**
   * 批量操作多个Repository
   */
  static async batchOperation<T>(
    repositories: RepositoryContainer,
    operations: Array<{
      repository: keyof RepositoryContainer;
      method: string;
      args: any[];
    }>
  ): Promise<T[]> {
    const promises = operations.map(op => {
      const repo = repositories[op.repository] as any;
      return repo[op.method](...op.args);
    });

    return Promise.all(promises);
  }

  /**
   * 事务中执行Repository操作
   */
  static async withTransaction<T>(
    db: PrismaClient,
    callback: (repositories: RepositoryContainer) => Promise<T>
  ): Promise<T> {
    return db.$transaction(async (tx) => {
      // 创建使用事务客户端的Repository实例
      const transactionRepositories = {
        user: new UserRepository(tx as PrismaClient),
        post: new PostRepository(tx as PrismaClient),
        comment: new CommentRepository(tx as PrismaClient),
      };

      return await callback(transactionRepositories);
    });
  }

  /**
   * 验证Repository方法参数
   */
  static validateParams(params: any, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (params[field] === undefined || params[field] === null) {
        throw new Error(`缺少必需参数: ${field}`);
      }
    }
  }

  /**
   * 标准化分页参数
   */
  static normalizePagination(pagination: any) {
    return {
      page: Math.max(1, parseInt(pagination.page) || 1),
      limit: Math.min(100, Math.max(1, parseInt(pagination.limit) || 20)),
      cursor: pagination.cursor || undefined,
    };
  }

  /**
   * 标准化排序参数
   */
  static normalizeSorting(sort: any) {
    const validDirections = ['asc', 'desc'];
    return {
      field: sort.field || 'createdAt',
      direction: validDirections.includes(sort.direction) ? sort.direction : 'desc',
    };
  }
}

/**
 * Repository中间件
 */
export class RepositoryMiddleware {
  /**
   * 日志中间件
   */
  static logging() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (this: any, ...args: any[]) {
        const startTime = Date.now();
        const className = this.constructor.name;
        
        console.log(`[${className}] 开始执行 ${propertyKey}`);
        
        try {
          const result = await originalMethod.apply(this, args);
          const duration = Date.now() - startTime;
          console.log(`[${className}] ${propertyKey} 执行成功，耗时 ${duration}ms`);
          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          console.error(`[${className}] ${propertyKey} 执行失败，耗时 ${duration}ms:`, error);
          throw error;
        }
      };

      return descriptor;
    };
  }

  /**
   * 性能监控中间件
   */
  static performance(threshold: number = 1000) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (this: any, ...args: any[]) {
        const startTime = Date.now();
        
        try {
          const result = await originalMethod.apply(this, args);
          const duration = Date.now() - startTime;
          
          if (duration > threshold) {
            console.warn(`[性能警告] ${target.constructor.name}.${propertyKey} 执行时间过长: ${duration}ms`);
          }
          
          return result;
        } catch (error) {
          throw error;
        }
      };

      return descriptor;
    };
  }

  /**
   * 缓存中间件
   */
  static cache(ttl: number = 300) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (this: any, ...args: any[]) {
        const cacheKey = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;
        
        // 尝试从缓存获取
        const cached = await this.getFromCache(cacheKey);
        if (cached) {
          return cached;
        }

        // 执行原方法
        const result = await originalMethod.apply(this, args);
        
        // 设置缓存
        await this.setCache(cacheKey, result, ttl);
        
        return result;
      };

      return descriptor;
    };
  }
}

/**
 * Repository配置
 */
export interface RepositoryConfig {
  /** 默认缓存TTL */
  defaultCacheTTL: number;
  /** 是否启用性能监控 */
  enablePerformanceMonitoring: boolean;
  /** 性能监控阈值（毫秒） */
  performanceThreshold: number;
  /** 是否启用日志 */
  enableLogging: boolean;
}

/**
 * 默认Repository配置
 */
export const defaultRepositoryConfig: RepositoryConfig = {
  defaultCacheTTL: 300,
  enablePerformanceMonitoring: true,
  performanceThreshold: 1000,
  enableLogging: process.env.NODE_ENV === 'development',
};

/**
 * 配置Repository
 */
export function configureRepositories(config: Partial<RepositoryConfig> = {}) {
  const finalConfig = { ...defaultRepositoryConfig, ...config };
  
  // 这里可以根据配置应用全局设置
  if (finalConfig.enableLogging) {
    console.log('Repository日志已启用');
  }
  
  if (finalConfig.enablePerformanceMonitoring) {
    console.log(`Repository性能监控已启用，阈值: ${finalConfig.performanceThreshold}ms`);
  }
  
  return finalConfig;
}
