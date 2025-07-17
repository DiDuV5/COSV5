/**
 * @fileoverview 配置验证器
 * @description 验证上传配置的有效性和一致性
 * @author Augment AI
 * @date 2025-07-03
 */

import {
  UnifiedUploadConfig,
  ConfigValidationResult,
  ConfigHealthCheck,
  Environment
} from '../types/upload-config-types';

/**
 * 配置验证器类
 */
export class ConfigValidator {

  /**
   * 验证配置
   */
  static validateConfig(config: UnifiedUploadConfig): ConfigValidationResult {
    console.log('🔍 开始验证配置');
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // 基本验证
    this.validateBasicConfig(config, errors, warnings);
    
    // 文件限制验证
    this.validateFileLimits(config, errors, warnings, recommendations);
    
    // 内存配置验证
    this.validateMemoryConfig(config, errors, warnings, recommendations);
    
    // 性能配置验证
    this.validatePerformanceConfig(config, errors, warnings, recommendations);
    
    // 安全配置验证
    this.validateSecurityConfig(config, warnings, recommendations);
    
    // 环境特定验证
    this.validateEnvironmentSpecific(config, warnings, recommendations);

    const result: ConfigValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };

    console.log(`✅ 配置验证完成: ${result.valid ? '通过' : '失败'}`);
    return result;
  }

  /**
   * 验证基本配置
   */
  private static validateBasicConfig(
    config: UnifiedUploadConfig,
    errors: string[],
    warnings: string[]
  ): void {
    // 环境验证
    const validEnvironments: Environment[] = ['development', 'production', 'test'];
    if (!validEnvironments.includes(config.environment)) {
      errors.push(`无效的环境配置: ${config.environment}`);
    }

    // 存储提供商验证
    if (config.storageProvider !== 'cloudflare-r2') {
      errors.push(`不支持的存储提供商: ${config.storageProvider}`);
    }

    // CDN域名验证
    if (!config.cdnDomain) {
      errors.push('CDN域名不能为空');
    } else if (!this.isValidDomain(config.cdnDomain)) {
      errors.push(`无效的CDN域名: ${config.cdnDomain}`);
    }

    // 备用CDN域名验证
    if (config.cdnBackupDomain && !this.isValidDomain(config.cdnBackupDomain)) {
      warnings.push(`无效的备用CDN域名: ${config.cdnBackupDomain}`);
    }
  }

  /**
   * 验证文件限制
   */
  private static validateFileLimits(
    config: UnifiedUploadConfig,
    errors: string[],
    warnings: string[],
    recommendations: string[]
  ): void {
    // 文件大小验证
    if (config.maxFileSize <= 0) {
      errors.push('最大文件大小必须大于0');
    } else if (config.maxFileSize > 5 * 1024 * 1024 * 1024) { // 5GB
      warnings.push('最大文件大小超过5GB，可能影响性能');
    }

    // 文件数量验证
    if (config.maxFilesPerUpload <= 0) {
      errors.push('每次上传最大文件数必须大于0');
    } else if (config.maxFilesPerUpload > 100) {
      warnings.push('每次上传文件数过多，可能影响性能');
    }

    // 每日上传限制验证
    if (config.maxDailyUploads <= 0) {
      errors.push('每日最大上传数必须大于0');
    }

    // MIME类型验证
    if (!config.allowedMimeTypes || config.allowedMimeTypes.length === 0) {
      errors.push('允许的MIME类型不能为空');
    } else {
      const invalidMimeTypes = config.allowedMimeTypes.filter(type => 
        type !== '*' && !this.isValidMimeType(type)
      );
      if (invalidMimeTypes.length > 0) {
        warnings.push(`无效的MIME类型: ${invalidMimeTypes.join(', ')}`);
      }
    }

    // 分片大小验证
    if (config.chunkSize <= 0) {
      errors.push('分片大小必须大于0');
    } else if (config.chunkSize < 1024 * 1024) { // 1MB
      recommendations.push('分片大小建议至少为1MB以提高效率');
    } else if (config.chunkSize > 100 * 1024 * 1024) { // 100MB
      warnings.push('分片大小过大，可能导致内存问题');
    }

    // 并发分片验证
    if (config.maxConcurrentChunks <= 0) {
      errors.push('最大并发分片数必须大于0');
    } else if (config.maxConcurrentChunks > 10) {
      warnings.push('并发分片数过多，可能影响服务器性能');
    }
  }

  /**
   * 验证内存配置
   */
  private static validateMemoryConfig(
    config: UnifiedUploadConfig,
    errors: string[],
    warnings: string[],
    recommendations: string[]
  ): void {
    // 内存使用限制验证
    if (config.maxMemoryUsage <= 0) {
      errors.push('最大内存使用量必须大于0');
    }

    // 内存阈值验证
    if (config.memoryWarningThreshold <= 0 || config.memoryWarningThreshold >= 1) {
      errors.push('内存警告阈值必须在0-1之间');
    }

    if (config.memoryCriticalThreshold <= 0 || config.memoryCriticalThreshold >= 1) {
      errors.push('内存临界阈值必须在0-1之间');
    }

    if (config.memoryWarningThreshold >= config.memoryCriticalThreshold) {
      errors.push('内存警告阈值不能大于等于临界阈值');
    }

    // 流式上传阈值验证
    if (config.streamThreshold <= 0) {
      errors.push('流式上传阈值必须大于0');
    }

    if (config.memorySafeThreshold <= 0) {
      errors.push('内存安全阈值必须大于0');
    }

    if (config.streamThreshold >= config.memorySafeThreshold) {
      warnings.push('流式上传阈值应该小于内存安全阈值');
    }

    // 内存配置建议
    if (config.maxMemoryUsage < 100 * 1024 * 1024) { // 100MB
      recommendations.push('建议将最大内存使用量设置为至少100MB');
    }
  }

  /**
   * 验证性能配置
   */
  private static validatePerformanceConfig(
    config: UnifiedUploadConfig,
    errors: string[],
    warnings: string[],
    recommendations: string[]
  ): void {
    // 压缩质量验证
    if (config.enableCompression) {
      if (config.compressionQuality < 1 || config.compressionQuality > 100) {
        errors.push('压缩质量必须在1-100之间');
      } else if (config.compressionQuality < 50) {
        warnings.push('压缩质量过低，可能影响图片质量');
      }
    }

    // 缩略图尺寸验证
    if (config.enableThumbnailGeneration) {
      if (!config.thumbnailSizes || config.thumbnailSizes.length === 0) {
        warnings.push('启用缩略图生成但未配置尺寸');
      } else {
        const invalidSizes = config.thumbnailSizes.filter(size => size <= 0 || size > 2048);
        if (invalidSizes.length > 0) {
          warnings.push(`无效的缩略图尺寸: ${invalidSizes.join(', ')}`);
        }
      }
    }

    // 重试配置验证
    if (config.maxRetries < 0) {
      errors.push('最大重试次数不能为负数');
    } else if (config.maxRetries > 10) {
      warnings.push('重试次数过多，可能导致长时间等待');
    }

    if (config.retryDelay < 0) {
      errors.push('重试延迟不能为负数');
    } else if (config.retryDelay > 60000) { // 60秒
      warnings.push('重试延迟过长，可能影响用户体验');
    }
  }

  /**
   * 验证安全配置
   */
  private static validateSecurityConfig(
    config: UnifiedUploadConfig,
    warnings: string[],
    recommendations: string[]
  ): void {
    // 病毒扫描建议
    if (!config.enableVirusScan && config.environment === 'production') {
      recommendations.push('生产环境建议启用病毒扫描');
    }

    // 内容验证建议
    if (!config.enableContentValidation) {
      recommendations.push('建议启用内容验证以提高安全性');
    }

    // 水印配置
    if (config.enableWatermark && config.environment === 'development') {
      warnings.push('开发环境启用水印可能影响调试');
    }
  }

  /**
   * 验证环境特定配置
   */
  private static validateEnvironmentSpecific(
    config: UnifiedUploadConfig,
    warnings: string[],
    recommendations: string[]
  ): void {
    switch (config.environment) {
      case 'development':
        if (config.enableDetailedLogging === false) {
          recommendations.push('开发环境建议启用详细日志');
        }
        if (config.maxFileSize > 100 * 1024 * 1024) { // 100MB
          warnings.push('开发环境文件大小限制过大');
        }
        break;

      case 'production':
        if (config.enableDetailedLogging === true) {
          warnings.push('生产环境启用详细日志可能影响性能');
        }
        if (config.logLevel === 'debug') {
          warnings.push('生产环境不建议使用debug日志级别');
        }
        if (!config.enableMetrics) {
          recommendations.push('生产环境建议启用性能监控');
        }
        break;

      case 'test':
        if (config.maxDailyUploads > 10) {
          recommendations.push('测试环境建议限制每日上传数量');
        }
        break;
    }
  }

  /**
   * 执行健康检查
   */
  static performHealthCheck(config: UnifiedUploadConfig): ConfigHealthCheck {
    console.log('🏥 执行配置健康检查');
    
    const issues: ConfigHealthCheck['issues'] = [];
    
    // 验证配置
    const validation = this.validateConfig(config);
    
    // 添加错误作为严重问题
    validation.errors.forEach(error => {
      issues.push({
        severity: 'critical',
        message: error
      });
    });

    // 添加警告作为中等问题
    validation.warnings.forEach(warning => {
      issues.push({
        severity: 'medium',
        message: warning
      });
    });

    // 性能检查
    const performanceIssues = this.checkPerformanceIssues(config);
    issues.push(...performanceIssues);

    // 安全检查
    const securityIssues = this.checkSecurityIssues(config);
    issues.push(...securityIssues);

    const healthy = issues.filter(issue => 
      issue.severity === 'critical' || issue.severity === 'high'
    ).length === 0;

    return {
      healthy,
      issues,
      performance: {
        memoryUsage: 0, // 需要实际测量
        cacheHitRate: 0, // 需要实际测量
        configLoadTime: 0 // 需要实际测量
      },
      lastCheck: new Date()
    };
  }

  /**
   * 检查性能问题
   */
  private static checkPerformanceIssues(config: UnifiedUploadConfig): ConfigHealthCheck['issues'] {
    const issues: ConfigHealthCheck['issues'] = [];

    // 检查内存配置
    if (config.maxMemoryUsage > 1024 * 1024 * 1024) { // 1GB
      issues.push({
        severity: 'medium',
        message: '内存使用限制过高，可能影响系统稳定性',
        suggestion: '建议将内存限制设置在1GB以内'
      });
    }

    // 检查分片配置
    if (config.chunkSize * config.maxConcurrentChunks > config.maxMemoryUsage) {
      issues.push({
        severity: 'high',
        message: '分片配置可能导致内存溢出',
        suggestion: '减少分片大小或并发数量'
      });
    }

    return issues;
  }

  /**
   * 检查安全问题
   */
  private static checkSecurityIssues(config: UnifiedUploadConfig): ConfigHealthCheck['issues'] {
    const issues: ConfigHealthCheck['issues'] = [];

    // 检查MIME类型配置
    if (config.allowedMimeTypes.includes('*')) {
      issues.push({
        severity: 'high',
        message: '允许所有文件类型存在安全风险',
        suggestion: '限制允许的文件类型'
      });
    }

    // 检查文件大小限制
    if (config.maxFileSize > 1024 * 1024 * 1024) { // 1GB
      issues.push({
        severity: 'medium',
        message: '文件大小限制过大，可能被滥用',
        suggestion: '根据实际需求调整文件大小限制'
      });
    }

    return issues;
  }

  /**
   * 验证域名格式
   */
  private static isValidDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain) || domain === 'localhost';
  }

  /**
   * 验证MIME类型格式
   */
  private static isValidMimeType(mimeType: string): boolean {
    const mimeTypeRegex = /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/;
    return mimeTypeRegex.test(mimeType);
  }
}
