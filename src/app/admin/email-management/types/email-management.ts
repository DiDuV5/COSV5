/**
 * @fileoverview 邮箱管理相关类型定义
 * @author Augment AI
 * @date 2025-07-03
 */

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpFromName: string;
  smtpFromEmail: string;
}

export interface EmailTemplate {
  type: 'VERIFICATION' | 'PASSWORD_RESET' | 'WELCOME' | 'NOTIFICATION';
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export interface CleanupDialogState {
  open: boolean;
  type: 'all' | 'unverified' | 'expired' | null;
  title: string;
  description: string;
}

export type TemplateField = 'subject' | 'html' | 'text';
export type CleanupType = 'all' | 'unverified' | 'expired';

export interface TemplateVariables {
  username: string;
  verificationUrl: string;
  resetUrl: string;
  platformUrl: string;
  supportEmail: string;
  currentYear: string;
  companyName: string;
  websiteUrl: string;
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
  unsubscribeUrl: string;
  estimatedTime: string;
  supportContact: string;
  loginUrl: string;
  welcomeGuideUrl: string;
  communityUrl: string;
  privilegeType: string;
  privilegeLevel: string;
  expirationDate: string;
  features: string[];
  guideUrl: string;
  daysLeft: number;
}
