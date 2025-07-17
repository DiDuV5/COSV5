/**
 * @fileoverview 软删除中间件
 * @description 提供统一的软删除功能和查询过滤
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { Prisma } from '@prisma/client';

/**
 * 软删除字段接口
 */
export interface SoftDeleteFields {
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy?: string | null;
  deletionReason?: string | null;
}

/**
 * 软删除查询选项
 */
export interface SoftDeleteQueryOptions {
  /** 是否包含已删除的记录 */
  includeDeleted?: boolean;
  /** 是否只返回已删除的记录 */
  onlyDeleted?: boolean;
}

/**
 * 软删除操作选项
 */
export interface SoftDeleteOptions {
  /** 删除者ID */
  deletedBy?: string;
  /** 删除原因 */
  deletionReason?: string;
  /** 是否强制物理删除 */
  forceDelete?: boolean;
}

/**
 * 软删除中间件类
 */
export class SoftDeleteMiddleware {
  /**
   * 应用软删除过滤器到查询条件
   */
  static applyFilter<T extends Record<string, any>>(
    where: T,
    options: SoftDeleteQueryOptions = {}
  ): T {
    const { includeDeleted = false, onlyDeleted = false } = options;

    // 如果明确要求包含已删除记录，不添加过滤条件
    if (includeDeleted && !onlyDeleted) {
      return where;
    }

    // 如果只要已删除记录
    if (onlyDeleted) {
      return {
        ...where,
        isDeleted: true,
      } as T;
    }

    // 默认过滤掉已删除记录
    return {
      ...where,
      isDeleted: false,
    } as T;
  }

  /**
   * 创建软删除数据
   */
  static createSoftDeleteData(options: SoftDeleteOptions = {}): Partial<SoftDeleteFields> {
    const { deletedBy, deletionReason } = options;

    return {
      isDeleted: true,
      deletedAt: new Date(),
      ...(deletedBy && { deletedBy }),
      ...(deletionReason && { deletionReason }),
    };
  }

  /**
   * 创建恢复数据
   */
  static createRestoreData(): Partial<SoftDeleteFields> {
    return {
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      deletionReason: null,
    };
  }

  /**
   * 检查记录是否已被软删除
   */
  static isDeleted(record: Partial<SoftDeleteFields>): boolean {
    return record.isDeleted === true;
  }

  /**
   * 获取删除信息
   */
  static getDeletionInfo(record: Partial<SoftDeleteFields>): {
    isDeleted: boolean;
    deletedAt: Date | null;
    deletedBy: string | null;
    deletionReason: string | null;
  } {
    return {
      isDeleted: record.isDeleted || false,
      deletedAt: record.deletedAt || null,
      deletedBy: record.deletedBy || null,
      deletionReason: record.deletionReason || null,
    };
  }
}

/**
 * 软删除装饰器
 */
export function withSoftDelete(options: SoftDeleteQueryOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: any, ...args: any[]) {
      // 如果第一个参数是查询条件对象，应用软删除过滤器
      if (args.length > 0 && typeof args[0] === 'object' && args[0].where) {
        args[0].where = SoftDeleteMiddleware.applyFilter(args[0].where, options);
      }

      return await originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Prisma中间件工厂
 */
export class PrismaSoftDeleteMiddleware {
  /**
   * 创建Prisma软删除中间件
   */
  static create(options: {
    /** 启用软删除的模型列表 */
    enabledModels?: string[];
    /** 默认查询选项 */
    defaultOptions?: SoftDeleteQueryOptions;
  } = {}) {
    const { enabledModels = [], defaultOptions = {} } = options;

    return async (params: any, next: any) => {
      const { model, action, args } = params;

      // 检查是否为启用软删除的模型
      if (!model || !enabledModels.includes(model)) {
        return next(params);
      }

      // 处理查询操作
      if (['findFirst', 'findMany', 'findUnique', 'count', 'aggregate'].includes(action)) {
        if (args.where) {
          args.where = SoftDeleteMiddleware.applyFilter(args.where, defaultOptions);
        } else {
          args.where = SoftDeleteMiddleware.applyFilter({}, defaultOptions);
        }
      }

      // 处理更新操作 - 转换为软删除
      if (action === 'delete') {
        params.action = 'update';
        params.args.data = SoftDeleteMiddleware.createSoftDeleteData();
      }

      // 处理批量删除操作
      if (action === 'deleteMany') {
        params.action = 'updateMany';
        params.args.data = SoftDeleteMiddleware.createSoftDeleteData();
      }

      return next(params);
    };
  }
}

/**
 * 软删除查询构建器
 */
export class SoftDeleteQueryBuilder {
  private whereConditions: any = {};
  private options: SoftDeleteQueryOptions = {};

  constructor(initialWhere: any = {}) {
    this.whereConditions = initialWhere;
  }

  /**
   * 包含已删除记录
   */
  includeDeleted(): this {
    this.options.includeDeleted = true;
    return this;
  }

  /**
   * 只返回已删除记录
   */
  onlyDeleted(): this {
    this.options.onlyDeleted = true;
    return this;
  }

  /**
   * 只返回未删除记录（默认）
   */
  onlyActive(): this {
    this.options.includeDeleted = false;
    this.options.onlyDeleted = false;
    return this;
  }

  /**
   * 添加查询条件
   */
  addWhere(condition: any): this {
    this.whereConditions = { ...this.whereConditions, ...condition };
    return this;
  }

  /**
   * 构建最终查询条件
   */
  build(): any {
    return SoftDeleteMiddleware.applyFilter(this.whereConditions, this.options);
  }
}

/**
 * 软删除工具类
 */
export class SoftDeleteUtils {
  /**
   * 批量软删除
   */
  static async batchSoftDelete<T>(
    model: any,
    ids: string[],
    options: SoftDeleteOptions = {}
  ): Promise<{ count: number }> {
    const updateData = SoftDeleteMiddleware.createSoftDeleteData(options);

    return await model.updateMany({
      where: {
        id: { in: ids },
        isDeleted: false, // 只删除未删除的记录
      },
      data: updateData,
    });
  }

  /**
   * 批量恢复
   */
  static async batchRestore<T>(
    model: any,
    ids: string[]
  ): Promise<{ count: number }> {
    const restoreData = SoftDeleteMiddleware.createRestoreData();

    return await model.updateMany({
      where: {
        id: { in: ids },
        isDeleted: true, // 只恢复已删除的记录
      },
      data: restoreData,
    });
  }

  /**
   * 永久删除已软删除的记录
   */
  static async permanentDelete<T>(
    model: any,
    ids: string[]
  ): Promise<{ count: number }> {
    return await model.deleteMany({
      where: {
        id: { in: ids },
        isDeleted: true, // 只永久删除已软删除的记录
      },
    });
  }

  /**
   * 清理过期的软删除记录
   */
  static async cleanupExpiredDeleted<T>(
    model: any,
    daysOld: number = 30
  ): Promise<{ count: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return await model.deleteMany({
      where: {
        isDeleted: true,
        deletedAt: {
          lt: cutoffDate,
        },
      },
    });
  }

  /**
   * 获取软删除统计信息
   */
  static async getStats(model: any): Promise<{
    total: number;
    active: number;
    deleted: number;
    deletedPercentage: number;
  }> {
    const [total, deleted] = await Promise.all([
      model.count(),
      model.count({
        where: { isDeleted: true },
      }),
    ]);

    const active = total - deleted;
    const deletedPercentage = total > 0 ? (deleted / total) * 100 : 0;

    return {
      total,
      active,
      deleted,
      deletedPercentage: Math.round(deletedPercentage * 100) / 100,
    };
  }
}
