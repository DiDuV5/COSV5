/**
 * @fileoverview 安全监控仪表板主组件
 * @description 提供向后兼容的统一导出接口
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

'use client';

import React from 'react';
import { SecurityDashboardHeader } from './security-dashboard-header';
import { SecurityOverviewCards } from './security-overview-cards';
import { SecurityTabs } from './security-tabs';
import { useSecurityDashboard, useSecurityUtils } from './security-dashboard-hooks';

// 导出所有类型
export * from './types';

// 导出所有子组件
export { SecurityDashboardHeader } from './security-dashboard-header';
export { SecurityOverviewCards } from './security-overview-cards';
export { SecurityTabs } from './security-tabs';
export { useSecurityDashboard, useSecurityUtils } from './security-dashboard-hooks';

/**
 * 安全监控仪表板主组件
 */
export default function SecurityDashboard() {
  const {
    securityStatus,
    vulnerabilities,
    loading,
    scanning,
    lastUpdate,
    fetchSecurityStatus,
    performSecurityScan,
    exportSecurityReport
  } = useSecurityDashboard();

  const {
    getRiskLevelColor,
    getSecurityScoreColor
  } = useSecurityUtils();

  // 检查是否有错误状态
  const hasError = !loading && !securityStatus;

  return (
    <div className="space-y-6">
      {/* 头部控制 */}
      <SecurityDashboardHeader
        lastUpdate={lastUpdate}
        scanning={scanning}
        loading={loading && !securityStatus}
        onScan={performSecurityScan}
        onExport={exportSecurityReport}
        onRetry={fetchSecurityStatus}
        hasError={hasError}
      />

      {/* 如果有安全状态数据，显示内容 */}
      {securityStatus && (
        <>
          {/* 安全概览卡片 */}
          <SecurityOverviewCards
            securityStatus={securityStatus}
            getSecurityScoreColor={getSecurityScoreColor}
          />

          {/* 详细信息标签页 */}
          <SecurityTabs
            securityStatus={securityStatus}
            vulnerabilities={vulnerabilities}
            getRiskLevelColor={getRiskLevelColor}
          />
        </>
      )}
    </div>
  );
}
