/**
 * @fileoverview 密码输入字段组件
 * @description 密码输入字段，包含强度指示器和要求提示
 * @author Augment AI
 * @date 2025-07-09
 * @version 1.0.0
 */

"use client";

import { UseFormRegister, FieldError } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import type { SignUpFormData, PublicSettings } from "../types";

interface PasswordFieldProps {
  register: UseFormRegister<SignUpFormData>;
  error?: FieldError;
  password: string;
  passwordWarning: string;
  publicSettings?: PublicSettings;
  onPasswordWarning: (warning: string) => void;
}

export function PasswordField({
  register,
  error,
  password,
  passwordWarning,
  publicSettings,
  onPasswordWarning,
}: PasswordFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="password">密码 *</Label>
      <PasswordInput
        id="password"
        placeholder={`请输入密码（至少${publicSettings?.passwordMinLength || 6}个字符）`}
        autoComplete="new-password"
        error={!!error}
        preventSpaces={true}
        showSpaceWarning={true}
        onSpaceWarning={onPasswordWarning}
        {...register("password")}
      />
      {error && (
        <p className="text-sm text-red-600">{error.message}</p>
      )}
      {passwordWarning && !error && (
        <p className="text-sm text-yellow-600">{passwordWarning}</p>
      )}

      {/* 密码要求提示 */}
      {!error && publicSettings && (
        <div className="text-xs text-gray-600">
          <p className="font-medium mb-1">密码要求：</p>
          <ul className="space-y-0.5">
            <li>• 至少 {publicSettings.passwordMinLength} 个字符</li>
            {publicSettings.passwordRequireUppercase && <li>• 包含大写字母</li>}
            {publicSettings.passwordRequireLowercase && <li>• 包含小写字母</li>}
            {publicSettings.passwordRequireNumbers && <li>• 包含数字</li>}
            {publicSettings.passwordRequireSymbols && <li>• 包含特殊字符</li>}
          </ul>
        </div>
      )}

      {/* 密码强度指示器 */}
      <PasswordStrength password={password} />
    </div>
  );
}
