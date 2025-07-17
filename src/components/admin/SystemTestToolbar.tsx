/**
 * @fileoverview 系统测试工具栏组件
 * @description 在admin页面顶部显示系统测试快捷工具
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TestTube, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Play,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Database,
  Upload,
  Video,
  Mail
} from 'lucide-react';

interface QuickTest {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  href: string;
  status: 'success' | 'warning' | 'error' | 'idle';
  priority: 'high' | 'medium' | 'low';
}

export function SystemTestToolbar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRunningQuickCheck, setIsRunningQuickCheck] = useState(false);

  const quickTests: QuickTest[] = [
    {
      id: 'system-status',
      name: '系统状态',
      icon: CheckCircle,
      href: '/admin/system-tests/system-status',
      status: 'success',
      priority: 'high'
    },
    {
      id: 'database',
      name: '数据库',
      icon: Database,
      href: '/admin/system-tests/database',
      status: 'success',
      priority: 'high'
    },
    {
      id: 'upload',
      name: '文件上传',
      icon: Upload,
      href: '/admin/system-tests/upload',
      status: 'success',
      priority: 'medium'
    },
    {
      id: 'video',
      name: '视频转码',
      icon: Video,
      href: '/admin/system-tests/video-transcoding',
      status: 'warning',
      priority: 'medium'
    },
    {
      id: 'email',
      name: '邮件服务',
      icon: Mail,
      href: '/admin/system-tests/email',
      status: 'error',
      priority: 'low'
    }
  ];

  // 运行快速检查
  const runQuickCheck = async () => {
    setIsRunningQuickCheck(true);
    // 模拟快速检查
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRunningQuickCheck(false);
  };

  // 获取状态图标
  const getStatusIcon = (status: QuickTest['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-3 h-3 text-yellow-600" />;
      case 'error':
        return <XCircle className="w-3 h-3 text-red-600" />;
      default:
        return <div className="w-3 h-3 bg-gray-300 rounded-full" />;
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: QuickTest['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50 hover:bg-green-100';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100';
      case 'error':
        return 'border-red-200 bg-red-50 hover:bg-red-100';
      default:
        return 'border-gray-200 bg-gray-50 hover:bg-gray-100';
    }
  };

  const successCount = quickTests.filter(t => t.status === 'success').length;
  const warningCount = quickTests.filter(t => t.status === 'warning').length;
  const errorCount = quickTests.filter(t => t.status === 'error').length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
      {/* 工具栏头部 */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <TestTube className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-900">系统测试</span>
          </div>
          
          {/* 状态概览 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600">{successCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-gray-600">{warningCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-gray-600">{errorCount}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 快速检查按钮 */}
          <Button
            onClick={runQuickCheck}
            disabled={isRunningQuickCheck}
            size="sm"
            variant="outline"
          >
            {isRunningQuickCheck ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            快速检查
          </Button>

          {/* 完整测试中心按钮 */}
          <Button size="sm" asChild>
            <a href="/admin/system-tests">
              <TestTube className="w-4 h-4 mr-2" />
              测试中心
            </a>
          </Button>

          {/* 展开/收起按钮 */}
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            size="sm"
            variant="ghost"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* 展开的测试项目 */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {quickTests.map((test) => (
              <a
                key={test.id}
                href={test.href}
                className={`p-3 border rounded-lg transition-colors ${getStatusColor(test.status)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <test.icon className="w-4 h-4 text-gray-700" />
                  {getStatusIcon(test.status)}
                </div>
                <div className="text-sm font-medium text-gray-900">{test.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      test.priority === 'high' ? 'border-red-300 text-red-700' :
                      test.priority === 'medium' ? 'border-yellow-300 text-yellow-700' :
                      'border-green-300 text-green-700'
                    }`}
                  >
                    {test.priority === 'high' ? '高' :
                     test.priority === 'medium' ? '中' : '低'}
                  </Badge>
                </div>
              </a>
            ))}
          </div>
          
          {/* 更多测试链接 */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <a
                href="/admin/system-tests/firefox-video"
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                Firefox视频测试
              </a>

              <a
                href="/admin/system-tests/tags"
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                标签功能测试
              </a>
              <a
                href="/admin/system-tests/debug-session"
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                会话调试
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
