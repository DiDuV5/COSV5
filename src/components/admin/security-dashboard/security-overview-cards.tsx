/**
 * @fileoverview 安全监控概览卡片组件
 * @description 提供安全状态概览和关键指标展示
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  AlertTriangle, 
  Lock,
  Key,
  Eye
} from 'lucide-react';
import { SecurityStatus } from './types';

interface SecurityOverviewCardsProps {
  securityStatus: SecurityStatus;
  getSecurityScoreColor: (score: number) => string;
}

/**
 * 安全评分卡片
 */
function SecurityScoreCard({ 
  securityStatus, 
  getSecurityScoreColor 
}: SecurityOverviewCardsProps) {
  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-6 w-6" />
          整体安全评分
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className={`text-4xl font-bold ${getSecurityScoreColor(securityStatus.overallScore)}`}>
            {securityStatus.overallScore}
          </div>
          <div className="flex-1">
            <Progress value={securityStatus.overallScore} className="h-3" />
            <p className="text-sm text-gray-600 mt-1">
              {securityStatus.overallScore >= 90 ? '优秀' : 
               securityStatus.overallScore >= 70 ? '良好' : 
               securityStatus.overallScore >= 50 ? '一般' : '需要改进'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 关键指标卡片
 */
function KeyMetricsCards({ securityStatus }: { securityStatus: SecurityStatus }) {
  const totalVulnerabilities = Object.values(securityStatus.vulnerabilities).reduce((a, b) => a + b, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">漏洞总数</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalVulnerabilities}</div>
          <p className="text-xs text-muted-foreground">
            {securityStatus.vulnerabilities.critical} 关键 • {securityStatus.vulnerabilities.high} 高危
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">加密覆盖率</CardTitle>
          <Lock className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{securityStatus.encryption.sensitiveDataCoverage}%</div>
          <p className="text-xs text-muted-foreground">
            敏感数据加密覆盖率
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">权限问题</CardTitle>
          <Key className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{securityStatus.permissions.overPrivilegedUsers}</div>
          <p className="text-xs text-muted-foreground">
            过度权限用户数量
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">威胁拦截</CardTitle>
          <Eye className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{securityStatus.threats.blockedAttacks}</div>
          <p className="text-xs text-muted-foreground">
            今日拦截攻击次数
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 安全概览卡片组合组件
 */
export function SecurityOverviewCards({ 
  securityStatus, 
  getSecurityScoreColor 
}: SecurityOverviewCardsProps) {
  return (
    <div className="space-y-6">
      {/* 安全评分卡片 */}
      <SecurityScoreCard 
        securityStatus={securityStatus} 
        getSecurityScoreColor={getSecurityScoreColor} 
      />
      
      {/* 关键指标 */}
      <KeyMetricsCards securityStatus={securityStatus} />
    </div>
  );
}
