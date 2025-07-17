/**
 * @fileoverview 邮箱输入字段组件
 * @description 邮箱输入字段，包含实时验证
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

interface EmailFieldProps {
  register: UseFormRegister<SignUpFormData>;
  error?: FieldError;
  validation: ValidationState;
  email: string;
  publicSettings?: PublicSettings;
}

export function EmailField({
  register,
  error,
  validation,
  email,
  publicSettings,
}: EmailFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="email">
        邮箱{publicSettings?.enableEmailVerification ? " *" : "（可选）"}
      </Label>
      <div className="relative">
        <Input
          id="email"
          type="email"
          placeholder="请输入邮箱地址"
          {...register("email")}
          className={`pr-10 ${
            error
              ? "border-red-500"
              : validation.isValid && email && email.length > 0
                ? "border-green-500"
                : ""
          }`}
        />
        {/* 验证状态图标 */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {validation.isChecking ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : email && email.length > 0 ? (
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
      {!error && validation.message && email && (
        <p className={`text-sm ${validation.isValid ? "text-green-600" : "text-red-600"}`}>
          {validation.message}
        </p>
      )}

      {/* 帮助文本 */}
      {!error && !validation.message && (
        <p className="text-xs text-gray-500">
          {publicSettings?.enableEmailVerification
            ? "邮箱地址用于账户验证、找回密码和接收通知"
            : "邮箱地址用于找回密码和接收通知（可选）"
          }
        </p>
      )}
    </div>
  );
}
