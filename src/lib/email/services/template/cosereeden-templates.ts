/**
 * @fileoverview CoserEden邮件模板服务
 * @description 提供CoserEden平台的专业邮件模板，包含7种不同类型的邮件模板
 * @author Augment AI
 * @date 2025-07-03
 * @version 2.0.0 - 重构版本
 */

import { EmailContent } from './email-template-base';

// 导入重构后的模板模块
// import { generateTestEmail, TestEmailVariables } from './templates/test-email-template'; // 已删除测试模板
import {
  generateVerificationEmail,
  generatePasswordResetEmail,
  VerificationEmailVariables,
  PasswordResetEmailVariables
} from './templates/auth-email-templates';
import {
  generateRegistrationPendingEmail,
  generateRegistrationApprovedEmail,
  RegistrationPendingEmailVariables,
  RegistrationApprovedEmailVariables
} from './templates/approval-email-templates';
import {
  generatePrivilegeActivationEmail,
  generatePrivilegeExpirationEmail,
  PrivilegeActivationEmailVariables,
  PrivilegeExpirationEmailVariables
} from './templates/privilege-email-templates';

/**
 * CoserEden邮件模板服务
 * 重构后的主服务类，整合所有邮件模板
 */
export class CoserEdenTemplateService {

  /**
   * 获取测试邮件模板
   */
  // static getTestEmailTemplate(variables: TestEmailVariables = {}): EmailContent {
  //   return generateTestEmail(variables);
  // } // 已删除测试模板

  /**
   * 获取注册邮箱验证模板
   */
  static getRegistrationVerificationTemplate(variables: VerificationEmailVariables = {}): EmailContent {
    return generateVerificationEmail(variables);
  }

  /**
   * 获取忘记密码邮箱验证模板
   */
  static getPasswordResetTemplate(variables: PasswordResetEmailVariables = {}): EmailContent {
    return generatePasswordResetEmail(variables);
  }

  /**
   * 获取等待注册审核模板
   */
  static getRegistrationPendingTemplate(variables: RegistrationPendingEmailVariables = {}): EmailContent {
    return generateRegistrationPendingEmail(variables);
  }

  /**
   * 获取审核通过通知模板
   */
  static getRegistrationApprovedTemplate(variables: RegistrationApprovedEmailVariables = {}): EmailContent {
    return generateRegistrationApprovedEmail(variables);
  }

  /**
   * 获取权益开通通知模板
   */
  static getPrivilegeActivationTemplate(variables: PrivilegeActivationEmailVariables = {}): EmailContent {
    return generatePrivilegeActivationEmail(variables);
  }

  /**
   * 获取权益到期提醒模板
   */
  static getPrivilegeExpirationTemplate(variables: PrivilegeExpirationEmailVariables = {}): EmailContent {
    return generatePrivilegeExpirationEmail(variables);
  }

  /**
   * 根据模板类型获取对应的邮件模板
   */
  static getTemplateByType(
    type: 'TEST' | 'VERIFICATION' | 'PASSWORD_RESET' | 'REGISTRATION_PENDING' | 'REGISTRATION_APPROVED' | 'PRIVILEGE_ACTIVATION' | 'PRIVILEGE_EXPIRATION',
    variables: any = {}
  ): EmailContent {
    switch (type) {
      case 'TEST':
        // return this.getTestEmailTemplate(variables); // 已删除测试模板
        console.warn('测试邮件模板已删除');
        return { subject: '测试邮件', html: '<p>测试邮件模板已删除</p>', text: '测试邮件模板已删除' };
      case 'VERIFICATION':
        return this.getRegistrationVerificationTemplate(variables);
      case 'PASSWORD_RESET':
        return this.getPasswordResetTemplate(variables);
      case 'REGISTRATION_PENDING':
        return this.getRegistrationPendingTemplate(variables);
      case 'REGISTRATION_APPROVED':
        return this.getRegistrationApprovedTemplate(variables);
      case 'PRIVILEGE_ACTIVATION':
        return this.getPrivilegeActivationTemplate(variables);
      case 'PRIVILEGE_EXPIRATION':
        return this.getPrivilegeExpirationTemplate(variables);
      default:
        throw new Error(`未知的邮件模板类型: ${type}`);
    }
  }

  /**
   * 获取所有可用的模板类型
   */
  static getAvailableTemplateTypes(): Array<{
    type: string;
    name: string;
    description: string;
  }> {
    return [
      {
        type: 'TEST',
        name: '测试邮件',
        description: '用于测试邮件服务配置的模板'
      },
      {
        type: 'VERIFICATION',
        name: '邮箱验证',
        description: '用户注册时的邮箱验证模板'
      },
      {
        type: 'PASSWORD_RESET',
        name: '密码重置',
        description: '用户忘记密码时的重置模板'
      },
      {
        type: 'REGISTRATION_PENDING',
        name: '注册审核',
        description: '用户注册等待审核的通知模板'
      },
      {
        type: 'REGISTRATION_APPROVED',
        name: '审核通过',
        description: '用户注册审核通过的通知模板'
      },
      {
        type: 'PRIVILEGE_ACTIVATION',
        name: '权益开通',
        description: '用户权益开通成功的通知模板'
      },
      {
        type: 'PRIVILEGE_EXPIRATION',
        name: '权益到期',
        description: '用户权益即将到期的提醒模板'
      }
    ];
  }
}
