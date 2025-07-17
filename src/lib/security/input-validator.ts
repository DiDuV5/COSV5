/**
 * 输入验证和清理工具
 * 用于防止SQL注入、XSS和其他安全漏洞
 */

import { TRPCErrorHandler } from '../errors/trpc-error-handler';

/**
 * 输入验证配置接口
 */
export interface ValidationConfig {
  /** 最大长度 */
  maxLength?: number;
  /** 最小长度 */
  minLength?: number;
  /** 允许的字符模式 */
  allowedPattern?: RegExp;
  /** 是否允许HTML */
  allowHtml?: boolean;
  /** 是否允许特殊字符 */
  allowSpecialChars?: boolean;
  /** 自定义验证函数 */
  customValidator?: (value: string) => boolean;
}

/**
 * 预定义的验证配置
 */
export const VALIDATION_PRESETS = {
  /** 用户名验证 */
  USERNAME: {
    maxLength: 50,
    minLength: 3,
    allowedPattern: /^[a-zA-Z0-9_-]+$/,
    allowHtml: false,
    allowSpecialChars: false,
  },

  /** 搜索词验证 */
  SEARCH_TERM: {
    maxLength: 100,
    minLength: 1,
    allowHtml: false,
    allowSpecialChars: false,
  },

  /** 邮箱验证 */
  EMAIL: {
    maxLength: 254,
    minLength: 5,
    allowedPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    allowHtml: false,
    allowSpecialChars: false,
  },

  /** 数据库标识符验证（表名、列名等） */
  DB_IDENTIFIER: {
    maxLength: 63,
    minLength: 1,
    allowedPattern: /^[a-zA-Z0-9_]+$/,
    allowHtml: false,
    allowSpecialChars: false,
  },

  /** 内容文本验证 */
  CONTENT_TEXT: {
    maxLength: 10000,
    minLength: 1,
    allowHtml: false,
    allowSpecialChars: true,
  },
} as const;

/**
 * 输入验证器类
 */
export class InputValidator {
  /**
   * 验证和清理字符串输入
   */
  static validateAndSanitize(
    input: string,
    config: ValidationConfig = {}
  ): string {
    if (typeof input !== 'string') {
      throw TRPCErrorHandler.validationError('输入必须是字符串类型');
    }

    // 基础清理
    let sanitized = input.trim();

    // 长度验证
    if (config.minLength !== undefined && sanitized.length < config.minLength) {
      throw TRPCErrorHandler.validationError(
        `输入长度不能少于${config.minLength}个字符`
      );
    }

    if (config.maxLength !== undefined && sanitized.length > config.maxLength) {
      throw TRPCErrorHandler.validationError(
        `输入长度不能超过${config.maxLength}个字符`
      );
    }

    // HTML清理
    if (!config.allowHtml) {
      sanitized = this.removeHtmlTags(sanitized);
    }

    // 特殊字符清理
    if (!config.allowSpecialChars) {
      sanitized = this.removeDangerousChars(sanitized);
    }

    // 模式验证
    if (config.allowedPattern && !config.allowedPattern.test(sanitized)) {
      throw TRPCErrorHandler.validationError('输入包含不允许的字符');
    }

    // 自定义验证
    if (config.customValidator && !config.customValidator(sanitized)) {
      throw TRPCErrorHandler.validationError('输入验证失败');
    }

    return sanitized;
  }

  /**
   * 验证数字输入
   */
  static validateNumber(
    input: number,
    options: {
      min?: number;
      max?: number;
      integer?: boolean;
    } = {}
  ): number {
    if (typeof input !== 'number' || isNaN(input)) {
      throw TRPCErrorHandler.validationError('输入必须是有效数字');
    }

    if (options.integer && !Number.isInteger(input)) {
      throw TRPCErrorHandler.validationError('输入必须是整数');
    }

    if (options.min !== undefined && input < options.min) {
      throw TRPCErrorHandler.validationError(`数值不能小于${options.min}`);
    }

    if (options.max !== undefined && input > options.max) {
      throw TRPCErrorHandler.validationError(`数值不能大于${options.max}`);
    }

    return input;
  }

  /**
   * 验证数组输入
   */
  static validateArray<T>(
    input: T[],
    options: {
      maxLength?: number;
      minLength?: number;
      itemValidator?: (item: T) => T;
    } = {}
  ): T[] {
    if (!Array.isArray(input)) {
      throw TRPCErrorHandler.validationError('输入必须是数组类型');
    }

    if (options.minLength !== undefined && input.length < options.minLength) {
      throw TRPCErrorHandler.validationError(
        `数组长度不能少于${options.minLength}个元素`
      );
    }

    if (options.maxLength !== undefined && input.length > options.maxLength) {
      throw TRPCErrorHandler.validationError(
        `数组长度不能超过${options.maxLength}个元素`
      );
    }

    if (options.itemValidator) {
      return input.map(options.itemValidator);
    }

    return input;
  }

  /**
   * 移除HTML标签
   */
  private static removeHtmlTags(input: string): string {
    return input.replace(/<[^>]*>/g, '');
  }

  /**
   * 移除危险字符
   */
  private static removeDangerousChars(input: string): string {
    return input
      .replace(/[<>'"&]/g, '') // HTML/XML特殊字符
      .replace(/[{}[\]]/g, '') // JSON特殊字符
      .replace(/[;\-]{2,}/g, '') // SQL注释字符（连续的分号或连字符）
      .replace(/[\x00-\x1f\x7f]/g, ''); // 控制字符
  }

  /**
   * 验证SQL标识符（表名、列名等）
   */
  static validateSqlIdentifier(identifier: string): string {
    return this.validateAndSanitize(identifier, VALIDATION_PRESETS.DB_IDENTIFIER);
  }

  /**
   * 验证搜索词
   */
  static validateSearchTerm(searchTerm: string): string {
    return this.validateAndSanitize(searchTerm, VALIDATION_PRESETS.SEARCH_TERM);
  }

  /**
   * 验证用户名
   */
  static validateUsername(username: string): string {
    return this.validateAndSanitize(username, VALIDATION_PRESETS.USERNAME);
  }

  /**
   * 验证邮箱
   */
  static validateEmail(email: string): string {
    return this.validateAndSanitize(email, VALIDATION_PRESETS.EMAIL);
  }

  /**
   * 验证分页参数
   */
  static validatePaginationParams(params: {
    limit?: number;
    offset?: number;
    cursor?: string;
  }): {
    limit: number;
    offset: number;
    cursor?: string;
  } {
    const limit = params.limit
      ? this.validateNumber(params.limit, { min: 1, max: 100, integer: true })
      : 20;

    const offset = params.offset
      ? this.validateNumber(params.offset, { min: 0, integer: true })
      : 0;

    const cursor = params.cursor
      ? this.validateAndSanitize(params.cursor, { maxLength: 100 })
      : undefined;

    return { limit, offset, cursor };
  }
}

/**
 * 装饰器：自动验证函数参数
 */
export function ValidateInput(config: ValidationConfig) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      // 验证第一个参数（通常是输入参数）
      if (args.length > 0 && typeof args[0] === 'string') {
        args[0] = InputValidator.validateAndSanitize(args[0], config);
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
