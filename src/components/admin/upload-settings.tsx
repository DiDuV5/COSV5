/**
 * @fileoverview 上传设置组件 (重构版)
 * @description 管理上传设置的主组件，保持完整的UI逻辑
 * @author Augment AI
 * @version 2.0.0
 *
 * 重构说明：
 * - 保持原有功能完全一致
 * - 采用适度模块化，将相关UI功能保持在同一模块内
 * - 高内聚、低耦合的设计原则
 * - 允许组件达到400-500行以保持UI逻辑连贯性
 */

'use client';

import React, { useEffect } from 'react';
import { Settings, BarChart3, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

// 导入拆分的组件
import { useUploadSettingsForm, type UploadSettingsForm } from './upload-settings/upload-settings-form';
import { GeneralSettingsPanel } from './upload-settings/general-settings-panel';
import { StorageSettingsPanel } from './upload-settings/storage-settings-panel';

/**
 * 上传设置组件 (重构版)
 * 
 * 核心功能：
 * 1. 管理上传设置表单
 * 2. 协调各个设置面板
 * 3. 处理设置保存和重置
 * 4. 显示统计信息
 */
export function UploadSettings() {
  const { toast } = useToast();

  // 获取当前设置
  const { data: currentSettings, isPending: isLoadingSettings } = api.admin.getUploadSettings.useQuery();

  // 保存设置
  const saveSettings = api.admin.updateUploadSettings.useMutation({
    onSuccess: () => {
      toast({
        title: '设置已保存',
        description: '上传设置已成功更新',
      });
      form.reset(form.getValues()); // 重置dirty状态
    },
    onError: (error) => {
      toast({
        title: '保存失败',
        description: error.message || '保存设置时发生错误',
        variant: 'destructive',
      });
    },
  });

  // 获取上传统计
  const { data: uploadStats } = api.admin.getUploadStats.useQuery({
    timeRange: 'week',
    fileType: 'all',
  });

  // 清理哈希记录
  const cleanupHashes = api.admin.cleanupUnusedHashes.useMutation({
    onSuccess: (result) => {
      toast({
        title: '清理完成',
        description: `已清理 ${result.cleanedCount} 个未使用的哈希记录`,
      });
    },
    onError: (error) => {
      toast({
        title: '清理失败',
        description: error.message || '清理哈希记录时发生错误',
        variant: 'destructive',
      });
    },
  });

  // 初始化表单
  const {
    form,
    resetToDefaults,
    validateForm,
    getFormData,
    hasChanges,
    formatFileSize,
    applyRecommendedConfig,
  } = useUploadSettingsForm(currentSettings);

  // 当获取到设置数据时，更新表单
  useEffect(() => {
    if (currentSettings) {
      form.reset(currentSettings);
    }
  }, [currentSettings, form]);

  // 处理表单提交
  const handleSubmit = async (data: UploadSettingsForm) => {
    try {
      const isValid = await validateForm();
      if (!isValid) {
        toast({
          title: '验证失败',
          description: '请检查表单中的错误信息',
          variant: 'destructive',
        });
        return;
      }

      await saveSettings.mutateAsync(data);
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  };

  // 处理重置到默认值
  const handleResetToDefaults = () => {
    resetToDefaults();
    toast({
      title: '已重置',
      description: '设置已重置为默认值',
    });
  };

  // 应用推荐配置
  const handleApplyRecommendedConfig = (userType: 'basic' | 'professional' | 'enterprise') => {
    applyRecommendedConfig(userType);
    toast({
      title: '配置已应用',
      description: `已应用${userType === 'basic' ? '基础' : userType === 'professional' ? '专业' : '企业'}级推荐配置`,
    });
  };

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载设置中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">上传设置</h1>
          <p className="text-gray-600">配置文件上传的规则和限制</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleResetToDefaults}
            disabled={saveSettings.isPending}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            重置默认
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmit(getFormData())}
            disabled={!hasChanges() || saveSettings.isPending}
          >
            {saveSettings.isPending ? (
              <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            保存设置
          </Button>
        </div>
      </div>

      {/* 快速配置推荐 */}
      <Card>
        <CardHeader>
          <CardTitle>快速配置</CardTitle>
          <CardDescription>
            根据平台规模选择推荐配置
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleApplyRecommendedConfig('basic')}
              className="h-auto p-4 flex flex-col items-start"
            >
              <div className="font-medium">基础配置</div>
              <div className="text-sm text-gray-500 mt-1">
                1GB文件，50个/帖，适合小型社区
              </div>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleApplyRecommendedConfig('professional')}
              className="h-auto p-4 flex flex-col items-start"
            >
              <div className="font-medium">专业配置</div>
              <div className="text-sm text-gray-500 mt-1">
                5GB文件，500个/帖，适合专业cosplay平台
              </div>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleApplyRecommendedConfig('enterprise')}
              className="h-auto p-4 flex flex-col items-start"
            >
              <div className="font-medium">企业配置</div>
              <div className="text-sm text-gray-500 mt-1">
                20GB文件，1000个/帖，适合大型平台
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 主要设置内容 */}
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              基础设置
            </TabsTrigger>
            <TabsTrigger value="storage" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              存储配置
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              统计信息
            </TabsTrigger>
          </TabsList>

          {/* 基础设置 */}
          <TabsContent value="general">
            <GeneralSettingsPanel form={form} />
          </TabsContent>

          {/* 存储配置 */}
          <TabsContent value="storage">
            <StorageSettingsPanel form={form} cleanupHashes={cleanupHashes} />
          </TabsContent>

          {/* 统计信息 */}
          <TabsContent value="stats" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  上传统计
                </CardTitle>
                <CardDescription>
                  查看平台的上传使用情况
                </CardDescription>
              </CardHeader>
              <CardContent>
                {uploadStats ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {uploadStats.summary.totalUploads.toLocaleString()}
                      </div>
                      <div className="text-sm text-blue-600">总文件数</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {formatFileSize(uploadStats.summary.totalSize / (1024 * 1024))}
                      </div>
                      <div className="text-sm text-green-600">总存储大小</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {formatFileSize(uploadStats.summary.avgFileSize / (1024 * 1024))}
                      </div>
                      <div className="text-sm text-purple-600">平均文件大小</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {Object.values(uploadStats.dailyStats).reduce((sum, day) => sum + day.uploads, 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-orange-600">期间上传</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    暂无统计数据
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>

      {/* 底部提示 */}
      {hasChanges() && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <p className="text-sm">您有未保存的更改</p>
        </div>
      )}
    </div>
  );
}
