/**
 * @fileoverview 邮件模板模块索引
 * @description 统一导出邮件模板相关的服务、类型和工具函数
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

// 导出基础服务
export { 
  EmailTemplateBase, 
  EmailTemplateType,
  createEmailTemplateBase 
} from './email-template-base';

// 导出验证模板服务
export { 
  VerificationTemplateService, 
  createVerificationTemplateService 
} from './verification-template';

// 导出通知模板服务
export { 
  NotificationTemplateService, 
  createNotificationTemplateService 
} from './notification-template';

// 导出类型
export type {
  TemplateVariables,
  EmailContent,
  EmailTemplateConfig,
} from './email-template-base';

export type {
  VerificationEmailVariables,
  PasswordResetEmailVariables,
} from './verification-template';

export type {
  WelcomeEmailVariables,
  SystemNotificationVariables,
  UserNotificationVariables,
} from './notification-template';
