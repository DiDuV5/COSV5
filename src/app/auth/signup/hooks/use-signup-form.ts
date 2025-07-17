/**
 * @fileoverview 注册表单Hook
 * @description 管理注册表单的状态和逻辑
 * @author Augment AI
 * @date 2025-07-09
 * @version 1.0.0
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { api } from "@/trpc/react";
import { useUsernameValidation, useEmailValidation } from "@/hooks/use-auth-validation";
import { cleanPasswordSpaces } from "@/lib/password-utils";
import { createSignUpSchema, type SignUpFormData, type PublicSettings } from "../types";

export function useSignupForm() {
  const [passwordWarning, setPasswordWarning] = useState<string>("");
  const router = useRouter();

  // 获取公开系统设置
  const { data: publicSettings, isPending: settingsLoading } = api.settings.getPublicSettings.useQuery();

  // 使用tRPC mutation
  const registerMutation = api.auth.register.useMutation();

  // 动态生成验证模式
  const signUpSchema = createSignUpSchema(publicSettings);

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      username: "",
      email: "",
      displayName: "",
      password: "",
      confirmPassword: "",
      agreeToTerms: false,
    },
  });

  // 监听表单字段变化
  const password = form.watch("password");
  const username = form.watch("username");
  const email = form.watch("email");

  // 实时验证
  const usernameValidation = useUsernameValidation(username, 500, publicSettings?.usernameMinLength || 5);
  const emailValidation = useEmailValidation(email);

  // 表单提交状态
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 处理注册提交（由TurnstileFormWrapper包装）
  const handleSubmit = async (data: SignUpFormData, turnstileToken?: string) => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // 清理密码空格
      const cleanedPassword = cleanPasswordSpaces(data.password);

      const result = await registerMutation.mutateAsync({
        username: data.username,
        email: data.email || undefined,
        displayName: data.displayName,
        password: cleanedPassword,
        turnstileToken, // 传递Turnstile token
      });

      // 检查是否需要邮箱验证
      if (result.requiresEmailVerification) {
        // 返回成功结果，让页面组件处理成功提示
        return {
          success: true,
          message: result.message || "注册成功，请检查您的邮箱并点击验证链接完成注册",
          requiresEmailVerification: true,
          emailSent: result.emailSent
        };
      }

      // 如果不需要邮箱验证，则自动登录
      try {
        const signInResult = await signIn("credentials", {
          username: result.user.username,
          password: form.watch("password"),
          redirect: false,
        });

        if (signInResult?.ok) {
          setTimeout(() => {
            router.push("/");
            router.refresh();
          }, 1500);
        } else {
          setTimeout(() => {
            router.push("/auth/signin");
          }, 2000);
        }
      } catch (error) {
        setTimeout(() => {
          router.push("/auth/signin");
        }, 2000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "注册失败，请稍后重试";
      throw new Error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    publicSettings,
    settingsLoading,
    usernameValidation,
    emailValidation,
    passwordWarning,
    setPasswordWarning,
    isSubmitting,
    handleSubmit,
    password,
    username,
    email,
  };
}
