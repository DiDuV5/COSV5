/**
 * @fileoverview 密码重置标签页组件
 * @description 管理员重置用户密码的表单
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import type { PasswordResetTabProps } from "../types";

export function PasswordResetTab({
  passwordForm,
  isSubmitting,
  showPassword,
  showConfirmPassword,
  onSubmit,
  onClose,
  onTogglePassword,
  onToggleConfirmPassword,
}: PasswordResetTabProps) {
  return (
    <Form {...passwordForm}>
      <form onSubmit={passwordForm.handleSubmit(onSubmit)} className="space-y-6">
        {/* 错误提示 */}
        {passwordForm.formState.errors.root && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {passwordForm.formState.errors.root.message}
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            重置密码后，用户需要使用新密码重新登录。请确保将新密码安全地传达给用户。
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 新密码 */}
          <FormField
            control={passwordForm.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>新密码</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder="输入新密码"
                    autoComplete="new-password"
                    preventSpaces={true}
                    showSpaceWarning={true}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 确认密码 */}
          <FormField
            control={passwordForm.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>确认密码</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder="再次输入新密码"
                    autoComplete="new-password"
                    preventSpaces={true}
                    showSpaceWarning={false} // 避免重复警告
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
          <Button type="submit" variant="destructive" disabled={isSubmitting}>
            {isSubmitting ? "重置中..." : "重置密码"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
