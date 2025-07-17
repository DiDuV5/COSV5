/**
 * @component EditUserDialog
 * @description 编辑用户对话框组件 - 重构为模块化架构
 * @author Augment AI
 * @date 2025-06-22
 * @version 2.0.0 - 模块化重构
 *
 * @props
 * - userId: string | null - 要编辑的用户ID
 * - open: boolean - 对话框是否打开
 * - onOpenChange: (open: boolean) => void - 对话框状态变化回调
 * - onSuccess: () => void - 编辑成功回调
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - react-hook-form
 * - zod
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2025-06-22: 重构为模块化架构，拆分大文件
 */

"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  User,
  Settings,
  BarChart3,
  Key,
} from "lucide-react";

// 导入模块化组件
import type { EditUserDialogProps } from "./edit-user-dialog/types";
import { useEditUserForm } from "./edit-user-dialog/hooks/use-edit-user-form";
import { usePasswordResetForm } from "./edit-user-dialog/hooks/use-password-reset-form";
import { UserAvatarSection } from "./edit-user-dialog/components/UserAvatarSection";
import { UserProfileTab } from "./edit-user-dialog/components/UserProfileTab";
import { UserSettingsTab } from "./edit-user-dialog/components/UserSettingsTab";
import { UserStatsTab } from "./edit-user-dialog/components/UserStatsTab";
import { PasswordResetTab } from "./edit-user-dialog/components/PasswordResetTab";

export function EditUserDialog({
  userId,
  open,
  onOpenChange,
  onSuccess,
}: EditUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 获取用户详情
  const { data: user, isPending } = api.admin.getUserById.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  );

  // 获取系统设置
  const { data: authSettings } = api.settings.getAuthSettings.useQuery();
  const usernameMinLength = authSettings?.usernameMinLength ?? 6;

  // 使用自定义Hook管理表单
  const { editForm, onSubmit: onEditSubmit, isPending: isEditLoading } = useEditUserForm({
    userId,
    user,
    usernameMinLength,
    onSuccess,
    onOpenChange,
  });

  const {
    passwordForm,
    showPassword,
    showConfirmPassword,
    onPasswordSubmit,
    isPending: isPasswordLoading,
    togglePassword,
    toggleConfirmPassword,
  } = usePasswordResetForm({
    userId,
    onSuccess: () => {
      alert("密码重置成功");
    },
    onOpenChange,
  });

  const handleClose = () => {
    if (!isSubmitting && !isEditLoading && !isPasswordLoading) {
      onOpenChange(false);
      editForm.reset();
      passwordForm.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑用户</DialogTitle>
          <DialogDescription>
            修改用户信息和权限设置
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : user ? (
          <>
            {/* 用户头像区域 */}
            <UserAvatarSection user={user} />

            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="profile">
                  <User className="w-4 h-4 mr-2" />
                  基本信息
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="w-4 h-4 mr-2" />
                  权限设置
                </TabsTrigger>
                <TabsTrigger value="stats">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  统计信息
                </TabsTrigger>
                <TabsTrigger value="password">
                  <Key className="w-4 h-4 mr-2" />
                  重置密码
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-6">
                <UserProfileTab
                  user={user}
                  editForm={editForm}
                  isSubmitting={isEditLoading}
                  onSubmit={onEditSubmit}
                  onClose={handleClose}
                />
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <UserSettingsTab
                  editForm={editForm}
                  isSubmitting={isEditLoading}
                  onSubmit={onEditSubmit}
                  onClose={handleClose}
                />
              </TabsContent>

              <TabsContent value="stats" className="space-y-6">
                <UserStatsTab user={user} />
              </TabsContent>

              <TabsContent value="password" className="space-y-6">
                <PasswordResetTab
                  passwordForm={passwordForm}
                  isSubmitting={isPasswordLoading}
                  showPassword={showPassword}
                  showConfirmPassword={showConfirmPassword}
                  onSubmit={onPasswordSubmit}
                  onClose={handleClose}
                  onTogglePassword={togglePassword}
                  onToggleConfirmPassword={toggleConfirmPassword}
                />
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
