/**
 * @fileoverview 安全审计系统统一导出
 * @description 提供向后兼容的统一导出接口
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

// 导出所有类型定义
export * from './types';

// 导出核心功能
export { SecurityAuditCore, securityAuditCore } from './audit-core';
export { VulnerabilityScanner, vulnerabilityScanner } from './vulnerability-scanner';
export { SecurityHelpers, securityHelpers } from './security-helpers';

// 为了保持100%向后兼容性，重新导出原始的SecurityAuditSystem类
import { securityAuditCore } from './audit-core';

/**
 * 安全审计系统（向后兼容类）
 * @deprecated 建议使用新的模块化API
 */
export class SecurityAuditSystem {
  private auditCore = securityAuditCore;

  /**
   * 执行完整安全审计
   */
  async performFullSecurityAudit() {
    return this.auditCore.performFullSecurityAudit();
  }

  /**
   * 获取审计历史
   */
  getAuditHistory() {
    return this.auditCore.getAuditHistory();
  }

  /**
   * 获取最新审计结果
   */
  getLatestAuditResult() {
    return this.auditCore.getLatestAuditResult();
  }
}

// 创建默认实例以保持向后兼容
export const securityAuditSystem = new SecurityAuditSystem();
