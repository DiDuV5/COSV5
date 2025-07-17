/**
 * @fileoverview 配置服务
 * @description 处理配置的获取和处理
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import {
  UnifiedUploadConfig,
  ConfigValidationResult,
  ConfigHealthCheck,
  ConfigLoadOptions,
  DEFAULT_UPLOAD_CONFIG
} from '../../types/upload-config-types';

import { ConfigLoader } from '../../loaders/config-loader';
import { ConfigValidator } from '../../validators/config-validator';
import { ConfigManager } from '../core/ConfigManager';

/**
 * 配置服务类
 */
export class ConfigService {
  private configManager: ConfigManager;

  constructor() {
    this.configManager = ConfigManager.getInstance();
  }

  /**
   * 获取统一上传配置
   */
  public async getConfig(configId?: string, options?: ConfigLoadOptions): Promise<UnifiedUploadConfig> {
    try {
      console.log('📖 获取统一上传配置');

      const cacheKey = 'unified_upload_config';
      const cacheManager = this.configManager.getCacheManager();

      // 尝试从缓存获取
      if (options?.useCache !== false) {
        const cached = cacheManager.get(cacheKey);
        if (cached) {
          console.log('✅ 从缓存获取配置');
          return cached;
        }
      }

      // 从各种源加载配置
      const config = await ConfigLoader.loadFullConfig(configId || 'default', options);

      // 验证配置
      if (options?.validateConfig !== false && config) {
        const validation = await ConfigValidator.validateConfig(config);
        if (!validation.isValid) {
          console.warn('⚠️ 配置验证失败:', validation.errors);
          if (options?.fallbackToDefaults !== false) {
            console.log('🔄 使用默认配置');
            return DEFAULT_UPLOAD_CONFIG;
          }
        }
      }

      // 缓存配置
      cacheManager.set(cacheKey, config);

      console.log('✅ 统一上传配置获取完成');
      return config as UnifiedUploadConfig;

    } catch (error) {
      console.error('❌ 获取统一上传配置失败:', error);

      // 返回默认配置作为降级方案
      console.log('🔄 使用默认配置作为降级方案');
      return DEFAULT_UPLOAD_CONFIG;
    }
  }

  /**
   * 验证配置
   */
  public async validateConfig(config: UnifiedUploadConfig): Promise<ConfigValidationResult> {
    try {
      console.log('🔍 验证上传配置');

      return await ConfigValidator.validateConfig(config);

    } catch (error) {
      console.error('❌ 验证配置失败:', error);

      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : '未知错误'],
        warnings: []
      };
    }
  }

  /**
   * 执行健康检查
   */
  public async performHealthCheck(): Promise<ConfigHealthCheck> {
    try {
      console.log('🏥 执行配置健康检查');

      const config = await this.getConfig();
      return await ConfigValidator.performHealthCheck(config);

    } catch (error) {
      console.error('❌ 配置健康检查失败:', error);

      return {
        configId: 'unknown',
        status: 'error',
        lastChecked: new Date(),
        issues: [`健康检查失败: ${error instanceof Error ? error.message : '未知错误'}`],
        recommendations: ['请检查配置加载器和验证器']
      };
    }
  }

  /**
   * 重新加载配置
   */
  public async reloadConfig(): Promise<UnifiedUploadConfig> {
    try {
      console.log('🔄 重新加载配置');

      // 清除缓存
      this.configManager.clearAllCache();

      // 重新加载配置
      return await this.getConfig('default', {
        useCache: false,
        validateConfig: true,
        fallbackToDefaults: true
      });

    } catch (error) {
      console.error('❌ 重新加载配置失败:', error);
      throw error;
    }
  }

  /**
   * 清除配置缓存
   */
  public clearConfigCache(): void {
    this.configManager.clearAllCache();
    console.log('🧹 配置缓存已清除');
  }
}
