/**
 * @fileoverview URL配置管理器
 * @description 遵循12-Factor App原则的URL配置管理，统一处理应用URL生成
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

import { env } from '@/lib/env';
import { TRPCErrorHandler, BusinessErrorType } from '@/lib/errors/trpc-error-handler';

/**
 * URL配置接口
 */
interface UrlConfig {
  baseUrl: string;
  domain: string;
  protocol: string;
  port?: number;
  isSecure: boolean;
}

/**
 * URL生成选项
 */
interface UrlGenerationOptions {
  path?: string;
  params?: Record<string, string>;
  fragment?: string;
  absolute?: boolean;
}

/**
 * URL配置管理器
 * 遵循12-Factor App配置即环境原则
 */
export class UrlConfigManager {
  private static instance: UrlConfigManager;
  private config: UrlConfig;
  private initialized = false;

  private constructor() {
    this.config = this.loadUrlConfig();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): UrlConfigManager {
    if (!UrlConfigManager.instance) {
      UrlConfigManager.instance = new UrlConfigManager();
    }
    return UrlConfigManager.instance;
  }

  /**
   * 从环境变量加载URL配置
   */
  private loadUrlConfig(): UrlConfig {
    // 优先级：NEXTAUTH_URL > NEXT_PUBLIC_APP_URL > 构建默认值
    const nextAuthUrl = env.NEXTAUTH_URL;
    const appUrl = process.env.COSEREEDEN_NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;

    let baseUrl: string;

    if (nextAuthUrl) {
      baseUrl = nextAuthUrl;
    } else if (appUrl) {
      baseUrl = appUrl;
    } else {
      // 根据环境构建默认URL
      baseUrl = this.buildDefaultUrl();
    }

    // 解析URL组件
    const url = new URL(baseUrl);

    return {
      baseUrl: baseUrl.replace(/\/$/, ''), // 移除尾部斜杠
      domain: url.hostname,
      protocol: url.protocol.replace(':', ''),
      port: url.port ? parseInt(url.port) : undefined,
      isSecure: url.protocol === 'https:',
    };
  }

  /**
   * 构建默认URL（当环境变量未设置时）
   */
  private buildDefaultUrl(): string {
    const nodeEnv = env.NODE_ENV;
    const port = process.env.COSEREEDEN_PORT ?? '3000';

    switch (nodeEnv) {
      case 'production':
        // 生产环境必须配置NEXTAUTH_URL或NEXT_PUBLIC_APP_URL
        throw TRPCErrorHandler.businessError(
          BusinessErrorType.CONFIGURATION_ERROR,
          '生产环境必须配置NEXTAUTH_URL或NEXT_PUBLIC_APP_URL环境变量'
        );

      case 'test':
        return 'http://localhost:3000';

      case 'development':
      default:
        return `http://localhost:${port}`;
    }
  }

  /**
   * 初始化配置（可选，用于验证）
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // 验证配置有效性
      this.validateConfig();
      this.initialized = true;

      console.log(`🌐 URL配置初始化完成: ${this.config.baseUrl}`);
    } catch (error) {
      console.error('❌ URL配置初始化失败:', error);
      throw error;
    }
  }

  /**
   * 验证配置有效性
   */
  private validateConfig(): void {
    const { baseUrl, domain } = this.config;

    // 验证URL格式
    try {
      new URL(baseUrl);
    } catch {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.CONFIGURATION_ERROR,
        `无效的基础URL配置: ${baseUrl}`
      );
    }

    // 生产环境安全检查
    if (env.NODE_ENV === 'production') {
      if (!this.config.isSecure) {
        console.warn('⚠️ 生产环境建议使用HTTPS协议');
      }

      if (domain === 'localhost' || domain.includes('127.0.0.1')) {
        throw TRPCErrorHandler.businessError(
          BusinessErrorType.CONFIGURATION_ERROR,
          '生产环境不能使用localhost域名'
        );
      }
    }
  }

  /**
   * 获取基础URL
   */
  public getBaseUrl(): string {
    return this.config.baseUrl;
  }

  /**
   * 获取域名
   */
  public getDomain(): string {
    return this.config.domain;
  }

  /**
   * 获取协议
   */
  public getProtocol(): string {
    return this.config.protocol;
  }

  /**
   * 是否为安全连接
   */
  public isSecure(): boolean {
    return this.config.isSecure;
  }

  /**
   * 生成完整URL
   */
  public generateUrl(options: UrlGenerationOptions = {}): string {
    const { path = '', params, fragment, absolute = true } = options;

    if (!absolute) {
      return this.buildRelativeUrl(path, params, fragment);
    }

    return this.buildAbsoluteUrl(path, params, fragment);
  }

  /**
   * 生成邮箱验证URL
   */
  public generateVerificationUrl(token: string): string {
    return this.generateUrl({
      path: '/auth/verify-email',
      params: { token },
    });
  }

  /**
   * 生成密码重置URL
   */
  public generatePasswordResetUrl(token: string): string {
    return this.generateUrl({
      path: '/auth/reset-password',
      params: { token },
    });
  }

  /**
   * 生成API回调URL
   */
  public generateApiCallbackUrl(endpoint: string): string {
    return this.generateUrl({
      path: `/api/${endpoint.replace(/^\//, '')}`,
    });
  }

  /**
   * 构建绝对URL
   */
  private buildAbsoluteUrl(path: string, params?: Record<string, string>, fragment?: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    let url = `${this.config.baseUrl}${cleanPath}`;

    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    if (fragment) {
      url += `#${fragment}`;
    }

    return url;
  }

  /**
   * 构建相对URL
   */
  private buildRelativeUrl(path: string, params?: Record<string, string>, fragment?: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    let url = cleanPath;

    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    if (fragment) {
      url += `#${fragment}`;
    }

    return url;
  }

  /**
   * 获取配置摘要（用于调试）
   */
  public getConfigSummary(): Record<string, any> {
    return {
      baseUrl: this.config.baseUrl,
      domain: this.config.domain,
      protocol: this.config.protocol,
      port: this.config.port,
      isSecure: this.config.isSecure,
      environment: env.NODE_ENV,
      initialized: this.initialized,
    };
  }
}

/**
 * 导出单例实例
 */
export const urlConfig = UrlConfigManager.getInstance();

/**
 * 便捷函数：生成邮箱验证URL
 */
export function generateVerificationUrl(token: string): string {
  return urlConfig.generateVerificationUrl(token);
}

/**
 * 便捷函数：生成密码重置URL
 */
export function generatePasswordResetUrl(token: string): string {
  return urlConfig.generatePasswordResetUrl(token);
}

/**
 * 便捷函数：获取基础URL
 */
export function getBaseUrl(): string {
  return urlConfig.getBaseUrl();
}

/**
 * 便捷函数：生成完整URL
 */
export function generateUrl(options: UrlGenerationOptions): string {
  return urlConfig.generateUrl(options);
}
