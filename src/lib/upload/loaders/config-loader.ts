/**
 * @fileoverview 配置加载器
 * @description 负责从各种源加载上传配置
 * @author Augment AI
 * @date 2025-07-03
 */

import {
  UnifiedUploadConfig,
  ConfigLoadOptions,
  ConfigSource,
  ConfigPriority,
  DEFAULT_UPLOAD_CONFIG
} from '../types/upload-config-types';

/**
 * 配置加载器类
 */
export class ConfigLoader {

  /**
   * 从环境变量加载配置
   */
  static loadFromEnvironment(): Partial<UnifiedUploadConfig> {
    console.log('🔧 从环境变量加载配置');

    const envConfig: Partial<UnifiedUploadConfig> = {};

    // 环境配置
    if (process.env.NODE_ENV) {
      envConfig.environment = process.env.NODE_ENV as any;
    }

    // 文件限制
    if (process.env.COSEREEDEN_UPLOAD_MAX_FILE_SIZE) {
      envConfig.maxFileSize = parseInt(process.env.COSEREEDEN_UPLOAD_MAX_FILE_SIZE);
    }
    if (process.env.COSEREEDEN_UPLOAD_MAX_FILES_PER_UPLOAD) {
      envConfig.maxFilesPerUpload = parseInt(process.env.COSEREEDEN_UPLOAD_MAX_FILES_PER_UPLOAD);
    }
    if (process.env.COSEREEDEN_UPLOAD_MAX_DAILY_UPLOADS) {
      envConfig.maxDailyUploads = parseInt(process.env.COSEREEDEN_UPLOAD_MAX_DAILY_UPLOADS);
    }
    if (process.env.COSEREEDEN_UPLOAD_ALLOWED_MIME_TYPES) {
      envConfig.allowedMimeTypes = process.env.COSEREEDEN_UPLOAD_ALLOWED_MIME_TYPES.split(',');
    }

    // 分片配置
    if (process.env.COSEREEDEN_UPLOAD_CHUNK_SIZE) {
      envConfig.chunkSize = parseInt(process.env.COSEREEDEN_UPLOAD_CHUNK_SIZE);
    }
    if (process.env.COSEREEDEN_UPLOAD_MAX_CONCURRENT_CHUNKS) {
      envConfig.maxConcurrentChunks = parseInt(process.env.COSEREEDEN_UPLOAD_MAX_CONCURRENT_CHUNKS);
    }
    if (process.env.COSEREEDEN_UPLOAD_STREAM_THRESHOLD) {
      envConfig.streamThreshold = parseInt(process.env.COSEREEDEN_UPLOAD_STREAM_THRESHOLD);
    }
    if (process.env.COSEREEDEN_UPLOAD_MEMORY_SAFE_THRESHOLD) {
      envConfig.memorySafeThreshold = parseInt(process.env.COSEREEDEN_UPLOAD_MEMORY_SAFE_THRESHOLD);
    }

    // 内存管理
    if (process.env.COSEREEDEN_UPLOAD_MAX_MEMORY_USAGE) {
      envConfig.maxMemoryUsage = parseInt(process.env.COSEREEDEN_UPLOAD_MAX_MEMORY_USAGE);
    }
    if (process.env.COSEREEDEN_UPLOAD_MEMORY_WARNING_THRESHOLD) {
      envConfig.memoryWarningThreshold = parseFloat(process.env.COSEREEDEN_UPLOAD_MEMORY_WARNING_THRESHOLD);
    }
    if (process.env.COSEREEDEN_UPLOAD_MEMORY_CRITICAL_THRESHOLD) {
      envConfig.memoryCriticalThreshold = parseFloat(process.env.COSEREEDEN_UPLOAD_MEMORY_CRITICAL_THRESHOLD);
    }
    if (process.env.COSEREEDEN_UPLOAD_ENABLE_AUTO_GC) {
      envConfig.enableAutoGC = process.env.COSEREEDEN_UPLOAD_ENABLE_AUTO_GC === 'true';
    }

    // 存储配置
    if (process.env.COSEREEDEN_CDN_DOMAIN) {
      envConfig.cdnDomain = process.env.COSEREEDEN_CDN_DOMAIN;
    }
    if (process.env.COSEREEDEN_CDN_BACKUP_DOMAIN) {
      envConfig.cdnBackupDomain = process.env.COSEREEDEN_CDN_BACKUP_DOMAIN;
    }

    // 安全配置
    if (process.env.COSEREEDEN_UPLOAD_ENABLE_VIRUS_SCAN) {
      envConfig.enableVirusScan = process.env.COSEREEDEN_UPLOAD_ENABLE_VIRUS_SCAN === 'true';
    }
    if (process.env.COSEREEDEN_UPLOAD_ENABLE_CONTENT_VALIDATION) {
      envConfig.enableContentValidation = process.env.COSEREEDEN_UPLOAD_ENABLE_CONTENT_VALIDATION === 'true';
    }
    if (process.env.COSEREEDEN_UPLOAD_ENABLE_WATERMARK) {
      envConfig.enableWatermark = process.env.COSEREEDEN_UPLOAD_ENABLE_WATERMARK === 'true';
    }

    // 性能配置
    if (process.env.COSEREEDEN_UPLOAD_ENABLE_COMPRESSION) {
      envConfig.enableCompression = process.env.COSEREEDEN_UPLOAD_ENABLE_COMPRESSION === 'true';
    }
    if (process.env.COSEREEDEN_UPLOAD_COMPRESSION_QUALITY) {
      envConfig.compressionQuality = parseInt(process.env.COSEREEDEN_UPLOAD_COMPRESSION_QUALITY);
    }
    if (process.env.COSEREEDEN_UPLOAD_ENABLE_THUMBNAIL_GENERATION) {
      envConfig.enableThumbnailGeneration = process.env.COSEREEDEN_UPLOAD_ENABLE_THUMBNAIL_GENERATION === 'true';
    }
    if (process.env.COSEREEDEN_UPLOAD_THUMBNAIL_SIZES) {
      envConfig.thumbnailSizes = process.env.COSEREEDEN_UPLOAD_THUMBNAIL_SIZES.split(',').map(s => parseInt(s));
    }

    // 监控配置
    if (process.env.COSEREEDEN_UPLOAD_ENABLE_METRICS) {
      envConfig.enableMetrics = process.env.COSEREEDEN_UPLOAD_ENABLE_METRICS === 'true';
    }
    if (process.env.COSEREEDEN_UPLOAD_ENABLE_DETAILED_LOGGING) {
      envConfig.enableDetailedLogging = process.env.COSEREEDEN_UPLOAD_ENABLE_DETAILED_LOGGING === 'true';
    }
    if (process.env.COSEREEDEN_UPLOAD_LOG_LEVEL) {
      envConfig.logLevel = process.env.COSEREEDEN_UPLOAD_LOG_LEVEL as any;
    }

    // 重试配置
    if (process.env.COSEREEDEN_UPLOAD_MAX_RETRIES) {
      envConfig.maxRetries = parseInt(process.env.COSEREEDEN_UPLOAD_MAX_RETRIES);
    }
    if (process.env.COSEREEDEN_UPLOAD_RETRY_DELAY) {
      envConfig.retryDelay = parseInt(process.env.COSEREEDEN_UPLOAD_RETRY_DELAY);
    }
    if (process.env.COSEREEDEN_UPLOAD_EXPONENTIAL_BACKOFF) {
      envConfig.exponentialBackoff = process.env.COSEREEDEN_UPLOAD_EXPONENTIAL_BACKOFF === 'true';
    }

    console.log(`✅ 从环境变量加载了 ${Object.keys(envConfig).length} 个配置项`);
    return envConfig;
  }

  /**
   * 从数据库加载配置
   */
  static async loadFromDatabase(): Promise<Partial<UnifiedUploadConfig>> {
    try {
      console.log('🗄️ 从数据库加载配置');

      const { prisma } = await import('@/lib/prisma');

      const configItems = await prisma.cansSystemConfig.findMany({
        where: {
          userLevel: {
            in: ['USER', 'VIP', 'CREATOR', 'ADMIN']
          }
        }
      });

      const dbConfig: Partial<UnifiedUploadConfig> = {};

      configItems.forEach((item: any) => {
        try {
          const value = JSON.parse(item.value);
          const configKey = this.mapDatabaseKeyToConfigKey(item.key);

          if (configKey) {
            (dbConfig as any)[configKey] = value;
          }
        } catch (error) {
          console.warn(`⚠️ 解析配置项失败: ${item.key}`, error);
        }
      });

      console.log(`✅ 从数据库加载了 ${Object.keys(dbConfig).length} 个配置项`);
      return dbConfig;

    } catch (error) {
      console.error('❌ 从数据库加载配置失败:', error);
      return {};
    }
  }

  /**
   * 合并多个配置源
   */
  static mergeConfigs(
    configs: Array<{ source: ConfigSource; config: Partial<UnifiedUploadConfig> }>
  ): UnifiedUploadConfig {
    console.log('🔀 合并配置源');

    // 按优先级排序
    const sortedConfigs = configs.sort((a, b) => {
      const priorityA = this.getConfigPriority(a.source);
      const priorityB = this.getConfigPriority(b.source);
      return priorityA - priorityB;
    });

    // 从默认配置开始
    let mergedConfig: UnifiedUploadConfig = { ...DEFAULT_UPLOAD_CONFIG };

    // 按优先级合并配置
    sortedConfigs.forEach(({ source, config }) => {
      mergedConfig = {
        ...mergedConfig,
        ...config
      };
      console.log(`📝 合并 ${source} 配置: ${Object.keys(config).length} 个配置项`);
    });

    console.log('✅ 配置合并完成');
    return mergedConfig;
  }

  /**
   * 加载完整配置
   */
  static async loadFullConfig(options: ConfigLoadOptions = {
    useCache: true,
    validateConfig: true,
    fallbackToDefaults: true,
    enableHotReload: false
  }): Promise<UnifiedUploadConfig> {
    try {
      console.log('🚀 开始加载完整配置');

      const configs: Array<{ source: ConfigSource; config: Partial<UnifiedUploadConfig> }> = [];

      // 加载默认配置
      configs.push({
        source: 'default',
        config: DEFAULT_UPLOAD_CONFIG
      });

      // 加载环境变量配置
      const envConfig = this.loadFromEnvironment();
      if (Object.keys(envConfig).length > 0) {
        configs.push({
          source: 'environment',
          config: envConfig
        });
      }

      // 加载数据库配置
      if (!options.useCache) {
        const dbConfig = await this.loadFromDatabase();
        if (Object.keys(dbConfig).length > 0) {
          configs.push({
            source: 'database',
            config: dbConfig
          });
        }
      }

      // 合并配置
      const finalConfig = this.mergeConfigs(configs);

      console.log('✅ 完整配置加载完成');
      return finalConfig;

    } catch (error) {
      console.error('❌ 加载完整配置失败:', error);

      if (options.fallbackToDefaults) {
        console.log('🔄 使用默认配置作为降级方案');
        return DEFAULT_UPLOAD_CONFIG;
      }

      throw error;
    }
  }

  /**
   * 获取配置优先级
   */
  private static getConfigPriority(source: ConfigSource): number {
    const priorityMap: Record<ConfigSource, number> = {
      'default': ConfigPriority.DEFAULT,
      'cache': ConfigPriority.CACHE,
      'database': ConfigPriority.DATABASE,
      'environment': ConfigPriority.ENVIRONMENT
    };

    return priorityMap[source] || ConfigPriority.DEFAULT;
  }

  /**
   * 映射数据库键到配置键
   */
  private static mapDatabaseKeyToConfigKey(dbKey: string): keyof UnifiedUploadConfig | null {
    const keyMapping: Record<string, keyof UnifiedUploadConfig> = {
      'upload_max_file_size': 'maxFileSize',
      'upload_max_files_per_upload': 'maxFilesPerUpload',
      'upload_max_daily_uploads': 'maxDailyUploads',
      'upload_allowed_mime_types': 'allowedMimeTypes',
      'upload_chunk_size': 'chunkSize',
      'upload_max_concurrent_chunks': 'maxConcurrentChunks',
      'upload_stream_threshold': 'streamThreshold',
      'upload_memory_safe_threshold': 'memorySafeThreshold',
      'upload_max_memory_usage': 'maxMemoryUsage',
      'upload_memory_warning_threshold': 'memoryWarningThreshold',
      'upload_memory_critical_threshold': 'memoryCriticalThreshold',
      'upload_enable_auto_gc': 'enableAutoGC',
      'upload_cdn_domain': 'cdnDomain',
      'upload_cdn_backup_domain': 'cdnBackupDomain',
      'upload_enable_virus_scan': 'enableVirusScan',
      'upload_enable_content_validation': 'enableContentValidation',
      'upload_enable_watermark': 'enableWatermark',
      'upload_enable_compression': 'enableCompression',
      'upload_compression_quality': 'compressionQuality',
      'upload_enable_thumbnail_generation': 'enableThumbnailGeneration',
      'upload_thumbnail_sizes': 'thumbnailSizes',
      'upload_enable_metrics': 'enableMetrics',
      'upload_enable_detailed_logging': 'enableDetailedLogging',
      'upload_log_level': 'logLevel',
      'upload_max_retries': 'maxRetries',
      'upload_retry_delay': 'retryDelay',
      'upload_exponential_backoff': 'exponentialBackoff'
    };

    return keyMapping[dbKey] || null;
  }

  /**
   * 验证配置完整性
   */
  static validateConfigCompleteness(config: Partial<UnifiedUploadConfig>): {
    complete: boolean;
    missingKeys: string[];
  } {
    const requiredKeys: (keyof UnifiedUploadConfig)[] = [
      'environment',
      'maxFileSize',
      'maxFilesPerUpload',
      'allowedMimeTypes',
      'chunkSize',
      'storageProvider',
      'cdnDomain'
    ];

    const missingKeys = requiredKeys.filter(key => !(key in config));

    return {
      complete: missingKeys.length === 0,
      missingKeys
    };
  }

  /**
   * 创建配置快照
   */
  static createConfigSnapshot(config: UnifiedUploadConfig): {
    snapshot: string;
    checksum: string;
    timestamp: Date;
  } {
    const snapshot = JSON.stringify(config, null, 2);
    const checksum = this.calculateChecksum(snapshot);

    return {
      snapshot,
      checksum,
      timestamp: new Date()
    };
  }

  /**
   * 计算配置校验和
   */
  private static calculateChecksum(data: string): string {
    // 简单的校验和计算，实际项目中应该使用更强的哈希算法
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(16);
  }
}
