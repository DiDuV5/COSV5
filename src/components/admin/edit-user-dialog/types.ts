/**
 * @fileoverview 编辑用户对话框类型定义
 * @description 定义编辑用户对话框相关的类型和验证模式
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { z } from "zod";

/**
 * 动态创建表单验证模式的函数
 */
export const createEditUserSchema = (usernameMinLength: number = 6) => z.object({
  username: z
    .string()
    .min(usernameMinLength, `用户名至少${usernameMinLength}个字符`)
    .max(20, "用户名最多20个字符")
    .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, "用户名只能包含字母、数字、下划线和中文字符"),
  email: z.string().email("请输入有效的邮箱地址").optional().or(z.literal("")),
  displayName: z.string().max(50, "显示名称最多50个字符").optional().or(z.literal("")),
  bio: z.string().max(500, "个人简介最多500个字符").optional().or(z.literal("")),
  userLevel: z.enum(["GUEST", "USER", "VIP", "CREATOR", "ADMIN"]),
  isVerified: z.boolean(),
  isActive: z.boolean(),
  canPublish: z.boolean(),
  avatarUrl: z.string().url("请输入有效的URL").optional().or(z.literal("")),
});

/**
 * 密码重置验证模式
 */
export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "密码至少6个字符"),
  confirmPassword: z.string().min(6, "请确认密码"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "两次输入的密码不一致",
  path: ["confirmPassword"],
});

/**
 * 编辑用户表单数据类型
 */
export type EditUserFormData = z.infer<ReturnType<typeof createEditUserSchema>>;

/**
 * 密码重置表单数据类型
 */
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/**
 * 编辑用户对话框属性
 */
export interface EditUserDialogProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

/**
 * 用户资料标签页属性
 */
export interface UserProfileTabProps {
  user: any;
  editForm: any;
  isSubmitting: boolean;
  onSubmit: (data: EditUserFormData) => void;
  onClose: () => void;
}

/**
 * 用户设置标签页属性
 */
export interface UserSettingsTabProps {
  editForm: any;
  isSubmitting: boolean;
  onSubmit: (data: EditUserFormData) => void;
  onClose: () => void;
}

/**
 * 用户统计标签页属性
 */
export interface UserStatsTabProps {
  user: any;
}

/**
 * 密码重置标签页属性
 */
export interface PasswordResetTabProps {
  passwordForm: any;
  isSubmitting: boolean;
  showPassword: boolean;
  showConfirmPassword: boolean;
  onSubmit: (data: ResetPasswordFormData) => void;
  onClose: () => void;
  onTogglePassword: () => void;
  onToggleConfirmPassword: () => void;
}

/**
 * 用户头像区域属性
 */
export interface UserAvatarSectionProps {
  user: any;
}
