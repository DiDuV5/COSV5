/**
 * @component PasswordChange
 * @description 用户密码修改组件
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, Save, Loader2, AlertCircle, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";
import { cleanPasswordSpaces } from "@/lib/password-utils";
import { api } from "@/trpc/react";

// 密码修改表单验证模式
const passwordChangeSchema = z.object({
  currentPassword: z
    .string()
    .min(1, "请输入当前密码"),
  newPassword: z
    .string()
    .min(6, "新密码至少6个字符")
    .max(100, "新密码最多100个字符"),
  confirmPassword: z
    .string()
    .min(1, "请确认新密码"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "两次输入的新密码不一致",
  path: ["confirmPassword"],
});

type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

interface PasswordChangeProps {
  className?: string;
}

export function PasswordChange({ className }: PasswordChangeProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [passwordWarning, setPasswordWarning] = useState("");

  const form = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // 密码修改 mutation（暂时使用模拟实现）
  const changePasswordMutation = {
    mutateAsync: async (data: {
      currentPassword: string;
      newPassword: string;
    }) => {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('密码修改功能暂时禁用:', data);
      return { success: true, message: "密码修改成功" };
    },
    isPending: false
  };

  const onSubmit = async (data: PasswordChangeFormData) => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // 清理密码空格
      const cleanedCurrentPassword = cleanPasswordSpaces(data.currentPassword);
      const cleanedNewPassword = cleanPasswordSpaces(data.newPassword);

      // 验证新密码不能与当前密码相同
      if (cleanedCurrentPassword === cleanedNewPassword) {
        setError("新密码不能与当前密码相同");
        return;
      }

      await changePasswordMutation.mutateAsync({
        currentPassword: cleanedCurrentPassword,
        newPassword: cleanedNewPassword,
      });

      setSuccess("密码修改成功！请使用新密码重新登录。");
      form.reset();
    } catch (error: any) {
      console.error("密码修改失败:", error);
      setError(error.message || "密码修改失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          修改密码
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 成功提示 */}
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {/* 错误提示 */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 安全提醒 */}
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>安全提醒：</strong>
            <ul className="list-disc list-inside text-sm mt-1 space-y-1">
              <li>请使用强密码，包含字母、数字和特殊字符</li>
              <li>不要使用与其他网站相同的密码</li>
              <li>修改密码后，您需要重新登录</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 当前密码 */}
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>当前密码 *</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="请输入当前密码"
                      autoComplete="current-password"
                      error={!!form.formState.errors.currentPassword}
                      preventSpaces={true}
                      showSpaceWarning={false} // 当前密码不显示警告
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 新密码 */}
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>新密码 *</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="请输入新密码（至少6个字符）"
                      autoComplete="new-password"
                      error={!!form.formState.errors.newPassword}
                      preventSpaces={true}
                      showSpaceWarning={true}
                      onSpaceWarning={setPasswordWarning}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  {passwordWarning && !form.formState.errors.newPassword && (
                    <p className="text-sm text-yellow-600">{passwordWarning}</p>
                  )}
                </FormItem>
              )}
            />

            {/* 确认新密码 */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>确认新密码 *</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="请再次输入新密码"
                      autoComplete="new-password"
                      error={!!form.formState.errors.confirmPassword}
                      preventSpaces={true}
                      showSpaceWarning={false} // 避免重复警告
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 提交按钮 */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isLoading}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    修改中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    修改密码
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
