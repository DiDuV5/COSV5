/**
 * @fileoverview 环境变量管理器统一导出
 * @description 统一导出所有环境变量管理相关的类型、函数和类，保持向后兼容性
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

// 导出所有类型和接口
export * from './env-types';

// 导出核心管理器类
export { EnvManager } from './env-manager-core';

// 导出模板功能
export {
  getP0Templates,
  getP1Templates,
  getAllTemplates,
} from './env-templates';

// 导出迁移功能
export {
  createMigrationMap,
  migrateToCoserEdenPrefix,
  needsMigration,
  generateMigrationPreview,
} from './env-migration';

// 导出安全扫描功能
export {
  performSecurityScan,
  checkPasswordSecurity,
  checkSecretSecurity,
  checkInsecureDefaults,
  calculateSecurityScore,
  isPasswordField,
  isSecretField,
  maskSensitiveValue,
} from './env-security';

// 导出工具函数
export {
  readEnvFile,
  updateEnvFile,
  compareEnvironments,
  compareEnvVars,
  validateEnvFile,
  formatEnvContent,
  fileExists,
  createBackup,
} from './env-utils';

// 为了保持完全的向后兼容性，创建默认导出
const envManager = () => import('./env-manager-core').then(m => m.EnvManager.getInstance());

export default envManager;
