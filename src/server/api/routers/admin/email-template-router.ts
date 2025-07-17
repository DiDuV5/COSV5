/**
 * @fileoverview 邮件模板管理路由
 * @description 处理邮件模板的获取、更新和预览功能
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { TRPCErrorHandler } from "@/lib/errors/trpc-error-handler";
import { EmailTemplateService, EmailTemplateType } from "@/lib/email/services/email-template-service";
import { CustomEmailTemplateService } from "@/lib/email/services/custom-template-service";

/**
 * 邮件模板类型枚举
 */
const EmailTemplateTypeSchema = z.enum([
  "TEST_EMAIL",
  "VERIFICATION",
  "PASSWORD_RESET",
  "REGISTRATION_PENDING",
  "REGISTRATION_APPROVED",
  "PRIVILEGE_GRANTED",
  "PRIVILEGE_EXPIRING",
  "WELCOME",
  "NOTIFICATION",
  "SYSTEM_NOTIFICATION",
]);

/**
 * 邮件模板路由
 */
export const emailTemplateRouter = createTRPCRouter({
  /**
   * 获取所有模板列表
   */
  getTemplates: adminProcedure
    .query(async ({ ctx }) => {
      try {
        const templates = [
          {
            type: "TEST_EMAIL",
            name: "测试邮件",
            description: "用于管理员测试邮箱配置是否正常工作",
            category: "系统",
          },
          {
            type: "VERIFICATION",
            name: "注册邮箱验证",
            description: "用户注册时的邮箱验证邮件",
            category: "认证",
          },
          {
            type: "PASSWORD_RESET",
            name: "忘记密码验证",
            description: "用户重置密码时的验证邮件",
            category: "认证",
          },
          {
            type: "REGISTRATION_PENDING",
            name: "等待注册审核",
            description: "用户提交注册申请后的确认邮件",
            category: "审核",
          },
          {
            type: "REGISTRATION_APPROVED",
            name: "审核通过通知",
            description: "用户注册审核通过的通知邮件",
            category: "审核",
          },
          {
            type: "PRIVILEGE_GRANTED",
            name: "权益开通",
            description: "用户权益开通通知邮件",
            category: "权益",
          },
          {
            type: "PRIVILEGE_EXPIRING",
            name: "权益到期",
            description: "用户权益即将到期或已到期的提醒邮件",
            category: "权益",
          },
        ];

        return {
          success: true,
          templates,
        };
      } catch (error) {
        console.error("获取邮件模板列表失败:", error);
        throw TRPCErrorHandler.businessError(
          "INTERNAL_ERROR" as any,
          "获取邮件模板列表失败"
        );
      }
    }),

  /**
   * 获取特定模板详情
   */
  getTemplate: adminProcedure
    .input(z.object({
      type: EmailTemplateTypeSchema,
    }))
    .query(async ({ ctx, input }) => {
      try {
        // 根据模板类型返回默认变量和示例
        const templateInfo = getTemplateInfo(input.type);

        // 将字符串类型转换为枚举类型
        const templateTypeMap: Record<string, EmailTemplateType> = {
          'TEST_EMAIL': EmailTemplateType.TEST_EMAIL,
          'VERIFICATION': EmailTemplateType.VERIFICATION,
          'PASSWORD_RESET': EmailTemplateType.PASSWORD_RESET,
          'REGISTRATION_PENDING': EmailTemplateType.REGISTRATION_PENDING,
          'REGISTRATION_APPROVED': EmailTemplateType.REGISTRATION_APPROVED,
          'PRIVILEGE_GRANTED': EmailTemplateType.PRIVILEGE_GRANTED,
          'PRIVILEGE_EXPIRING': EmailTemplateType.PRIVILEGE_EXPIRING,
          'WELCOME': EmailTemplateType.WELCOME,
          'NOTIFICATION': EmailTemplateType.NOTIFICATION,
          'SYSTEM_ALERT': EmailTemplateType.SYSTEM_ALERT,
        };

        const enumType = templateTypeMap[input.type];
        console.log('🔍 模板类型转换调试:', {
          inputType: input.type,
          enumType: enumType,
          enumTypeValue: enumType ? enumType.toString() : 'undefined',
          enumTypeType: typeof enumType,
          isEnumValue: enumType === EmailTemplateType.VERIFICATION,
          actualEnumValue: EmailTemplateType.VERIFICATION
        });

        if (!enumType) {
          throw new Error(`不支持的模板类型: ${input.type}`);
        }

        // 优先获取自定义模板，如果没有则使用默认模板
        const defaultVariables = getDefaultVariables(input.type);
        console.log('🔍 调用 getEmailTemplate:', {
          enumType: enumType,
          enumTypeValue: enumType.toString(),
          defaultVariables
        });

        // 使用统一的模板获取方法（优先自定义模板）
        const templateContent = await CustomEmailTemplateService.getEmailTemplate(
          enumType as EmailTemplateType,
          defaultVariables
        );

        return {
          success: true,
          template: {
            type: input.type,
            ...templateInfo,
            subject: templateContent.subject,
            htmlContent: templateContent.html,
            textContent: templateContent.text,
            isCustom: templateContent.isCustom,
          },
        };
      } catch (error) {
        console.error("获取邮件模板详情失败:", error);
        throw TRPCErrorHandler.businessError(
          "INTERNAL_ERROR" as any,
          "获取邮件模板详情失败"
        );
      }
    }),

  /**
   * 预览模板
   */
  previewTemplate: adminProcedure
    .input(z.object({
      type: EmailTemplateTypeSchema,
      variables: z.record(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { type, variables = {} } = input;

        // 获取默认变量
        const defaultVariables = getDefaultVariables(type);
        const mergedVariables = { ...defaultVariables, ...variables };

        // 映射字符串类型到枚举值
        const typeMapping: Record<string, EmailTemplateType> = {
          "TEST_EMAIL": EmailTemplateType.TEST_EMAIL,
          "VERIFICATION": EmailTemplateType.VERIFICATION,
          "PASSWORD_RESET": EmailTemplateType.PASSWORD_RESET,
          "REGISTRATION_PENDING": EmailTemplateType.REGISTRATION_PENDING,
          "REGISTRATION_APPROVED": EmailTemplateType.REGISTRATION_APPROVED,
          "PRIVILEGE_GRANTED": EmailTemplateType.PRIVILEGE_GRANTED,
          "PRIVILEGE_EXPIRING": EmailTemplateType.PRIVILEGE_EXPIRING,
          "WELCOME": EmailTemplateType.WELCOME,
          "NOTIFICATION": EmailTemplateType.NOTIFICATION,
          "SYSTEM_NOTIFICATION": EmailTemplateType.SYSTEM_ALERT,
        };

        const templateType = typeMapping[type];
        if (!templateType) {
          throw new Error(`不支持的邮件模板类型: ${type}`);
        }

        // 使用统一的模板获取方法（优先自定义模板）
        const emailContent = await CustomEmailTemplateService.getEmailTemplate(
          templateType,
          mergedVariables
        );

        return {
          success: true,
          previewHtml: emailContent.html,
          previewText: emailContent.text,
          subject: emailContent.subject,
        };
      } catch (error) {
        console.error("预览邮件模板失败:", error);
        throw TRPCErrorHandler.businessError(
          "INTERNAL_ERROR" as any,
          "预览邮件模板失败: " + (error instanceof Error ? error.message : "未知错误")
        );
      }
    }),

  /**
   * 保存自定义模板
   */
  saveTemplate: adminProcedure
    .input(z.object({
      type: EmailTemplateTypeSchema,
      subject: z.string().min(1, "邮件主题不能为空"),
      htmlContent: z.string().min(1, "HTML内容不能为空"),
      textContent: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { type, subject, htmlContent, textContent } = input;

        // 映射字符串类型到枚举值
        const typeMapping: Record<string, EmailTemplateType> = {
          "TEST_EMAIL": EmailTemplateType.TEST_EMAIL,
          "VERIFICATION": EmailTemplateType.VERIFICATION,
          "PASSWORD_RESET": EmailTemplateType.PASSWORD_RESET,
          "REGISTRATION_PENDING": EmailTemplateType.REGISTRATION_PENDING,
          "REGISTRATION_APPROVED": EmailTemplateType.REGISTRATION_APPROVED,
          "PRIVILEGE_GRANTED": EmailTemplateType.PRIVILEGE_GRANTED,
          "PRIVILEGE_EXPIRING": EmailTemplateType.PRIVILEGE_EXPIRING,
          "WELCOME": EmailTemplateType.WELCOME,
          "NOTIFICATION": EmailTemplateType.NOTIFICATION,
          "SYSTEM_NOTIFICATION": EmailTemplateType.SYSTEM_ALERT,
        };

        const templateType = typeMapping[type];
        if (!templateType) {
          throw new Error(`不支持的邮件模板类型: ${type}`);
        }

        // 保存自定义模板
        const result = await CustomEmailTemplateService.saveCustomTemplate(
          templateType,
          subject,
          htmlContent,
          textContent || "",
          ctx.user.id
        );

        if (!result.success) {
          throw TRPCErrorHandler.businessError(
            "INTERNAL_ERROR" as any,
            result.message
          );
        }

        return {
          success: true,
          message: result.message,
        };
      } catch (error) {
        console.error("保存邮件模板失败:", error);
        throw TRPCErrorHandler.businessError(
          "INTERNAL_ERROR" as any,
          "保存邮件模板失败: " + (error instanceof Error ? error.message : "未知错误")
        );
      }
    }),
});

/**
 * 获取模板信息
 */
function getTemplateInfo(type: string) {
  const templateInfoMap: Record<string, any> = {
    TEST_EMAIL: {
      name: "测试邮件",
      description: "用于管理员测试邮箱配置是否正常工作",
      variables: [
        { name: "testTime", description: "测试时间", required: false },
        { name: "serverInfo", description: "服务器信息", required: false },
        { name: "configStatus", description: "配置状态", required: false },
        { name: "recipientEmail", description: "接收邮箱", required: false },
      ],
    },
    VERIFICATION: {
      name: "注册邮箱验证",
      description: "用户注册时的邮箱验证邮件",
      variables: [
        { name: "username", description: "用户名", required: true },
        { name: "verificationUrl", description: "验证链接", required: true },
        { name: "expirationTime", description: "过期时间", required: false },
      ],
    },
    PASSWORD_RESET: {
      name: "忘记密码验证",
      description: "用户重置密码时的验证邮件",
      variables: [
        { name: "username", description: "用户名", required: true },
        { name: "resetUrl", description: "重置链接", required: true },
        { name: "expirationTime", description: "过期时间", required: false },
        { name: "requestIp", description: "请求IP", required: false },
        { name: "requestTime", description: "请求时间", required: false },
      ],
    },
    REGISTRATION_PENDING: {
      name: "等待注册审核",
      description: "用户提交注册申请后的确认邮件",
      variables: [
        { name: "username", description: "用户名", required: true },
        { name: "applicationId", description: "申请编号", required: false },
        { name: "estimatedTime", description: "预计审核时间", required: false },
        { name: "supportContact", description: "客服联系方式", required: false },
      ],
    },
    REGISTRATION_APPROVED: {
      name: "审核通过通知",
      description: "用户注册审核通过的通知邮件",
      variables: [
        { name: "username", description: "用户名", required: true },
        { name: "loginUrl", description: "登录链接", required: false },
        { name: "welcomeGuideUrl", description: "新手指南链接", required: false },
        { name: "communityUrl", description: "社区链接", required: false },
      ],
    },
    PRIVILEGE_GRANTED: {
      name: "权益开通",
      description: "用户权益开通通知邮件",
      variables: [
        { name: "username", description: "用户名", required: true },
        { name: "privilegeType", description: "权益类型", required: true },
        { name: "privilegeLevel", description: "权益等级", required: false },
        { name: "expirationDate", description: "到期日期", required: false },
        { name: "features", description: "特权功能列表", required: false },
        { name: "guideUrl", description: "使用指南链接", required: false },
      ],
    },
    PRIVILEGE_EXPIRING: {
      name: "权益到期",
      description: "用户权益即将到期或已到期的提醒邮件",
      variables: [
        { name: "username", description: "用户名", required: true },
        { name: "privilegeType", description: "权益类型", required: true },
        { name: "expirationDate", description: "到期日期", required: true },
        { name: "daysLeft", description: "剩余天数", required: false },
        { name: "renewUrl", description: "续费链接", required: false },
        { name: "discountCode", description: "优惠码", required: false },
        { name: "discountPercent", description: "优惠百分比", required: false },
      ],
    },
  };

  return templateInfoMap[type] || {};
}

/**
 * 获取默认变量
 */
function getDefaultVariables(type: string): Record<string, any> {
  const defaultVariablesMap: Record<string, any> = {
    TEST_EMAIL: {
      testTime: new Date().toLocaleString('zh-CN'),
      serverInfo: "SMTP服务器连接正常",
      configStatus: "邮箱配置验证成功",
      recipientEmail: "test@example.com",
    },
    VERIFICATION: {
      username: "示例用户",
      verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.COSEREEDEN_NEXTAUTH_URL || 'https://cosereeden.com'}/auth/verify-email?token=example-token`,
      expirationTime: process.env.COSEREEDEN_EMAIL_TOKEN_EXPIRY_HOURS ? `${process.env.COSEREEDEN_EMAIL_TOKEN_EXPIRY_HOURS}小时` : "24小时",
    },
    PASSWORD_RESET: {
      username: "示例用户",
      resetUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.COSEREEDEN_NEXTAUTH_URL || 'https://cosereeden.com'}/auth/reset-password?token=example-token`,
      expirationTime: process.env.COSEREEDEN_PASSWORD_RESET_EXPIRY_HOURS ? `${process.env.COSEREEDEN_PASSWORD_RESET_EXPIRY_HOURS}小时` : "1小时",
      requestIp: "192.168.1.100",
      requestTime: new Date().toLocaleString('zh-CN'),
    },
    REGISTRATION_PENDING: {
      username: "新申请者",
      applicationId: "APP" + Date.now(),
      estimatedTime: "1-3个工作日",
      supportContact: "https://t.me/CoserYYbot",
    },
    REGISTRATION_APPROVED: {
      username: "新成员",
      loginUrl: "https://cosereeden.com/login",
      welcomeGuideUrl: "https://cosereeden.com/guide/welcome",
      communityUrl: "https://cosereeden.com/community",
    },
    PRIVILEGE_GRANTED: {
      username: "VIP用户",
      privilegeType: "VIP会员",
      privilegeLevel: "VIP",
      expirationDate: "2025年12月31日",
      features: ["高清上传", "优先展示", "专属标识", "客服优先"],
      guideUrl: "https://cosereeden.com/guide/vip",
    },
    PRIVILEGE_EXPIRING: {
      username: "VIP用户",
      privilegeType: "VIP会员",
      expirationDate: "2025年12月31日",
      daysLeft: 7,
      renewUrl: "https://cosereeden.com/renew",
      discountCode: "RENEW20",
      discountPercent: 20,
    },
  };

  return defaultVariablesMap[type] || {};
}
