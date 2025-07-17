/**
 * @component ExperienceConfigManager
 * @description 经验值系统配置管理组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - userLevel: string - 用户等级
 * - displayName: string - 显示名称
 * - color: string - 主题颜色
 *
 * @example
 * <ExperienceConfigManager
 *   userLevel="USER"
 *   displayName="普通用户"
 *   color="blue"
 * />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - tRPC
 * - shadcn/ui
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Brain,
  RotateCcw,
  Save,
  Clock,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  Settings,
  Loader2,
  // Settings,
  Zap,
} from "lucide-react";
import { formatDateTime, getHoursUntilReset } from "@/lib/utils";

interface ExperienceConfigManagerProps {
  userLevel: string;
  displayName: string;
  color: string;
}

export default function ExperienceConfigManager({
  userLevel,
  displayName,
  color
}: ExperienceConfigManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [dailyLimit, setDailyLimit] = useState<number>(100);
  const [ratio, setRatio] = useState<number>(1.0);

  // 获取配置数据
  const { data: config, isPending, refetch } = api.cans.config.getConfig.useQuery({ userLevel });

  // 获取经验值重置统计
  const { data: resetStats, refetch: refetchStats } = api.cans.experience.getExperienceStats.useQuery();

  // 更新配置
  const updateConfigMutation = api.cans.config.updateConfig.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setIsEditing(false);
      refetch();
      refetchStats();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // 重置所有用户经验值
  const resetAllMutation = {
    mutate: (data: { forceReset: boolean; reason: string }) => {
      console.log('重置所有用户经验值:', data);
      toast.success('重置功能暂未实现');
      refetchStats();
    },
    isPending: false
  };

  const handleSave = () => {
    if (!config) return;

    updateConfigMutation.mutate({
      userLevel,
      dailyExperienceLimit: dailyLimit,
      dailyCommentLimit: config?.dailyCommentLimit || 10,
      dailySigninCans: config?.dailySigninCans || 5,
      consecutiveBonus: config?.consecutiveBonus || '1.2',
      likeCans: config?.likeCans || 1,
      commentCans: config?.commentCans || 2,
      shareCans: config?.shareCans || 3,
      publishMomentCans: config?.publishMomentCans || 5,
      publishPostCans: config?.publishPostCans || 10,
      dailyLikeLimit: config?.dailyLikeLimit || 50,
      dailyShareLimit: config?.dailyShareLimit || 20,
      dailyMomentLimit: config?.dailyMomentLimit || 10,
      dailyPostLimit: config?.dailyPostLimit || 5,
      beLikedCans: config?.beLikedCans || 1,
      beCommentedCans: config?.beCommentedCans || 2,
      beSharedCans: config?.beSharedCans || 3,
      cansToExperienceRatio: ratio,
      reason: `管理员更新 ${displayName} 等级经验值配置`,
    });
  };

  const handleEdit = () => {
    if (config) {
      setDailyLimit(config.dailyExperienceLimit);
      setRatio(config.cansToExperienceRatio);
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (config) {
      setDailyLimit(config.dailyExperienceLimit);
      setRatio(config.cansToExperienceRatio);
    }
  };

  const handleResetAll = () => {
    if (confirm('确定要重置所有用户的每日经验值吗？此操作不可撤销。')) {
      resetAllMutation.mutate({
        forceReset: false,
        reason: '管理员手动批量重置经验值',
      });
    }
  };

  const handleForceResetAll = () => {
    if (confirm('确定要强制重置所有用户的每日经验值吗？这将忽略时间检查，立即重置所有用户。此操作不可撤销。')) {
      resetAllMutation.mutate({
        forceReset: true,
        reason: '管理员强制批量重置经验值',
      });
    }
  };

  if (isPending) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">加载配置中...</span>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              未找到 {displayName} 等级的配置信息
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const hoursUntilReset = getHoursUntilReset();

  return (
    <div className="space-y-6">
      {/* 经验值配置卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className={`h-5 w-5 text-${color}-500`} />
            <span>{displayName} - 经验值配置</span>
            <Badge variant="outline" className={`text-${color}-600 border-${color}-200`}>
              {userLevel}
            </Badge>
          </CardTitle>
          <CardDescription>
            管理 {displayName} 等级用户的经验值获得限制和转换比例
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 当前配置显示 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">每日经验值上限</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(Number(e.target.value))}
                  min={0}
                  max={1000}
                  className="w-full"
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="text-lg font-semibold">{config.dailyExperienceLimit}</span>
                  <span className="text-sm text-muted-foreground">经验值/天</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">罐头转经验值比例</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={ratio}
                  onChange={(e) => setRatio(Number(e.target.value))}
                  min={0}
                  max={10}
                  step={0.1}
                  className="w-full"
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-lg font-semibold">{config.cansToExperienceRatio}</span>
                  <span className="text-sm text-muted-foreground">经验值/罐头</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* 操作按钮 */}
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSave}
                  disabled={updateConfigMutation.isPending}
                  className="flex-1"
                >
                  {updateConfigMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  保存配置
                </Button>
                <Button variant="outline" onClick={handleCancel} className="flex-1">
                  取消
                </Button>
              </>
            ) : (
              <Button onClick={handleEdit} variant="outline" className="flex-1">
                <Settings className="h-4 w-4 mr-2" />
                编辑配置
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 全局经验值管理 */}
      {userLevel === 'ADMIN' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <RotateCcw className="h-5 w-5 text-orange-500" />
              <span>全局经验值管理</span>
            </CardTitle>
            <CardDescription>
              管理所有用户的经验值重置和统计信息
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 重置统计 */}
            {resetStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Users className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-blue-600">{resetStats.overview?.totalAccounts || 0}</div>
                  <div className="text-sm text-blue-600">总用户数</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-green-600">{resetStats.dailyStats?.totalDaily || 0}</div>
                  <div className="text-sm text-green-600">今日已重置</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-orange-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-orange-600">{resetStats.dailyStats?.maximumDaily || 0}</div>
                  <div className="text-sm text-orange-600">需要重置</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <Clock className="h-6 w-6 text-purple-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-purple-600">{hoursUntilReset}h</div>
                  <div className="text-sm text-purple-600">距离重置</div>
                </div>
              </div>
            )}

            <Separator />

            {/* 重置操作 */}
            <div className="flex space-x-2">
              <Button
                onClick={handleResetAll}
                disabled={resetAllMutation.isPending}
                variant="outline"
                className="flex-1"
              >
                {resetAllMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                重置需要重置的用户
              </Button>
              <Button
                onClick={handleForceResetAll}
                disabled={resetAllMutation.isPending}
                variant="destructive"
                className="flex-1"
              >
                {resetAllMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4 mr-2" />
                )}
                强制重置所有用户
              </Button>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>注意：</strong>重置操作将清空用户的每日经验值获得记录。
                &ldquo;重置需要重置的用户&rdquo;只会重置超过24小时未重置的用户，
                &ldquo;强制重置所有用户&rdquo;会立即重置所有用户，请谨慎操作。
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
