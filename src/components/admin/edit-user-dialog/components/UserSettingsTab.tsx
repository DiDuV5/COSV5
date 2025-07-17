/**
 * @fileoverview 用户设置标签页组件
 * @description 用户权限和状态设置表单
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import type { UserSettingsTabProps } from "../types";

export function UserSettingsTab({
  editForm,
  isSubmitting,
  onSubmit,
  onClose,
}: UserSettingsTabProps) {
  return (
    <Form {...editForm}>
      <form onSubmit={editForm.handleSubmit(onSubmit)} className="space-y-6">
        {/* 错误提示 */}
        {editForm.formState.errors.root && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {editForm.formState.errors.root.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-lg font-medium">用户等级</h4>

            {/* 用户等级 */}
            <FormField
              control={editForm.control}
              name="userLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>用户等级</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择用户等级" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="GUEST">访客 (GUEST)</SelectItem>
                      <SelectItem value="USER">普通用户 (USER)</SelectItem>
                      <SelectItem value="VIP">会员 (VIP)</SelectItem>
                      <SelectItem value="CREATOR">创作者 (CREATOR)</SelectItem>
                      <SelectItem value="ADMIN">管理员 (ADMIN)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    用户等级决定了用户在平台上的权限和功能访问范围
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <h4 className="text-lg font-medium">权限设置</h4>

            {/* 验证状态 */}
            <FormField
              control={editForm.control}
              name="isVerified"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">验证状态</FormLabel>
                    <FormDescription>
                      标记用户为已验证用户
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* 活跃状态 */}
            <FormField
              control={editForm.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">活跃状态</FormLabel>
                    <FormDescription>
                      禁用后用户无法登录
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* 发布权限 */}
            <FormField
              control={editForm.control}
              name="canPublish"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">发布权限</FormLabel>
                    <FormDescription>
                      允许用户发布内容
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "保存中..." : "保存权限设置"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
