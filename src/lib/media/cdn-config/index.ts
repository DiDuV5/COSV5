/**
 * @fileoverview CDN配置管理器 - 统一导出
 * @description 重构后的CDN配置管理器，保持100%向后兼容性
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 模块化重构版本
 */

// 重新导出所有模块，保持向后兼容性
export * from './types';
export * from './loader';
export * from './security';
export * from './enhanced';

// 为了完全向后兼容，创建CDNConfigManager类
import {
  CDNConfig,
  CDNSecurityConfig,
  CDNConfigListener,
  EnhancedCDNConfig,
} from './types';
import { CDNConfigLoader } from './loader';
import { CDNSecurityValidator } from './security';
import { CDNEnhancedManager } from './enhanced';

/**
 * CDN配置管理器 - 向后兼容包装器
 */
export class CDNConfigManager {
  private static instance: CDNConfigManager;
  private config: CDNConfig;
  private configListeners: CDNConfigListener[] = [];
  private securityValidator: CDNSecurityValidator;

  private constructor() {
    this.config = CDNConfigLoader.loadConfigFromEnv();
    this.securityValidator = new CDNSecurityValidator(this.config);
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): CDNConfigManager {
    if (!CDNConfigManager.instance) {
      CDNConfigManager.instance = new CDNConfigManager();
    }
    return CDNConfigManager.instance;
  }

  /**
   * 获取当前配置
   */
  public getConfig(): CDNConfig {
    return { ...this.config };
  }

  /**
   * 获取主CDN域名
   */
  public getPrimaryCDNDomain(): string {
    return this.config.primaryDomain;
  }

  /**
   * 获取备用CDN域名列表
   */
  public getBackupCDNDomains(): string[] {
    return [...this.config.backupDomains];
  }

  /**
   * 获取所有可用CDN域名
   */
  public getAllCDNDomains(): string[] {
    return [this.config.primaryDomain, ...this.config.backupDomains];
  }

  /**
   * 验证域名是否在白名单中
   */
  public isDomainWhitelisted(domain: string): boolean {
    return this.securityValidator.isDomainWhitelisted(domain);
  }

  /**
   * 验证来源是否被允许
   */
  public isOriginAllowed(origin: string): boolean {
    return this.securityValidator.isOriginAllowed(origin);
  }

  /**
   * 获取安全配置
   */
  public getSecurityConfig(): CDNSecurityConfig {
    return this.securityValidator.getSecurityConfig();
  }

  /**
   * 动态更新配置（热重载）
   */
  public updateConfig(newConfig: Partial<CDNConfig>): boolean {
    try {
      const updatedConfig = { ...this.config, ...newConfig };
      
      // 验证配置
      if (!CDNConfigLoader.validateConfig(updatedConfig)) {
        console.error('CDN配置验证失败');
        return false;
      }

      this.config = updatedConfig;
      this.securityValidator.updateConfig(this.config);
      this.notifyConfigListeners();

      console.log('CDN配置已更新:', this.config);
      return true;
    } catch (error) {
      console.error('CDN配置更新失败:', error);
      return false;
    }
  }

  /**
   * 重新加载环境变量配置
   */
  public reloadConfig(): void {
    this.config = CDNConfigLoader.loadConfigFromEnv();
    this.securityValidator.updateConfig(this.config);
    this.notifyConfigListeners();
    console.log('CDN配置已重新加载:', this.config);
  }

  /**
   * 添加配置变更监听器
   */
  public addConfigListener(listener: CDNConfigListener): void {
    this.configListeners.push(listener);
  }

  /**
   * 移除配置变更监听器
   */
  public removeConfigListener(listener: CDNConfigListener): void {
    const index = this.configListeners.indexOf(listener);
    if (index > -1) {
      this.configListeners.splice(index, 1);
    }
  }

  /**
   * 通知所有配置监听器
   */
  private notifyConfigListeners(): void {
    this.configListeners.forEach(listener => {
      try {
        listener(this.config);
      } catch (error) {
        console.error('配置监听器执行失败:', error);
      }
    });
  }

  /**
   * 获取当前环境
   */
  public getEnvironment(): string {
    return this.config.environment;
  }

  /**
   * 检查是否为生产环境
   */
  public isProduction(): boolean {
    return this.config.environment === 'production';
  }

  /**
   * 检查是否为开发环境
   */
  public isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  /**
   * 获取安全验证器
   */
  public getSecurityValidator(): CDNSecurityValidator {
    return this.securityValidator;
  }
}

/**
 * 增强CDN管理器 - 向后兼容包装器
 */
export class EnhancedCDNManager {
  private baseManager: CDNConfigManager;
  private enhancedManager: CDNEnhancedManager;

  constructor() {
    this.baseManager = CDNConfigManager.getInstance();
    this.enhancedManager = new CDNEnhancedManager(this.baseManager.getConfig());
  }

  /**
   * 获取增强配置
   */
  public getConfig(): EnhancedCDNConfig {
    return this.enhancedManager.getConfig();
  }

  /**
   * 更新增强配置
   */
  public updateConfig(newConfig: Partial<EnhancedCDNConfig>): boolean {
    return this.enhancedManager.updateConfig(newConfig);
  }

  /**
   * 获取当前活跃CDN域名
   */
  public async getActiveCDNDomain(): Promise<string> {
    return this.enhancedManager.getActiveCDNDomain();
  }

  /**
   * 获取所有CDN域名
   */
  public getAllCDNDomains(): string[] {
    return this.enhancedManager.getAllCDNDomains();
  }

  /**
   * 启动健康检查
   */
  public startHealthCheck(): void {
    this.enhancedManager.startHealthCheck();
  }

  /**
   * 停止健康检查
   */
  public stopHealthCheck(): void {
    this.enhancedManager.stopHealthCheck();
  }

  /**
   * 执行健康检查
   */
  public async performHealthCheck(): Promise<void> {
    return this.enhancedManager.performHealthCheck();
  }

  /**
   * 手动故障转移
   */
  public async manualFailover(targetDomainIndex: number): Promise<boolean> {
    return this.enhancedManager.manualFailover(targetDomainIndex);
  }

  /**
   * 获取域名状态报告
   */
  public getDomainStatusReport() {
    return this.enhancedManager.getDomainStatusReport();
  }

  /**
   * 重置域名错误计数
   */
  public resetDomainErrors(): void {
    this.enhancedManager.resetDomainErrors();
  }

  /**
   * 销毁管理器
   */
  public destroy(): void {
    this.enhancedManager.destroy();
  }
}

/**
 * 导出单例实例 - 保持向后兼容性
 */
export const cdnConfig = CDNConfigManager.getInstance();

/**
 * 导出增强CDN管理器实例 - 保持向后兼容性
 */
export const enhancedCDNManager = new EnhancedCDNManager();

/**
 * 便捷导出函数 - 保持向后兼容性
 */
export const getPrimaryCDNDomain = () => cdnConfig.getPrimaryCDNDomain();
export const getBackupCDNDomains = () => cdnConfig.getBackupCDNDomains();
export const getAllCDNDomains = () => cdnConfig.getAllCDNDomains();
export const isDomainWhitelisted = (domain: string) => cdnConfig.isDomainWhitelisted(domain);
export const isOriginAllowed = (origin: string) => cdnConfig.isOriginAllowed(origin);

/**
 * 默认导出
 */
export default CDNConfigManager;
