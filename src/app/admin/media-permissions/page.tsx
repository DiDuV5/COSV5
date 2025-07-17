/**
 * @fileoverview 媒体权限管理页面
 * @description 管理不同用户组的媒体内容访问权限和百分比限制
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @features
 * - 用户组媒体访问百分比配置
 * - 受限内容预览权限管理
 * - 实时权限测试和预览
 * - 批量权限配置更新
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - tRPC
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Users,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { api } from '@/trpc/react';
import { toast } from '@/hooks/use-toast';

// 用户组配置
const USER_LEVELS = [
  { value: 'GUEST', label: '访客', color: 'bg-gray-500' },
  { value: 'USER', label: '入馆', color: 'bg-blue-500' },
  { value: 'VIP', label: '赞助', color: 'bg-green-500' },
  { value: 'CREATOR', label: '荣誉', color: 'bg-purple-500' },
  { value: 'ADMIN', label: '守馆', color: 'bg-red-500' }
];

export default function MediaPermissionsPage() {
  const [selectedLevel, setSelectedLevel] = useState('GUEST');
  const [isSaving, setIsSaving] = useState(false);

  // 获取所有权限配置
  const { data: configs, isPending, refetch } = api.permission.getAllConfigs.useQuery();

  // 获取当前选中等级的配置
  const { data: currentConfig } = api.permission.getConfigByLevel.useQuery(
    { userLevel: selectedLevel },
    { enabled: !!selectedLevel }
  );

  // 更新权限配置
  const updateConfig = api.permission.updateConfig.useMutation({
    onSuccess: () => {
      refetch();
      toast({
        title: "配置更新成功",
        description: `${USER_LEVELS.find(l => l.value === selectedLevel)?.label} 的媒体权限已更新`,
      });
    },
    onError: (error) => {
      toast({
        title: "配置更新失败",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // 处理权限更新
  const handleUpdatePermission = async (field: string, value: any) => {
    if (!currentConfig) return;

    setIsSaving(true);
    try {
      await updateConfig.mutateAsync({
        userLevel: selectedLevel,
        [field]: value
      });
    } catch (error) {
      console.error('更新权限失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 批量更新所有等级的权限
  const handleBatchUpdate = async () => {
    setIsSaving(true);
    try {
      const updates = USER_LEVELS.map(level => {
        const defaultPercentage = level.value === 'GUEST' ? 20 :
                                 level.value === 'USER' ? 60 : 100;
        const canPreview = level.value !== 'GUEST';

        return updateConfig.mutateAsync({
          userLevel: level.value,
          mediaAccessPercentage: defaultPercentage,
          canViewRestrictedPreview: canPreview
        });
      });

      await Promise.all(updates);

      toast({
        title: "批量更新成功",
        description: "所有用户组的媒体权限已重置为默认值",
      });
    } catch (error) {
      toast({
        title: "批量更新失败",
        description: "部分配置更新失败，请检查后重试",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isPending) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">媒体权限管理</h1>
          <p className="text-gray-600 mt-2">
            配置不同用户组对媒体内容的访问权限和百分比限制
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isPending}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
          <Button
            onClick={handleBatchUpdate}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            重置默认值
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 用户组选择 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              用户组选择
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {USER_LEVELS.map((level) => {
              const config = configs?.find(c => c.userLevel === level.value);
              const isSelected = selectedLevel === level.value;

              return (
                <div
                  key={level.value}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedLevel(level.value)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${level.color}`} />
                      <span className="font-medium">{level.label}</span>
                      <Badge variant="outline" className="text-xs">
                        {level.value}
                      </Badge>
                    </div>

                    {config && (
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {config.mediaAccessPercentage}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {config.canViewRestrictedPreview ? '可预览' : '不可预览'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* 权限配置 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              {USER_LEVELS.find(l => l.value === selectedLevel)?.label} 权限配置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentConfig ? (
              <>
                {/* 媒体访问百分比 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">媒体访问百分比</Label>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {currentConfig.mediaAccessPercentage}%
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Slider
                      value={[currentConfig.mediaAccessPercentage]}
                      onValueChange={([value]) =>
                        handleUpdatePermission('mediaAccessPercentage', value)
                      }
                      max={100}
                      min={0}
                      step={5}
                      className="w-full"
                      disabled={isSaving}
                    />

                    <div className="flex justify-between text-xs text-gray-500">
                      <span>0% (无访问权限)</span>
                      <span>50% (部分内容)</span>
                      <span>100% (完全访问)</span>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      该用户组可以查看帖子中 <strong>{currentConfig.mediaAccessPercentage}%</strong> 的媒体内容。
                      剩余内容将显示为受限状态，需要更高权限才能查看。
                    </p>
                  </div>
                </div>

                <Separator />

                {/* 受限内容预览权限 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">受限内容预览</Label>
                      <p className="text-sm text-gray-500 mt-1">
                        是否允许预览受限制的媒体内容
                      </p>
                    </div>

                    <Switch
                      checked={currentConfig.canViewRestrictedPreview}
                      onCheckedChange={(checked) =>
                        handleUpdatePermission('canViewRestrictedPreview', checked)
                      }
                      disabled={isSaving}
                    />
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    {currentConfig.canViewRestrictedPreview ? (
                      <>
                        <Eye className="w-4 h-4 text-green-500" />
                        <span className="text-green-600">可以预览受限内容</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4 text-red-500" />
                        <span className="text-red-600">无法预览受限内容</span>
                      </>
                    )}
                  </div>
                </div>

                <Separator />

                {/* 权限预览 */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">权限效果预览</Label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 示例：10张图片的帖子 */}
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3">示例：10张图片的帖子</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm">
                            可查看: {Math.ceil(10 * currentConfig.mediaAccessPercentage / 100)} 张图片
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-red-500" />
                          <span className="text-sm">
                            受限: {10 - Math.ceil(10 * currentConfig.mediaAccessPercentage / 100)} 张图片
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 示例：20张图片的帖子 */}
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3">示例：20张图片的帖子</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm">
                            可查看: {Math.ceil(20 * currentConfig.mediaAccessPercentage / 100)} 张图片
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-red-500" />
                          <span className="text-sm">
                            受限: {20 - Math.ceil(20 * currentConfig.mediaAccessPercentage / 100)} 张图片
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">请选择一个用户组来配置权限</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 保存状态指示器 */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>保存中...</span>
        </div>
      )}
    </div>
  );
}
