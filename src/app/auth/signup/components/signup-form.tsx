/**
 * @fileoverview 注册表单组件
 * @description 用户注册表单的主要组件
 * @author Augment AI
 * @date 2025-07-09
 * @version 1.0.0
 */

"use client";

import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { TurnstileFormWrapper, useTurnstileContextSafe } from "@/components/security/turnstile-form-wrapper";
import { UsernameField } from "./username-field";
import { EmailField } from "./email-field";
import { DisplayNameField } from "./display-name-field";
import { PasswordField } from "./password-field";
import { ConfirmPasswordField } from "./confirm-password-field";
import { TermsAgreementField } from "./terms-agreement-field";
import { FormMessages } from "./form-messages";
import type { SignUpFormData, PublicSettings, ValidationState } from "../types";

interface SignupFormProps {
  form: UseFormReturn<SignUpFormData>;
  publicSettings: PublicSettings | undefined;
  usernameValidation: ValidationState;
  emailValidation: ValidationState;
  error: string;
  success: string;
  passwordWarning: string;
  isSubmitting: boolean;
  onSubmit: (data: SignUpFormData, turnstileToken?: string) => void;
  onPasswordWarning: (warning: string) => void;
}

/**
 * 内部注册表单组件（使用Turnstile上下文）
 */
function SignupFormInner({
  form,
  publicSettings,
  usernameValidation,
  emailValidation,
  error,
  success,
  passwordWarning,
  isSubmitting,
  onSubmit,
  onPasswordWarning,
}: Omit<SignupFormProps, 'onSubmit'> & {
  onSubmit: (data: SignUpFormData, turnstileToken?: string) => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = form;

  // 安全地使用Turnstile上下文（处理SSR）
  const turnstileContext = useTurnstileContextSafe();

  // 监听表单字段变化
  const password = watch("password");
  const username = watch("username");
  const email = watch("email");

  // 检查是否可以提交
  const canSubmit = (): boolean => {
    if (turnstileContext.isEnabled && !turnstileContext.isVerified) {
      return false;
    }
    return true;
  };

  // 处理表单提交
  const handleFormSubmit = async (data: SignUpFormData) => {
    if (!canSubmit()) return;
    await onSubmit(data, turnstileContext.token || undefined);
  };

  // 计算按钮是否禁用
  const isButtonDisabled = (): boolean => {
    return Boolean(
      isSubmitting ||
      usernameValidation.isChecking ||
      emailValidation.isChecking ||
      (username.length >= (publicSettings?.usernameMinLength || 5) && !usernameValidation.isValid) ||
      (email && email.length > 0 && !emailValidation.isValid)
    );
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* 错误和成功提示 */}
        <FormMessages
          error={error}
          success={success}
        />

        {/* 用户名输入 */}
        <UsernameField
          register={register}
          error={errors.username}
          validation={usernameValidation}
          username={username}
          publicSettings={publicSettings}
        />

        {/* 邮箱输入 */}
        <EmailField
          register={register}
          error={errors.email}
          validation={emailValidation}
          email={email}
          publicSettings={publicSettings}
        />

        {/* 显示名称输入 */}
        <DisplayNameField
          register={register}
          error={errors.displayName}
        />

        {/* 密码输入 */}
        <PasswordField
          register={register}
          error={errors.password}
          password={password}
          passwordWarning={passwordWarning}
          publicSettings={publicSettings}
          onPasswordWarning={onPasswordWarning}
        />

        {/* 确认密码输入 */}
        <ConfirmPasswordField
          register={register}
          error={errors.confirmPassword}
        />

        {/* 服务条款同意 */}
        <TermsAgreementField
          register={register}
          error={errors.agreeToTerms}
        />

        {/* 提交按钮 */}
        <Button
          type="submit"
          className="w-full"
          disabled={isButtonDisabled()}
        >
          {isSubmitting ? "注册中..." : "注册账户"}
        </Button>

        {/* 验证状态提示 */}
        {(usernameValidation.isChecking || emailValidation.isChecking) && (
          <p className="text-sm text-gray-600 text-center">
            正在验证信息...
          </p>
        )}
      </form>
    );
}

export function SignupForm(props: SignupFormProps) {
  return (
    <TurnstileFormWrapper
      featureId="USER_REGISTER"
      theme="light"
      className="space-y-4"
    >
      <SignupFormInner {...props} onSubmit={(data, token) => props.onSubmit(data, token)} />
    </TurnstileFormWrapper>
  );
}
