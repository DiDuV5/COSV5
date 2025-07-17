/**
 * @fileoverview 邮件模板基础服务
 * @description 提供邮件模板的基础样式、布局和工具函数
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

/**
 * 邮件模板类型枚举
 */
export enum EmailTemplateType {
  TEST_EMAIL = 'test_email',
  VERIFICATION = 'verification',
  PASSWORD_RESET = 'password_reset',
  REGISTRATION_PENDING = 'registration_pending',
  REGISTRATION_APPROVED = 'registration_approved',
  PRIVILEGE_GRANTED = 'privilege_granted',
  PRIVILEGE_EXPIRING = 'privilege_expiring',
  WELCOME = 'welcome',
  NOTIFICATION = 'notification',
  SYSTEM_ALERT = 'system_alert',
}

/**
 * 模板变量接口
 */
export interface TemplateVariables {
  [key: string]: string | number | boolean;
}

/**
 * 邮件内容接口
 */
export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

/**
 * 邮件模板配置接口
 */
export interface EmailTemplateConfig {
  brandName: string;
  brandColor: string;
  supportEmail: string;
  websiteUrl: string;
  logoUrl?: string;
}

/**
 * 邮件模板基础服务类
 */
export class EmailTemplateBase {
  /**
   * 默认配置
   */
  private static readonly DEFAULT_CONFIG: EmailTemplateConfig = {
    brandName: 'CoserEden',
    brandColor: '#3b82f6',
    supportEmail: 'support@cosereeden.com',
    websiteUrl: 'https://cosereeden.com',
  };

  /**
   * 基础CSS样式
   */
  static readonly BASE_STYLES = `
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        background-color: #f5f5f5;
        padding: 20px;
      }
      .container {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        overflow: hidden;
      }
      .header {
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        color: white;
        padding: 30px;
        text-align: center;
      }
      .header h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 600;
      }
      .content {
        padding: 30px;
      }
      .content h2 {
        color: #1f2937;
        margin-top: 0;
        margin-bottom: 20px;
        font-size: 24px;
        font-weight: 600;
      }
      .content p {
        margin-bottom: 15px;
        color: #4b5563;
      }
      .button {
        display: inline-block;
        background: #3b82f6;
        color: white;
        padding: 12px 30px;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        transition: background-color 0.3s;
      }
      .button:hover {
        background: #2563eb;
      }
      .button-secondary {
        background: #6b7280;
      }
      .button-secondary:hover {
        background: #4b5563;
      }
      .footer {
        background: #f8f9fa;
        padding: 20px 30px;
        text-align: center;
        color: #666;
        font-size: 14px;
      }
      .code-block {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 4px;
        padding: 15px;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        word-break: break-all;
        margin: 15px 0;
      }
      .alert {
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 4px;
        padding: 15px;
        margin: 15px 0;
        color: #856404;
      }
      .alert-success {
        background: #d4edda;
        border: 1px solid #c3e6cb;
        color: #155724;
      }
      .alert-error {
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        color: #721c24;
      }
      .alert-info {
        background: #d1ecf1;
        border: 1px solid #bee5eb;
        color: #0c5460;
      }
      .divider {
        height: 1px;
        background: #e5e7eb;
        margin: 20px 0;
      }
      .text-center {
        text-align: center;
      }
      .text-small {
        font-size: 14px;
      }
      .text-muted {
        color: #6b7280;
      }
      .mb-0 {
        margin-bottom: 0;
      }
      .mt-0 {
        margin-top: 0;
      }
    </style>
  `;

  /**
   * 生成邮件HTML结构
   */
  static generateEmailHTML(
    content: string,
    config: Partial<EmailTemplateConfig> = {}
  ): string {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${finalConfig.brandName}</title>
        ${this.BASE_STYLES}
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${finalConfig.logoUrl ?
        `<img src="${finalConfig.logoUrl}" alt="${finalConfig.brandName}" style="height: 40px; margin-bottom: 10px;">` :
        ''
      }
            <h1>${finalConfig.brandName}</h1>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p class="mb-0">© 2025 ${finalConfig.brandName}. 保留所有权利。</p>
            <p class="text-small text-muted mb-0">
              如有疑问，请联系 <a href="mailto:${finalConfig.supportEmail}">${finalConfig.supportEmail}</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 生成纯文本版本
   */
  static generatePlainText(
    content: string,
    config: Partial<EmailTemplateConfig> = {}
  ): string {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    // 移除HTML标签并格式化
    const plainContent = content
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return `
${finalConfig.brandName}

${plainContent}

© 2025 ${finalConfig.brandName}
如有疑问，请联系 ${finalConfig.supportEmail}
    `.trim();
  }

  /**
   * 替换模板变量
   */
  static replaceVariables(template: string, variables: TemplateVariables): string {
    let result = template;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(value));
    });

    return result;
  }

  /**
   * 生成按钮HTML
   */
  static generateButton(
    text: string,
    url: string,
    variant: 'primary' | 'secondary' = 'primary'
  ): string {
    const className = variant === 'primary' ? 'button' : 'button button-secondary';
    return `<a href="${url}" class="${className}">${text}</a>`;
  }

  /**
   * 生成警告框HTML
   */
  static generateAlert(
    content: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ): string {
    const className = type === 'info' ? 'alert alert-info' :
      type === 'success' ? 'alert alert-success' :
        type === 'error' ? 'alert alert-error' :
          'alert';

    return `<div class="${className}">${content}</div>`;
  }

  /**
   * 生成代码块HTML
   */
  static generateCodeBlock(code: string): string {
    return `<div class="code-block">${code}</div>`;
  }

  /**
   * 验证邮件地址
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 转义HTML特殊字符
   */
  static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return text.replace(/[&<>"']/g, (char) => map[char]);
  }

  /**
   * 格式化日期
   */
  static formatDate(date: Date | string, locale: string = 'zh-CN'): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * 生成分隔线
   */
  static generateDivider(): string {
    return '<div class="divider"></div>';
  }
}

/**
 * 导出服务创建函数
 */
export const createEmailTemplateBase = () => EmailTemplateBase;
