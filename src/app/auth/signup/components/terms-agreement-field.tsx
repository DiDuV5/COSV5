/**
 * @fileoverview 服务条款同意字段组件
 * @description 服务条款同意复选框
 * @author Augment AI
 * @date 2025-07-09
 * @version 1.0.0
 */

"use client";

import { UseFormRegister, FieldError } from "react-hook-form";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import type { SignUpFormData } from "../types";

interface TermsAgreementFieldProps {
  register: UseFormRegister<SignUpFormData>;
  error?: FieldError;
}

export function TermsAgreementField({ register, error }: TermsAgreementFieldProps) {
  return (
    <div className="flex items-start space-x-2">
      <input
        id="agreeToTerms"
        type="checkbox"
        {...register("agreeToTerms")}
        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
      />
      <div className="flex-1">
        <Label htmlFor="agreeToTerms" className="text-sm text-gray-700">
          我已阅读并同意{" "}
          <Link href="/terms" className="text-blue-600 hover:text-blue-500">
            服务条款
          </Link>{" "}
          和{" "}
          <Link href="/privacy" className="text-blue-600 hover:text-blue-500">
            隐私政策
          </Link>
        </Label>
        {error && (
          <p className="text-sm text-red-600 mt-1">{error.message}</p>
        )}
      </div>
    </div>
  );
}
