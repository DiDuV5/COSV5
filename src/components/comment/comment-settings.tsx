/**
 * @fileoverview 评论管理设置组件
 * @description 管理员可以配置评论系统的各种设置，包括审核提示显示等
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @example
 * <CommentSettings />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - shadcn/ui components
 * - tRPC API
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Settings,
  Eye,
  EyeOff,
  MessageCircle,
  Shield,
  Save,
  RotateCcw
} from "lucide-react";

// 评论设置接口
interface CommentSettings {
  showAuditMessages: boolean;
  allowGuestComments: boolean;
  requireApprovalForGuests: boolean;
  requireApprovalForUsers: boolean;
  enableAutoModeration: boolean;
  showPendingToAuthor: boolean;
  showRejectedToAuthor: boolean;
  enableQuickApproval: boolean;
}

// 默认设置
const defaultSettings: CommentSettings = {
  showAuditMessages: true,
  allowGuestComments: true,
  requireApprovalForGuests: true,
  requireApprovalForUsers: false,
  enableAutoModeration: false,
  showPendingToAuthor: true,
  showRejectedToAuthor: true,
  enableQuickApproval: true,
};

export function CommentSettings() {
  const [settings, setSettings] = useState<CommentSettings>(defaultSettings);
  const [isPending, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  // 更新设置
  const updateSetting = (key: keyof CommentSettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  // 保存设置
  const handleSave = async () => {
    setIsLoading(true);
    try {
      // TODO: 实现保存设置的API调用
      await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟API调用

      toast({
        title: "设置已保存",
        description: "评论管理设置已成功更新",
      });
      setHasChanges(false);
    } catch (error) {
      toast({
        title: "保存失败",
        description: "保存设置时出现错误，请重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 重置设置
  const handleReset = () => {
    setSettings(defaultSettings);
    setHasChanges(true);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          评论管理设置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 审核提示设置 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            审核提示设置
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="showAuditMessages">显示审核提示</Label>
                <p className="text-sm text-muted-foreground">
                  是否向用户显示{'"您的评论正在审核中"'}等提示信息
                </p>
              </div>
              <Switch
                id="showAuditMessages"
                checked={settings.showAuditMessages}
                onCheckedChange={(checked) => updateSetting('showAuditMessages', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="showPendingToAuthor">显示待审核状态</Label>
                <p className="text-sm text-muted-foreground">
                  评论作者是否可以看到自己的待审核评论
                </p>
              </div>
              <Switch
                id="showPendingToAuthor"
                checked={settings.showPendingToAuthor}
                onCheckedChange={(checked) => updateSetting('showPendingToAuthor', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="showRejectedToAuthor">显示被拒绝状态</Label>
                <p className="text-sm text-muted-foreground">
                  评论作者是否可以看到自己被拒绝的评论
                </p>
              </div>
              <Switch
                id="showRejectedToAuthor"
                checked={settings.showRejectedToAuthor}
                onCheckedChange={(checked) => updateSetting('showRejectedToAuthor', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* 审核设置 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4" />
            审核设置
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allowGuestComments">允许游客评论</Label>
                <p className="text-sm text-muted-foreground">
                  是否允许未注册用户发表评论
                </p>
              </div>
              <Switch
                id="allowGuestComments"
                checked={settings.allowGuestComments}
                onCheckedChange={(checked) => updateSetting('allowGuestComments', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="requireApprovalForGuests">游客评论需要审核</Label>
                <p className="text-sm text-muted-foreground">
                  游客发表的评论是否需要管理员审核
                </p>
              </div>
              <Switch
                id="requireApprovalForGuests"
                checked={settings.requireApprovalForGuests}
                onCheckedChange={(checked) => updateSetting('requireApprovalForGuests', checked)}
                disabled={!settings.allowGuestComments}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="requireApprovalForUsers">注册用户评论需要审核</Label>
                <p className="text-sm text-muted-foreground">
                  注册用户发表的评论是否需要管理员审核
                </p>
              </div>
              <Switch
                id="requireApprovalForUsers"
                checked={settings.requireApprovalForUsers}
                onCheckedChange={(checked) => updateSetting('requireApprovalForUsers', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enableQuickApproval">启用快捷审核</Label>
                <p className="text-sm text-muted-foreground">
                  管理员可以在评论区直接批准或拒绝评论
                </p>
              </div>
              <Switch
                id="enableQuickApproval"
                checked={settings.enableQuickApproval}
                onCheckedChange={(checked) => updateSetting('enableQuickApproval', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* 设置预览 */}
        {!settings.showAuditMessages && (
          <Alert>
            <EyeOff className="h-4 w-4" />
            <AlertDescription>
              当前设置下，用户将不会看到{'"您的评论正在审核中"'}等提示信息。
            </AlertDescription>
          </Alert>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isPending}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {isPending ? "保存中..." : "保存设置"}
          </Button>

          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            重置
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
