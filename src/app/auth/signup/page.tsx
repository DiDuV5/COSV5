/**
 * @fileoverview 用户注册页面组件 - 重构版本
 * @description 用户注册页面，支持用户名、邮箱、密码注册
 * @author Augment AI
 * @date 2025-07-09
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 *
 * @dependencies
 * - next: ^14.0.0
 * - react-hook-form: ^7.48.2
 * - zod: ^3.22.4
 * - @trpc/react-query: ^10.45.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2025-07-09: 模块化重构，拆分组件和hooks
 */

"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/auth-layout";
import { CollapsibleNotice } from "@/components/ui/collapsible-notice";
import { SignupForm } from "./components/signup-form";
import { useSignupForm } from "./hooks/use-signup-form";

/**
 * 注册页面内容组件
 */
function SignUpPageContent() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const {
    form,
    publicSettings,
    usernameValidation,
    emailValidation,
    passwordWarning,
    setPasswordWarning,
    isSubmitting,
    handleSubmit,
  } = useSignupForm();

  // 处理表单提交（TurnstileFormWrapper会自动传递token）
  const handleFormSubmit = async (data: any, turnstileToken?: string) => {
    setError("");
    setSuccess("");

    try {
      const result = await handleSubmit(data, turnstileToken);

      // 如果返回了成功结果（邮箱验证情况）
      if (result && result.success) {
        setSuccess(result.message);
      }
      // 其他情况（自动登录等）在hook内部处理
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "注册失败，请稍后重试";
      setError(errorMessage);
    }
  };

  return (
    <AuthLayout
      title="用户注册"
      subtitle="加入兔图社区"
    >
      <div className="space-y-6">
        {/* 导航链接 */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            已有账户？{" "}
            <Link
              href="/auth/signin"
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              立即登录
            </Link>
          </p>
        </div>

        {/* 运营说明 */}
        {publicSettings?.registerPageNotice && (
          <CollapsibleNotice
            title="使用须知"
            content={publicSettings.registerPageNotice}
            variant="info"
          />
        )}

        {/* 注册表单 */}
        <SignupForm
          form={form}
          publicSettings={publicSettings}
          usernameValidation={usernameValidation}
          emailValidation={emailValidation}
          error={error}
          success={success}
          passwordWarning={passwordWarning}
          isSubmitting={isSubmitting}
          onSubmit={handleFormSubmit}
          onPasswordWarning={setPasswordWarning}
        />
      </div>
    </AuthLayout>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    }>
      <SignUpPageContent />
    </Suspense>
  );
}
