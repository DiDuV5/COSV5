/**
 * @fileoverview 用户注册审核管理页面
 * @description 管理员用于审核待审核用户注册申请的页面
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - react: ^18.0.0
 * - @trpc/react-query: ^10.45.0
 * - next: ^14.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，支持用户注册审核功能
 */

"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Settings,
  UserCheck,
  TrendingUp,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { PendingUsersList } from "@/components/admin/user-approval/PendingUsersList";
import { ApprovalHistoryTab } from "@/components/admin/user-approval/ApprovalHistoryTab";

interface SearchFormData {
  search: string;
  sortBy: "createdAt" | "username";
  sortOrder: "asc" | "desc";
}

export default function UserApprovalPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "username">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // 获取系统统计数据
  const { data: stats, refetch: refetchStats, isPending: statsLoading } = api.userApproval.getApprovalStats.useQuery();

  // 获取注册审核配置
  const { data: settings, refetch: refetchSettings, isPending: settingsLoading } = api.userApproval.getApprovalConfig.useQuery();

  // 更新设置 mutation
  const updateSettingsMutation = api.userApproval.updateApprovalConfig.useMutation({
    onSuccess: () => {
      toast.success("设置已更新，立即生效");
      refetchSettings();
      refetchStats(); // 刷新统计数据以反映设置变更
    },
    onError: (error) => {
      toast.error(`设置更新失败: ${error.message}`);
    },
    onSettled: () => {
      setIsUpdatingSettings(false);
    },
  });

  const handleRefresh = () => {
    refetchStats();
    refetchSettings();
    toast.success("数据已刷新");
  };

  // 处理注册审核开关变更
  const handleApprovalToggle = async (checked: boolean) => {
    if (!settings) return;

    setIsUpdatingSettings(true);
    try {
      await updateSettingsMutation.mutateAsync({
        registrationApprovalEnabled: checked,
      });
    } catch (error) {
      // Error handling is done in mutation callbacks
    }
  };

  // 处理邮件通知开关变更
  const handleNotificationToggle = async (checked: boolean) => {
    if (!settings) return;

    setIsUpdatingSettings(true);
    try {
      await updateSettingsMutation.mutateAsync({
        notificationEnabled: checked,
      });
    } catch (error) {
      // Error handling is done in mutation callbacks
    }
  };

  // 统计卡片数据
  const approvalRate = stats && stats.totalCount > 0 ? ((stats.approvedCount / stats.totalCount) * 100).toFixed(1) : "0";

  const statCards = [
    {
      title: "待审核用户",
      value: stats?.pendingCount || 0,
      icon: Clock,
      color: "orange",
      bgColor: "bg-orange-100",
      textColor: "text-orange-600",
      description: "等待管理员审核"
    },
    {
      title: "已批准用户",
      value: stats?.approvedCount || 0,
      icon: CheckCircle,
      color: "green",
      bgColor: "bg-green-100",
      textColor: "text-green-600",
      description: "审核通过的用户"
    },
    {
      title: "已拒绝用户",
      value: stats?.rejectedCount || 0,
      icon: XCircle,
      color: "red",
      bgColor: "bg-red-100",
      textColor: "text-red-600",
      description: "审核被拒绝的用户"
    },
    {
      title: "今日审核",
      value: (stats?.todayApprovals || 0) + (stats?.todayRejections || 0),
      icon: TrendingUp,
      color: "purple",
      bgColor: "bg-purple-100",
      textColor: "text-purple-600",
      description: `通过 ${stats?.todayApprovals || 0} / 拒绝 ${stats?.todayRejections || 0}`
    }
  ];

  if (statsLoading || settingsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-2">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">用户注册审核</h1>
          <p className="text-gray-600 mt-1">
            管理用户注册申请，审核新用户账户
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <Shield className="w-4 h-4 mr-2" />
            刷新数据
          </Button>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className={`p-2 ${stat.bgColor} rounded-lg`}>
                    <Icon className={`w-6 h-6 ${stat.textColor}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 主要内容区域 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            待审核用户
            {stats?.pendingCount && stats.pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {stats.pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            审核历史
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            审核设置
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                待审核用户列表
              </CardTitle>
              <CardDescription>
                {stats?.pendingCount ? `共有 ${stats.pendingCount} 个用户等待审核` : "暂无待审核用户"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* 搜索和筛选 */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1">
                  <Label htmlFor="search">搜索用户</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="search"
                      placeholder="搜索用户名、邮箱或显示名称..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="sortBy">排序</Label>
                  <select
                    id="sortBy"
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                      setSortBy(newSortBy);
                      setSortOrder(newSortOrder);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="createdAt-desc">注册时间 (最新)</option>
                    <option value="createdAt-asc">注册时间 (最早)</option>
                    <option value="username-asc">用户名 (A-Z)</option>
                    <option value="username-desc">用户名 (Z-A)</option>
                  </select>
                </div>
              </div>

              {/* 待审核用户列表 */}
              <PendingUsersList
                searchQuery={searchQuery}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onRefresh={handleRefresh}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <ApprovalHistoryTab />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                注册审核设置
              </CardTitle>
              <CardDescription>
                配置用户注册审核相关的系统设置，设置立即生效无需重启
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* 审核开关 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-600" />
                        <Label className="font-medium">启用注册审核</Label>
                        <Badge variant={settings?.registrationApprovalEnabled ? "default" : "secondary"}>
                          {settings?.registrationApprovalEnabled ? "已启用" : "已禁用"}
                        </Badge>
                        {isUpdatingSettings && (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        启用后，新用户注册需要管理员审核才能正常使用系统
                      </p>
                    </div>
                    <Switch
                      checked={settings?.registrationApprovalEnabled || false}
                      onCheckedChange={handleApprovalToggle}
                      disabled={isUpdatingSettings || settingsLoading}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <Label className="font-medium">邮件通知</Label>
                        <Badge variant={settings?.notificationEnabled ? "default" : "secondary"}>
                          {settings?.notificationEnabled ? "已启用" : "已禁用"}
                        </Badge>
                        {isUpdatingSettings && (
                          <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        审核完成后向用户发送邮件通知（需要配置邮件服务）
                      </p>
                    </div>
                    <Switch
                      checked={settings?.notificationEnabled || false}
                      onCheckedChange={handleNotificationToggle}
                      disabled={isUpdatingSettings || settingsLoading}
                    />
                  </div>
                </div>

                {/* 状态提示 */}
                <div className="space-y-4">
                  {settings?.registrationApprovalEnabled && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                        <div className="text-sm text-yellow-800">
                          <p className="font-medium mb-1">注册审核已启用</p>
                          <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>新用户注册后将处于&ldquo;待审核&rdquo;状态</li>
                            <li>待审核用户无法登录系统</li>
                            <li>管理员需要在用户审核页面手动批准或拒绝</li>
                            <li>现有用户不受影响</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {!settings?.registrationApprovalEnabled && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <div className="text-sm text-green-800">
                          <p className="font-medium mb-1">自动批准模式</p>
                          <p className="text-xs">新用户注册后可以立即使用系统，无需管理员审核</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {stats?.pendingCount && stats.pendingCount > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <span className="font-medium text-orange-900">
                          当前有 {stats.pendingCount} 个用户等待审核
                        </span>
                      </div>
                      <p className="text-sm text-orange-800 mt-1">
                        请及时处理待审核用户，以免影响用户体验
                      </p>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <Shield className="w-4 h-4 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">配置说明</p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                          <li>设置变更立即生效，无需重启服务器</li>
                          <li>邮件通知需要先在系统设置中配置SMTP邮件服务</li>
                          <li>管理员邮箱注册的用户会自动通过审核</li>
                          <li>可以随时开启或关闭注册审核功能</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
