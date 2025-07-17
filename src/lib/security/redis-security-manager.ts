/**
 * @fileoverview Redis安全配置管理器
 * @description 管理Redis的安全配置，包括密码、TLS/SSL、访问控制等，遵循12-Factor App原则，移除硬编码配置
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0
 */

import fs from 'fs';
import path from 'path';
import { TRPCErrorHandler } from '../errors/trpc-error-handler';

import Redis from 'ioredis';

/**
 * Redis安全配置默认值常量
 * 遵循12-Factor App原则，从环境变量获取，支持双前缀
 */
const REDIS_SECURITY_DEFAULTS = {
  // 连接配置
  MAX_CONNECTIONS: process.env.COSEREEDEN_REDIS_MAX_CONNECTIONS || process.env.REDIS_MAX_CONNECTIONS || '100',
  CONNECTION_TIMEOUT: process.env.COSEREEDEN_REDIS_CONNECTION_TIMEOUT || process.env.REDIS_CONNECTION_TIMEOUT || '5000',
  COMMAND_TIMEOUT: process.env.COSEREEDEN_REDIS_COMMAND_TIMEOUT || process.env.REDIS_COMMAND_TIMEOUT || '3000',

  // 安全策略
  MAX_MEMORY_POLICY: process.env.COSEREEDEN_REDIS_MAX_MEMORY_POLICY || process.env.REDIS_MAX_MEMORY_POLICY || 'allkeys-lru',
  LOG_LEVEL: process.env.COSEREEDEN_REDIS_LOG_LEVEL || process.env.REDIS_LOG_LEVEL || 'notice',

  // TLS配置
  TLS_ENABLED: process.env.COSEREEDEN_REDIS_TLS_ENABLED || process.env.REDIS_TLS_ENABLED,
  TLS_REJECT_UNAUTHORIZED: process.env.COSEREEDEN_REDIS_TLS_REJECT_UNAUTHORIZED || process.env.REDIS_TLS_REJECT_UNAUTHORIZED,
  TLS_CERT_PATH: process.env.COSEREEDEN_REDIS_TLS_CERT_PATH || process.env.REDIS_TLS_CERT_PATH,
  TLS_KEY_PATH: process.env.COSEREEDEN_REDIS_TLS_KEY_PATH || process.env.REDIS_TLS_KEY_PATH,
  TLS_CA_PATH: process.env.COSEREEDEN_REDIS_TLS_CA_PATH || process.env.REDIS_TLS_CA_PATH,

  // 访问控制
  ALLOWED_IPS: process.env.COSEREEDEN_REDIS_ALLOWED_IPS || process.env.REDIS_ALLOWED_IPS,
  BLOCKED_IPS: process.env.COSEREEDEN_REDIS_BLOCKED_IPS || process.env.REDIS_BLOCKED_IPS,

  // 认证配置
  USERNAME: process.env.COSEREEDEN_REDIS_USERNAME || process.env.REDIS_USERNAME,
  PASSWORD: process.env.COSEREEDEN_REDIS_PASSWORD || process.env.REDIS_PASSWORD,
  ENABLE_AUTH: process.env.COSEREEDEN_REDIS_ENABLE_AUTH || process.env.REDIS_ENABLE_AUTH,
  REQUIRE_TLS: process.env.COSEREEDEN_REDIS_REQUIRE_TLS || process.env.REDIS_REQUIRE_TLS,
  ALLOW_DANGEROUS_COMMANDS: process.env.COSEREEDEN_REDIS_ALLOW_DANGEROUS_COMMANDS || process.env.REDIS_ALLOW_DANGEROUS_COMMANDS,
} as const;

/**
 * Redis安全配置接口
 */
export interface RedisSecurityConfig {
  // 基础认证
  password?: string;
  username?: string;

  // TLS/SSL配置
  tls: {
    enabled: boolean;
    rejectUnauthorized: boolean;
    cert?: string;
    key?: string;
    ca?: string;
    certPath?: string;
    keyPath?: string;
    caPath?: string;
  };

  // 访问控制
  accessControl: {
    allowedIPs: string[];
    blockedIPs: string[];
    maxConnections: number;
    connectionTimeout: number;
    commandTimeout: number;
  };

  // 安全策略
  securityPolicy: {
    enableAuth: boolean;
    requireTLS: boolean;
    allowDangerousCommands: boolean;
    maxMemoryPolicy: string;
    logLevel: 'debug' | 'verbose' | 'notice' | 'warning';
  };
}

/**
 * Redis安全管理器
 */
export class RedisSecurityManager {
  private config: RedisSecurityConfig;

  constructor() {
    this.config = this.loadSecurityConfig();
  }

  /**
   * 验证必需的环境变量
   */
  private validateRequiredEnvVars(): void {
    if (process.env.NODE_ENV === 'production') {
      const requiredVars = ['REDIS_PASSWORD'];
      const missingVars = requiredVars.filter(varName =>
        !process.env[varName] && !process.env[`COSEREEDEN_${varName}`]
      );

      if (missingVars.length > 0) {
        console.warn(`生产环境建议设置以下Redis安全环境变量: ${missingVars.join(', ')}`);
      }
    }
  }

  /**
   * 加载安全配置
   */
  private loadSecurityConfig(): RedisSecurityConfig {
    this.validateRequiredEnvVars();

    return {
      password: REDIS_SECURITY_DEFAULTS.PASSWORD,
      username: REDIS_SECURITY_DEFAULTS.USERNAME,

      tls: {
        enabled: REDIS_SECURITY_DEFAULTS.TLS_ENABLED === 'true',
        rejectUnauthorized: REDIS_SECURITY_DEFAULTS.TLS_REJECT_UNAUTHORIZED !== 'false',
        certPath: REDIS_SECURITY_DEFAULTS.TLS_CERT_PATH,
        keyPath: REDIS_SECURITY_DEFAULTS.TLS_KEY_PATH,
        caPath: REDIS_SECURITY_DEFAULTS.TLS_CA_PATH,
      },

      accessControl: {
        allowedIPs: this.parseIPList(REDIS_SECURITY_DEFAULTS.ALLOWED_IPS),
        blockedIPs: this.parseIPList(REDIS_SECURITY_DEFAULTS.BLOCKED_IPS),
        maxConnections: parseInt(REDIS_SECURITY_DEFAULTS.MAX_CONNECTIONS),
        connectionTimeout: parseInt(REDIS_SECURITY_DEFAULTS.CONNECTION_TIMEOUT),
        commandTimeout: parseInt(REDIS_SECURITY_DEFAULTS.COMMAND_TIMEOUT),
      },

      securityPolicy: {
        enableAuth: REDIS_SECURITY_DEFAULTS.ENABLE_AUTH !== 'false',
        requireTLS: REDIS_SECURITY_DEFAULTS.REQUIRE_TLS === 'true',
        allowDangerousCommands: REDIS_SECURITY_DEFAULTS.ALLOW_DANGEROUS_COMMANDS === 'true',
        maxMemoryPolicy: REDIS_SECURITY_DEFAULTS.MAX_MEMORY_POLICY,
        logLevel: (REDIS_SECURITY_DEFAULTS.LOG_LEVEL as any),
      },
    };
  }

  /**
   * 解析IP列表
   */
  private parseIPList(ipString?: string): string[] {
    if (!ipString) return [];
    return ipString.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
  }

  /**
   * 获取Redis连接配置（包含安全设置）
   */
  public getRedisConnectionConfig(): any {
    const baseConfig: any = {
      host: process.env.COSEREEDEN_REDIS_HOST || 'localhost',
      port: parseInt(process.env.COSEREEDEN_REDIS_PORT || '6379'),
      db: parseInt(process.env.COSEREEDEN_REDIS_DB || '0'),
      keyPrefix: process.env.COSEREEDEN_REDIS_KEY_PREFIX || 'cosereeden:',
      maxRetriesPerRequest: parseInt(process.env.COSEREEDEN_REDIS_MAX_RETRIES || '3'),
      retryDelayOnFailover: parseInt(process.env.COSEREEDEN_REDIS_RETRY_DELAY || '100'),
      enableOfflineQueue: true,
      lazyConnect: false, // 改为立即连接，避免首次请求延迟
      keepAlive: 30000,
      family: 4,
      connectTimeout: this.config.accessControl.connectionTimeout,
      commandTimeout: this.config.accessControl.commandTimeout,
    };

    // 添加认证配置（只有在明确设置时才添加）
    if (this.config.password && this.config.password.trim() !== '') {
      baseConfig.password = this.config.password;
    }

    if (this.config.username && this.config.username.trim() !== '') {
      baseConfig.username = this.config.username;
    }

    // 添加TLS配置
    if (this.config.tls.enabled) {
      baseConfig.tls = this.getTLSConfig();
    }

    return baseConfig;
  }

  /**
   * 获取TLS配置
   */
  private getTLSConfig(): any {
    const tlsConfig: any = {
      rejectUnauthorized: this.config.tls.rejectUnauthorized,
    };

    try {
      // 加载证书文件
      if (this.config.tls.certPath && fs.existsSync(this.config.tls.certPath)) {
        tlsConfig.cert = fs.readFileSync(this.config.tls.certPath);
      }

      if (this.config.tls.keyPath && fs.existsSync(this.config.tls.keyPath)) {
        tlsConfig.key = fs.readFileSync(this.config.tls.keyPath);
      }

      if (this.config.tls.caPath && fs.existsSync(this.config.tls.caPath)) {
        tlsConfig.ca = fs.readFileSync(this.config.tls.caPath);
      }

      // 直接使用证书内容（如果提供）
      if (this.config.tls.cert) {
        tlsConfig.cert = this.config.tls.cert;
      }

      if (this.config.tls.key) {
        tlsConfig.key = this.config.tls.key;
      }

      if (this.config.tls.ca) {
        tlsConfig.ca = this.config.tls.ca;
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw TRPCErrorHandler.businessError(
        'INTERNAL_SERVER_ERROR' as any,
        'Redis TLS证书加载失败',
        {
          context: { error: errorMessage },
          recoveryActions: [
            '检查证书文件路径',
            '验证证书文件权限',
            '确认证书文件格式',
          ],
        }
      );
    }

    return tlsConfig;
  }

  /**
   * 验证安全配置
   */
  public validateSecurityConfig(): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // 检查密码强度
    if (this.config.securityPolicy.enableAuth) {
      if (!this.config.password) {
        errors.push('启用认证但未设置密码');
      } else if (this.config.password.length < 12) {
        warnings.push('Redis密码长度建议至少12位');
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(this.config.password)) {
        warnings.push('Redis密码建议包含大小写字母和数字');
      }
    }

    // 检查TLS配置
    if (this.config.tls.enabled) {
      if (this.config.tls.certPath && !fs.existsSync(this.config.tls.certPath)) {
        errors.push(`TLS证书文件不存在: ${this.config.tls.certPath}`);
      }

      if (this.config.tls.keyPath && !fs.existsSync(this.config.tls.keyPath)) {
        errors.push(`TLS私钥文件不存在: ${this.config.tls.keyPath}`);
      }

      if (this.config.tls.caPath && !fs.existsSync(this.config.tls.caPath)) {
        errors.push(`TLS CA文件不存在: ${this.config.tls.caPath}`);
      }
    }

    // 检查生产环境安全设置
    if (process.env.NODE_ENV === 'production') {
      if (!this.config.password) {
        errors.push('生产环境必须设置Redis密码');
      }

      if (!this.config.tls.enabled) {
        warnings.push('生产环境建议启用TLS加密');
      }

      if (this.config.securityPolicy.allowDangerousCommands) {
        warnings.push('生产环境不建议允许危险命令');
      }
    }

    // 检查网络安全
    if (this.config.accessControl.allowedIPs.length === 0) {
      warnings.push('未配置IP白名单，建议限制访问IP');
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
    };
  }

  /**
   * 生成安全配置报告
   */
  public generateSecurityReport(): {
    config: RedisSecurityConfig;
    validation: {
      isValid: boolean;
      warnings: string[];
      errors: string[];
    };
    recommendations: string[];
  } {
    const validation = this.validateSecurityConfig();
    const recommendations: string[] = [];

    // 基于当前配置生成建议
    if (!this.config.tls.enabled) {
      recommendations.push('启用TLS加密以保护数据传输');
    }

    if (!this.config.password || this.config.password.length < 16) {
      recommendations.push('使用更强的密码（至少16位，包含特殊字符）');
    }

    if (this.config.accessControl.allowedIPs.length === 0) {
      recommendations.push('配置IP白名单限制访问来源');
    }

    if (this.config.securityPolicy.allowDangerousCommands) {
      recommendations.push('禁用危险命令以提高安全性');
    }

    if (this.config.accessControl.maxConnections > 50) {
      recommendations.push('考虑降低最大连接数以防止资源耗尽');
    }

    return {
      config: this.config,
      validation,
      recommendations,
    };
  }

  /**
   * 更新安全配置
   */
  public updateSecurityConfig(updates: Partial<RedisSecurityConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      tls: {
        ...this.config.tls,
        ...updates.tls,
      },
      accessControl: {
        ...this.config.accessControl,
        ...updates.accessControl,
      },
      securityPolicy: {
        ...this.config.securityPolicy,
        ...updates.securityPolicy,
      },
    };
  }

  /**
   * 获取当前安全配置
   */
  public getSecurityConfig(): RedisSecurityConfig {
    return { ...this.config };
  }

  /**
   * 测试安全连接
   */
  public async testSecureConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      const config = this.getRedisConnectionConfig();

      const testRedis = new Redis(config);

      // 测试连接
      await testRedis.ping();

      // 测试认证（如果启用）
      if (this.config.password) {
        await testRedis.auth(this.config.password);
      }

      await testRedis.quit();

      return {
        success: true,
        message: 'Redis安全连接测试成功',
        details: {
          tls: this.config.tls.enabled,
          auth: !!this.config.password,
          timestamp: Date.now(),
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        message: 'Redis安全连接测试失败',
        details: {
          error: errorMessage,
          config: {
            host: process.env.COSEREEDEN_REDIS_HOST,
            port: process.env.COSEREEDEN_REDIS_PORT,
            tls: this.config.tls.enabled,
            auth: !!this.config.password,
          },
        },
      };
    }
  }
}
