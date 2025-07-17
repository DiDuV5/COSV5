/**
 * @fileoverview P0级配置迁移器
 * @description 执行P0级（关键基础设施）配置迁移
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

import { logger } from '@/lib/logging/log-deduplicator';
import { getEnvWithFallback } from '@/lib/config/env-compatibility';
import type { ConfigMigrationStatus, MigrationOptions } from './integration-types';

/**
 * P0级配置迁移器
 */
export class P0Migrator {
  /**
   * 执行P0级配置迁移
   */
  async migrateP0Configs(options: MigrationOptions = {}): Promise<ConfigMigrationStatus[]> {
    logger.info('开始P0级配置迁移（关键基础设施）');
    
    const results: ConfigMigrationStatus[] = [];

    // Redis配置迁移
    results.push(await this.migrateRedisConfig(options));

    // 数据库配置迁移
    results.push(await this.migrateDatabaseConfig(options));

    // 存储配置迁移
    results.push(await this.migrateStorageConfig(options));

    logger.info('P0级配置迁移完成', { 
      totalCategories: results.length,
      completedCategories: results.filter(r => r.status === 'completed').length,
      failedCategories: results.filter(r => r.status === 'failed').length
    });

    return results;
  }

  /**
   * 迁移Redis配置
   */
  private async migrateRedisConfig(options: MigrationOptions): Promise<ConfigMigrationStatus> {
    const status: ConfigMigrationStatus = {
      category: 'redis',
      priority: 'P0',
      status: 'in_progress',
      migratedCount: 0,
      totalCount: 4,
      errors: [],
      warnings: []
    };

    try {
      logger.info('迁移Redis配置');

      if (options.dryRun) {
        logger.info('DRY RUN: 模拟Redis配置迁移');
        status.status = 'completed';
        status.migratedCount = status.totalCount;
        return status;
      }

      // 检查Redis配置
      const redisHost = process.env.COSEREEDEN_REDIS_HOST || process.env.COSEREEDEN_REDIS_HOST;
      const redisPort = process.env.COSEREEDEN_REDIS_PORT || process.env.COSEREEDEN_REDIS_PORT;
      const redisPassword = process.env.COSEREEDEN_REDIS_PASSWORD || process.env.COSEREEDEN_REDIS_PASSWORD;
      const redisDb = process.env.COSEREEDEN_REDIS_DB || process.env.COSEREEDEN_REDIS_DB;

      // 验证配置
      if (!redisHost) {
        status.errors.push('Redis主机地址未配置');
      } else {
        status.migratedCount++;
      }

      if (!redisPort) {
        status.warnings.push('Redis端口未配置，将使用默认值6379');
      } else {
        status.migratedCount++;
      }

      if (!redisPassword && process.env.NODE_ENV === 'production') {
        status.warnings.push('生产环境建议设置Redis密码');
      } else if (redisPassword) {
        status.migratedCount++;
      }

      if (!redisDb) {
        status.warnings.push('Redis数据库编号未配置，将使用默认值0');
      } else {
        status.migratedCount++;
      }

      status.status = status.errors.length === 0 ? 'completed' : 'failed';
      logger.info('Redis配置迁移完成', { 
        migratedCount: status.migratedCount,
        totalCount: status.totalCount,
        errors: status.errors.length,
        warnings: status.warnings.length
      });

    } catch (error) {
      status.status = 'failed';
      status.errors.push(`Redis配置迁移失败: ${error instanceof Error ? error.message : '未知错误'}`);
      logger.error('Redis配置迁移失败', { error });
    }

    return status;
  }

  /**
   * 迁移数据库配置
   */
  private async migrateDatabaseConfig(options: MigrationOptions): Promise<ConfigMigrationStatus> {
    const status: ConfigMigrationStatus = {
      category: 'database',
      priority: 'P0',
      status: 'in_progress',
      migratedCount: 0,
      totalCount: 3,
      errors: [],
      warnings: []
    };

    try {
      logger.info('迁移数据库配置');

      if (options.dryRun) {
        logger.info('DRY RUN: 模拟数据库配置迁移');
        status.status = 'completed';
        status.migratedCount = status.totalCount;
        return status;
      }

      // 检查数据库配置
      const databaseUrl = process.env.COSEREEDEN_DATABASE_URL || getEnvWithFallback('COSEREEDEN_DATABASE_URL');
      const connectionLimit = process.env.COSEREEDEN_DB_CONNECTION_LIMIT || process.env.COSEREEDEN_DB_CONNECTION_LIMIT;
      const connectTimeout = process.env.COSEREEDEN_DB_CONNECT_TIMEOUT || process.env.COSEREEDEN_DB_CONNECT_TIMEOUT;

      if (!databaseUrl) {
        status.errors.push('数据库连接URL未配置');
      } else {
        status.migratedCount++;
      }

      if (!connectionLimit) {
        status.warnings.push('数据库连接池大小未配置，将使用默认值');
      } else {
        status.migratedCount++;
      }

      if (!connectTimeout) {
        status.warnings.push('数据库连接超时未配置，将使用默认值');
      } else {
        status.migratedCount++;
      }

      status.status = status.errors.length === 0 ? 'completed' : 'failed';
      logger.info('数据库配置迁移完成', { 
        migratedCount: status.migratedCount,
        totalCount: status.totalCount,
        errors: status.errors.length,
        warnings: status.warnings.length
      });

    } catch (error) {
      status.status = 'failed';
      status.errors.push(`数据库配置迁移失败: ${error instanceof Error ? error.message : '未知错误'}`);
      logger.error('数据库配置迁移失败', { error });
    }

    return status;
  }

  /**
   * 迁移存储配置
   */
  private async migrateStorageConfig(options: MigrationOptions): Promise<ConfigMigrationStatus> {
    const status: ConfigMigrationStatus = {
      category: 'storage',
      priority: 'P0',
      status: 'in_progress',
      migratedCount: 0,
      totalCount: 4,
      errors: [],
      warnings: []
    };

    try {
      logger.info('迁移存储配置');

      if (options.dryRun) {
        logger.info('DRY RUN: 模拟存储配置迁移');
        status.status = 'completed';
        status.migratedCount = status.totalCount;
        return status;
      }

      // 检查Cloudflare R2配置
      const accessKeyId = process.env.COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID;
      const secretAccessKey = process.env.COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY;
      const bucketName = process.env.COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME || process.env.COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME;
      const endpoint = process.env.COSEREEDEN_CLOUDFLARE_R2_ENDPOINT || process.env.COSEREEDEN_CLOUDFLARE_R2_ENDPOINT;

      if (!accessKeyId) {
        status.errors.push('Cloudflare R2访问密钥ID未配置');
      } else {
        status.migratedCount++;
      }

      if (!secretAccessKey) {
        status.errors.push('Cloudflare R2秘密访问密钥未配置');
      } else {
        status.migratedCount++;
      }

      if (!bucketName) {
        status.warnings.push('R2存储桶名称未配置，将使用默认值');
      } else {
        status.migratedCount++;
      }

      if (!endpoint) {
        status.warnings.push('R2端点URL未配置，将使用默认值');
      } else {
        status.migratedCount++;
      }

      status.status = status.errors.length === 0 ? 'completed' : 'failed';
      logger.info('存储配置迁移完成', { 
        migratedCount: status.migratedCount,
        totalCount: status.totalCount,
        errors: status.errors.length,
        warnings: status.warnings.length
      });

    } catch (error) {
      status.status = 'failed';
      status.errors.push(`存储配置迁移失败: ${error instanceof Error ? error.message : '未知错误'}`);
      logger.error('存储配置迁移失败', { error });
    }

    return status;
  }

  /**
   * 验证P0级配置完整性
   */
  async validateP0Configs(): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证Redis配置
    const redisHost = process.env.COSEREEDEN_REDIS_HOST || process.env.COSEREEDEN_REDIS_HOST;
    if (!redisHost) {
      errors.push('Redis主机地址未配置');
    }

    // 验证数据库配置
    const databaseUrl = process.env.COSEREEDEN_DATABASE_URL || getEnvWithFallback('COSEREEDEN_DATABASE_URL');
    if (!databaseUrl) {
      errors.push('数据库连接URL未配置');
    }

    // 验证存储配置
    const accessKeyId = process.env.COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    
    if (!accessKeyId) {
      errors.push('Cloudflare R2访问密钥ID未配置');
    }
    
    if (!secretAccessKey) {
      errors.push('Cloudflare R2秘密访问密钥未配置');
    }

    // 生产环境特殊检查
    if (process.env.NODE_ENV === 'production') {
      const redisPassword = process.env.COSEREEDEN_REDIS_PASSWORD || process.env.COSEREEDEN_REDIS_PASSWORD;
      if (!redisPassword) {
        warnings.push('生产环境建议设置Redis密码');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
