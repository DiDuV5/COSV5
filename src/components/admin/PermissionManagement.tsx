/**
 * @component PermissionManagement
 * @description 完整的权限管理组件，整合所有权限配置功能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 2.0.0 - 重构为模块化结构
 *
 * @props
 * - onUpdate: () => void - 更新回调
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - react-hook-form
 * - zod
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2025-06-20: 重构为模块化结构，拆分为多个子组件
 */

"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
} from "@/components/ui/form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Save,
} from "lucide-react";
import { GuestPermissionConfig } from "./GuestPermissionConfig";
import { USER_LEVEL_CONFIGS } from "@/lib/constants/user-levels";

// 导入子组件
import { UserLevelSelector } from "./permission-management/components/UserLevelSelector";
import { PublishingPermissions } from "./permission-management/components/PublishingPermissions";
import { UploadPermissions } from "./permission-management/components/UploadPermissions";
import { AccessPermissions } from "./permission-management/components/AccessPermissions";
import { CommentPermissions } from "./permission-management/components/CommentPermissions";
import { SocialPermissions } from "./permission-management/components/SocialPermissions";
import { ContentLimits } from "./permission-management/components/ContentLimits";

// 导入Hook和类型
import { usePermissionManagement } from "./permission-management/hooks/use-permission-management";
import type { PermissionManagementProps } from "./permission-management/types";

export default function PermissionManagement({ onUpdate }: PermissionManagementProps) {
  const {
    selectedLevel,
    setSelectedLevel,
    isSaving,
    configs,
    currentConfig: _currentConfig,
    isPending,
    form,
    handleSave,
    handleInitializeDefaults,
  } = usePermissionManagement(onUpdate);

  const selectedLevelConfig = USER_LEVEL_CONFIGS.find(
    config => config.value === selectedLevel
  );

  const onSubmit = async (data: any) => {
    try {
      await handleSave(data);
    } catch (error) {
      console.error("保存权限配置失败:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* 用户等级选择器 */}
      <UserLevelSelector
        configs={configs}
        selectedLevel={selectedLevel}
        onLevelChange={setSelectedLevel}
        onInitializeDefaults={handleInitializeDefaults}
        isInitializing={false}
      />

      {/* 权限配置表单 */}
      {selectedLevel && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              {selectedLevelConfig?.label} 权限配置
            </CardTitle>
            <CardDescription>
              配置 {selectedLevelConfig?.label} 用户等级的详细权限设置
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs defaultValue="publishing" className="w-full">
                  <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="publishing">发布权限</TabsTrigger>
                    <TabsTrigger value="upload">上传权限</TabsTrigger>
                    <TabsTrigger value="access">访问权限</TabsTrigger>
                    <TabsTrigger value="comment">评论权限</TabsTrigger>
                    <TabsTrigger value="social">社交权限</TabsTrigger>
                    <TabsTrigger value="content">内容限制</TabsTrigger>
                  </TabsList>

                  <TabsContent value="publishing" className="space-y-4">
                    <PublishingPermissions form={form} selectedLevel={selectedLevel} />
                  </TabsContent>

                  <TabsContent value="upload" className="space-y-4">
                    <UploadPermissions form={form} selectedLevel={selectedLevel} />
                  </TabsContent>

                  <TabsContent value="access" className="space-y-4">
                    <AccessPermissions form={form} selectedLevel={selectedLevel} />
                  </TabsContent>

                  <TabsContent value="comment" className="space-y-4">
                    <CommentPermissions form={form} selectedLevel={selectedLevel} />
                  </TabsContent>

                  <TabsContent value="social" className="space-y-4">
                    <SocialPermissions form={form} selectedLevel={selectedLevel} />
                  </TabsContent>

                  <TabsContent value="content" className="space-y-4">
                    <ContentLimits form={form} selectedLevel={selectedLevel} />
                  </TabsContent>
                </Tabs>

                <Separator />

                <div className="flex justify-end gap-4">
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="min-w-32"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? "保存中..." : "保存配置"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* 游客权限特殊配置 */}
      {selectedLevel === "GUEST" && (
        <GuestPermissionConfig onUpdate={onUpdate} />
      )}
    </div>
  );
}
