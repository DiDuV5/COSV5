/**
 * @fileoverview 注册页面类型定义
 * @description 注册页面相关的类型定义和验证模式
 * @author Augment AI
 * @date 2025-07-09
 * @version 1.0.0
 */

import { z } from "zod";

/**
 * 系统设置类型（从公开设置API获取）
 */
export interface PublicSettings {
  usernameMinLength?: number;
  passwordMinLength?: number;
  passwordRequireUppercase?: boolean;
  passwordRequireLowercase?: boolean;
  passwordRequireNumbers?: boolean;
  passwordRequireSymbols?: boolean;
  enableEmailVerification?: boolean;
  registerPageNotice?: string;
}

/**
 * 动态表单验证模式生成函数
 */
export const createSignUpSchema = (settings?: PublicSettings) => {
  const usernameMinLength = settings?.usernameMinLength || 5;
  const passwordMinLength = settings?.passwordMinLength || 6;

  // 构建密码验证规则
  let passwordSchema = z
    .string()
    .min(passwordMinLength, `密码至少${passwordMinLength}个字符`)
    .max(100, "密码最多100个字符");

  // 添加密码复杂度要求
  if (settings?.passwordRequireUppercase) {
    passwordSchema = passwordSchema.regex(/[A-Z]/, "密码必须包含大写字母");
  }
  if (settings?.passwordRequireLowercase) {
    passwordSchema = passwordSchema.regex(/[a-z]/, "密码必须包含小写字母");
  }
  if (settings?.passwordRequireNumbers) {
    passwordSchema = passwordSchema.regex(/\d/, "密码必须包含数字");
  }
  if (settings?.passwordRequireSymbols) {
    passwordSchema = passwordSchema.regex(/[!@#$%^&*(),.?":{}|<>]/, "密码必须包含特殊字符");
  }

  // 邮箱验证规则
  const emailSchema = settings?.enableEmailVerification
    ? z.string().email("请输入有效的邮箱地址").min(1, "启用邮箱验证时邮箱为必填项")
    : z.string().email("请输入有效的邮箱地址").optional().or(z.literal(""));

  return z.object({
    username: z
      .string()
      .min(usernameMinLength, `用户名至少${usernameMinLength}个字符`)
      .max(20, "用户名最多20个字符")
      .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, "用户名只能包含字母、数字、下划线和中文字符"),
    email: emailSchema,
    displayName: z
      .string()
      .min(1, "显示名称不能为空")
      .max(50, "显示名称最多50个字符"),
    password: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, "请确认密码"),
    agreeToTerms: z
      .boolean()
      .refine((val) => val === true, "请同意服务条款"),
    turnstileToken: z.string().optional(), // Turnstile验证token
  }).refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });
};

/**
 * 注册表单数据类型
 */
export type SignUpFormData = {
  username: string;
  email: string;
  displayName: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
  turnstileToken?: string; // Turnstile验证token
};

/**
 * 注册API请求数据类型
 */
export type RegisterRequestData = {
  username: string;
  email?: string;
  displayName: string;
  password: string;
  turnstileToken?: string;
};

/**
 * 注册API响应数据类型
 */
export interface RegisterResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    username: string;
    email: string | null;
    displayName: string;
    userLevel: string;
    isVerified: boolean;
    canPublish: boolean;
    approvalStatus: string;
    createdAt: Date;
  };
  requiresEmailVerification?: boolean;
  requiresApproval?: boolean;
  emailSent?: boolean;
  canRetryRegistration?: boolean;
}

/**
 * 表单状态类型
 */
export interface FormState {
  isPending: boolean;
  error: string;
  success: string;
  passwordWarning: string;
}

/**
 * 验证状态类型
 */
export interface ValidationState {
  isChecking: boolean;
  isValid: boolean;
  message: string;
}
