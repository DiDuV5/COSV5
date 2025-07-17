/**
 * @fileoverview 环境变量向后兼容性工具
 * @description 提供统一的环境变量获取方法，支持 COSEREEDEN_ 前缀和遗留命名的向后兼容
 * @author Augment AI
 * @date 2025-07-12
 * @version 1.0.0
 */

/**
 * 环境变量映射表
 * 新变量名 -> 旧变量名的映射
 */
const ENV_MIGRATION_MAP = new Map<string, string[]>([
  // 核心应用配置
  ['COSEREEDEN_NODE_ENV', ['NODE_ENV']],
  ['COSEREEDEN_PORT', ['PORT']],

  // 数据库配置
  ['COSEREEDEN_DATABASE_URL', ['DATABASE_URL']],

  // 认证配置
  ['COSEREEDEN_NEXTAUTH_SECRET', ['NEXTAUTH_SECRET']],
  ['COSEREEDEN_NEXTAUTH_URL', ['NEXTAUTH_URL']],
  ['COSEREEDEN_NEXT_PUBLIC_APP_URL', ['NEXT_PUBLIC_APP_URL']],

  // Redis配置
  ['COSEREEDEN_REDIS_HOST', ['REDIS_HOST']],
  ['COSEREEDEN_REDIS_PORT', ['REDIS_PORT']],
  ['COSEREEDEN_REDIS_PASSWORD', ['REDIS_PASSWORD']],
  ['COSEREEDEN_REDIS_DB', ['REDIS_DB']],
  ['COSEREEDEN_REDIS_URL', ['REDIS_URL']],

  // Cloudflare R2配置
  ['COSEREEDEN_CLOUDFLARE_R2_ACCOUNT_ID', ['CLOUDFLARE_R2_ACCOUNT_ID', 'CLOUDFLARE_ACCOUNT_ID']],
  ['COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID', ['CLOUDFLARE_R2_ACCESS_KEY_ID']],
  ['COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY', ['CLOUDFLARE_R2_SECRET_ACCESS_KEY']],
  ['COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME', ['CLOUDFLARE_R2_BUCKET_NAME']],
  ['COSEREEDEN_CLOUDFLARE_R2_ENDPOINT', ['CLOUDFLARE_R2_ENDPOINT']],
  ['COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN', ['CLOUDFLARE_R2_CDN_DOMAIN']],

  // CDN配置
  ['COSEREEDEN_CDN_WHITELIST_DOMAINS', ['CDN_WHITELIST_DOMAINS']],
  ['COSEREEDEN_CDN_ALLOWED_ORIGINS', ['CDN_ALLOWED_ORIGINS']],
  ['COSEREEDEN_NEXT_PUBLIC_UPLOAD_DOMAIN', ['NEXT_PUBLIC_UPLOAD_DOMAIN']],

  // 邮件配置
  ['COSEREEDEN_SMTP_HOST', ['SMTP_HOST']],
  ['COSEREEDEN_SMTP_PORT', ['SMTP_PORT']],
  ['COSEREEDEN_SMTP_USER', ['SMTP_USER']],
  ['COSEREEDEN_SMTP_PASS', ['SMTP_PASS']],

  // Turnstile配置
  ['COSEREEDEN_TURNSTILE_SITE_KEY', ['TURNSTILE_SITE_KEY']],
  ['COSEREEDEN_TURNSTILE_SECRET_KEY', ['TURNSTILE_SECRET_KEY']],

  // 监控配置
  ['COSEREEDEN_SENTRY_DSN', ['SENTRY_DSN']],
  ['COSEREEDEN_LOG_LEVEL', ['LOG_LEVEL']],
]);

/**
 * 获取环境变量值，支持向后兼容
 * @param newKey 新的环境变量名（COSEREEDEN_前缀）
 * @param defaultValue 默认值
 * @returns 环境变量值
 */
export function getEnvWithFallback(newKey: string, defaultValue: string): string;
export function getEnvWithFallback(newKey: string, defaultValue?: string): string | undefined;
export function getEnvWithFallback(newKey: string, defaultValue?: string): string | undefined {
  // 首先尝试新的变量名
  const newValue = process.env[newKey];
  if (newValue !== undefined) {
    return newValue;
  }

  // 尝试映射的旧变量名
  const oldKeys = ENV_MIGRATION_MAP.get(newKey);
  if (oldKeys) {
    for (const oldKey of oldKeys) {
      const oldValue = process.env[oldKey];
      if (oldValue !== undefined) {
        // 在开发环境中提示迁移
        if (process.env.NODE_ENV === 'development') {
          console.warn(`⚠️ 环境变量 "${oldKey}" 已废弃，请使用 "${newKey}" 替代`);
        }
        return oldValue;
      }
    }
  }

  return defaultValue;
}

/**
 * 获取必需的环境变量，如果不存在则抛出错误
 * @param newKey 新的环境变量名（COSEREEDEN_前缀）
 * @param errorMessage 自定义错误消息
 * @returns 环境变量值
 */
export function getRequiredEnv(newKey: string, errorMessage?: string): string {
  const value = getEnvWithFallback(newKey);

  if (value === undefined || value === '') {
    const oldKeys = ENV_MIGRATION_MAP.get(newKey);
    const allKeys = [newKey, ...(oldKeys || [])];
    const message = errorMessage || `Missing required environment variable: ${allKeys.join(' or ')}`;
    throw new Error(message);
  }

  return value;
}

/**
 * 获取布尔类型的环境变量
 * @param newKey 新的环境变量名（COSEREEDEN_前缀）
 * @param defaultValue 默认值
 * @returns 布尔值
 */
export function getBooleanEnv(newKey: string, defaultValue: boolean = false): boolean {
  const value = getEnvWithFallback(newKey);

  if (value === undefined) {
    return defaultValue;
  }

  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * 获取数字类型的环境变量
 * @param newKey 新的环境变量名（COSEREEDEN_前缀）
 * @param defaultValue 默认值
 * @returns 数字值
 */
export function getNumberEnv(newKey: string, defaultValue: number): number {
  const value = getEnvWithFallback(newKey);

  if (value === undefined) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    console.warn(`⚠️ 环境变量 "${newKey}" 的值 "${value}" 不是有效数字，使用默认值 ${defaultValue}`);
    return defaultValue;
  }

  return parsed;
}

/**
 * 获取数组类型的环境变量（逗号分隔）
 * @param newKey 新的环境变量名（COSEREEDEN_前缀）
 * @param defaultValue 默认值
 * @returns 字符串数组
 */
export function getArrayEnv(newKey: string, defaultValue: string[] = []): string[] {
  const value = getEnvWithFallback(newKey);

  if (value === undefined || value === '') {
    return defaultValue;
  }

  return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
}

/**
 * 检查环境变量迁移状态
 * @returns 迁移状态报告
 */
export function checkMigrationStatus(): {
  total: number;
  migrated: number;
  pending: string[];
  deprecated: string[];
} {
  const pending: string[] = [];
  const deprecated: string[] = [];
  let migrated = 0;

  for (const [newKey, oldKeys] of ENV_MIGRATION_MAP.entries()) {
    const hasNew = process.env[newKey] !== undefined;
    const hasOld = oldKeys.some(oldKey => process.env[oldKey] !== undefined);

    if (hasNew) {
      migrated++;
      if (hasOld) {
        deprecated.push(...oldKeys.filter(oldKey => process.env[oldKey] !== undefined));
      }
    } else if (hasOld) {
      pending.push(newKey);
    }
  }

  return {
    total: ENV_MIGRATION_MAP.size,
    migrated,
    pending,
    deprecated,
  };
}

/**
 * 生成环境变量迁移指南
 * @returns 迁移指南文本
 */
export function generateMigrationGuide(): string {
  const status = checkMigrationStatus();
  const lines: string[] = [];

  lines.push('# 环境变量迁移指南');
  lines.push('');
  lines.push(`## 迁移状态: ${status.migrated}/${status.total} (${Math.round(status.migrated / status.total * 100)}%)`);
  lines.push('');

  if (status.pending.length > 0) {
    lines.push('## 待迁移的环境变量:');
    for (const newKey of status.pending) {
      const oldKeys = ENV_MIGRATION_MAP.get(newKey);
      lines.push(`- ${newKey} (替代: ${oldKeys?.join(', ')})`);
    }
    lines.push('');
  }

  if (status.deprecated.length > 0) {
    lines.push('## 可以移除的废弃变量:');
    for (const oldKey of status.deprecated) {
      lines.push(`- ${oldKey}`);
    }
    lines.push('');
  }

  lines.push('## 迁移步骤:');
  lines.push('1. 在环境变量文件中添加新的 COSEREEDEN_ 前缀变量');
  lines.push('2. 验证应用功能正常');
  lines.push('3. 移除旧的环境变量');
  lines.push('4. 运行 `npm run config:validate` 验证配置');

  return lines.join('\n');
}

/**
 * 验证环境变量命名规范
 * @param envKey 环境变量名
 * @returns 验证结果
 */
export function validateEnvNaming(envKey: string): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // 检查是否使用 COSEREEDEN_ 前缀
  if (!envKey.startsWith('COSEREEDEN_')) {
    issues.push('缺少 COSEREEDEN_ 前缀');
    suggestions.push(`使用 COSEREEDEN_${envKey} 替代`);
  }

  // 检查是否使用 SCREAMING_SNAKE_CASE
  if (!/^[A-Z][A-Z0-9_]*$/.test(envKey)) {
    issues.push('不符合 SCREAMING_SNAKE_CASE 格式');
    suggestions.push('使用大写字母和下划线，如 COSEREEDEN_EXAMPLE_VAR');
  }

  // 检查是否有连续下划线
  if (envKey.includes('__')) {
    issues.push('包含连续下划线');
    suggestions.push('使用单个下划线分隔单词');
  }

  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
  };
}
