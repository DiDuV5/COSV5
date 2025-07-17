/**
 * @fileoverview 配置验证器统一导出
 * @description 统一导出所有配置验证相关的类型、函数和类，保持向后兼容性
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

// 导出所有类型和接口
export * from './config-validation-types';

// 导出核心验证器类
export { ConfigValidator } from './config-validator-core';

// 导出工具函数
export {
  validateRule,
  validateType,
  checkSecuritySensitiveField,
  checkDependencies,
  checkConflicts,
  type TypeValidationResult,
  type RuleValidationResult,
} from './config-validation-utils';

// 导出验证规则
export {
  getRedisValidationRules,
  getDatabaseValidationRules,
  getStorageValidationRules,
  getEmailValidationRules,
  getSecurityValidationRules,
  getAuthValidationRules,
} from './config-validation-rules';

// 导出报告生成功能
export {
  generateValidationReport,
  formatValidationReport,
  generateValidationSummary,
} from './config-validation-report';

// 为了保持完全的向后兼容性，创建默认导出
const validator = () => import('./config-validator-core').then(m => m.ConfigValidator.getInstance());

export default validator;
