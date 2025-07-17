/**
 * @fileoverview 确认密码输入字段组件
 * @description 确认密码输入字段
 * @author Augment AI
 * @date 2025-07-09
 * @version 1.0.0
 */

"use client";

import { UseFormRegister, FieldError } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import type { SignUpFormData } from "../types";

interface ConfirmPasswordFieldProps {
  register: UseFormRegister<SignUpFormData>;
  error?: FieldError;
}

export function ConfirmPasswordField({ register, error }: ConfirmPasswordFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="confirmPassword">确认密码 *</Label>
      <PasswordInput
        id="confirmPassword"
        placeholder="请再次输入密码"
        autoComplete="new-password"
        error={!!error}
        preventSpaces={true}
        showSpaceWarning={false} // 确认密码不显示警告，避免重复
        {...register("confirmPassword")}
      />
      {error && (
        <p className="text-sm text-red-600">{error.message}</p>
      )}
    </div>
  );
}
