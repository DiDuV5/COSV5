/**
 * @fileoverview 认证相关类型定义
 * @description 定义认证模块使用的类型和接口
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { z } from "zod";

/**
 * 用户注册输入验证
 */
export const registerInputSchema = z.object({
  username: z.string().min(1, "用户名不能为空"),
  email: z.string().email("请输入有效的邮箱地址").optional(),
  password: z.string().min(1, "密码不能为空"),
  displayName: z.string().min(1, "显示名称不能为空").max(50, "显示名称最多50个字符"),
  turnstileToken: z.string().optional(), // Turnstile验证token
});

/**
 * 用户名检查输入验证
 */
export const checkUsernameInputSchema = z.object({
  username: z.string().min(1, "用户名不能为空"),
});

/**
 * 邮箱检查输入验证
 */
export const checkEmailInputSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
});

/**
 * 用户资料更新输入验证
 */
export const updateProfileInputSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal("")),
  birthday: z.date().optional(),
});

/**
 * 登录输入验证
 */
export const loginInputSchema = z.object({
  username: z.string().min(1, "用户名不能为空"),
  password: z.string().min(1, "密码不能为空"),
});

/**
 * 忘记密码输入验证
 */
export const forgotPasswordInputSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  turnstileToken: z.string().optional(),
});

/**
 * 重置密码输入验证
 */
export const resetPasswordInputSchema = z.object({
  token: z.string().min(1, "重置令牌不能为空"),
  newPassword: z.string().min(6, "新密码至少6个字符").max(100, "密码最多100个字符"),
  turnstileToken: z.string().optional(),
});

/**
 * 密码修改输入验证
 */
export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, "请输入当前密码"),
  newPassword: z.string().min(6, "新密码至少6个字符").max(100),
});





/**
 * 认证设置类型
 */
export interface AuthSettings {
  usernameMinLength: number;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
}

/**
 * 用户注册结果类型
 */
export interface UserRegistrationResult {
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
  canRetryRegistration?: boolean; // 新增：表示可以重新注册
}

/**
 * 用户名可用性检查结果
 */
export interface UsernameAvailabilityResult {
  available: boolean;
  message: string;
}

/**
 * 邮箱可用性检查结果
 */
export interface EmailAvailabilityResult {
  available: boolean;
  message: string;
}

/**
 * 密码修改结果
 */
export interface PasswordChangeResult {
  success: boolean;
  message: string;
}

/**
 * 用户资料更新结果
 */
export interface ProfileUpdateResult {
  success: boolean;
  message: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    bio: string | null;
    location: string | null;
    website: string | null;
    birthday: Date | null;
    updatedAt: Date;
  };
}
