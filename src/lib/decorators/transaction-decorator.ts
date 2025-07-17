/**
 * @fileoverview 事务装饰器
 * @description 提供事务装饰器简化事务使用
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { TransactionManager, TransactionOptions } from '@/lib/transaction-manager';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';

/**
 * 事务装饰器选项
 */
export interface TransactionDecoratorOptions extends TransactionOptions {
  /** 错误处理策略 */
  errorHandling?: 'throw' | 'return' | 'log';
  /** 成功回调 */
  onSuccess?: (result: any) => void;
  /** 失败回调 */
  onError?: (error: any) => void;
}

/**
 * 事务装饰器
 * 自动将方法包装在数据库事务中
 */
export function withTransaction(options: TransactionDecoratorOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: any, ...args: any[]) {
      const transactionId = `${target.constructor.name}.${propertyKey}_${Date.now()}`;
      
      try {
        const result = await TransactionManager.executeTransaction(
          async (tx) => {
            // 将事务客户端注入到方法的上下文中
            const contextWithTx = { ...this, tx };
            return await originalMethod.apply(contextWithTx, args);
          },
          {
            ...options,
            transactionId,
          }
        );

        if (result.success) {
          if (options.onSuccess) {
            options.onSuccess(result.data);
          }
          return result.data;
        } else {
          const error = new Error(result.error || '事务执行失败');
          
          if (options.onError) {
            options.onError(error);
          }

          switch (options.errorHandling) {
            case 'return':
              return null;
            case 'log':
              console.error(`事务失败 [${transactionId}]:`, error);
              return null;
            case 'throw':
            default:
              throw TRPCErrorHandler.internalError(
                result.error || '事务执行失败'
              );
          }
        }
      } catch (error) {
        if (options.onError) {
          options.onError(error);
        }

        switch (options.errorHandling) {
          case 'return':
            return null;
          case 'log':
            console.error(`事务异常 [${transactionId}]:`, error);
            return null;
          case 'throw':
          default:
            throw error;
        }
      }
    };

    return descriptor;
  };
}

/**
 * 批量操作事务装饰器
 * 专门用于批量数据操作
 */
export function withBatchTransaction(options: TransactionDecoratorOptions = {}) {
  return withTransaction({
    maxRetries: 5,
    retryDelay: 2000,
    timeout: 30000, // 30秒超时
    isolationLevel: 'Serializable',
    ...options,
  });
}

/**
 * 关键业务事务装饰器
 * 用于关键业务操作，具有更严格的事务保证
 */
export function withCriticalTransaction(options: TransactionDecoratorOptions = {}) {
  return withTransaction({
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 15000, // 15秒超时
    isolationLevel: 'Serializable',
    enableMonitoring: true,
    ...options,
  });
}

/**
 * 快速事务装饰器
 * 用于简单快速的操作
 */
export function withQuickTransaction(options: TransactionDecoratorOptions = {}) {
  return withTransaction({
    maxRetries: 1,
    retryDelay: 500,
    timeout: 5000, // 5秒超时
    isolationLevel: 'ReadCommitted',
    ...options,
  });
}

/**
 * 事务方法工厂
 * 用于动态创建事务方法
 */
export class TransactionMethodFactory {
  /**
   * 创建用户注册事务方法
   */
  static createUserRegistration() {
    return withCriticalTransaction({
      errorHandling: 'throw',
      onSuccess: (result) => {
        console.log('用户注册成功:', result.user?.username);
      },
      onError: (error) => {
        console.error('用户注册失败:', error);
      },
    });
  }

  /**
   * 创建帖子发布事务方法
   */
  static createPostPublication() {
    return withCriticalTransaction({
      errorHandling: 'throw',
      timeout: 20000, // 20秒超时，因为可能涉及文件上传
      onSuccess: (result) => {
        console.log('帖子发布成功:', result.post?.title);
      },
      onError: (error) => {
        console.error('帖子发布失败:', error);
      },
    });
  }

  /**
   * 创建评论创建事务方法
   */
  static createCommentCreation() {
    return withQuickTransaction({
      errorHandling: 'throw',
      onSuccess: (result) => {
        console.log('评论创建成功');
      },
    });
  }

  /**
   * 创建用户关注事务方法
   */
  static createUserFollow() {
    return withQuickTransaction({
      errorHandling: 'throw',
      maxRetries: 2,
    });
  }

  /**
   * 创建点赞事务方法
   */
  static createLikeAction() {
    return withQuickTransaction({
      errorHandling: 'return', // 点赞失败不抛出错误
      maxRetries: 2,
    });
  }

  /**
   * 创建数据统计更新事务方法
   */
  static createStatsUpdate() {
    return withBatchTransaction({
      errorHandling: 'log', // 统计更新失败只记录日志
      maxRetries: 5,
      retryDelay: 3000,
    });
  }
}

/**
 * 事务上下文类型
 * 用于在事务方法中访问事务客户端
 */
export interface TransactionContext {
  tx: any; // Prisma.TransactionClient
}

/**
 * 事务辅助函数
 */
export class TransactionHelpers {
  /**
   * 检查是否在事务中
   */
  static isInTransaction(context: any): context is TransactionContext {
    return context && typeof context.tx === 'object';
  }

  /**
   * 获取数据库客户端（事务或普通）
   */
  static getDbClient(context: any) {
    return this.isInTransaction(context) ? context.tx : context.db;
  }

  /**
   * 安全执行事务操作
   */
  static async safeExecute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      console.error('事务操作失败:', error);
      
      if (fallback) {
        try {
          return await fallback();
        } catch (fallbackError) {
          console.error('回退操作也失败:', fallbackError);
        }
      }
      
      return null;
    }
  }
}
