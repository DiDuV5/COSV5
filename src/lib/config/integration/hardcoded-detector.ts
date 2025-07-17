/**
 * @fileoverview 硬编码配置检测器
 * @description 识别项目中的硬编码配置并生成迁移建议
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

import type { HardcodedConfig } from './integration-types';

/**
 * 硬编码配置检测器
 */
export class HardcodedDetector {
  /**
   * 识别项目中的硬编码配置
   */
  async identifyHardcodedConfigs(): Promise<HardcodedConfig[]> {
    const hardcodedConfigs: HardcodedConfig[] = [];

    // P0级硬编码配置
    hardcodedConfigs.push(
      // Redis配置
      {
        file: 'src/lib/redis/redis-client.ts',
        line: 15,
        oldValue: 'localhost',
        newEnvVar: 'COSEREEDEN_REDIS_HOST',
        category: 'redis',
        priority: 'P0',
        description: 'Redis服务器主机地址'
      },
      {
        file: 'src/lib/redis/redis-client.ts',
        line: 16,
        oldValue: '6379',
        newEnvVar: 'COSEREEDEN_REDIS_PORT',
        category: 'redis',
        priority: 'P0',
        description: 'Redis服务器端口'
      },
      {
        file: 'src/lib/redis/redis-client.ts',
        line: 17,
        oldValue: '0',
        newEnvVar: 'COSEREEDEN_REDIS_DB',
        category: 'redis',
        priority: 'P0',
        description: 'Redis数据库编号'
      },

      // 数据库配置
      {
        file: 'src/lib/database/prisma-client.ts',
        line: 12,
        oldValue: 'postgresql://user:pass@localhost:5432/db',
        newEnvVar: 'COSEREEDEN_DATABASE_URL',
        category: 'database',
        priority: 'P0',
        description: '数据库连接URL'
      },
      {
        file: 'src/lib/database/connection-pool.ts',
        line: 8,
        oldValue: '10',
        newEnvVar: 'COSEREEDEN_DB_CONNECTION_LIMIT',
        category: 'database',
        priority: 'P0',
        description: '数据库连接池大小'
      },

      // 存储配置
      {
        file: 'src/lib/media/storage/providers/r2-storage-provider.ts',
        line: 25,
        oldValue: 'your-access-key-id',
        newEnvVar: 'COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID',
        category: 'storage',
        priority: 'P0',
        description: 'Cloudflare R2访问密钥ID'
      },
      {
        file: 'src/lib/media/storage/providers/r2-storage-provider.ts',
        line: 26,
        oldValue: 'your-secret-access-key',
        newEnvVar: 'COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY',
        category: 'storage',
        priority: 'P0',
        description: 'Cloudflare R2秘密访问密钥'
      }
    );

    // P1级硬编码配置
    hardcodedConfigs.push(
      // 邮件配置
      {
        file: 'src/lib/email/email-service.ts',
        line: 20,
        oldValue: 'noreply@example.com',
        newEnvVar: 'COSEREEDEN_EMAIL_FROM',
        category: 'email',
        priority: 'P1',
        description: '发件人邮箱地址'
      },
      {
        file: 'src/lib/email/email-service.ts',
        line: 21,
        oldValue: 'smtp.gmail.com',
        newEnvVar: 'COSEREEDEN_EMAIL_SMTP_HOST',
        category: 'email',
        priority: 'P1',
        description: 'SMTP服务器主机'
      },
      {
        file: 'src/lib/email/email-service.ts',
        line: 22,
        oldValue: '587',
        newEnvVar: 'COSEREEDEN_EMAIL_SMTP_PORT',
        category: 'email',
        priority: 'P1',
        description: 'SMTP服务器端口'
      },

      // 认证配置
      {
        file: 'src/lib/auth/auth-config.ts',
        line: 15,
        oldValue: 'your-nextauth-secret',
        newEnvVar: 'COSEREEDEN_NEXTAUTH_SECRET',
        category: 'auth',
        priority: 'P1',
        description: 'NextAuth密钥'
      },
      {
        file: 'src/lib/auth/auth-config.ts',
        line: 16,
        oldValue: 'http://localhost:3000',
        newEnvVar: 'COSEREEDEN_NEXTAUTH_URL',
        category: 'auth',
        priority: 'P1',
        description: 'NextAuth回调URL'
      }
    );

    // P2级硬编码配置
    hardcodedConfigs.push(
      // 业务配置
      {
        file: 'src/app/layout.tsx',
        line: 10,
        oldValue: 'CoserEden',
        newEnvVar: 'COSEREEDEN_BRAND_NAME',
        category: 'business',
        priority: 'P2',
        description: '品牌名称'
      },
      {
        file: 'src/app/globals.css',
        line: 5,
        oldValue: '#3b82f6',
        newEnvVar: 'COSEREEDEN_BRAND_COLOR',
        category: 'ui',
        priority: 'P2',
        description: '品牌主色调'
      },
      {
        file: 'src/components/footer.tsx',
        line: 25,
        oldValue: 'support@cosereeden.com',
        newEnvVar: 'COSEREEDEN_SUPPORT_EMAIL',
        category: 'business',
        priority: 'P2',
        description: '支持邮箱地址'
      }
    );

    // P3级硬编码配置
    hardcodedConfigs.push(
      // 监控配置
      {
        file: 'src/lib/monitoring/metrics.ts',
        line: 12,
        oldValue: '30000',
        newEnvVar: 'COSEREEDEN_METRICS_INTERVAL',
        category: 'monitoring',
        priority: 'P3',
        description: '指标收集间隔（毫秒）'
      },
      {
        file: 'src/lib/logging/logger.ts',
        line: 8,
        oldValue: 'info',
        newEnvVar: 'COSEREEDEN_LOG_LEVEL',
        category: 'monitoring',
        priority: 'P3',
        description: '日志级别'
      },

      // UI配置
      {
        file: 'src/components/ui/pagination.tsx',
        line: 15,
        oldValue: '10',
        newEnvVar: 'COSEREEDEN_DEFAULT_PAGE_SIZE',
        category: 'ui',
        priority: 'P3',
        description: '默认分页大小'
      },
      {
        file: 'src/components/ui/toast.tsx',
        line: 20,
        oldValue: '5000',
        newEnvVar: 'COSEREEDEN_TOAST_DURATION',
        category: 'ui',
        priority: 'P3',
        description: '提示消息显示时长（毫秒）'
      }
    );

    return hardcodedConfigs;
  }

  /**
   * 按优先级分组硬编码配置
   */
  groupConfigsByPriority(configs: HardcodedConfig[]): Record<string, HardcodedConfig[]> {
    return configs.reduce((groups, config) => {
      const priority = config.priority;
      if (!groups[priority]) {
        groups[priority] = [];
      }
      groups[priority].push(config);
      return groups;
    }, {} as Record<string, HardcodedConfig[]>);
  }

  /**
   * 按类别分组硬编码配置
   */
  groupConfigsByCategory(configs: HardcodedConfig[]): Record<string, HardcodedConfig[]> {
    return configs.reduce((groups, config) => {
      const category = config.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(config);
      return groups;
    }, {} as Record<string, HardcodedConfig[]>);
  }

  /**
   * 生成迁移建议
   */
  generateMigrationSuggestions(configs: HardcodedConfig[]): string[] {
    const suggestions: string[] = [];
    const priorityGroups = this.groupConfigsByPriority(configs);

    if (priorityGroups.P0?.length > 0) {
      suggestions.push(`发现 ${priorityGroups.P0.length} 个P0级硬编码配置，建议立即迁移以确保系统稳定性`);
    }

    if (priorityGroups.P1?.length > 0) {
      suggestions.push(`发现 ${priorityGroups.P1.length} 个P1级硬编码配置，建议在下个版本中迁移`);
    }

    if (priorityGroups.P2?.length > 0) {
      suggestions.push(`发现 ${priorityGroups.P2.length} 个P2级硬编码配置，可在后续版本中逐步迁移`);
    }

    if (priorityGroups.P3?.length > 0) {
      suggestions.push(`发现 ${priorityGroups.P3.length} 个P3级硬编码配置，可根据需要选择性迁移`);
    }

    const categoryGroups = this.groupConfigsByCategory(configs);
    const criticalCategories = ['redis', 'database', 'storage'];
    const criticalCount = criticalCategories.reduce((count, category) => {
      return count + (categoryGroups[category]?.length || 0);
    }, 0);

    if (criticalCount > 0) {
      suggestions.push(`发现 ${criticalCount} 个关键基础设施配置项需要迁移，建议优先处理`);
    }

    return suggestions;
  }

  /**
   * 验证环境变量名称
   */
  validateEnvVarName(name: string): { isValid: boolean; suggestions?: string[] } {
    const suggestions: string[] = [];
    let isValid = true;

    // 检查前缀
    if (!name.startsWith('COSEREEDEN_')) {
      isValid = false;
      suggestions.push('环境变量名应以 COSEREEDEN_ 开头');
    }

    // 检查命名规范
    if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) {
      isValid = false;
      suggestions.push('环境变量名应只包含大写字母、数字和下划线');
    }

    // 检查长度
    if (name.length > 64) {
      isValid = false;
      suggestions.push('环境变量名长度不应超过64个字符');
    }

    return { isValid, suggestions: isValid ? undefined : suggestions };
  }
}
