/**
 * @fileoverview 媒体权限配置组件 (重构版)
 * @description 管理员配置用户组媒体访问权限的专用组件，采用模块化架构
 * @author Augment AI
 * @date 2024-01-XX
 * @version 2.0.0
 * @since 1.0.0
 *
 * @features
 * - 媒体访问百分比配置 (0-100%)
 * - 视频播放权限控制
 * - 受限内容预览权限配置
 * - 图片下载权限控制
 * - 批量保存权限配置
 * - 权限配置预览功能
 * - 导入/导出权限配置
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - react-hook-form
 * - zod
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2025-06-29: v2.0.0 重构为模块化架构
 */

'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  Save,
  RotateCcw,
  AlertCircle,
  Loader2,
} from 'lucide-react';

// 导入拆分的模块
import { usePermissionConfig } from './media-permission/hooks/use-permission-config';
import { PermissionConfigTable } from './media-permission/components/PermissionConfigTable';
import { PermissionPreview } from './media-permission/components/PermissionPreview';
import { ImportExportActions } from './media-permission/components/ImportExportActions';

export interface MediaPermissionConfigProps {
  onUpdate?: () => void;
}

/**
 * 重构后的媒体权限配置组件
 */
export function MediaPermissionConfig({ onUpdate }: MediaPermissionConfigProps) {
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // 使用重构后的Hook
  const {
    form,
    isSaving,
    permissionOverview,
    isPending,
    error,
    handleSave,
    handleResetDefaults,
    handleExport,
    handleImport,
    refetch,
  } = usePermissionConfig({
    onSaveSuccess: () => {
      onUpdate?.();
    },
  });

  // 加载状态
  if (isPending) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          加载权限配置失败：{error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6" />
            媒体权限配置
          </h2>
          <p className="text-gray-600 mt-1">
            配置不同用户等级的媒体访问权限
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowDebugInfo(!showDebugInfo)}
          >
            {showDebugInfo ? '隐藏调试' : '显示调试'}
          </Button>
          <ImportExportActions
            onExport={handleExport}
            onImport={handleImport}
            isPending={isSaving}
          />
        </div>
      </div>

      {/* 调试信息 */}
      {showDebugInfo && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="text-sm text-yellow-800">调试信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-yellow-700 space-y-1">
              <p>表单配置数量: {form.watch('configs').length}</p>
              <p>操作原因: {`"${form.watch('reason')}"`}</p>
              <p>权限概览数据: {permissionOverview ? `${permissionOverview.configs?.length || 0} 项配置, ${permissionOverview.userStats?.length || 0} 项统计` : '加载中...'}</p>
              <p>保存状态: {isSaving ? '保存中...' : '空闲'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 主要内容区域 */}
      <Tabs defaultValue="config" className="space-y-6">
        <TabsList>
          <TabsTrigger value="config">权限配置</TabsTrigger>
          <TabsTrigger value="preview">预览效果</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          {/* 权限配置表单 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                用户组媒体权限配置
              </CardTitle>
              <CardDescription>
                为每个用户等级配置媒体访问权限和功能限制
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
                  {/* 权限配置表格 */}
                  <PermissionConfigTable
                    form={form}
                    permissionOverview={permissionOverview}
                    showDebugInfo={showDebugInfo}
                  />

                  {/* 操作原因 */}
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>操作原因</FormLabel>
                        <Textarea
                          {...field}
                          placeholder="请填写修改权限配置的原因..."
                          className="min-h-[80px]"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2">
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center gap-2"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {isSaving ? '保存中...' : '保存配置'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResetDefaults}
                      disabled={isSaving}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      重置默认
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          {/* 权限预览 */}
          <PermissionPreview
            form={form}
            permissionOverview={permissionOverview}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
