/**
 * @fileoverview 用户名输入字段组件
 * @description 用户名输入字段，包含实时验证
 * @author Augment AI
 * @date 2025-07-09
 * @version 1.0.0
 */

"use client";

import { UseFormRegister, FieldError } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X, Loader2 } from "lucide-react";
import type { SignUpFormData, PublicSettings, ValidationState } from "../types";

interface UsernameFieldProps {
  register: UseFormRegister<SignUpFormData>;
  error?: FieldError;
  validation: ValidationState;
  username: string;
  publicSettings?: PublicSettings;
}

export function UsernameField({
  register,
  error,
  validation,
  username,
  publicSettings,
}: UsernameFieldProps) {
  const minLength = publicSettings?.usernameMinLength || 5;

  return (
    <div className="space-y-2">
      <Label htmlFor="username">用户名 *</Label>
      <div className="relative">
        <Input
          id="username"
          type="text"
          placeholder={`请输入用户名（${minLength}-20个字符）`}
          {...register("username")}
          className={`pr-10 ${
            error
              ? "border-red-500"
              : validation.isValid && username.length >= minLength
                ? "border-green-500"
                : ""
          }`}
        />
        {/* 验证状态图标 */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {validation.isChecking ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : username.length >= minLength ? (
            validation.isValid ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <X className="h-4 w-4 text-red-500" />
            )
          ) : null}
        </div>
      </div>

      {/* 错误信息优先显示 */}
      {error && (
        <p className="text-sm text-red-600">{error.message}</p>
      )}

      {/* 实时验证信息 */}
      {!error && validation.message && (
        <p className={`text-sm ${validation.isValid ? "text-green-600" : "text-red-600"}`}>
          {validation.message}
        </p>
      )}

      {/* 帮助文本 */}
      {!error && !validation.message && (
        <p className="text-xs text-gray-500">
          用户名只能包含字母、数字、下划线和中文字符，长度 {minLength}-20 个字符
        </p>
      )}
    </div>
  );
}
