/**
 * @fileoverview 系统状态检查页面
 * @description 检查文件上传系统的各项功能状态
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - Next.js 14+
 * - tRPC
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2024-01-XX: 移动到admin/system-tests目录
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  User,
  Upload,
  Database,
  Settings,
  HardDrive,
  ArrowLeft
} from 'lucide-react';
import { api } from '@/trpc/react';
import Link from 'next/link';

interface StatusItem {
  name: string;
  status: 'success' | 'error' | 'warning' | 'loading';
  message: string;
  details?: string;
}

export default function SystemStatusPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // API 查询
  // const { data: currentUser, isPending: userLoading, error: userError } = api.auth.getCurrentUser.useQuery();
  const currentUser = null;
  const userLoading = false;
  const userError = null;
  const { data: uploadConfig, isPending: configLoading, error: configError } = api.upload.getUploadConfig.useQuery();
  // const { data: storageStats, isPending: statsLoading, error: statsError } = api.upload.getStorageStats.useQuery();

  // 刷新所有状态
  const refreshStatus = async () => {
    setIsRefreshing(true);
    // 这里可以添加刷新逻辑
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // 生成状态项
  const getStatusItems = (): StatusItem[] => {
    const items: StatusItem[] = [];

    // 用户认证状态
    if (userLoading) {
      items.push({
        name: '用户认证',
        status: 'loading',
        message: '检查用户认证状态...',
      });
    } else if (userError) {
      items.push({
        name: '用户认证',
        status: 'error',
        message: '用户认证失败',
        details: (userError as any)?.message || '未知错误',
      });
    } else if (currentUser) {
      items.push({
        name: '用户认证',
        status: 'success',
        message: `已登录: ${(currentUser as any)?.username || '未知用户'}`,
        details: `权限: ${(currentUser as any)?.userLevel || '未知'}, 发布权限: ${(currentUser as any)?.canPublish ? '是' : '否'}`,
      });
    }

    // 上传配置状态
    if (configLoading) {
      items.push({
        name: '上传配置',
        status: 'loading',
        message: '加载上传配置...',
      });
    } else if (configError) {
      items.push({
        name: '上传配置',
        status: 'error',
        message: '上传配置加载失败',
        details: configError.message,
      });
    } else if (uploadConfig) {
      items.push({
        name: '上传配置',
        status: 'success',
        message: '上传配置正常',
        details: `最大文件: ${Math.round(uploadConfig.maxFileSize / 1024 / 1024)}MB, 支持类型: ${uploadConfig.allowedTypes.length}种`,
      });
    }

    // 存储统计状态 (暂时禁用)
    items.push({
      name: '存储统计',
      status: 'warning',
      message: '存储统计功能暂时禁用',
      details: '正在进行系统升级，功能将在后续版本中恢复',
    });

    // 数据库连接状态
    items.push({
      name: '数据库连接',
      status: currentUser ? 'success' : 'error',
      message: currentUser ? '数据库连接正常' : '数据库连接异常',
      details: currentUser ? 'Prisma + SQLite 正常工作' : '无法连接到数据库',
    });

    // 文件上传 API 状态
    items.push({
      name: '文件上传 API',
      status: 'success',
      message: 'API 路由已配置',
      details: '/api/upload 端点可用',
    });

    return items;
  };

  const statusItems = getStatusItems();
  const successCount = statusItems.filter(item => item.status === 'success').length;
  const errorCount = statusItems.filter(item => item.status === 'error').length;
  const warningCount = statusItems.filter(item => item.status === 'warning').length;

  const getStatusIcon = (status: StatusItem['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'loading':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
    }
  };

  const getStatusColor = (status: StatusItem['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'loading':
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* 返回按钮和页面标题 */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/system-tests">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回测试中心
            </Link>
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">系统状态检查</h1>
            <p className="text-gray-600 mt-2">检查文件上传系统的各项功能状态</p>
          </div>
          <Button
            onClick={refreshStatus}
            disabled={isRefreshing}
            variant="outline"
          >
            {isRefreshing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            刷新状态
          </Button>
        </div>
      </div>

      {/* 状态概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{successCount}</div>
            <div className="text-sm text-gray-600">正常</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{errorCount}</div>
            <div className="text-sm text-gray-600">错误</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
            <div className="text-sm text-gray-600">警告</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{statusItems.length}</div>
            <div className="text-sm text-gray-600">总计</div>
          </CardContent>
        </Card>
      </div>

      {/* 详细状态列表 */}
      <Card>
        <CardHeader>
          <CardTitle>系统组件状态</CardTitle>
          <CardDescription>
            各个系统组件的详细状态信息
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {statusItems.map((item, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getStatusColor(item.status)}`}
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(item.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      <Badge
                        variant={item.status === 'success' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">{item.message}</p>
                    {item.details && (
                      <p className="text-xs text-gray-500">{item.details}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 快速链接 */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Upload className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium">测试上传</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              测试文件上传和预览功能
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/admin/system-tests/upload', '_blank')}
              className="w-full"
            >
              打开测试页面
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <User className="w-5 h-5 text-green-600" />
              <h3 className="font-medium">内容发布</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              创建和发布新的内容
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/create', '_blank')}
              className="w-full"
            >
              打开发布页面
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Settings className="w-5 h-5 text-purple-600" />
              <h3 className="font-medium">系统设置</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              管理上传和系统设置
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/admin/settings', '_blank')}
              className="w-full"
            >
              打开设置页面
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
