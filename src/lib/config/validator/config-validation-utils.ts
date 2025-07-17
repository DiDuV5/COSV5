/**
 * @fileoverview 配置验证工具函数
 * @description 提供配置验证相关的工具函数，包括类型验证、安全检查等
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

import type { ConfigValidationRule, ConfigError, ConfigWarning, ConfigSuggestion } from './config-validation-types';

/**
 * 类型验证结果
 */
export interface TypeValidationResult {
  isValid: boolean;
  suggestion?: string;
}

/**
 * 规则验证结果
 */
export interface RuleValidationResult {
  errors: ConfigError[];
  warnings: ConfigWarning[];
  suggestions: ConfigSuggestion[];
}

/**
 * 验证单个规则
 */
export function validateRule(rule: ConfigValidationRule): RuleValidationResult {
  const errors: ConfigError[] = [];
  const warnings: ConfigWarning[] = [];
  const suggestions: ConfigSuggestion[] = [];

  // 获取环境变量值（支持双前缀）
  const value = process.env[`COSEREEDEN_${rule.field}`] || process.env[rule.field];
  const nodeEnv = process.env.NODE_ENV || 'development';

  // 检查必需字段
  const envSpecific = rule.environmentSpecific?.[nodeEnv as keyof typeof rule.environmentSpecific];
  const isRequired = envSpecific?.required ?? rule.required;

  if (isRequired && !value) {
    errors.push({
      code: 'REQUIRED_FIELD_MISSING',
      message: `必需的配置字段缺失: ${rule.field}`,
      field: rule.field,
      fixSuggestion: `请设置环境变量 COSEREEDEN_${rule.field} 或 ${rule.field}`,
    });
    return { errors, warnings, suggestions };
  }

  if (!value) {
    // 如果不是必需字段但有默认值，提供建议
    const defaultValue = envSpecific?.defaultValue ?? rule.defaultValue;
    if (defaultValue) {
      suggestions.push({
        code: 'DEFAULT_VALUE_AVAILABLE',
        message: `字段 ${rule.field} 未设置，将使用默认值`,
        field: rule.field,
        recommendedValue: defaultValue,
        reason: '提供默认值以确保配置明确',
      });
    }
    return { errors, warnings, suggestions };
  }

  // 类型验证
  const typeValidation = validateType(value, rule.type);
  if (!typeValidation.isValid) {
    errors.push({
      code: 'INVALID_TYPE',
      message: `字段 ${rule.field} 类型错误`,
      field: rule.field,
      value,
      expectedType: rule.type,
      fixSuggestion: typeValidation.suggestion,
    });
    return { errors, warnings, suggestions };
  }

  // 范围验证
  if (rule.type === 'number') {
    const numValue = parseInt(value);
    if (rule.min !== undefined && numValue < rule.min) {
      errors.push({
        code: 'VALUE_TOO_SMALL',
        message: `字段 ${rule.field} 值过小`,
        field: rule.field,
        value,
        expectedRange: `>= ${rule.min}`,
        fixSuggestion: `请设置大于等于 ${rule.min} 的值`,
      });
    }
    if (rule.max !== undefined && numValue > rule.max) {
      errors.push({
        code: 'VALUE_TOO_LARGE',
        message: `字段 ${rule.field} 值过大`,
        field: rule.field,
        value,
        expectedRange: `<= ${rule.max}`,
        fixSuggestion: `请设置小于等于 ${rule.max} 的值`,
      });
    }
  }

  // 模式验证
  if (rule.pattern && !rule.pattern.test(value)) {
    errors.push({
      code: 'PATTERN_MISMATCH',
      message: `字段 ${rule.field} 格式不正确`,
      field: rule.field,
      value,
      fixSuggestion: `请确保值匹配模式: ${rule.pattern.source}`,
    });
  }

  // 允许值验证
  if (rule.allowedValues && !rule.allowedValues.includes(value)) {
    errors.push({
      code: 'INVALID_VALUE',
      message: `字段 ${rule.field} 值不在允许范围内`,
      field: rule.field,
      value,
      fixSuggestion: `请使用以下值之一: ${rule.allowedValues.join(', ')}`,
    });
  }

  // 安全敏感字段检查
  if (rule.securitySensitive) {
    checkSecuritySensitiveField(rule.field, value, warnings, suggestions);
  }

  return { errors, warnings, suggestions };
}

/**
 * 类型验证
 */
export function validateType(value: string, type: ConfigValidationRule['type']): TypeValidationResult {
  switch (type) {
    case 'string':
      return { isValid: true };

    case 'number':
      const isNumber = !isNaN(parseInt(value));
      return {
        isValid: isNumber,
        suggestion: isNumber ? undefined : '请提供有效的数字值',
      };

    case 'boolean':
      const validBooleans = ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'];
      return {
        isValid: validBooleans.includes(value.toLowerCase()),
        suggestion: `请使用以下值之一: ${validBooleans.join(', ')}`,
      };

    case 'url':
      try {
        new URL(value);
        return { isValid: true };
      } catch {
        return {
          isValid: false,
          suggestion: '请提供有效的URL格式，如: https://example.com',
        };
      }

    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return {
        isValid: emailRegex.test(value),
        suggestion: '请提供有效的邮箱地址格式',
      };

    case 'json':
      try {
        JSON.parse(value);
        return { isValid: true };
      } catch {
        return {
          isValid: false,
          suggestion: '请提供有效的JSON格式',
        };
      }

    default:
      return { isValid: true };
  }
}

/**
 * 检查安全敏感字段
 */
export function checkSecuritySensitiveField(
  field: string,
  value: string,
  warnings: ConfigWarning[],
  suggestions: ConfigSuggestion[]
): void {
  // 检查密码强度
  if (field.toLowerCase().includes('password') || field.toLowerCase().includes('secret')) {
    if (value.length < 16) {
      warnings.push({
        code: 'WEAK_PASSWORD',
        message: `字段 ${field} 密码强度不足`,
        field,
        recommendation: '建议使用至少16个字符的强密码',
      });
    }

    if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/[0-9]/.test(value)) {
      suggestions.push({
        code: 'PASSWORD_COMPLEXITY',
        message: `字段 ${field} 建议包含大小写字母和数字`,
        field,
        reason: '提高密码安全性',
      });
    }
  }

  // 检查是否包含明显的测试值
  const testValues = ['test', 'demo', 'example', 'localhost', '127.0.0.1'];
  if (testValues.some(testValue => value.toLowerCase().includes(testValue))) {
    if (process.env.NODE_ENV === 'production') {
      warnings.push({
        code: 'TEST_VALUE_IN_PRODUCTION',
        message: `字段 ${field} 在生产环境中包含测试值`,
        field,
        recommendation: '请在生产环境中使用真实的配置值',
      });
    }
  }
}

/**
 * 检查依赖关系
 */
export function checkDependencies(
  rules: ConfigValidationRule[],
  errors: ConfigError[]
): void {
  for (const rule of rules) {
    if (!rule.dependencies) continue;

    const value = process.env[`COSEREEDEN_${rule.field}`] || process.env[rule.field];
    if (!value) continue;

    for (const dependency of rule.dependencies) {
      const depValue = process.env[`COSEREEDEN_${dependency}`] || process.env[dependency];
      if (!depValue) {
        errors.push({
          code: 'DEPENDENCY_MISSING',
          message: `字段 ${rule.field} 依赖于 ${dependency}，但 ${dependency} 未设置`,
          field: rule.field,
          fixSuggestion: `请设置环境变量 COSEREEDEN_${dependency} 或 ${dependency}`,
        });
      }
    }
  }
}

/**
 * 检查冲突
 */
export function checkConflicts(
  rules: ConfigValidationRule[],
  warnings: ConfigWarning[]
): void {
  for (const rule of rules) {
    if (!rule.conflicts) continue;

    const value = process.env[`COSEREEDEN_${rule.field}`] || process.env[rule.field];
    if (!value) continue;

    for (const conflict of rule.conflicts) {
      const conflictValue = process.env[`COSEREEDEN_${conflict}`] || process.env[conflict];
      if (conflictValue) {
        warnings.push({
          code: 'CONFIGURATION_CONFLICT',
          message: `字段 ${rule.field} 与 ${conflict} 存在冲突`,
          field: rule.field,
          recommendation: `请检查 ${rule.field} 和 ${conflict} 的配置是否兼容`,
        });
      }
    }
  }
}
