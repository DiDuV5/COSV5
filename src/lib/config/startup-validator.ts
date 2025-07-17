/**
 * @fileoverview 启动时配置验证器
 * @description 应用启动时的统一配置验证和初始化检查
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

import { EnvValidator, validateEnvironmentOnStartup } from './env-validator';
import { StorageFactory } from '../storage/object-storage/storage-factory';
import { RedisConfigManager } from './redis-config';
import { getDatabaseConfig } from '../database/connection/config';

/**
 * 启动验证结果接口
 */
export interface StartupValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  services: {
    database: { status: 'ok' | 'error' | 'warning'; message: string };
    storage: { status: 'ok' | 'error' | 'warning'; message: string };
    redis: { status: 'ok' | 'error' | 'warning'; message: string };
  };
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

/**
 * 启动配置验证器
 */
export class StartupValidator {
  /**
   * 执行完整的启动验证
   */
  static async validateStartup(): Promise<StartupValidationResult> {
    console.log('🚀 开始应用启动验证...\n');

    const result: StartupValidationResult = {
      success: true,
      errors: [],
      warnings: [],
      services: {
        database: { status: 'ok', message: '' },
        storage: { status: 'ok', message: '' },
        redis: { status: 'ok', message: '' },
      },
      summary: {
        totalChecks: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
      },
    };

    // 1. 验证环境变量
    await this.validateEnvironmentVariables(result);

    // 2. 验证数据库配置
    await this.validateDatabaseConfig(result);

    // 3. 验证存储配置
    await this.validateStorageConfig(result);

    // 4. 验证Redis配置
    await this.validateRedisConfig(result);

    // 5. 生成总结
    this.generateSummary(result);

    return result;
  }

  /**
   * 验证环境变量
   */
  private static async validateEnvironmentVariables(result: StartupValidationResult): Promise<void> {
    console.log('📋 验证环境变量配置...');

    try {
      const envResult = EnvValidator.validateAllConfigs();
      result.summary.totalChecks += envResult.summary.totalChecked;

      if (envResult.isValid) {
        result.summary.passed += envResult.summary.requiredPresent;
        console.log('✅ 环境变量验证通过');
      } else {
        result.success = false;
        result.errors.push(...envResult.errors);
        result.summary.failed += envResult.missing.length + envResult.invalid.length;
        console.log('❌ 环境变量验证失败');
      }

      if (envResult.warnings.length > 0) {
        result.warnings.push(...envResult.warnings);
        result.summary.warnings += envResult.warnings.length;
      }
    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : '环境变量验证异常';
      result.errors.push(`环境变量验证失败: ${errorMessage}`);
      result.summary.failed++;
      console.log('❌ 环境变量验证异常:', errorMessage);
    }
  }

  /**
   * 验证数据库配置
   */
  private static async validateDatabaseConfig(result: StartupValidationResult): Promise<void> {
    console.log('🗄️ 验证数据库配置...');

    try {
      getDatabaseConfig(); // 验证数据库配置是否可以正常创建
      result.services.database.status = 'ok';
      result.services.database.message = '数据库配置验证通过';
      result.summary.passed++;
      console.log('✅ 数据库配置验证通过');
    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : '数据库配置验证失败';
      result.services.database.status = 'error';
      result.services.database.message = errorMessage;
      result.errors.push(`数据库配置错误: ${errorMessage}`);
      result.summary.failed++;
      console.log('❌ 数据库配置验证失败:', errorMessage);
    }

    result.summary.totalChecks++;
  }

  /**
   * 验证存储配置
   */
  private static async validateStorageConfig(result: StartupValidationResult): Promise<void> {
    console.log('💾 验证存储配置...');

    try {
      const storageConfig = StorageFactory.createPrimaryStorageConfig();
      StorageFactory.validateStorageConfig(storageConfig);

      result.services.storage.status = 'ok';
      result.services.storage.message = '存储配置验证通过';
      result.summary.passed++;
      console.log('✅ 存储配置验证通过');
    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : '存储配置验证失败';
      result.services.storage.status = 'error';
      result.services.storage.message = errorMessage;
      result.errors.push(`存储配置错误: ${errorMessage}`);
      result.summary.failed++;
      console.log('❌ 存储配置验证失败:', errorMessage);
    }

    result.summary.totalChecks++;
  }

  /**
   * 验证Redis配置
   */
  private static async validateRedisConfig(result: StartupValidationResult): Promise<void> {
    console.log('🔴 验证Redis配置...');

    try {
      RedisConfigManager.getConnectionConfig(); // 验证Redis配置是否可以正常创建
      const validation = RedisConfigManager.validateConfig();

      if (validation.isValid) {
        result.services.redis.status = 'ok';
        result.services.redis.message = 'Redis配置验证通过';
        result.summary.passed++;
        console.log('✅ Redis配置验证通过');
      } else {
        result.services.redis.status = 'warning';
        result.services.redis.message = `Redis配置有警告: ${validation.warnings.join(', ')}`;
        result.warnings.push(...validation.warnings);
        result.summary.warnings += validation.warnings.length;
        result.summary.passed++;
        console.log('⚠️ Redis配置有警告');
      }
    } catch (error) {
      // Redis是可选服务，配置失败不影响应用启动
      const errorMessage = error instanceof Error ? error.message : 'Redis配置验证失败';
      result.services.redis.status = 'warning';
      result.services.redis.message = `Redis配置警告: ${errorMessage}`;
      result.warnings.push(`Redis配置警告: ${errorMessage}`);
      result.summary.warnings++;
      result.summary.passed++;
      console.log('⚠️ Redis配置警告:', errorMessage);
    }

    result.summary.totalChecks++;
  }

  /**
   * 生成验证总结
   */
  private static generateSummary(result: StartupValidationResult): void {
    console.log('\n📊 启动验证总结:');
    console.log(`🔍 总计检查: ${result.summary.totalChecks} 项`);
    console.log(`✅ 通过: ${result.summary.passed} 项`);
    console.log(`❌ 失败: ${result.summary.failed} 项`);
    console.log(`⚠️ 警告: ${result.summary.warnings} 项`);

    console.log('\n🔧 服务状态:');
    console.log(`📊 数据库: ${this.getStatusIcon(result.services.database.status)} ${result.services.database.message}`);
    console.log(`💾 存储: ${this.getStatusIcon(result.services.storage.status)} ${result.services.storage.message}`);
    console.log(`🔴 Redis: ${this.getStatusIcon(result.services.redis.status)} ${result.services.redis.message}`);

    if (result.success) {
      console.log('\n🎉 应用启动验证通过！所有关键服务配置正常。');
    } else {
      console.log('\n💥 应用启动验证失败！请检查以下错误:');
      result.errors.forEach(error => console.log(`  ❌ ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️ 注意以下警告:');
      result.warnings.forEach(warning => console.log(`  ⚠️ ${warning}`));
    }
  }

  /**
   * 获取状态图标
   */
  private static getStatusIcon(status: 'ok' | 'error' | 'warning'): string {
    switch (status) {
      case 'ok':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return '❓';
    }
  }

  /**
   * 快速验证（仅检查关键配置）
   */
  static async quickValidate(): Promise<boolean> {
    try {
      // 只验证P0级配置
      const envResult = EnvValidator.validateP0Config();
      if (!envResult.isValid) {
        console.error('❌ 关键环境变量配置缺失');
        return false;
      }

      // 快速检查存储配置
      StorageFactory.createPrimaryStorageConfig();

      console.log('✅ 快速验证通过');
      return true;
    } catch (error) {
      console.error('❌ 快速验证失败:', error instanceof Error ? error.message : '未知错误');
      return false;
    }
  }
}

/**
 * 导出便捷函数
 */
export async function validateStartupConfig(): Promise<StartupValidationResult> {
  return StartupValidator.validateStartup();
}

export async function quickValidateConfig(): Promise<boolean> {
  return StartupValidator.quickValidate();
}

/**
 * 在应用启动时自动验证（如果启用）
 */
if (process.env.COSEREEDEN_AUTO_VALIDATE_ON_STARTUP !== 'false') {
  // 延迟执行，避免在模块加载时立即执行
  process.nextTick(async () => {
    if (process.env.NODE_ENV !== 'test') {
      try {
        validateEnvironmentOnStartup();
      } catch (error) {
        console.error('启动验证失败:', error);
        if (process.env.NODE_ENV === 'production') {
          process.exit(1);
        }
      }
    }
  });
}
