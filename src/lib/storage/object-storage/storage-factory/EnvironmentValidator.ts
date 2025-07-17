/**
 * @fileoverview 环境变量验证器
 * @description 专门负责环境变量的验证和检查
 * @author Augment AI
 * @date 2025-07-15
 * @version 1.0.0
 */

import type { StorageConfig } from '../base-storage-provider';
import type { 
  EnvironmentValidationResult, 
  ConfigValidationResult,
  ConfigStatus,
  REQUIRED_ENV_VARS,
  OPTIONAL_ENV_VARS 
} from './types';

/**
 * 环境变量验证器类
 */
export class EnvironmentValidator {
  private readonly requiredVars = [
    'COSEREEDEN_CLOUDFLARE_R2_ACCOUNT_ID',
    'COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID',
    'COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY',
    'COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME',
    'COSEREEDEN_CLOUDFLARE_R2_ENDPOINT',
  ] as const;

  private readonly optionalVars = [
    'COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN',
    'COSEREEDEN_CLOUDFLARE_R2_CUSTOM_DOMAIN',
    'COSEREEDEN_CLOUDFLARE_R2_API_TOKEN',
    'COSEREEDEN_CLOUDFLARE_R2_REGION',
  ] as const;

  /**
   * 验证必需的环境变量
   */
  public validateRequiredEnvVars(): void {
    const missing = this.requiredVars.filter(key => !process.env[key]);

    if (missing.length > 0) {
      const errorMessage = `
❌ 缺少必需的环境变量:
${missing.map(key => `  - ${key}`).join('\n')}

请在环境变量中设置这些配置项。参考配置:
${missing.map(key => `${key}=your-${key.toLowerCase().replace('cosereeden_cloudflare_r2_', '').replace(/_/g, '-')}`).join('\n')}
      `.trim();

      throw new Error(errorMessage);
    }
  }

  /**
   * 获取配置状态摘要
   */
  public getConfigStatus(): EnvironmentValidationResult {
    const missingRequired = this.requiredVars.filter(key => !process.env[key]);
    const presentOptional = this.optionalVars.filter(key => process.env[key]);

    return {
      isValid: missingRequired.length === 0,
      requiredVarsPresent: missingRequired.length === 0,
      optionalVarsPresent: presentOptional,
      missingRequired,
      summary: {
        provider: 'cloudflare-r2',
        configSource: 'environment-variables',
        requiredVars: this.requiredVars.length,
        optionalVars: this.optionalVars.length,
        presentOptional: presentOptional.length,
      },
    };
  }

  /**
   * 验证Cloudflare R2配置
   */
  public validateCloudflareR2Config(config: StorageConfig): void {
    const errors: string[] = [];

    // 验证必需字段
    this.validateRequiredFields(config, errors);

    // 验证URL格式
    this.validateUrlFormats(config, errors);

    if (errors.length > 0) {
      throw new Error(`Cloudflare R2配置验证失败:\n${errors.map(e => `  - ${e}`).join('\n')}`);
    }

    console.log('✅ Cloudflare R2配置验证通过');
  }

  /**
   * 验证必需字段
   */
  private validateRequiredFields(config: StorageConfig, errors: string[]): void {
    if (!config.bucket) errors.push('bucket名称不能为空');
    if (!config.accessKeyId) errors.push('accessKeyId不能为空');
    if (!config.secretAccessKey) errors.push('secretAccessKey不能为空');
    if (!config.endpoint) errors.push('endpoint不能为空');
    if (!config.accountId) errors.push('accountId不能为空');
  }

  /**
   * 验证URL格式
   */
  private validateUrlFormats(config: StorageConfig, errors: string[]): void {
    if (config.endpoint && !config.endpoint.startsWith('https://')) {
      errors.push('endpoint必须使用HTTPS协议');
    }

    if (config.cdnDomain && !config.cdnDomain.startsWith('https://')) {
      errors.push('CDN域名必须使用HTTPS协议');
    }
  }

  /**
   * 验证本地存储配置
   */
  public validateLocalStorageConfig(config: StorageConfig): void {
    if (!config.basePath) {
      throw new Error('本地存储基础路径不能为空');
    }
  }

  /**
   * 验证存储配置
   */
  public validateStorageConfig(config: StorageConfig): void {
    if (config.provider === 'cloudflare-r2') {
      this.validateCloudflareR2Config(config);
    } else if (config.provider === 'local') {
      this.validateLocalStorageConfig(config);
    }
  }

  /**
   * 检查环境配置
   */
  public checkEnvironmentConfig(): ConfigStatus {
    console.log('🔧 检查环境变量配置');

    try {
      const status = this.getConfigStatus();
      const errors: string[] = [];
      const warnings: string[] = [];

      // 检查必需的环境变量
      if (status.missingRequired.length > 0) {
        errors.push(`缺少必需的环境变量: ${status.missingRequired.join(', ')}`);
      }

      // 检查可选的环境变量
      if (status.optionalVarsPresent.length === 0) {
        warnings.push('建议设置CDN域名以获得更好的性能');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        summary: {
          provider: 'cloudflare-r2',
          configSource: 'environment-variables',
          requiredVarsPresent: status.requiredVarsPresent,
          optionalVarsCount: status.optionalVarsPresent.length,
          message: errors.length === 0 ? '环境变量配置完整' : '环境变量配置不完整',
        },
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : '未知错误'],
        warnings: [],
        summary: {
          provider: 'cloudflare-r2',
          configSource: 'environment-variables',
          message: '环境变量配置验证失败',
        },
      };
    }
  }

  /**
   * 获取环境变量值（安全）
   */
  public getEnvVar(key: string, defaultValue?: string): string | undefined {
    return process.env[key] || defaultValue;
  }

  /**
   * 检查环境变量是否存在
   */
  public hasEnvVar(key: string): boolean {
    return !!process.env[key];
  }

  /**
   * 获取所有必需环境变量的状态
   */
  public getRequiredVarsStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    
    for (const key of this.requiredVars) {
      status[key] = this.hasEnvVar(key);
    }
    
    return status;
  }

  /**
   * 获取所有可选环境变量的状态
   */
  public getOptionalVarsStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    
    for (const key of this.optionalVars) {
      status[key] = this.hasEnvVar(key);
    }
    
    return status;
  }

  /**
   * 生成环境变量配置报告
   */
  public generateConfigReport(): {
    required: Record<string, boolean>;
    optional: Record<string, boolean>;
    summary: {
      totalRequired: number;
      presentRequired: number;
      totalOptional: number;
      presentOptional: number;
      completeness: number;
    };
  } {
    const required = this.getRequiredVarsStatus();
    const optional = this.getOptionalVarsStatus();
    
    const presentRequired = Object.values(required).filter(Boolean).length;
    const presentOptional = Object.values(optional).filter(Boolean).length;
    
    return {
      required,
      optional,
      summary: {
        totalRequired: this.requiredVars.length,
        presentRequired,
        totalOptional: this.optionalVars.length,
        presentOptional,
        completeness: Math.round((presentRequired / this.requiredVars.length) * 100),
      },
    };
  }
}
