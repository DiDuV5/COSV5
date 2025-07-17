/**
 * @fileoverview Turnstile设置组件
 * @description 管理员控制Turnstile验证功能的开关和统计
 * @author Augment AI
 * @date 2025-07-09
 * @version 1.0.0
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Activity,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3
} from "lucide-react";

import { TURNSTILE_FEATURES, type TurnstileFeatureId } from "@/types/turnstile";
import { api } from "@/trpc/react";

/**
 * 功能配置卡片组件
 */
function FeatureConfigCard({
  featureId,
  enabled,
  onToggle,
  isLoading
}: {
  featureId: TurnstileFeatureId;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  isLoading: boolean;
}) {
  const feature = TURNSTILE_FEATURES[featureId];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P0': return 'bg-red-100 text-red-800 border-red-200';
      case 'P1': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'P2': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {enabled ? (
              <ShieldCheck className="h-5 w-5 text-green-600" />
            ) : (
              <ShieldX className="h-5 w-5 text-gray-400" />
            )}
            <div>
              <CardTitle className="text-lg">{feature.name}</CardTitle>
              <CardDescription className="text-sm">
                {feature.description}
              </CardDescription>
            </div>
          </div>
          <Badge className={getPriorityColor(feature.priority)}>
            {feature.priority}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-gray-600">页面路径: {feature.path}</p>
            <p className="text-sm text-gray-600">API端点: {feature.apiEndpoint}</p>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium">
              {enabled ? '已启用' : '已禁用'}
            </span>
            <Switch
              checked={enabled}
              onCheckedChange={onToggle}
              disabled={isLoading}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 系统统计组件
 */
function SystemStats() {
  // 模拟统计数据
  const mockStats = {
    totalVerifications: 1234,
    successRate: 98.5,
    todayVerifications: 156,
    avgResponseTime: 145
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">总验证次数</p>
              <p className="text-2xl font-bold">{mockStats.totalVerifications.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">成功率</p>
              <p className="text-2xl font-bold">{mockStats.successRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4 text-purple-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">今日验证</p>
              <p className="text-2xl font-bold">{mockStats.todayVerifications}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-orange-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">平均响应时间</p>
              <p className="text-2xl font-bold">{mockStats.avgResponseTime}ms</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 系统健康状态组件
 */
function SystemHealth() {
  const [healthStatus, setHealthStatus] = useState<{
    status: 'healthy' | 'warning' | 'error';
    message: string;
    details: string[];
  }>({
    status: 'healthy',
    message: 'Turnstile系统运行正常',
    details: [
      '✅ Cloudflare连接正常',
      '✅ 配置验证通过',
      '✅ 功能管理器运行正常',
      '✅ API响应正常'
    ]
  });

  const getStatusIcon = () => {
    switch (healthStatus.status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusColor = () => {
    switch (healthStatus.status) {
      case 'healthy': return 'border-green-200 bg-green-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'error': return 'border-red-200 bg-red-50';
    }
  };

  return (
    <Alert className={getStatusColor()}>
      {getStatusIcon()}
      <AlertTitle>系统状态</AlertTitle>
      <AlertDescription>
        <p className="mb-2">{healthStatus.message}</p>
        <ul className="space-y-1">
          {healthStatus.details.map((detail, index) => (
            <li key={index} className="text-sm">{detail}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Turnstile设置主组件
 */
export function TurnstileSettings() {
  const [isLoading, setIsLoading] = useState(false);

  // 获取功能状态
  const { data: featureStates, refetch } = api.turnstile.getFeatureStates.useQuery();

  // 启用功能
  const enableFeature = api.turnstile.enableFeature.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // 禁用功能
  const disableFeature = api.turnstile.disableFeature.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // 批量启用
  const enableAllFeatures = api.turnstile.enableAllFeatures.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // 批量禁用
  const disableAllFeatures = api.turnstile.disableAllFeatures.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleToggleFeature = async (featureId: TurnstileFeatureId, enabled: boolean) => {
    setIsLoading(true);
    try {
      if (enabled) {
        await enableFeature.mutateAsync({ featureId });
      } else {
        await disableFeature.mutateAsync({ featureId });
      }
    } catch (error) {
      console.error('切换功能状态失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableAll = async () => {
    setIsLoading(true);
    try {
      const result = await enableAllFeatures.mutateAsync();

      if (result.success) {
        toast.success(result.message, {
          description: `成功启用 ${result.data.enabledCount}/${result.data.totalCount} 个功能`
        });

        if (result.data.errors.length > 0) {
          console.warn('批量启用部分失败:', result.data.errors);
          toast.warning('部分功能启用失败', {
            description: `${result.data.errors.length} 个功能启用失败，请查看控制台日志`
          });
        }
      } else {
        toast.error(result.message, {
          description: `仅成功启用 ${result.data.enabledCount}/${result.data.totalCount} 个功能`
        });
        console.error('批量启用失败:', result.data.errors);
      }
    } catch (error) {
      console.error('批量启用失败:', error);
      toast.error('批量启用失败', {
        description: '请检查网络连接和权限设置'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableAll = async () => {
    setIsLoading(true);
    try {
      const result = await disableAllFeatures.mutateAsync();

      if (result.success) {
        toast.success(result.message, {
          description: `成功禁用 ${result.data.disabledCount}/${result.data.totalCount} 个功能`
        });

        if (result.data.errors.length > 0) {
          console.warn('批量禁用部分失败:', result.data.errors);
          toast.warning('部分功能禁用失败', {
            description: `${result.data.errors.length} 个功能禁用失败，请查看控制台日志`
          });
        }
      } else {
        toast.error(result.message, {
          description: `仅成功禁用 ${result.data.disabledCount}/${result.data.totalCount} 个功能`
        });
        console.error('批量禁用失败:', result.data.errors);
      }
    } catch (error) {
      console.error('批量禁用失败:', error);
      toast.error('批量禁用失败', {
        description: '请检查网络连接和权限设置'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!featureStates) {
    return (
      <div className="flex items-center justify-center p-8">
        <Activity className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-2">加载中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 系统健康状态 */}
      <SystemHealth />

      {/* 批量操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">功能控制</h3>
          <p className="text-sm text-gray-600">管理各项Turnstile验证功能的启用状态</p>
        </div>
        <div className="flex space-x-2">
          {/* 批量启用确认对话框 */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                全部启用
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center">
                  <ShieldCheck className="h-5 w-5 text-green-600 mr-2" />
                  确认批量启用
                </AlertDialogTitle>
                <AlertDialogDescription>
                  您即将启用所有Turnstile验证功能。这将在以下场景中要求用户完成人机验证：
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• 用户注册和登录</li>
                    <li>• 密码重置</li>
                    <li>• 内容发布和文件上传</li>
                    <li>• 游客评论和点赞</li>
                  </ul>
                  <p className="mt-3 text-amber-600">
                    ⚠️ 启用后可能会影响用户体验，请确认您已配置好Cloudflare Turnstile。
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleEnableAll}
                  className="bg-green-600 hover:bg-green-700"
                >
                  确认启用
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* 批量禁用确认对话框 */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <ShieldX className="h-4 w-4 mr-2" />
                全部禁用
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center">
                  <ShieldX className="h-5 w-5 text-red-600 mr-2" />
                  确认批量禁用
                </AlertDialogTitle>
                <AlertDialogDescription>
                  您即将禁用所有Turnstile验证功能。这将移除以下场景的人机验证保护：
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• 用户注册和登录</li>
                    <li>• 密码重置</li>
                    <li>• 内容发布和文件上传</li>
                    <li>• 游客评论和点赞</li>
                  </ul>
                  <p className="mt-3 text-red-600">
                    ⚠️ 禁用后可能会降低系统安全性，增加垃圾信息和恶意攻击的风险。
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDisableAll}
                  className="bg-red-600 hover:bg-red-700"
                >
                  确认禁用
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* 功能配置卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Object.entries(TURNSTILE_FEATURES).map(([featureId, feature]) => (
          <FeatureConfigCard
            key={featureId}
            featureId={featureId as TurnstileFeatureId}
            enabled={featureStates.features[featureId as TurnstileFeatureId]?.enabled || false}
            onToggle={(enabled) => handleToggleFeature(featureId as TurnstileFeatureId, enabled)}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* 系统统计 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">系统统计</h3>
        <SystemStats />
      </div>
    </div>
  );
}
