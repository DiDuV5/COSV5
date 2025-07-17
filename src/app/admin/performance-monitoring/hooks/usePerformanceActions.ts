'use client';

/**
 * @fileoverview 性能监控操作Hook
 * @description 管理性能监控页面的操作逻辑
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { useState } from 'react';
import { toast } from "@/components/ui/use-toast";
import {
  UsePerformanceActionsReturn,
  ExportFormat,
  UpdateInterval,
  PerformanceReportData,
  UsePerformanceDataReturn
} from '../types';
import { ReportUtils } from '../utils/reportUtils';
import { EXPORT_FILENAME_TEMPLATES } from '../constants';

/**
 * 性能监控操作Hook
 * @param performanceData 性能数据Hook返回值
 * @param updateRealTimeConfig 更新实时配置函数
 * @returns 操作函数和状态
 */
export function usePerformanceActions(
  performanceData: UsePerformanceDataReturn,
  updateRealTimeConfig?: (config: { updateInterval: number }) => void
): UsePerformanceActionsReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  /**
   * 手动刷新所有数据
   */
  const handleRefresh = async (): Promise<void> => {
    setIsRefreshing(true);
    try {
      await performanceData.refetchAll();
      setLastUpdated(new Date());
      toast({
        title: "刷新成功",
        description: "性能监控数据已更新",
      });
    } catch (error) {
      toast({
        title: "刷新失败",
        description: "无法获取最新的性能数据",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * 更新刷新间隔
   * @param newInterval 新的刷新间隔
   */
  const handleUpdateInterval = (newInterval: UpdateInterval): void => {
    if (updateRealTimeConfig) {
      updateRealTimeConfig({ updateInterval: newInterval });
    }
    toast({
      title: "更新成功",
      description: `刷新间隔已设置为 ${newInterval / 1000} 秒`,
    });
  };

  /**
   * 导出数据
   * @param format 导出格式
   */
  const handleExport = async (format: ExportFormat): Promise<void> => {
    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'markdown') {
        // 生成Markdown格式的报告
        if (!performanceData.performanceReport?.data) {
          throw new Error('没有可用的性能报告数据');
        }

        // 验证报告数据
        const validation = ReportUtils.validateReportData(performanceData.performanceReport.data);
        if (!validation.isValid) {
          throw new Error(`报告数据验证失败: ${validation.errors.join(', ')}`);
        }

        content = ReportUtils.generateMarkdownContent(performanceData.performanceReport.data);
        filename = ReportUtils.generateFilename(EXPORT_FILENAME_TEMPLATES.PERFORMANCE_REPORT_MD);
        mimeType = ReportUtils.getMimeType('markdown');
      } else {
        // 导出JSON格式的数据
        const exportData = {
          timestamp: new Date().toISOString(),
          realTimeMetrics: performanceData.realTimeMetrics?.data,
          performanceStats: performanceData.performanceStats?.data,
          performanceReport: performanceData.performanceReport?.data,
          modelStats: performanceData.modelStats?.data,
        };

        content = ReportUtils.generateJsonContent(exportData);
        filename = ReportUtils.generateFilename(EXPORT_FILENAME_TEMPLATES.PERFORMANCE_DATA_JSON);
        mimeType = ReportUtils.getMimeType('json');
      }

      // 下载文件
      ReportUtils.downloadFile(content, filename, mimeType);

      toast({
        title: "导出成功",
        description: `性能数据已导出为 ${format.toUpperCase()} 格式`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast({
        title: "导出失败",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return {
    isRefreshing,
    lastUpdated,
    handleRefresh,
    handleUpdateInterval,
    handleExport,
  };
}
