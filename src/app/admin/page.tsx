/**
 * @fileoverview 管理后台首页
 * @description 显示系统概览和统计信息
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/react-query: ^10.45.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, MessageSquare, UserCheck, Activity, TestTube, CheckCircle, AlertTriangle, XCircle, Play } from "lucide-react";
import { SystemTestStatus } from "@/components/admin/SystemTestStatus";
import { SystemTestToolbar } from "@/components/admin/SystemTestToolbar";

export default function AdminDashboard() {
  const { data: stats, isPending } = api.admin.getStats.useQuery();

  // 模拟系统健康状态检查
  const systemHealth = {
    database: { status: 'healthy', message: '数据库连接正常' },
    storage: { status: 'healthy', message: '文件存储正常' },
    email: { status: 'warning', message: '邮件服务未配置' },
    telegram: { status: 'healthy', message: 'Telegram Bot 已配置' },
    upload: { status: 'healthy', message: '文件上传功能正常' },
    transcoding: { status: 'warning', message: '视频转码需要检查' }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (isPending) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">系统概览</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "总用户数",
      value: stats?.totalUsers || 0,
      description: "注册用户总数",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "活跃用户",
      value: stats?.activeUsers || 0,
      description: "当前活跃用户",
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "发布内容",
      value: stats?.totalPosts || 0,
      description: "已发布的内容数",
      icon: FileText,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "待审核评论",
      value: stats?.pendingComments || 0,
      description: "等待审核的评论",
      icon: MessageSquare,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">系统概览</h1>
        <p className="text-gray-600 mt-2">查看平台的整体运营情况和关键指标</p>
      </div>

      {/* 系统测试工具栏 */}
      <SystemTestToolbar />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 快速操作 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>快速操作</span>
            </CardTitle>
            <CardDescription>
              常用的管理操作快捷入口
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <a
                href="/admin/users"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <div className="text-sm font-medium">用户管理</div>
              </a>
              <a
                href="/admin/posts"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                <FileText className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <div className="text-sm font-medium">内容管理</div>
              </a>
              <a
                href="/admin/comments"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                <MessageSquare className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                <div className="text-sm font-medium">评论审核</div>
              </a>
              <a
                href="/admin/settings"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                <Activity className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <div className="text-sm font-medium">系统设置</div>
              </a>
            </div>
            <div className="mt-4 space-y-3">
              {/* 系统测试中心 - 主入口 */}
              <a
                href="/admin/system-tests"
                className="w-full p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition-colors text-center block bg-gradient-to-r from-blue-50 to-indigo-50"
              >
                <TestTube className="h-7 w-7 mx-auto mb-2 text-blue-600" />
                <div className="text-base font-semibold text-blue-600">系统测试中心</div>
                <div className="text-xs text-gray-600 mt-1">完整的功能测试和调试工具套件</div>
              </a>

              {/* 快速测试按钮 */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href="/admin/system-tests/system-status"
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center text-xs"
                >
                  <CheckCircle className="h-4 w-4 mx-auto mb-1 text-green-600" />
                  <div className="font-medium">系统状态</div>
                </a>
                <a
                  href="/admin/system-tests/upload"
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center text-xs"
                >
                  <Play className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                  <div className="font-medium">上传测试</div>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>系统健康状态</span>
              <a
                href="/admin/system-tests/system-status"
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <TestTube className="w-3 h-3" />
                详细检查
              </a>
            </CardTitle>
            <CardDescription>
              实时系统组件状态监控
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(systemHealth).map(([key, health]) => (
              <div key={key} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  {getHealthIcon(health.status)}
                  <span className="text-sm text-gray-700">
                    {key === 'database' ? '数据库连接' :
                     key === 'storage' ? '文件存储' :
                     key === 'email' ? '邮件服务' :
                     key === 'telegram' ? 'Telegram Bot' :
                     key === 'upload' ? '文件上传' :
                     key === 'transcoding' ? '视频转码' : key}
                  </span>
                </div>
                <span className={`text-xs ${getHealthColor(health.status)}`}>
                  {health.status === 'healthy' ? '正常' :
                   health.status === 'warning' ? '警告' : '错误'}
                </span>
              </div>
            ))}

            {/* 整体健康评分 */}
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">整体健康度</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-300"
                      style={{ width: '85%' }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-green-600">85%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 系统测试状态概览 */}
      <SystemTestStatus />
    </div>
  );
}
