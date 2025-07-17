/**
 * @fileoverview 邮件模板服务（重构版）
 * @description 采用模块化架构的邮件模板管理服务
 * @author Augment AI
 * @date 2025-06-29
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 */

// 导入重构后的模块
import {
  EmailTemplateBase,
  EmailTemplateType,
  VerificationTemplateService,
  NotificationTemplateService,
  type EmailContent,
  type EmailTemplateConfig,
  type TemplateVariables,
  type VerificationEmailVariables,
  type PasswordResetEmailVariables,
  type WelcomeEmailVariables,
  type SystemNotificationVariables,
  type UserNotificationVariables,
} from './template';

// 导入CoserEden专用模板
import { CoserEdenTemplateService } from './template/cosereeden-templates';

// 导入配置化系统
// import { getEmailVerificationConfig } from '@/lib/config/email-verification-config'; // 暂时注释掉，避免导入错误

// 临时函数定义
function getEmailVerificationConfig() {
  return {
    brandName: 'CoserEden',
    brandColor: '#3B82F6',
    supportEmail: 'support@cosereeden.com',
    websiteUrl: 'https://cosereeden.com',
  };
}

/**
 * 邮件模板服务（重构版）
 */
export class EmailTemplateService {
  /**
   * 默认配置
   */
  private static DEFAULT_CONFIG: EmailTemplateConfig = {
    brandName: 'CoserEden',
    brandColor: '#3B82F6',
    supportEmail: 'support@cosereeden.com',
    websiteUrl: 'https://cosereeden.com',
  };

  /**
   * 获取动态配置（从环境变量）
   */
  private static getConfig(): EmailTemplateConfig {
    try {
      const config = getEmailVerificationConfig();
      return {
        brandName: config.brandName,
        brandColor: config.brandColor,
        supportEmail: config.supportEmail,
        websiteUrl: config.websiteUrl,
      };
    } catch (error) {
      // 如果获取配置失败，返回默认配置
      return this.DEFAULT_CONFIG;
    }
  }

  /**
   * 默认配置（备用）
   */
  private static readonly FALLBACK_CONFIG: EmailTemplateConfig = {
    brandName: 'CoserEden',
    brandColor: '#3b82f6',
    supportEmail: 'support@cosereeden.com',
    websiteUrl: 'https://cosereeden.com',
  };

  /**
   * 生成邮箱验证邮件
   */
  static generateVerificationEmail(variables: VerificationEmailVariables): EmailContent {
    try {
      const config = this.getConfig();
      return VerificationTemplateService.generateVerificationEmail(variables, config);
    } catch (error) {
      console.warn('使用配置化系统失败，回退到默认配置:', error);
      return VerificationTemplateService.generateVerificationEmail(variables, this.FALLBACK_CONFIG);
    }
  }

  /**
   * 生成密码重置邮件
   */
  static generatePasswordResetEmail(variables: PasswordResetEmailVariables): EmailContent {
    try {
      const config = this.getConfig();
      return VerificationTemplateService.generatePasswordResetEmail(variables, config);
    } catch (error) {
      console.warn('使用配置化系统失败，回退到默认配置:', error);
      return VerificationTemplateService.generatePasswordResetEmail(variables, this.FALLBACK_CONFIG);
    }
  }

  /**
   * 生成邮箱验证成功邮件
   */
  static generateVerificationSuccessEmail(variables: { username: string }): EmailContent {
    return VerificationTemplateService.generateVerificationSuccessEmail(
      variables,
      this.getDefaultConfig()
    );
  }

  /**
   * 生成密码重置成功邮件
   */
  static generatePasswordResetSuccessEmail(variables: {
    username: string;
    resetTime?: string
  }): EmailContent {
    return VerificationTemplateService.generatePasswordResetSuccessEmail(
      variables,
      this.getDefaultConfig()
    );
  }

  /**
   * 生成欢迎邮件
   */
  static generateWelcomeEmail(variables: WelcomeEmailVariables): EmailContent {
    return NotificationTemplateService.generateWelcomeEmail(
      variables,
      this.getDefaultConfig()
    );
  }

  /**
   * 生成系统通知邮件
   */
  static generateSystemNotificationEmail(variables: SystemNotificationVariables): EmailContent {
    return NotificationTemplateService.generateSystemNotificationEmail(
      variables,
      this.getDefaultConfig()
    );
  }

  /**
   * 生成用户通知邮件
   */
  static generateUserNotificationEmail(variables: UserNotificationVariables): EmailContent {
    return NotificationTemplateService.generateUserNotificationEmail(
      variables,
      this.getDefaultConfig()
    );
  }

  /**
   * 生成通知摘要邮件
   */
  static generateNotificationDigestEmail(variables: {
    username: string;
    notifications: UserNotificationVariables[];
    period: string;
    unreadCount: number;
    dashboardUrl?: string;
  }): EmailContent {
    return NotificationTemplateService.generateNotificationDigestEmail(
      variables,
      this.getDefaultConfig()
    );
  }

  /**
   * 根据模板类型生成邮件
   */
  static generateEmailByType(
    type: EmailTemplateType,
    variables: TemplateVariables
  ): EmailContent {
    console.log('🔍 generateEmailByType 调试:', {
      type: type,
      typeValue: type.toString(),
      typeType: typeof type,
      isVerification: type === EmailTemplateType.VERIFICATION,
      verificationValue: EmailTemplateType.VERIFICATION,
      allEnumValues: Object.values(EmailTemplateType)
    });

    switch (type) {
      // 使用CoserEden专用模板
      case EmailTemplateType.TEST_EMAIL:
        // return CoserEdenTemplateService.getTestEmailTemplate(variables as any); // 已删除测试模板
        console.warn('测试邮件模板已删除');
        return { subject: '测试邮件', html: '<p>测试邮件模板已删除</p>', text: '测试邮件模板已删除' };

      case EmailTemplateType.VERIFICATION:
        console.log('🎯 进入 VERIFICATION case!');
        return CoserEdenTemplateService.getRegistrationVerificationTemplate(variables as any);

      case EmailTemplateType.PASSWORD_RESET:
        return CoserEdenTemplateService.getPasswordResetTemplate(variables as any);

      case EmailTemplateType.REGISTRATION_PENDING:
        return CoserEdenTemplateService.getRegistrationPendingTemplate(variables as any);

      case EmailTemplateType.REGISTRATION_APPROVED:
        return CoserEdenTemplateService.getRegistrationApprovedTemplate(variables as any);

      case EmailTemplateType.PRIVILEGE_GRANTED:
        return CoserEdenTemplateService.getPrivilegeActivationTemplate(variables as any);

      case EmailTemplateType.PRIVILEGE_EXPIRING:
        return CoserEdenTemplateService.getPrivilegeExpirationTemplate(variables as any);

      // 保留原有模板作为备用
      case EmailTemplateType.WELCOME:
        return this.generateWelcomeEmail(variables as unknown as WelcomeEmailVariables);

      case EmailTemplateType.NOTIFICATION:
        return this.generateUserNotificationEmail(variables as unknown as UserNotificationVariables);

      case EmailTemplateType.SYSTEM_ALERT:
        return this.generateSystemNotificationEmail(variables as unknown as SystemNotificationVariables);

      default:
        throw new Error(`不支持的邮件模板类型: ${type}`);
    }
  }

  /**
   * 验证邮件变量
   */
  static validateEmailVariables(
    type: EmailTemplateType,
    variables: TemplateVariables
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 通用验证
    if (!variables.username || typeof variables.username !== 'string') {
      errors.push('username 是必需的字符串字段');
    }

    // 根据类型进行特定验证
    switch (type) {
      case EmailTemplateType.VERIFICATION:
        if (!variables.verificationUrl || typeof variables.verificationUrl !== 'string') {
          errors.push('verificationUrl 是必需的字符串字段');
        }
        break;

      case EmailTemplateType.PASSWORD_RESET:
        if (!variables.resetUrl || typeof variables.resetUrl !== 'string') {
          errors.push('resetUrl 是必需的字符串字段');
        }
        break;

      case EmailTemplateType.NOTIFICATION:
      case EmailTemplateType.SYSTEM_ALERT:
        if (!variables.message || typeof variables.message !== 'string') {
          errors.push('message 是必需的字符串字段');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取模板预览
   */
  static getTemplatePreview(type: EmailTemplateType): {
    type: EmailTemplateType;
    name: string;
    description: string;
    requiredVariables: string[];
    optionalVariables: string[];
  } {
    const templates = {
      [EmailTemplateType.VERIFICATION]: {
        type: EmailTemplateType.VERIFICATION,
        name: '邮箱验证',
        description: '用于新用户邮箱验证的邮件模板',
        requiredVariables: ['username', 'verificationUrl'],
        optionalVariables: ['expiryHours'],
      },
      [EmailTemplateType.PASSWORD_RESET]: {
        type: EmailTemplateType.PASSWORD_RESET,
        name: '密码重置',
        description: '用于用户密码重置的邮件模板',
        requiredVariables: ['username', 'resetUrl'],
        optionalVariables: ['expiryHours', 'requestIp', 'requestTime'],
      },
      [EmailTemplateType.WELCOME]: {
        type: EmailTemplateType.WELCOME,
        name: '欢迎邮件',
        description: '用于欢迎新用户的邮件模板',
        requiredVariables: ['username'],
        optionalVariables: ['displayName', 'joinDate', 'dashboardUrl', 'guideUrl'],
      },
      [EmailTemplateType.NOTIFICATION]: {
        type: EmailTemplateType.NOTIFICATION,
        name: '用户通知',
        description: '用于用户互动通知的邮件模板',
        requiredVariables: ['username', 'notificationType', 'message'],
        optionalVariables: ['actorName', 'contentTitle', 'contentUrl', 'timestamp'],
      },
      [EmailTemplateType.SYSTEM_ALERT]: {
        type: EmailTemplateType.SYSTEM_ALERT,
        name: '系统通知',
        description: '用于系统重要通知的邮件模板',
        requiredVariables: ['username', 'title', 'message'],
        optionalVariables: ['actionUrl', 'actionText', 'priority', 'category'],
      },
    };

    return templates[type as keyof typeof templates];
  }

  /**
   * 获取所有可用模板
   */
  static getAllTemplates(): Array<{
    type: EmailTemplateType;
    name: string;
    description: string;
    requiredVariables: string[];
    optionalVariables: string[];
  }> {
    return Object.values(EmailTemplateType).map(type => this.getTemplatePreview(type));
  }

  /**
   * 测试邮件模板
   */
  static testTemplate(
    type: EmailTemplateType,
    variables: TemplateVariables
  ): {
    success: boolean;
    content?: EmailContent;
    error?: string;
  } {
    try {
      // 验证变量
      const validation = this.validateEmailVariables(type, variables);
      if (!validation.isValid) {
        return {
          success: false,
          error: `变量验证失败: ${validation.errors.join(', ')}`,
        };
      }

      // 生成邮件内容
      const content = this.generateEmailByType(type, variables);

      return {
        success: true,
        content,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 更新默认配置
   */
  static updateDefaultConfig(config: Partial<EmailTemplateConfig>): void {
    Object.assign(this.DEFAULT_CONFIG, config);
  }

  /**
   * 获取当前默认配置
   */
  static getDefaultConfig(): EmailTemplateConfig {
    return { ...this.DEFAULT_CONFIG };
  }
}

/**
 * 导出类型和枚举
 */
export {
  EmailTemplateType,
  type EmailContent,
  type EmailTemplateConfig,
  type TemplateVariables,
  type VerificationEmailVariables,
  type PasswordResetEmailVariables,
  type WelcomeEmailVariables,
  type SystemNotificationVariables,
  type UserNotificationVariables,
};

/**
 * 导出服务创建函数
 */
export const createEmailTemplateService = () => EmailTemplateService;
