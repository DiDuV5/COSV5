/**
 * @fileoverview 邮箱验证相关的Zod模式定义
 * @description 定义邮箱验证API的输入输出模式
 * @author Augment AI
 * @date 2025-07-03
 */

import { z } from "zod";

/**
 * 邮箱验证输入模式
 */
export const EmailVerificationInput = z.object({
  token: z.string().min(1, "验证令牌不能为空"),
});

/**
 * 发送验证邮件输入模式
 */
export const SendVerificationEmailInput = z.object({
  email: z.string().email("邮箱格式不正确"),
});

/**
 * 邮箱验证结果输出模式
 */
export const EmailVerificationOutput = z.object({
  success: z.boolean(),
  message: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    emailVerified: z.date().nullable(),
    username: z.string(),
    displayName: z.string().nullable(),
  }).optional(),
});

/**
 * 令牌检查输出模式
 */
export const TokenCheckOutput = z.object({
  valid: z.boolean(),
  expired: z.boolean(),
  email: z.string().optional(),
  expiresAt: z.date().optional(),
});

/**
 * 基础成功响应模式
 */
export const BasicSuccessOutput = z.object({
  success: z.boolean(),
  message: z.string(),
});

/**
 * 清理结果输出模式
 */
export const CleanupOutput = z.object({
  cleaned: z.number(),
});

/**
 * 验证状态输出模式
 */
export const VerificationStatusOutput = z.object({
  emailVerified: z.boolean(),
  verifiedAt: z.date().nullable(),
  pendingVerification: z.boolean(),
  pendingEmail: z.string().optional(),
});

/**
 * 邮箱配置检查输出模式
 */
export const EmailConfigCheckOutput = z.object({
  configured: z.boolean(),
  missingVars: z.array(z.string()),
  testEmailSent: z.boolean().optional(),
});

/**
 * 测试邮件输入模式
 */
export const TestEmailInput = z.object({
  testEmail: z.string().email('请输入有效的邮箱地址'),
});

/**
 * 类型定义
 */
export type EmailVerificationInputType = z.infer<typeof EmailVerificationInput>;
export type SendVerificationEmailInputType = z.infer<typeof SendVerificationEmailInput>;
export type EmailVerificationOutputType = z.infer<typeof EmailVerificationOutput>;
export type TokenCheckOutputType = z.infer<typeof TokenCheckOutput>;
export type BasicSuccessOutputType = z.infer<typeof BasicSuccessOutput>;
export type CleanupOutputType = z.infer<typeof CleanupOutput>;
export type VerificationStatusOutputType = z.infer<typeof VerificationStatusOutput>;
export type EmailConfigCheckOutputType = z.infer<typeof EmailConfigCheckOutput>;
export type TestEmailInputType = z.infer<typeof TestEmailInput>;
