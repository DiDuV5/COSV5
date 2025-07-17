/**
 * @fileoverview 数据清理工具函数
 * @description 敏感数据清理和参数标准化工具
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { SENSITIVE_FIELDS } from '../constants';

/**
 * 清理敏感参数
 * @param params 原始参数
 * @returns 清理后的参数
 */
export const sanitizeParams = (params: any): any => {
  if (!params || typeof params !== 'object') {
    return params;
  }

  const sanitized = { ...params };

  const sanitizeObject = (obj: any): any => {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const result = Array.isArray(obj) ? [] : {};

    Object.keys(obj).forEach(key => {
      const lowerKey = key.toLowerCase();

      if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
        (result as any)[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        (result as any)[key] = sanitizeObject(obj[key]);
      } else {
        (result as any)[key] = obj[key];
      }
    });

    return result;
  };

  return sanitizeObject(sanitized);
};

/**
 * 标准化参数（移除具体值，保留结构）
 * @param params 原始参数
 * @returns 标准化后的参数
 */
export const normalizeParams = (params: any): any => {
  if (!params || typeof params !== 'object') {
    return {};
  }

  const normalized: any = {};

  Object.keys(params).forEach(key => {
    const value = params[key];

    if (value === null || value === undefined) {
      normalized[key] = null;
    } else if (typeof value === 'object') {
      normalized[key] = normalizeParams(value);
    } else {
      normalized[key] = typeof value;
    }
  });

  return normalized;
};
