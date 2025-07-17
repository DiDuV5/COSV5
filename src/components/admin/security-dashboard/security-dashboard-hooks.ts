/**
 * @fileoverview 安全监控仪表板自定义Hook
 * @description 提供安全监控相关的业务逻辑和状态管理
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';
import { SecurityStatus, VulnerabilityDetail, SecurityDashboardState } from './types';

/**
 * 安全监控仪表板Hook
 */
export function useSecurityDashboard() {
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<VulnerabilityDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  /**
   * 获取安全状态
   */
  const fetchSecurityStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/security/status');
      if (response.ok) {
        const data = await response.json();
        setSecurityStatus(data.status);
        setVulnerabilities(data.vulnerabilities || []);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('获取安全状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 执行安全扫描
   */
  const performSecurityScan = async () => {
    try {
      setScanning(true);
      const response = await fetch('/api/admin/security/scan', {
        method: 'POST'
      });
      if (response.ok) {
        await fetchSecurityStatus();
      }
    } catch (error) {
      console.error('安全扫描失败:', error);
    } finally {
      setScanning(false);
    }
  };

  /**
   * 导出安全报告
   */
  const exportSecurityReport = async () => {
    try {
      const response = await fetch('/api/admin/security/report');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-report-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('导出安全报告失败:', error);
    }
  };

  useEffect(() => {
    fetchSecurityStatus();
  }, []);

  return {
    securityStatus,
    vulnerabilities,
    loading,
    scanning,
    lastUpdate,
    fetchSecurityStatus,
    performSecurityScan,
    exportSecurityReport
  };
}

/**
 * 安全工具函数Hook
 */
export function useSecurityUtils() {
  /**
   * 获取风险等级颜色
   */
  const getRiskLevelColor = (level: string): string => {
    switch (level) {
      case 'CRITICAL': return 'text-red-600 bg-red-50';
      case 'HIGH': return 'text-orange-600 bg-orange-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
      case 'LOW': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  /**
   * 获取安全评分颜色
   */
  const getSecurityScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  return {
    getRiskLevelColor,
    getSecurityScoreColor
  };
}
