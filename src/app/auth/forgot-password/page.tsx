/**
 * @fileoverview 密码重置页面组件
 * @description 用户密码重置页面，支持邮箱重置密码
 * @author Augment AI
 * @date 2025-07-09
 * @version 1.0.0
 */

"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth/auth-layout";
import { CollapsibleNotice } from "@/components/ui/collapsible-notice";
import { TurnstileFormWrapper, useTurnstileContextSafe } from "@/components/security/turnstile-form-wrapper";
import { api } from "@/trpc/react";

// 表单验证模式
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "请输入邮箱地址")
    .email("请输入有效的邮箱地址"),
  turnstileToken: z.string().optional(), // Turnstile验证token
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * 忘记密码表单组件（使用Turnstile上下文）
 */
function ForgotPasswordForm() {
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // 安全地使用Turnstile上下文（处理SSR）
  const turnstileContext = useTurnstileContextSafe();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // 使用tRPC mutation
  const forgotPasswordMutation = api.auth.forgotPassword.useMutation();

  // 验证Turnstile状态
  const validateTurnstile = (): boolean => {
    if (turnstileContext.isEnabled && !turnstileContext.isVerified) {
      setError('请完成人机验证');
      return false;
    }
    return true;
  };

  // 发送重置邮件
  const sendResetEmail = async (email: string): Promise<void> => {
    const result = await forgotPasswordMutation.mutateAsync({
      email,
      turnstileToken: turnstileContext.token || undefined,
    });

    setSuccess(result.message || "密码重置邮件已发送，请检查您的邮箱");
    reset();

    // 3秒后跳转到登录页面
    setTimeout(() => {
      router.push("/auth/signin");
    }, 3000);
  };

  // 处理表单提交
  const onSubmit = async (data: ForgotPasswordFormData) => {
    if (isSubmitting) return;

    if (!validateTurnstile()) return;

    setIsSubmitting(true);
    setSuccess("");
    setError("");

    try {
      await sendResetEmail(data.email);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "发送重置邮件失败，请稍后重试";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
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

      {/* 邮箱输入 */}
      <div className="space-y-2">
        <Label htmlFor="email">邮箱地址</Label>
        <Input
          id="email"
          type="email"
          placeholder="请输入您的邮箱地址"
          {...register("email")}
          className={errors.email ? "border-red-500" : ""}
          disabled={isSubmitting || !!success}
        />
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        )}
        <p className="text-xs text-gray-500">
          请确保邮箱地址正确，重置链接将发送到此邮箱
        </p>
      </div>

      {/* 提交按钮 */}
      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || !!success}
      >
        {isSubmitting ? "发送中..." : success ? "已发送" : "发送重置邮件"}
      </Button>

      {/* 帮助信息 */}
      {!success && (
        <div className="text-center text-sm text-gray-600">
          <p>没有收到邮件？请检查垃圾邮件文件夹</p>
          <p className="mt-1">
            如果仍有问题，请{" "}
            <Link
              href="/contact"
              className="text-blue-600 hover:text-blue-500"
            >
              联系客服
            </Link>
          </p>
        </div>
      )}
    </form>
  );
}

/**
 * 忘记密码页面内容组件
 */
function ForgotPasswordPageContent() {
  return (
    <AuthLayout
      title="重置密码"
      subtitle="找回您的账户"
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

        {/* 说明信息 */}
        <CollapsibleNotice
          title="密码重置说明"
          content="请输入您注册时使用的邮箱地址，我们将向该邮箱发送密码重置链接。重置链接有效期为1小时，请及时使用。"
          variant="info"
        />

        {/* 密码重置表单 */}
        <TurnstileFormWrapper
          featureId="PASSWORD_RESET"
          theme="light"
          className="space-y-4"
        >
          <ForgotPasswordForm />
        </TurnstileFormWrapper>

        {/* 其他选项 */}
        <div className="text-center space-y-2">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                其他选项
              </span>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <Link
              href="/auth/signup"
              className="text-blue-600 hover:text-blue-500 transition-colors"
            >
              创建新账户
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

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    }>
      <ForgotPasswordPageContent />
    </Suspense>
  );
}
