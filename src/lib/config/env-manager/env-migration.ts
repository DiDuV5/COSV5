/**
 * @fileoverview 环境变量配置迁移功能
 * @description 提供配置迁移到COSEREEDEN_前缀的功能
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

import { logger } from '@/lib/logging/log-deduplicator';
import type { MigrationResult } from './env-types';

/**
 * 创建迁移映射表
 */
export function createMigrationMap(): Map<string, string> {
  const migrationMap = new Map<string, string>();

  // Redis配置迁移
  migrationMap.set('REDIS_HOST', 'COSEREEDEN_REDIS_HOST');
  migrationMap.set('REDIS_PORT', 'COSEREEDEN_REDIS_PORT');
  migrationMap.set('REDIS_PASSWORD', 'COSEREEDEN_REDIS_PASSWORD');
  migrationMap.set('REDIS_DB', 'COSEREEDEN_REDIS_DB');
  migrationMap.set('REDIS_DEFAULT_TTL', 'COSEREEDEN_REDIS_DEFAULT_TTL');
  migrationMap.set('REDIS_MAX_RETRIES', 'COSEREEDEN_REDIS_MAX_RETRIES');
  migrationMap.set('REDIS_CONNECT_TIMEOUT', 'COSEREEDEN_REDIS_CONNECT_TIMEOUT');
  migrationMap.set('REDIS_COMMAND_TIMEOUT', 'COSEREEDEN_REDIS_COMMAND_TIMEOUT');
  migrationMap.set('REDIS_TLS_ENABLED', 'COSEREEDEN_REDIS_TLS_ENABLED');
  migrationMap.set('REDIS_ENABLE_AUTH', 'COSEREEDEN_REDIS_ENABLE_AUTH');

  // 数据库配置迁移
  migrationMap.set('DATABASE_URL', 'COSEREEDEN_DATABASE_URL');
  migrationMap.set('DB_CONNECTION_LIMIT', 'COSEREEDEN_DB_CONNECTION_LIMIT');
  migrationMap.set('DB_CONNECT_TIMEOUT', 'COSEREEDEN_DB_CONNECT_TIMEOUT');
  migrationMap.set('DB_QUERY_TIMEOUT', 'COSEREEDEN_DB_QUERY_TIMEOUT');
  migrationMap.set('DB_POOL_TIMEOUT', 'COSEREEDEN_DB_POOL_TIMEOUT');

  // 存储配置迁移
  migrationMap.set('CLOUDFLARE_R2_ACCESS_KEY_ID', 'COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID');
  migrationMap.set('CLOUDFLARE_R2_SECRET_ACCESS_KEY', 'COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY');
  migrationMap.set('CLOUDFLARE_R2_BUCKET_NAME', 'COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME');
  migrationMap.set('CLOUDFLARE_R2_ENDPOINT', 'COSEREEDEN_CLOUDFLARE_R2_ENDPOINT');
  migrationMap.set('CLOUDFLARE_R2_CDN_DOMAIN', 'COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN');
  migrationMap.set('CLOUDFLARE_ACCOUNT_ID', 'COSEREEDEN_CLOUDFLARE_ACCOUNT_ID');

  // 邮件配置迁移
  migrationMap.set('EMAIL_TOKEN_EXPIRY_HOURS', 'COSEREEDEN_EMAIL_TOKEN_EXPIRY_HOURS');
  migrationMap.set('PASSWORD_RESET_EXPIRY_HOURS', 'COSEREEDEN_PASSWORD_RESET_EXPIRY_HOURS');
  migrationMap.set('MAX_RESEND_ATTEMPTS', 'COSEREEDEN_MAX_RESEND_ATTEMPTS');
  migrationMap.set('RESEND_COOLDOWN_MINUTES', 'COSEREEDEN_RESEND_COOLDOWN_MINUTES');
  migrationMap.set('EMAIL_FROM', 'COSEREEDEN_EMAIL_FROM');
  migrationMap.set('EMAIL_FROM_NAME', 'COSEREEDEN_EMAIL_FROM_NAME');
  migrationMap.set('EMAIL_MAX_CONNECTIONS', 'COSEREEDEN_EMAIL_MAX_CONNECTIONS');
  migrationMap.set('EMAIL_CONNECTION_TIMEOUT', 'COSEREEDEN_EMAIL_CONNECTION_TIMEOUT');

  // 安全配置迁移
  migrationMap.set('SECURITY_KEY_LENGTH', 'COSEREEDEN_SECURITY_KEY_LENGTH');
  migrationMap.set('SECURITY_IV_LENGTH', 'COSEREEDEN_SECURITY_IV_LENGTH');
  migrationMap.set('SECURITY_PBKDF2_ITERATIONS', 'COSEREEDEN_SECURITY_PBKDF2_ITERATIONS');
  migrationMap.set('SECURITY_RSA_KEY_LENGTH', 'COSEREEDEN_SECURITY_RSA_KEY_LENGTH');

  // 认证配置迁移
  migrationMap.set('NEXTAUTH_SECRET', 'COSEREEDEN_NEXTAUTH_SECRET');
  migrationMap.set('NEXTAUTH_URL', 'COSEREEDEN_NEXTAUTH_URL');
  migrationMap.set('AUTH_SESSION_MAX_AGE', 'COSEREEDEN_AUTH_SESSION_MAX_AGE');
  migrationMap.set('AUTH_SESSION_UPDATE_AGE', 'COSEREEDEN_AUTH_SESSION_UPDATE_AGE');
  migrationMap.set('AUTH_COOKIE_SECURE', 'COSEREEDEN_AUTH_COOKIE_SECURE');
  migrationMap.set('AUTH_COOKIE_SAME_SITE', 'COSEREEDEN_AUTH_COOKIE_SAME_SITE');
  migrationMap.set('COOKIE_DOMAIN', 'COSEREEDEN_COOKIE_DOMAIN');

  return migrationMap;
}

/**
 * 执行配置迁移
 */
export async function migrateToCoserEdenPrefix(
  envVars: Record<string, string | undefined>,
  updateEnvFile?: (key: string, value: string) => Promise<void>
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    migratedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    details: {
      migrated: [],
      skipped: [],
      errors: [],
    },
  };

  try {
    // 定义迁移映射
    const migrationMap = createMigrationMap();

    for (const [oldName, newName] of migrationMap) {
      try {
        const oldValue = envVars[oldName];
        const newValue = envVars[newName];

        if (oldValue && !newValue) {
          // 可以迁移
          if (updateEnvFile) {
            await updateEnvFile(newName, oldValue);
          } else {
            process.env[newName] = oldValue;
          }
          result.migratedCount++;
          result.details.migrated.push(`${oldName} → ${newName}`);
          logger.info(`迁移配置: ${oldName} → ${newName}`);
        } else if (oldValue && newValue) {
          // 已存在新配置，跳过
          result.skippedCount++;
          result.details.skipped.push(`${oldName} (${newName}已存在)`);
        } else if (!oldValue) {
          // 旧配置不存在，跳过
          result.skippedCount++;
          result.details.skipped.push(`${oldName} (不存在)`);
        }
      } catch (error) {
        result.errorCount++;
        result.details.errors.push({
          variable: oldName,
          error: error instanceof Error ? error.message : '未知错误',
        });
        logger.error(`迁移配置失败: ${oldName}`, { error });
      }
    }

    if (result.errorCount > 0) {
      result.success = false;
    }

    logger.info('配置迁移完成', {
      migrated: result.migratedCount,
      skipped: result.skippedCount,
      errors: result.errorCount,
    });
  } catch (error) {
    result.success = false;
    result.errorCount++;
    result.details.errors.push({
      variable: 'general',
      error: error instanceof Error ? error.message : '未知错误',
    });
    logger.error('配置迁移过程中发生错误', { error });
  }

  return result;
}

/**
 * 检查是否需要迁移
 */
export function needsMigration(envVars: Record<string, string | undefined>): {
  needsMigration: boolean;
  oldConfigCount: number;
  newConfigCount: number;
  migratableCount: number;
} {
  const migrationMap = createMigrationMap();
  let oldConfigCount = 0;
  let newConfigCount = 0;
  let migratableCount = 0;

  for (const [oldName, newName] of migrationMap) {
    const hasOld = !!envVars[oldName];
    const hasNew = !!envVars[newName];

    if (hasOld) oldConfigCount++;
    if (hasNew) newConfigCount++;
    if (hasOld && !hasNew) migratableCount++;
  }

  return {
    needsMigration: migratableCount > 0,
    oldConfigCount,
    newConfigCount,
    migratableCount,
  };
}

/**
 * 生成迁移预览
 */
export function generateMigrationPreview(envVars: Record<string, string | undefined>): {
  willMigrate: Array<{ from: string; to: string; value: string }>;
  willSkip: Array<{ from: string; reason: string }>;
} {
  const migrationMap = createMigrationMap();
  const willMigrate: Array<{ from: string; to: string; value: string }> = [];
  const willSkip: Array<{ from: string; reason: string }> = [];

  for (const [oldName, newName] of migrationMap) {
    const oldValue = envVars[oldName];
    const newValue = envVars[newName];

    if (oldValue && !newValue) {
      willMigrate.push({
        from: oldName,
        to: newName,
        value: maskSensitiveValue(oldName, oldValue),
      });
    } else if (oldValue && newValue) {
      willSkip.push({
        from: oldName,
        reason: `${newName}已存在`,
      });
    } else if (!oldValue) {
      willSkip.push({
        from: oldName,
        reason: '配置不存在',
      });
    }
  }

  return { willMigrate, willSkip };
}

/**
 * 掩码敏感值（用于预览）
 */
function maskSensitiveValue(key: string, value: string): string {
  const sensitiveFields = [
    'PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'AUTH',
    'DATABASE_URL', 'ACCESS_KEY', 'PRIVATE'
  ];

  const isSensitive = sensitiveFields.some(field => 
    key.toUpperCase().includes(field)
  );

  if (isSensitive) {
    if (value.length <= 4) {
      return '***';
    }
    return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
  }

  return value;
}
