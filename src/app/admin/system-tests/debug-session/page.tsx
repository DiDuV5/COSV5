/**
 * @fileoverview 会话调试页面
 * @description 调试用户会话和认证状态
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - Next.js 14+
 * - NextAuth.js
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2024-01-XX: 移动到admin/system-tests目录
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Shield, 
  Clock, 
  Key, 
  RefreshCw,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface SessionDebugInfo {
  hasSession: boolean;
  sessionStatus: string;
  userId?: string;
  username?: string;
  email?: string;
  userLevel?: string;
  isVerified?: boolean;
  canPublish?: boolean;
  sessionExpiry?: string;
  lastUpdate?: string;
}

export default function DebugSessionPage() {
  const { data: session, status, update } = useSession();
  const [debugInfo, setDebugInfo] = useState<SessionDebugInfo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 收集会话调试信息
  useEffect(() => {
    const info: SessionDebugInfo = {
      hasSession: !!session,
      sessionStatus: status,
      userId: session?.user?.id,
      username: session?.user?.username,
      email: session?.user?.email || undefined,
      userLevel: session?.user?.userLevel,
      isVerified: session?.user?.isVerified,
      canPublish: session?.user?.canPublish,
      sessionExpiry: session?.expires,
      lastUpdate: new Date().toISOString()
    };
    
    setDebugInfo(info);
  }, [session, status]);

  // 刷新会话
  const refreshSession = async () => {
    setIsRefreshing(true);
    try {
      await update();
    } catch (error) {
      console.error('刷新会话失败:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 获取状态图标
  const getStatusIcon = (value: boolean | undefined) => {
    if (value === true) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (value === false) return <XCircle className="w-4 h-4 text-red-600" />;
    return <AlertCircle className="w-4 h-4 text-gray-400" />;
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'authenticated':
        return 'bg-green-100 text-green-800';
      case 'unauthenticated':
        return 'bg-red-100 text-red-800';
      case 'loading':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 返回按钮和页面标题 */}
      <div className="mb-8">
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
            <h1 className="text-3xl font-bold text-gray-900">会话调试</h1>
            <p className="text-gray-600 mt-2">调试用户会话和认证状态</p>
          </div>
          <Button
            onClick={refreshSession}
            disabled={isRefreshing}
            variant="outline"
          >
            {isRefreshing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            刷新会话
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左侧：会话状态 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                认证状态
              </CardTitle>
              <CardDescription>
                当前用户的认证和会话状态
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">会话状态</span>
                  <Badge className={getStatusColor(status)}>
                    {status}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">是否已登录</span>
                  {getStatusIcon(debugInfo?.hasSession)}
                </div>
                
                {debugInfo?.sessionExpiry && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">会话过期时间</span>
                    <span className="text-xs text-gray-500">
                      {new Date(debugInfo.sessionExpiry).toLocaleString()}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">最后更新</span>
                  <span className="text-xs text-gray-500">
                    {debugInfo?.lastUpdate ? new Date(debugInfo.lastUpdate).toLocaleString() : '未知'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 用户信息 */}
          {session?.user && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  用户信息
                </CardTitle>
                <CardDescription>
                  当前登录用户的详细信息
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">用户ID:</span>
                      <div className="text-gray-600 break-all">{session.user.id}</div>
                    </div>
                    <div>
                      <span className="font-medium">用户名:</span>
                      <div className="text-gray-600">{session.user.username}</div>
                    </div>
                    <div>
                      <span className="font-medium">邮箱:</span>
                      <div className="text-gray-600">{session.user.email || '未设置'}</div>
                    </div>
                    <div>
                      <span className="font-medium">显示名称:</span>
                      <div className="text-gray-600">{session.user.name || '未设置'}</div>
                    </div>
                    <div>
                      <span className="font-medium">用户等级:</span>
                      <div className="text-gray-600">{session.user.userLevel}</div>
                    </div>
                    <div>
                      <span className="font-medium">头像:</span>
                      <div className="text-gray-600">{session.user.image ? '已设置' : '未设置'}</div>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t">
                    <h4 className="font-medium mb-2">权限状态</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">邮箱验证</span>
                        {getStatusIcon(session.user.isVerified)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">发布权限</span>
                        {getStatusIcon(session.user.canPublish)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧：调试工具 */}
        <div className="space-y-6">
          {/* 会话数据 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                会话数据
              </CardTitle>
              <CardDescription>
                完整的会话对象数据（JSON格式）
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
                <pre className="text-xs text-gray-700">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* 调试操作 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                调试操作
              </CardTitle>
              <CardDescription>
                会话相关的调试和测试操作
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  onClick={refreshSession}
                  disabled={isRefreshing}
                  className="w-full"
                  variant="outline"
                >
                  {isRefreshing ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  强制刷新会话
                </Button>
                
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full"
                  variant="outline"
                >
                  重新加载页面
                </Button>
                
                <Button
                  onClick={() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }}
                  className="w-full"
                  variant="outline"
                >
                  清除本地存储
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 浏览器信息 */}
          <Card>
            <CardHeader>
              <CardTitle>浏览器信息</CardTitle>
              <CardDescription>
                当前浏览器的相关信息
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">User Agent:</span>
                  <span className="text-xs text-gray-500 max-w-xs truncate">
                    {navigator.userAgent}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Cookie 支持:</span>
                  <span className="text-xs text-gray-500">
                    {navigator.cookieEnabled ? '是' : '否'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">本地存储:</span>
                  <span className="text-xs text-gray-500">
                    {typeof Storage !== 'undefined' ? '支持' : '不支持'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">当前URL:</span>
                  <span className="text-xs text-gray-500 max-w-xs truncate">
                    {window.location.href}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 快速链接 */}
      <div className="mt-8 flex gap-4">
        <Button variant="outline" asChild>
          <Link href="/auth/signin">
            登录页面
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/auth/signup">
            注册页面
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/system-tests/system-status">
            系统状态
          </Link>
        </Button>
      </div>
    </div>
  );
}
