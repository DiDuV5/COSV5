/**
 * @fileoverview 密码重置确认页面组件
 * @description 用户通过邮件链接重置密码的页面
 * @author Augment AI
 * @date 2025-07-09
 * @version 1.0.0
 */

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthLayout } from "@/components/auth/auth-layout";
import { PasswordStrength } from "@/components/auth/password-strength";
import { TurnstileFormWrapper } from "@/components/security/turnstile-form-wrapper";
import { useTurnstileFormSubmission } from "@/hooks/use-turnstile-client";
import { cleanPasswordSpaces } from "@/lib/password-utils";
import { api } from "@/trpc/react";

// 表单验证模式
const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(6, "新密码至少6个字符")
    .max(100, "密码最多100个字符"),
  confirmPassword: z
    .string()
    .min(1, "请确认新密码"),
  turnstileToken: z.string().optional(), // Turnstile验证token
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "两次输入的密码不一致",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
  const [success, setSuccess] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || null;

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPassword = watch("newPassword");

  // 使用tRPC mutation
  const resetPasswordMutation = api.auth.resetPassword.useMutation();

  // 使用Turnstile表单提交Hook
  const {
    isSubmitting,
    handleSubmit: handleTurnstileSubmit,
    error: turnstileError,
    setError: setTurnstileError
  } = useTurnstileFormSubmission<ResetPasswordFormData>({
    featureId: 'PASSWORD_RESET',
    onSubmit: async (data, turnstileToken) => {
      if (!token) {
        setTokenError("缺少重置令牌，请重新申请密码重置");
        return;
      }

      setTurnstileError(null);

      try {
        // 清理密码空格
        const cleanedPassword = cleanPasswordSpaces(data.newPassword);

        const result = await resetPasswordMutation.mutateAsync({
          token,
          newPassword: cleanedPassword,
          turnstileToken,
        });

        setSuccess(result.message || "密码重置成功！");
        reset(); // 清空表单

        // 3秒后跳转到登录页面
        setTimeout(() => {
          router.push("/auth/signin");
        }, 3000);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "密码重置失败，请稍后重试";
        setTurnstileError(errorMessage);
      }
    }
  });

  useEffect(() => {
    setMounted(true);

    // 检查是否有重置令牌
    if (!token) {
      setTokenError("缺少重置令牌，请重新申请密码重置");
    }
  }, [token]);

  if (!mounted) {
    return null; // 避免水合不匹配
  }

  return (
    <AuthLayout
      title="重置密码"
      subtitle="设置您的新密码"
    >
      <div className="space-y-6">
        {/* 导航链接 */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            记起密码了？{" "}
            <Link
              href="/auth/signin"
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              立即登录
            </Link>
          </p>
        </div>

        {/* 令牌错误提示 */}
        {tokenError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {tokenError}
            <div className="mt-2">
              <Link
                href="/auth/forgot-password"
                className="text-blue-600 hover:text-blue-500 underline"
              >
                重新申请密码重置
              </Link>
            </div>
          </div>
        )}

        {/* 密码重置表单 */}
        {!tokenError && (
          <TurnstileFormWrapper
            featureId="PASSWORD_RESET"
            theme="light"
            className="space-y-4"
          >
            <form onSubmit={handleSubmit(handleTurnstileSubmit)} className="space-y-4">
              {/* 错误提示 */}
              {turnstileError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {turnstileError}
                </div>
              )}

              {/* 成功提示 */}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
                  {success}
                  <div className="mt-2 text-xs text-green-600">
                    页面将在3秒后自动跳转到登录页面...
                  </div>
                </div>
              )}

              {/* 新密码输入 */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">新密码</Label>
                <PasswordInput
                  id="newPassword"
                  placeholder="请输入新密码"
                  {...register("newPassword")}
                  className={errors.newPassword ? "border-red-500" : ""}
                  disabled={isSubmitting || !!success}
                />
                {errors.newPassword && (
                  <p className="text-sm text-red-600">{errors.newPassword.message}</p>
                )}

                {/* 密码强度指示器 */}
                {newPassword && (
                  <PasswordStrength password={newPassword} />
                )}
              </div>

              {/* 确认密码输入 */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认新密码</Label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="请再次输入新密码"
                  {...register("confirmPassword")}
                  className={errors.confirmPassword ? "border-red-500" : ""}
                  disabled={isSubmitting || !!success}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* 密码要求说明 */}
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                <p className="font-medium mb-1">密码要求：</p>
                <ul className="text-xs space-y-1">
                  <li>• 至少6个字符</li>
                  <li>• 建议包含大小写字母、数字和特殊字符</li>
                  <li>• 避免使用常见密码或个人信息</li>
                </ul>
              </div>

              {/* 提交按钮 */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !!success}
              >
                {isSubmitting ? "重置中..." : success ? "重置成功" : "重置密码"}
              </Button>
            </form>
          </TurnstileFormWrapper>
        )}

        {/* 帮助信息 */}
        <div className="text-center space-y-2">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                需要帮助？
              </span>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <Link
              href="/auth/forgot-password"
              className="text-blue-600 hover:text-blue-500 transition-colors"
            >
              重新申请密码重置
            </Link>
            {" · "}
            <Link
              href="/contact"
              className="text-blue-600 hover:text-blue-500 transition-colors"
            >
              联系客服
            </Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
