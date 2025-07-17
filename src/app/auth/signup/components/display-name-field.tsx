/**
 * @fileoverview 显示名称输入字段组件
 * @description 显示名称输入字段
 * @author Augment AI
 * @date 2025-07-09
 * @version 1.0.0
 */

"use client";

import { UseFormRegister, FieldError } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SignUpFormData } from "../types";

interface DisplayNameFieldProps {
  register: UseFormRegister<SignUpFormData>;
  error?: FieldError;
}

export function DisplayNameField({ register, error }: DisplayNameFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="displayName">显示名称 *</Label>
      <Input
        id="displayName"
        type="text"
        placeholder="请输入显示名称"
        {...register("displayName")}
        className={error ? "border-red-500" : ""}
      />
      {error && (
        <p className="text-sm text-red-600">{error.message}</p>
      )}
    </div>
  );
}
