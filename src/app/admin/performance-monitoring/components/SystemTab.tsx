/**
 * @fileoverview 系统监控标签页组件
 * @description 显示系统资源使用情况和监控信息
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { SystemMonitor } from "./SystemMonitor";
import { MOCK_SYSTEM_DATA } from '../constants';

interface SystemTabProps {
  // 这里可以添加真实的系统监控数据props
  // 目前使用模拟数据
}

export function SystemTab({}: SystemTabProps) {
  return (
    <div className="space-y-6">
      {/* 系统监控组件 */}
      <SystemMonitor
        data={MOCK_SYSTEM_DATA as any}
        isLoading={false}
        showAlerts={true}
      />

      {/* 系统监控说明 */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>系统监控：</strong>
          实时监控服务器CPU、内存、磁盘和网络使用情况。
          当资源使用率超过90%时会显示告警信息。
        </AlertDescription>
      </Alert>
    </div>
  );
}
