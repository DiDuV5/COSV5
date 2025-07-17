/**
 * @fileoverview 下载安全管理页面
 * @description 管理员查看下载链接安全统计和访问日志
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Download, 
  Users, 
  Clock,
  TrendingUp,
  Eye
} from 'lucide-react';

/**
 * 下载安全管理页面
 */
export default function DownloadSecurityPage() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  // 模拟数据 - 实际应该从API获取
  const securityStats = {
    totalDownloads: 1234,
    suspiciousActivities: 23,
    blockedAttempts: 8,
    activeTokens: 156,
    securityScore: 92,
  };

  const recentLogs = [
    {
      id: '1',
      type: 'SUSPICIOUS',
      message: '检测到可疑User-Agent',
      ipAddress: '192.168.1.100',
      timestamp: '2025-07-08 14:30:25',
      severity: 'high',
    },
    {
      id: '2',
      type: 'RATE_LIMITED',
      message: '请求频率过高',
      ipAddress: '10.0.0.50',
      timestamp: '2025-07-08 14:25:12',
      severity: 'medium',
    },
    {
      id: '3',
      type: 'PURCHASE',
      message: '成功兑换下载链接',
      ipAddress: '172.16.0.25',
      timestamp: '2025-07-08 14:20:08',
      severity: 'low',
    },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SUSPICIOUS': return <AlertTriangle className="w-4 h-4" />;
      case 'RATE_LIMITED': return <Clock className="w-4 h-4" />;
      case 'PURCHASE': return <Download className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            下载安全管理
          </h1>
          <p className="text-gray-600 mt-2">
            监控下载链接的安全状态和访问行为
          </p>
        </div>
        
        {/* 时间范围选择 */}
        <div className="flex gap-2">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range === '24h' ? '24小时' : range === '7d' ? '7天' : '30天'}
            </Button>
          ))}
        </div>
      </div>

      {/* 安全统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">总下载次数</p>
                <p className="text-2xl font-bold">{securityStats.totalDownloads.toLocaleString()}</p>
              </div>
              <Download className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">可疑活动</p>
                <p className="text-2xl font-bold text-orange-600">{securityStats.suspiciousActivities}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">阻止尝试</p>
                <p className="text-2xl font-bold text-red-600">{securityStats.blockedAttempts}</p>
              </div>
              <Shield className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">活跃令牌</p>
                <p className="text-2xl font-bold text-green-600">{securityStats.activeTokens}</p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">安全评分</p>
                <p className="text-2xl font-bold text-blue-600">{securityStats.securityScore}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 安全日志 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            最近安全日志
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(log.type)}
                    <Badge variant={getSeverityColor(log.severity) as any}>
                      {log.type}
                    </Badge>
                  </div>
                  <div>
                    <p className="font-medium">{log.message}</p>
                    <p className="text-sm text-gray-600">IP: {log.ipAddress}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">{log.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm">
              查看更多日志
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 安全配置 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>安全设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">启用访问日志</p>
                <p className="text-sm text-gray-600">记录所有下载访问行为</p>
              </div>
              <Button size="sm" variant="outline">
                已启用
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">防爬虫保护</p>
                <p className="text-sm text-gray-600">检测和阻止自动化访问</p>
              </div>
              <Button size="sm" variant="outline">
                已启用
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">IP黑名单</p>
                <p className="text-sm text-gray-600">自动封禁可疑IP地址</p>
              </div>
              <Button size="sm" variant="outline">
                已启用
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>令牌管理</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">令牌有效期</p>
                <p className="text-sm text-gray-600">一次性访问令牌的有效时间</p>
              </div>
              <Badge variant="secondary">24小时</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">清理过期令牌</p>
                <p className="text-sm text-gray-600">自动清理过期的访问令牌</p>
              </div>
              <Button size="sm" variant="outline">
                立即清理
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">令牌使用统计</p>
                <p className="text-sm text-gray-600">查看令牌使用情况</p>
              </div>
              <Button size="sm" variant="outline">
                查看详情
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
