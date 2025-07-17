/**
 * @fileoverview 配置验证器
 * @description 负责验证上传配置的有效性
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import type {
  UploadConfig,
  ConfigValidationResult,
  ConfigUpdateOptions
} from '../types/upload-config-types';

/**
 * 配置验证器类
 */
export class ConfigValidator {
  private static instance: ConfigValidator;

  // 支持的文件类型
  private readonly SUPPORTED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'video/ogg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'application/pdf',
    'text/plain',
    'application/json',
    'application/xml'
  ];

  // 最大文件大小限制 (100MB)
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024;

  // 最小文件大小限制 (1KB)
  private readonly MIN_FILE_SIZE = 1024;

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): ConfigValidator {
    if (!ConfigValidator.instance) {
      ConfigValidator.instance = new ConfigValidator();
    }
    return ConfigValidator.instance;
  }

  /**
   * 验证配置
   */
  async validateConfig(
    config: UploadConfig,
    options: ConfigUpdateOptions = {}
  ): Promise<ConfigValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 基本字段验证
      this.validateBasicFields(config, errors);

      // 文件大小验证
      this.validateFileSize(config, errors, warnings);

      // 文件类型验证
      this.validateFileTypes(config, errors, warnings);

      // 路径验证
      this.validateUploadPath(config, errors, warnings);

      // 名称验证
      this.validateName(config, errors, warnings);

      // 描述验证
      this.validateDescription(config, warnings);

      // 安全性验证
      await this.validateSecurity(config, errors, warnings);

      // 性能验证
      this.validatePerformance(config, warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      errors.push(`验证过程中发生错误: ${error instanceof Error ? error.message : '未知错误'}`);

      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * 验证基本字段
   */
  private validateBasicFields(config: UploadConfig, errors: string[]): void {
    if (!config.id || typeof config.id !== 'string' || config.id.trim() === '') {
      errors.push('配置ID不能为空');
    }

    if (!config.name || typeof config.name !== 'string' || config.name.trim() === '') {
      errors.push('配置名称不能为空');
    }

    if (typeof config.isActive !== 'boolean') {
      errors.push('isActive字段必须是布尔值');
    }

    if (!config.createdAt || !(config.createdAt instanceof Date)) {
      errors.push('创建时间必须是有效的日期');
    }

    if (!config.updatedAt || !(config.updatedAt instanceof Date)) {
      errors.push('更新时间必须是有效的日期');
    }
  }

  /**
   * 验证文件大小
   */
  private validateFileSize(config: UploadConfig, errors: string[], warnings: string[]): void {
    if (typeof config.maxFileSize !== 'number' || config.maxFileSize <= 0) {
      errors.push('最大文件大小必须是正数');
      return;
    }

    if (config.maxFileSize < this.MIN_FILE_SIZE) {
      errors.push(`最大文件大小不能小于 ${this.MIN_FILE_SIZE} 字节`);
    }

    if (config.maxFileSize > this.MAX_FILE_SIZE) {
      errors.push(`最大文件大小不能超过 ${this.MAX_FILE_SIZE} 字节`);
    }

    // 警告：文件大小过大可能影响性能
    if (config.maxFileSize > 50 * 1024 * 1024) { // 50MB
      warnings.push('文件大小超过50MB可能影响上传性能');
    }
  }

  /**
   * 验证文件类型
   */
  private validateFileTypes(config: UploadConfig, errors: string[], warnings: string[]): void {
    if (!Array.isArray(config.allowedTypes)) {
      errors.push('允许的文件类型必须是数组');
      return;
    }

    if (config.allowedTypes.length === 0) {
      errors.push('至少需要指定一种允许的文件类型');
      return;
    }

    const invalidTypes: string[] = [];
    const deprecatedTypes: string[] = [];

    for (const type of config.allowedTypes) {
      if (typeof type !== 'string' || type.trim() === '') {
        errors.push('文件类型必须是非空字符串');
        continue;
      }

      if (!this.SUPPORTED_MIME_TYPES.includes(type)) {
        invalidTypes.push(type);
      }

      // 检查已弃用的类型
      if (type === 'image/jpg') {
        deprecatedTypes.push(type);
      }
    }

    if (invalidTypes.length > 0) {
      warnings.push(`以下文件类型可能不被支持: ${invalidTypes.join(', ')}`);
    }

    if (deprecatedTypes.length > 0) {
      warnings.push(`以下文件类型已弃用，建议使用标准MIME类型: ${deprecatedTypes.join(', ')}`);
    }
  }

  /**
   * 验证上传路径
   */
  private validateUploadPath(config: UploadConfig, errors: string[], warnings: string[]): void {
    if (!config.uploadPath || typeof config.uploadPath !== 'string') {
      errors.push('上传路径不能为空');
      return;
    }

    const path = config.uploadPath.trim();

    if (path === '') {
      errors.push('上传路径不能为空');
      return;
    }

    // 检查路径格式
    if (!path.startsWith('/')) {
      errors.push('上传路径必须以 / 开头');
    }

    // 检查危险路径
    const dangerousPaths = ['/etc', '/var', '/usr', '/bin', '/sbin', '/root'];
    if (dangerousPaths.some(dangerous => path.startsWith(dangerous))) {
      errors.push('上传路径不能指向系统目录');
    }

    // 检查路径长度
    if (path.length > 255) {
      errors.push('上传路径长度不能超过255个字符');
    }

    // 检查特殊字符
    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(path)) {
      errors.push('上传路径包含无效字符');
    }

    // 警告：深层路径可能影响性能
    const pathDepth = path.split('/').length - 1;
    if (pathDepth > 5) {
      warnings.push('路径层级过深可能影响文件访问性能');
    }
  }

  /**
   * 验证名称
   */
  private validateName(config: UploadConfig, errors: string[], warnings: string[]): void {
    const name = config.name.trim();

    if (name.length < 2) {
      errors.push('配置名称至少需要2个字符');
    }

    if (name.length > 100) {
      errors.push('配置名称不能超过100个字符');
    }

    // 检查特殊字符
    const invalidChars = /[<>:"|?*\\\/]/;
    if (invalidChars.test(name)) {
      errors.push('配置名称包含无效字符');
    }

    // 检查是否全为数字
    if (/^\d+$/.test(name)) {
      warnings.push('建议配置名称包含字母以提高可读性');
    }
  }

  /**
   * 验证描述
   */
  private validateDescription(config: UploadConfig, warnings: string[]): void {
    if (config.description) {
      if (config.description.length > 500) {
        warnings.push('描述过长可能影响显示效果');
      }

      if (config.description.trim() === '') {
        warnings.push('描述为空，建议添加有意义的描述');
      }
    } else {
      warnings.push('建议添加配置描述以提高可维护性');
    }
  }

  /**
   * 验证安全性
   */
  private async validateSecurity(config: UploadConfig, errors: string[], warnings: string[]): Promise<void> {
    // 检查可执行文件类型
    const executableTypes = [
      'application/x-executable',
      'application/x-msdownload',
      'application/x-msdos-program',
      'application/x-sh',
      'text/x-script'
    ];

    const hasExecutableTypes = config.allowedTypes.some(type =>
      executableTypes.includes(type) || type.includes('script')
    );

    if (hasExecutableTypes) {
      errors.push('不允许上传可执行文件类型');
    }

    // 检查危险文件扩展名
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
    const pathContainsDangerous = dangerousExtensions.some(ext =>
      config.uploadPath.toLowerCase().includes(ext)
    );

    if (pathContainsDangerous) {
      warnings.push('上传路径包含可能的危险文件扩展名');
    }

    // 检查文件大小安全性
    if (config.maxFileSize > 10 * 1024 * 1024) { // 10MB
      warnings.push('大文件上传可能存在安全风险，建议启用病毒扫描');
    }
  }

  /**
   * 验证性能
   */
  private validatePerformance(config: UploadConfig, warnings: string[]): void {
    // 检查文件类型数量
    if (config.allowedTypes.length > 20) {
      warnings.push('允许的文件类型过多可能影响验证性能');
    }

    // 检查路径复杂度
    if (config.uploadPath.includes('..')) {
      warnings.push('路径包含相对路径符号可能影响安全性和性能');
    }

    // 检查名称复杂度
    if (config.name.length > 50) {
      warnings.push('配置名称过长可能影响界面显示');
    }
  }

  /**
   * 快速验证（仅检查关键字段）
   */
  async quickValidate(config: UploadConfig): Promise<boolean> {
    try {
      return !!(
        config.id &&
        config.name &&
        config.maxFileSize > 0 &&
        Array.isArray(config.allowedTypes) &&
        config.allowedTypes.length > 0 &&
        config.uploadPath &&
        typeof config.isActive === 'boolean'
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取支持的文件类型列表
   */
  getSupportedMimeTypes(): string[] {
    return [...this.SUPPORTED_MIME_TYPES];
  }

  /**
   * 获取文件大小限制
   */
  getFileSizeLimits() {
    return {
      min: this.MIN_FILE_SIZE,
      max: this.MAX_FILE_SIZE
    };
  }

  /**
   * 验证文件类型是否支持
   */
  isMimeTypeSupported(mimeType: string): boolean {
    return this.SUPPORTED_MIME_TYPES.includes(mimeType);
  }

  /**
   * 获取推荐的配置设置
   */
  getRecommendedSettings() {
    return {
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
      uploadPath: '/uploads/images',
      description: '请添加配置描述'
    };
  }

  /**
   * 静态验证配置方法
   */
  static async validateConfig(
    config: UploadConfig,
    options: ConfigUpdateOptions = {}
  ): Promise<ConfigValidationResult> {
    const instance = ConfigValidator.getInstance();
    return instance.validateConfig(config, options);
  }

  /**
   * 静态健康检查方法
   */
  static async performHealthCheck(config: UploadConfig): Promise<any> {
    const instance = ConfigValidator.getInstance();
    const validation = await instance.validateConfig(config);

    return {
      status: validation.isValid ? 'healthy' : 'error',
      lastChecked: new Date(),
      issues: validation.errors,
      recommendations: validation.warnings
    };
  }
}
