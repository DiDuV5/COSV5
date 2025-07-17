/**
 * @fileoverview 系统测试中心主页
 * @description 统一的系统测试和调试工具入口
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - Next.js 14+
 * - Lucide React Icons
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TestTube, 
  Upload, 
  Activity, 
  Video, 
  Image, 
  Mail, 
  MessageSquare, 
  Database,
  Settings,
  Bug,
  Monitor,
  FileText,
  Tag,
  ExternalLink
} from 'lucide-react';

interface TestCategory {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  tests: TestItem[];
}

interface TestItem {
  name: string;
  description: string;
  path: string;
  status: 'active' | 'deprecated' | 'new';
  priority: 'high' | 'medium' | 'low';
}

export default function SystemTestsPage() {
  const testCategories: TestCategory[] = [
    {
      title: '系统状态',
      description: '系统整体状态检查和监控',
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      tests: [
        {
          name: '系统状态检查',
          description: '检查系统各组件运行状态',
          path: '/admin/tests/system-status',
          status: 'active',
          priority: 'high'
        },
        {
          name: '数据库连接测试',
          description: '测试数据库连接和查询性能',
          path: '/admin/tests/database',
          status: 'new',
          priority: 'high'
        }
      ]
    },
    {
      title: '文件上传',
      description: '文件上传和媒体处理功能测试',
      icon: Upload,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      tests: [
        {
          name: '文件上传测试',
          description: '测试文件上传、预览和管理功能',
          path: '/admin/system-tests/upload',
          status: 'active',
          priority: 'high'
        },
        {
          name: '媒体处理测试',
          description: '测试图片和视频处理功能',
          path: '/admin/system-tests/media',
          status: 'active',
          priority: 'medium'
        }
      ]
    },
    {
      title: '视频系统',
      description: '视频转码和播放功能测试',
      icon: Video,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      tests: [
        {
          name: '视频转码测试',
          description: '测试视频转码和兼容性',
          path: '/admin/system-tests/video-transcoding',
          status: 'active',
          priority: 'high'
        },
        {
          name: 'Firefox视频测试',
          description: '测试Firefox浏览器视频播放',
          path: '/admin/system-tests/firefox-video',
          status: 'active',
          priority: 'medium'
        },
        {
          name: '转码后视频测试',
          description: '测试转码后的视频播放',
          path: '/admin/system-tests/converted-videos',
          status: 'active',
          priority: 'medium'
        }
      ]
    },
    {
      title: '通信系统',
      description: '邮件通信功能测试',
      icon: Mail,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      tests: [
        {
          name: '邮件发送测试',
          description: '测试邮件发送和验证功能',
          path: '/admin/system-tests/email',
          status: 'active',
          priority: 'medium'
        }
      ]
    },
    {
      title: '标签系统',
      description: '标签和内容分类功能测试',
      icon: Tag,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      tests: [
        {
          name: '标签功能测试',
          description: '测试标签创建、搜索和管理',
          path: '/admin/system-tests/tags',
          status: 'active',
          priority: 'low'
        }
      ]
    },
    {
      title: '调试工具',
      description: '系统调试和问题排查工具',
      icon: Bug,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      tests: [
        {
          name: '会话调试',
          description: '调试用户会话和认证状态',
          path: '/admin/system-tests/debug-session',
          status: 'active',
          priority: 'low'
        },
        {
          name: '媒体调试',
          description: '调试媒体文件处理问题',
          path: '/admin/system-tests/debug-media',
          status: 'active',
          priority: 'low'
        }
      ]
    }
  ];

  const getStatusBadge = (status: TestItem['status']) => {
    switch (status) {
      case 'new':
        return <Badge variant="default" className="bg-green-100 text-green-800">新增</Badge>;
      case 'deprecated':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">已弃用</Badge>;
      default:
        return <Badge variant="outline">正常</Badge>;
    }
  };

  const getPriorityColor = (priority: TestItem['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      default:
        return 'border-l-green-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <TestTube className="w-8 h-8 text-blue-600" />
          系统测试中心
        </h1>
        <p className="text-gray-600 mt-2">
          统一的系统功能测试和调试工具，用于验证各个模块的正常运行
        </p>
      </div>

      {/* 测试分类 */}
      <div className="space-y-8">
        {testCategories.map((category, categoryIndex) => (
          <Card key={categoryIndex}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${category.bgColor}`}>
                  <category.icon className={`w-5 h-5 ${category.color}`} />
                </div>
                {category.title}
              </CardTitle>
              <CardDescription>{category.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.tests.map((test, testIndex) => (
                  <div
                    key={testIndex}
                    className={`p-4 border-l-4 ${getPriorityColor(test.priority)} bg-gray-50 rounded-r-lg hover:bg-gray-100 transition-colors`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{test.name}</h4>
                      {getStatusBadge(test.status)}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{test.description}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(test.path, '_blank')}
                      className="w-full"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      打开测试
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            使用说明
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
              <div>
                <strong>高优先级测试</strong>：核心功能测试，建议定期执行
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
              <div>
                <strong>中优先级测试</strong>：重要功能测试，按需执行
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <strong>低优先级测试</strong>：辅助功能测试，问题排查时使用
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
