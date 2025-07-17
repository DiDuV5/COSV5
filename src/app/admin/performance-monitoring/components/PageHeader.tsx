/**
 * @fileoverview 性能监控页面头部组件
 * @description 包含标题、时间范围选择、导出和刷新功能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */
"use client";


import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Download } from "lucide-react";
import { TIME_RANGES, UPDATE_INTERVALS } from '../constants';
import { UpdateInterval, ExportFormat } from '../types';

interface PageHeaderProps {
  selectedTimeRange: number;
  updateInterval: UpdateInterval;
  isRefreshing: boolean;
  isLoadingReport: boolean;
  onTimeRangeChange: (value: number) => void;
  onUpdateIntervalChange: (interval: UpdateInterval) => void;
  onRefresh: () => void;
  onExport: (format: ExportFormat) => void;
}

export function PageHeader({
  selectedTimeRange,
  updateInterval,
  isRefreshing,
  isLoadingReport,
  onTimeRangeChange,
  onUpdateIntervalChange,
  onRefresh,
  onExport,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
      {/* 页面标题 */}
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 truncate">
          数据库性能监控
        </h1>
        <p className="text-gray-600 mt-1 text-sm md:text-base">
          实时监控数据库性能指标，分析查询效率和系统健康状况
        </p>
      </div>

      {/* 操作区域 */}
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        {/* 时间范围选择 */}
        <Select
          value={selectedTimeRange.toString()}
          onValueChange={(value) => onTimeRangeChange(Number(value))}
        >
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value.toString()}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 实时更新间隔选择 */}
        <Select
          value={updateInterval.toString()}
          onValueChange={(value) => onUpdateIntervalChange(Number(value) as UpdateInterval)}
        >
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UPDATE_INTERVALS.map((interval) => (
              <SelectItem key={interval.value} value={interval.value.toString()}>
                {interval.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 导出按钮 */}
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport('json')}
            disabled={isLoadingReport}
            className="flex-1 sm:flex-none"
          >
            <Download className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">JSON</span>
            <span className="sm:hidden">JSON</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport('markdown')}
            disabled={isLoadingReport}
            className="flex-1 sm:flex-none"
          >
            <Download className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">MD</span>
            <span className="sm:hidden">MD</span>
          </Button>
        </div>

        {/* 刷新按钮 */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 mr-1 sm:mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">刷新</span>
          <span className="sm:hidden">刷新</span>
        </Button>
      </div>
    </div>
  );
}
