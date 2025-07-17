/**
 * @fileoverview 配置加载器
 * @description 负责加载和管理上传配置
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import type {
  UploadConfig,
  ConfigLoadOptions,
  ConfigSearchResult,
  ConfigQueryFilter,
  ConfigPaginationOptions
} from '../types/upload-config-types';

/**
 * 配置加载器类
 */
export class ConfigLoader {
  private static instance: ConfigLoader;
  private configCache = new Map<string, UploadConfig>();
  private cacheTimeout = 5 * 60 * 1000; // 5分钟缓存

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  /**
   * 加载配置
   */
  async loadConfig(configId: string, options: ConfigLoadOptions = {}): Promise<UploadConfig | null> {
    try {
      // 检查缓存
      if (!options.forceRefresh && this.configCache.has(configId)) {
        return this.configCache.get(configId) || null;
      }

      // 模拟从数据库加载配置
      const config = await this.fetchConfigFromDatabase(configId, options);

      if (config) {
        this.configCache.set(configId, config);
      }

      return config;
    } catch (error) {
      console.error('加载配置失败:', error);
      return null;
    }
  }

  /**
   * 加载多个配置
   */
  async loadConfigs(configIds: string[], options: ConfigLoadOptions = {}): Promise<UploadConfig[]> {
    try {
      const configs = await Promise.all(
        configIds.map(id => this.loadConfig(id, options))
      );

      return configs.filter(config => config !== null) as UploadConfig[];
    } catch (error) {
      console.error('批量加载配置失败:', error);
      return [];
    }
  }

  /**
   * 搜索配置
   */
  async searchConfigs(
    filter: ConfigQueryFilter = {},
    pagination: ConfigPaginationOptions = {}
  ): Promise<ConfigSearchResult> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = pagination;

      // 模拟搜索逻辑
      const allConfigs = await this.getAllConfigs(filter);

      // 排序
      const sortedConfigs = this.sortConfigs(allConfigs, sortBy, sortOrder);

      // 分页
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const configs = sortedConfigs.slice(startIndex, endIndex);

      return {
        configs,
        total: allConfigs.length,
        page,
        limit,
        hasMore: endIndex < allConfigs.length
      };
    } catch (error) {
      console.error('搜索配置失败:', error);
      return {
        configs: [],
        total: 0,
        page: 1,
        limit: 20,
        hasMore: false
      };
    }
  }

  /**
   * 获取活跃配置
   */
  async getActiveConfigs(): Promise<UploadConfig[]> {
    return this.searchConfigs({ isActive: true }).then(result => result.configs);
  }

  /**
   * 预加载配置
   */
  async preloadConfigs(configIds: string[]): Promise<void> {
    try {
      await this.loadConfigs(configIds, { forceRefresh: false });
    } catch (error) {
      console.error('预加载配置失败:', error);
    }
  }

  /**
   * 清除缓存
   */
  clearCache(configId?: string): void {
    if (configId) {
      this.configCache.delete(configId);
    } else {
      this.configCache.clear();
    }
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.configCache.size,
      keys: Array.from(this.configCache.keys())
    };
  }

  /**
   * 从数据库获取配置（模拟）
   */
  private async fetchConfigFromDatabase(
    configId: string,
    options: ConfigLoadOptions
  ): Promise<UploadConfig | null> {
    // 模拟数据库查询
    await new Promise(resolve => setTimeout(resolve, 100));

    // 模拟配置数据
    const mockConfig: UploadConfig = {
      id: configId,
      name: `配置-${configId}`,
      description: `配置${configId}的描述`,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
      uploadPath: '/uploads',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 如果不包含非活跃配置且配置非活跃，返回null
    if (!options.includeInactive && !mockConfig.isActive) {
      return null;
    }

    return mockConfig;
  }

  /**
   * 获取所有配置（模拟）
   */
  private async getAllConfigs(filter: ConfigQueryFilter): Promise<UploadConfig[]> {
    // 模拟数据库查询
    await new Promise(resolve => setTimeout(resolve, 200));

    // 生成模拟数据
    const configs: UploadConfig[] = [];
    for (let i = 1; i <= 50; i++) {
      const config: UploadConfig = {
        id: `config-${i}`,
        name: `配置-${i}`,
        description: `配置${i}的描述`,
        maxFileSize: (i % 3 + 1) * 5 * 1024 * 1024, // 5MB, 10MB, 15MB
        allowedTypes: ['image/jpeg', 'image/png'],
        uploadPath: `/uploads/type-${i % 3}`,
        isActive: i % 4 !== 0, // 75%活跃
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - i * 12 * 60 * 60 * 1000)
      };
      configs.push(config);
    }

    // 应用过滤器
    return this.applyFilter(configs, filter);
  }

  /**
   * 应用过滤器
   */
  private applyFilter(configs: UploadConfig[], filter: ConfigQueryFilter): UploadConfig[] {
    return configs.filter(config => {
      if (filter.name && !config.name.includes(filter.name)) {
        return false;
      }
      if (filter.isActive !== undefined && config.isActive !== filter.isActive) {
        return false;
      }
      if (filter.createdAfter && config.createdAt < filter.createdAfter) {
        return false;
      }
      if (filter.createdBefore && config.createdAt > filter.createdBefore) {
        return false;
      }
      return true;
    });
  }

  /**
   * 排序配置
   */
  private sortConfigs(
    configs: UploadConfig[],
    sortBy: string,
    sortOrder: 'asc' | 'desc'
  ): UploadConfig[] {
    return configs.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'createdAt':
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
          break;
        case 'updatedAt':
          aValue = a.updatedAt.getTime();
          bValue = b.updatedAt.getTime();
          break;
        case 'maxFileSize':
          aValue = a.maxFileSize;
          bValue = b.maxFileSize;
          break;
        default:
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }

  /**
   * 验证配置
   */
  async validateConfig(config: UploadConfig): Promise<boolean> {
    try {
      // 基本验证
      if (!config.id || !config.name) {
        return false;
      }

      if (config.maxFileSize <= 0) {
        return false;
      }

      if (!config.allowedTypes || config.allowedTypes.length === 0) {
        return false;
      }

      if (!config.uploadPath) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('配置验证失败:', error);
      return false;
    }
  }

  /**
   * 刷新配置缓存
   */
  async refreshCache(): Promise<void> {
    try {
      const activeConfigs = await this.getActiveConfigs();
      this.configCache.clear();

      for (const config of activeConfigs) {
        this.configCache.set(config.id, config);
      }
    } catch (error) {
      console.error('刷新缓存失败:', error);
    }
  }

  /**
   * 加载完整配置（静态方法）
   */
  static async loadFullConfig(configId: string, options: ConfigLoadOptions = {}): Promise<UploadConfig | null> {
    const instance = ConfigLoader.getInstance();
    return instance.loadConfig(configId, options);
  }
}
