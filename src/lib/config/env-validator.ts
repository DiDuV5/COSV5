/**
 * @fileoverview 环境变量验证器
 * @description 统一的环境变量验证和错误处理机制，确保12-Factor App合规性
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

/**
 * 环境变量配置项接口
 */
export interface EnvVarConfig {
  key: string;
  description: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'url' | 'email';
  defaultValue?: string;
  validation?: (value: string) => boolean;
  errorMessage?: string;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missing: string[];
  invalid: string[];
  summary: {
    totalChecked: number;
    requiredPresent: number;
    optionalPresent: number;
    configSource: string;
  };
}

/**
 * P0级环境变量配置定义
 */
export const P0_ENV_CONFIGS: EnvVarConfig[] = [
  // 数据库配置
  {
    key: 'COSEREEDEN_DATABASE_URL',
    description: '数据库连接URL',
    required: true,
    type: 'url',
    validation: (value) => value.startsWith('postgresql://'),
    errorMessage: '数据库URL必须是有效的PostgreSQL连接字符串',
  },
  
  // Cloudflare R2存储配置
  {
    key: 'COSEREEDEN_CLOUDFLARE_R2_ACCOUNT_ID',
    description: 'Cloudflare R2账户ID',
    required: true,
    type: 'string',
    validation: (value) => value.length === 32,
    errorMessage: 'Cloudflare R2账户ID必须是32位字符串',
  },
  {
    key: 'COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID',
    description: 'Cloudflare R2访问密钥ID',
    required: true,
    type: 'string',
    validation: (value) => value.length >= 20,
    errorMessage: 'Cloudflare R2访问密钥ID长度不足',
  },
  {
    key: 'COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY',
    description: 'Cloudflare R2秘密访问密钥',
    required: true,
    type: 'string',
    validation: (value) => value.length >= 40,
    errorMessage: 'Cloudflare R2秘密访问密钥长度不足',
  },
  {
    key: 'COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME',
    description: 'Cloudflare R2存储桶名称',
    required: true,
    type: 'string',
    validation: (value) => /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(value),
    errorMessage: 'Cloudflare R2存储桶名称格式无效',
  },
  {
    key: 'COSEREEDEN_CLOUDFLARE_R2_ENDPOINT',
    description: 'Cloudflare R2端点URL',
    required: true,
    type: 'url',
    validation: (value) => value.startsWith('https://') && value.includes('.r2.cloudflarestorage.com'),
    errorMessage: 'Cloudflare R2端点URL格式无效',
  },
  
  // Redis配置
  {
    key: 'COSEREEDEN_REDIS_HOST',
    description: 'Redis主机地址',
    required: true,
    type: 'string',
    validation: (value) => value.length > 0,
    errorMessage: 'Redis主机地址不能为空',
  },
];

/**
 * P1级环境变量配置定义（可选但推荐）
 */
export const P1_ENV_CONFIGS: EnvVarConfig[] = [
  // 数据库连接配置
  {
    key: 'COSEREEDEN_DB_CONNECTION_LIMIT',
    description: '数据库连接池大小',
    required: false,
    type: 'number',
    defaultValue: '20',
    validation: (value) => {
      const num = parseInt(value);
      return !isNaN(num) && num > 0 && num <= 100;
    },
    errorMessage: '数据库连接池大小必须是1-100之间的数字',
  },
  {
    key: 'COSEREEDEN_DB_CONNECT_TIMEOUT',
    description: '数据库连接超时时间(ms)',
    required: false,
    type: 'number',
    defaultValue: '30000',
    validation: (value) => {
      const num = parseInt(value);
      return !isNaN(num) && num >= 5000 && num <= 60000;
    },
    errorMessage: '数据库连接超时时间必须是5000-60000ms之间的数字',
  },
  
  // Redis配置
  {
    key: 'COSEREEDEN_REDIS_PORT',
    description: 'Redis端口号',
    required: false,
    type: 'number',
    defaultValue: '6379',
    validation: (value) => {
      const num = parseInt(value);
      return !isNaN(num) && num > 0 && num <= 65535;
    },
    errorMessage: 'Redis端口号必须是1-65535之间的数字',
  },
  {
    key: 'COSEREEDEN_REDIS_DEFAULT_TTL',
    description: 'Redis默认TTL(秒)',
    required: false,
    type: 'number',
    defaultValue: '3600',
    validation: (value) => {
      const num = parseInt(value);
      return !isNaN(num) && num > 0;
    },
    errorMessage: 'Redis默认TTL必须是正整数',
  },
  
  // Cloudflare R2可选配置
  {
    key: 'COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN',
    description: 'Cloudflare R2 CDN域名',
    required: false,
    type: 'url',
    validation: (value) => value.startsWith('https://'),
    errorMessage: 'CDN域名必须使用HTTPS协议',
  },
];

/**
 * 环境变量验证器类
 */
export class EnvValidator {
  /**
   * 验证P0级环境变量
   */
  static validateP0Config(): ValidationResult {
    return this.validateConfigs(P0_ENV_CONFIGS, 'P0级(关键基础设施)');
  }

  /**
   * 验证P1级环境变量
   */
  static validateP1Config(): ValidationResult {
    return this.validateConfigs(P1_ENV_CONFIGS, 'P1级(核心功能)');
  }

  /**
   * 验证所有环境变量
   */
  static validateAllConfigs(): ValidationResult {
    const p0Result = this.validateP0Config();
    const p1Result = this.validateP1Config();

    return {
      isValid: p0Result.isValid, // P0级必须通过，P1级可选
      errors: [...p0Result.errors, ...p1Result.errors],
      warnings: [...p0Result.warnings, ...p1Result.warnings],
      missing: [...p0Result.missing, ...p1Result.missing],
      invalid: [...p0Result.invalid, ...p1Result.invalid],
      summary: {
        totalChecked: p0Result.summary.totalChecked + p1Result.summary.totalChecked,
        requiredPresent: p0Result.summary.requiredPresent + p1Result.summary.requiredPresent,
        optionalPresent: p0Result.summary.optionalPresent + p1Result.summary.optionalPresent,
        configSource: '12-Factor App环境变量',
      },
    };
  }

  /**
   * 验证配置列表
   */
  private static validateConfigs(configs: EnvVarConfig[], category: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missing: string[] = [];
    const invalid: string[] = [];
    
    let requiredPresent = 0;
    let optionalPresent = 0;

    for (const config of configs) {
      const value = process.env[config.key];
      
      if (!value) {
        if (config.required) {
          missing.push(config.key);
          errors.push(`❌ 缺少必需的环境变量: ${config.key} (${config.description})`);
        } else {
          warnings.push(`⚠️ 建议设置可选环境变量: ${config.key} (${config.description})`);
        }
        continue;
      }

      // 验证值的有效性
      if (config.validation && !config.validation(value)) {
        invalid.push(config.key);
        errors.push(`❌ 环境变量值无效: ${config.key} - ${config.errorMessage || '格式错误'}`);
        continue;
      }

      // 类型验证
      if (!this.validateType(value, config.type)) {
        invalid.push(config.key);
        errors.push(`❌ 环境变量类型错误: ${config.key} 应该是 ${config.type} 类型`);
        continue;
      }

      // 统计已设置的变量
      if (config.required) {
        requiredPresent++;
      } else {
        optionalPresent++;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      missing,
      invalid,
      summary: {
        totalChecked: configs.length,
        requiredPresent,
        optionalPresent,
        configSource: category,
      },
    };
  }

  /**
   * 验证值的类型
   */
  private static validateType(value: string, type: EnvVarConfig['type']): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string' && value.length > 0;
      case 'number':
        return !isNaN(parseInt(value));
      case 'boolean':
        return ['true', 'false', '1', '0'].includes(value.toLowerCase());
      case 'url':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      default:
        return true;
    }
  }

  /**
   * 生成配置建议
   */
  static generateConfigSuggestions(result: ValidationResult): string {
    if (result.isValid && result.warnings.length === 0) {
      return '✅ 所有环境变量配置完整且有效！';
    }

    let suggestions = '\n📋 环境变量配置建议:\n\n';

    if (result.missing.length > 0) {
      suggestions += '🔴 必需的环境变量:\n';
      for (const key of result.missing) {
        const config = [...P0_ENV_CONFIGS, ...P1_ENV_CONFIGS].find(c => c.key === key);
        suggestions += `${key}=your-${config?.description || 'value'}\n`;
      }
      suggestions += '\n';
    }

    if (result.warnings.length > 0) {
      suggestions += '🟡 推荐的环境变量:\n';
      for (const warning of result.warnings) {
        const key = warning.match(/: (\w+)/)?.[1];
        if (key) {
          const config = P1_ENV_CONFIGS.find(c => c.key === key);
          suggestions += `${key}=${config?.defaultValue || 'your-value'}\n`;
        }
      }
    }

    return suggestions;
  }

  /**
   * 打印验证结果
   */
  static printValidationResult(result: ValidationResult): void {
    console.log('\n🔍 环境变量验证结果:');
    console.log(`📊 总计检查: ${result.summary.totalChecked} 项`);
    console.log(`✅ 必需变量: ${result.summary.requiredPresent} 项`);
    console.log(`🔧 可选变量: ${result.summary.optionalPresent} 项`);
    
    if (result.errors.length > 0) {
      console.log('\n❌ 错误:');
      result.errors.forEach(error => console.log(`  ${error}`));
    }
    
    if (result.warnings.length > 0) {
      console.log('\n⚠️ 警告:');
      result.warnings.forEach(warning => console.log(`  ${warning}`));
    }
    
    if (result.isValid) {
      console.log('\n✅ 环境变量验证通过！');
    } else {
      console.log('\n❌ 环境变量验证失败！');
      console.log(this.generateConfigSuggestions(result));
    }
  }
}

/**
 * 启动时验证环境变量
 */
export function validateEnvironmentOnStartup(): void {
  console.log('🔧 开始验证环境变量配置...');
  
  const result = EnvValidator.validateAllConfigs();
  EnvValidator.printValidationResult(result);
  
  if (!result.isValid) {
    console.error('\n💥 环境变量配置不完整，应用可能无法正常运行！');
    
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 生产环境必须配置所有必需的环境变量');
      process.exit(1);
    } else {
      console.warn('⚠️ 开发环境检测到配置问题，请尽快修复');
    }
  }
}
