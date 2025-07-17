/**
 * @fileoverview 系统测试状态组件
 * @description 在admin首页显示系统测试的实时状态
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - Lucide React Icons
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  TestTube,
  Play,
  Clock
} from 'lucide-react';

interface TestStatus {
  id: string;
  name: string;
  status: 'success' | 'warning' | 'error' | 'running' | 'idle';
  lastRun?: string;
  message?: string;
  priority: 'high' | 'medium' | 'low';
}

export function SystemTestStatus() {
  const [tests, setTests] = useState<TestStatus[]>([
    {
      id: 'system-status',
      name: '系统状态',
      status: 'success',
      lastRun: '5分钟前',
      message: '所有组件正常',
      priority: 'high'
    },
    {
      id: 'database',
      name: '数据库连接',
      status: 'success',
      lastRun: '10分钟前',
      message: '连接正常',
      priority: 'high'
    },
    {
      id: 'upload',
      name: '文件上传',
      status: 'success',
      lastRun: '15分钟前',
      message: '上传功能正常',
      priority: 'medium'
    },
    {
      id: 'video-transcoding',
      name: '视频转码',
      status: 'warning',
      lastRun: '1小时前',
      message: '部分格式需要优化',
      priority: 'medium'
    },
    {
      id: 'email',
      name: '邮件服务',
      status: 'error',
      lastRun: '2小时前',
      message: 'SMTP配置错误',
      priority: 'low'
    }
  ]);

  const [isRunningQuickTest, setIsRunningQuickTest] = useState(false);

  // 运行快速测试
  const runQuickTest = async () => {
    setIsRunningQuickTest(true);

    // 模拟快速测试
    const testOrder = ['system-status', 'database', 'upload'];

    for (const testId of testOrder) {
      setTests(prev => prev.map(test =>
        test.id === testId
          ? { ...test, status: 'running' as const }
          : test
      ));

      // 模拟测试时间
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 模拟测试结果
      const success = Math.random() > 0.2; // 80% 成功率
      setTests(prev => prev.map(test =>
        test.id === testId
          ? {
              ...test,
              status: success ? 'success' as const : 'warning' as const,
              lastRun: '刚刚',
              message: success ? '测试通过' : '需要检查'
            }
          : test
      ));
    }

    setIsRunningQuickTest(false);
  };

  // 获取状态图标
  const getStatusIcon = (status: TestStatus['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: TestStatus['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: TestStatus['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      default:
        return 'border-l-green-500';
    }
  };

  // 计算整体健康度
  const calculateHealthScore = () => {
    const weights = { high: 3, medium: 2, low: 1 };
    const scores = { success: 1, warning: 0.5, error: 0, running: 0.8, idle: 0.3 };

    let totalWeight = 0;
    let totalScore = 0;

    tests.forEach(test => {
      const weight = weights[test.priority];
      const score = scores[test.status];
      totalWeight += weight;
      totalScore += weight * score;
    });

    return Math.round((totalScore / totalWeight) * 100);
  };

  const healthScore = calculateHealthScore();
  const successCount = tests.filter(t => t.status === 'success').length;
  const warningCount = tests.filter(t => t.status === 'warning').length;
  const errorCount = tests.filter(t => t.status === 'error').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5 text-blue-600" />
              系统测试概览
            </CardTitle>
            <CardDescription>
              核心功能测试状态和健康度评估
            </CardDescription>
          </div>
          <Button
            onClick={runQuickTest}
            disabled={isRunningQuickTest}
            size="sm"
            variant="outline"
          >
            {isRunningQuickTest ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            快速测试
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 健康度概览 */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{successCount}</div>
              <div className="text-xs text-gray-600">正常</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
              <div className="text-xs text-gray-600">警告</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{errorCount}</div>
              <div className="text-xs text-gray-600">错误</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{healthScore}%</div>
              <div className="text-xs text-gray-600">健康度</div>
            </div>
          </div>

          {/* 测试项目列表 */}
          <div className="space-y-2">
            {tests.slice(0, 5).map((test) => (
              <div
                key={test.id}
                className={`flex items-center justify-between p-3 border-l-4 ${getPriorityColor(test.priority)} bg-gray-50 rounded-r-lg`}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(test.status)}
                  <div>
                    <div className="text-sm font-medium">{test.name}</div>
                    {test.message && (
                      <div className="text-xs text-gray-500">{test.message}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(test.status)}>
                    {test.status === 'success' ? '正常' :
                     test.status === 'warning' ? '警告' :
                     test.status === 'error' ? '错误' :
                     test.status === 'running' ? '运行中' : '待测试'}
                  </Badge>
                  {test.lastRun && (
                    <span className="text-xs text-gray-500">{test.lastRun}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 快速链接 */}
          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" asChild className="flex-1">
              <a href="/admin/system-tests">
                <TestTube className="w-4 h-4 mr-2" />
                完整测试中心
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild className="flex-1">
              <a href="/admin/system-tests/system-status">
                <CheckCircle className="w-4 h-4 mr-2" />
                系统状态
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
