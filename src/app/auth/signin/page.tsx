/**
 * @fileoverview 登录页面组件
 * @description 用户登录页面，支持用户名/邮箱登录
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - next-auth: ^4.24.0
 * - react-hook-form: ^7.48.2
 * - zod: ^3.22.4
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2024-01-XX: 添加表单验证和改进的错误处理
 */

"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthLayout } from "@/components/auth/auth-layout";
import { CollapsibleNotice } from "@/components/ui/collapsible-notice";
import { api } from "@/trpc/react";
import { cleanPasswordSpaces } from "@/lib/password-utils";
import { TurnstileFormWrapper, useTurnstileContextSafe } from "@/components/security/turnstile-form-wrapper";

// 表单验证模式
const signInSchema = z.object({
  username: z
    .string()
    .min(1, "请输入用户名或邮箱")
    .max(100, "用户名或邮箱过长"),
  password: z
    .string()
    .min(1, "请输入密码")
    .max(100, "密码过长"),
  rememberMe: z.boolean().optional(),
  turnstileToken: z.string().optional(), // Turnstile验证token
});

type SignInFormData = z.infer<typeof signInSchema>;

/**
 * 登录表单组件（使用Turnstile上下文）
 */
function SignInForm() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordWarning, setPasswordWarning] = useState<string>("");
  const router = useRouter();

  // 安全地使用Turnstile上下文（处理SSR）
  const turnstileContext = useTurnstileContextSafe();

  // 使用tRPC登录mutation（根据Turnstile状态选择API）
  const loginMutation = turnstileContext.isEnabled
    ? api.auth.loginWithTurnstile.useMutation()
    : api.auth.login.useMutation();

  // 表单提交状态
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError: setFormError,
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  // 验证Turnstile状态
  const validateTurnstile = async (): Promise<boolean> => {
    if (!turnstileContext.isEnabled) return true;

    console.log('🔍 登录验证检查:', {
      isEnabled: turnstileContext.isEnabled,
      isVerified: turnstileContext.isVerified,
      hasToken: !!turnstileContext.token,
      tokenLength: turnstileContext.token?.length || 0
    });

    const hasValidToken = turnstileContext.token && turnstileContext.token.length > 0;
    const isVerified = turnstileContext.isVerified;

    if (!hasValidToken && !isVerified) {
      console.log('❌ 登录验证失败：缺少有效的验证token');
      setError('请完成人机验证');
      return false;
    }

    // 如果有token但isVerified为false，给一个短暂的延迟让状态同步
    if (hasValidToken && !isVerified) {
      console.log('⚠️ 登录验证：token存在但isVerified为false，等待状态同步...');
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return true;
  };

  // 执行登录流程
  const performLogin = async (data: SignInFormData): Promise<void> => {
    const cleanedPassword = cleanPasswordSpaces(data.password);

    // 第一步：使用tRPC进行验证
    const loginParams = turnstileContext.isEnabled
      ? {
          username: data.username,
          password: cleanedPassword,
          turnstileToken: turnstileContext.token || undefined,
        }
      : {
          username: data.username,
          password: cleanedPassword,
        };

    await loginMutation.mutateAsync(loginParams);

    // 第二步：使用NextAuth.js建立会话状态
    const nextAuthResult = await signIn('credentials', {
      username: data.username,
      password: cleanedPassword,
      redirect: false,
    });

    if (nextAuthResult?.error) {
      setError("会话建立失败，请重试");
      return;
    }

    setSuccess("登录成功，正在跳转...");
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1000);
  };

  // 处理表单提交
  const onSubmit = async (data: SignInFormData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const isValid = await validateTurnstile();
      if (!isValid) return;

      await performLogin(data);
    } catch (error) {
      console.error("登录错误:", error);
      const errorMessage = error instanceof Error ? error.message : "登录过程中发生错误，请稍后重试";
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
        </div>
      )}

      {/* 用户名输入 */}
      <div className="space-y-2">
        <Label htmlFor="username">用户名或邮箱</Label>
        <Input
          id="username"
          type="text"
          placeholder="请输入用户名或邮箱"
          {...register("username")}
          className={errors.username ? "border-red-500" : ""}
        />
        {errors.username && (
          <p className="text-sm text-red-600">{errors.username.message}</p>
        )}
      </div>

      {/* 密码输入 */}
      <div className="space-y-2">
        <Label htmlFor="password">密码</Label>
        <PasswordInput
          id="password"
          placeholder="请输入密码"
          autoComplete="current-password"
          error={!!errors.password}
          preventSpaces={true}
          showSpaceWarning={true}
          onSpaceWarning={setPasswordWarning}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        )}
        {passwordWarning && !errors.password && (
          <p className="text-sm text-yellow-600">{passwordWarning}</p>
        )}
      </div>

      {/* 记住我选项 */}
      <div className="flex items-center">
        <input
          id="rememberMe"
          type="checkbox"
          {...register("rememberMe")}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <Label htmlFor="rememberMe" className="ml-2 text-sm text-gray-700">
          记住我
        </Label>
      </div>

      {/* Turnstile验证由TurnstileFormWrapper自动处理 */}

      {/* 提交按钮 */}
      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? "登录中..." : "登录"}
      </Button>
    </form>
  );
}

function SignInPageContent() {
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const searchParams = useSearchParams();

  // 获取公开系统设置
  const { data: publicSettings } = api.settings.getPublicSettings.useQuery();

  // 确保组件已挂载，避免 Hydration 错误
  useEffect(() => {
    setMounted(true);
  }, []);

  // 处理 URL 参数中的消息
  useEffect(() => {
    if (!mounted) return;

    const verified = searchParams?.get("verified");
    const message = searchParams?.get("message");
    const errorParam = searchParams?.get("error");

    if (verified === "true") {
      setSuccess("邮箱验证成功！您现在可以登录了。");
    } else if (message) {
      // 处理各种成功消息
      const successMessages: Record<string, string> = {
        email_verified: "邮箱验证成功！您现在可以登录了。",
        email_verified_approved: "邮箱验证成功！您的账户已通过审核，可以正常使用所有功能。",
        email_verified_pending_approval: "邮箱验证成功！您的账户正在等待管理员审核，审核通过后即可正常使用。",
      };

      const successMessage = successMessages[message] || decodeURIComponent(message);
      setSuccess(successMessage);
    } else if (errorParam) {
      // 处理各种登录错误
      const errorMessages: Record<string, string> = {
        //         account_rejected: "账户审核未通过，请联系管理员",
        insufficient_permissions: "权限不足，无法访问该页面",

        // 邮箱验证错误
        missing_token: "验证链接无效，缺少验证令牌",
        invalid_token: "验证链接无效或已失效",
        expired_token: "验证链接已过期，请重新注册",
        user_not_found: "用户不存在，请重新注册",
        verification_failed: "邮箱验证失败，请重试或联系管理员",
      };

      const errorMessage = message ? decodeURIComponent(message) : errorMessages[errorParam] || "登录失败，请重试";
      setError(errorMessage);
    }
  }, [searchParams, mounted]);

  // 在组件完全挂载前显示加载状态
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthLayout
      title="用户登录"
      subtitle="欢迎回到兔图"
    >
      <div className="space-y-6">
        {/* 导航链接 */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            还没有账户？{" "}
            <Link
              href="/auth/signup"
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              立即注册
            </Link>
          </p>
        </div>

        {/* 运营说明 */}
        {publicSettings?.loginPageNotice && (
          <CollapsibleNotice
            title="使用须知"
            content={publicSettings.loginPageNotice}
            variant="info"
          />
        )}

        {/* Telegram 登录 - 根据设置显示 */}
        {publicSettings?.enableTelegramLogin && (
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  快捷登录
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  或账号登录
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 登录表单 */}
        <div className="space-y-4">
          <TurnstileFormWrapper
            featureId="USER_LOGIN"
            theme="auto"
          >
            <SignInForm />
          </TurnstileFormWrapper>
        </div>

        {/* 忘记密码链接 */}
        <div className="text-center">
          <Link
            href="/auth/forgot-password"
            className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
          >
            忘记密码？
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    }>
      <SignInPageContent />
    </Suspense>
  );
}
