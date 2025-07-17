/**
 * @fileoverview 验证邮件模板服务
 * @description 专门处理邮箱验证和密码重置邮件模板
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import { EmailTemplateBase, type EmailContent, type EmailTemplateConfig } from './email-template-base';

/**
 * 验证邮件变量接口
 */
export interface VerificationEmailVariables {
  username: string;
  verificationUrl: string;
  expiryHours?: number;
}

/**
 * 密码重置邮件变量接口
 */
export interface PasswordResetEmailVariables {
  username: string;
  resetUrl: string;
  expiryHours?: number;
  requestIp?: string;
  requestTime?: string;
}

/**
 * 验证邮件模板服务类
 */
export class VerificationTemplateService {
  /**
   * 生成邮箱验证邮件
   */
  static generateVerificationEmail(
    variables: VerificationEmailVariables,
    config?: Partial<EmailTemplateConfig>
  ): EmailContent {
    const { username, verificationUrl, expiryHours = 24 } = variables;

    const subject = `${config?.brandName || 'CoserEden'} - 邮箱验证`;

    const content = `
      <h2>邮箱验证</h2>
      <p>亲爱的 <strong>${EmailTemplateBase.escapeHtml(username)}</strong>，</p>
      <p>感谢您注册${config?.brandName || 'CoserEden'}！请点击下面的按钮验证您的邮箱地址：</p>

      <div class="text-center" style="margin: 30px 0;">
        ${EmailTemplateBase.generateButton('验证邮箱', verificationUrl)}
      </div>

      <p>如果按钮无法点击，请复制以下链接到浏览器地址栏：</p>
      ${EmailTemplateBase.generateCodeBlock(verificationUrl)}

      ${EmailTemplateBase.generateAlert(
      `<strong>注意：</strong>此链接将在${expiryHours}小时后过期。`,
      'warning'
    )}

      ${EmailTemplateBase.generateAlert(
      `<strong>📧 邮件安全提示：</strong><br>
      如果您使用QQ邮箱、网易邮箱等邮件服务，点击链接时可能会被重定向到安全检查页面。<br>
      <strong>解决方法：</strong><br>
      1. 复制上方链接，直接粘贴到浏览器地址栏访问<br>
      2. 或者在安全检查页面选择"继续访问"<br>
      3. 无法点击链接？<a href="${verificationUrl.replace('/auth/verify-email', '/auth/verify-email-manual')}" style="color: #3b82f6; text-decoration: underline;">点击这里手动验证</a>`,
      'info'
    )}

      <p>如果您没有注册账户，请忽略此邮件。</p>

      ${EmailTemplateBase.generateDivider()}

      <p class="text-small text-muted">
        为了保护您的账户安全，请不要将此邮件转发给他人。
      </p>
    `;

    const html = EmailTemplateBase.generateEmailHTML(content, config);
    const text = this.generateVerificationPlainText(variables, config);

    return { subject, html, text };
  }

  /**
   * 生成密码重置邮件
   */
  static generatePasswordResetEmail(
    variables: PasswordResetEmailVariables,
    config?: Partial<EmailTemplateConfig>
  ): EmailContent {
    const {
      username,
      resetUrl,
      expiryHours = 1,
      requestIp,
      requestTime
    } = variables;

    const subject = `${config?.brandName || 'CoserEden'} - 密码重置`;

    const content = `
      <h2>密码重置请求</h2>
      <p>亲爱的 <strong>${EmailTemplateBase.escapeHtml(username)}</strong>，</p>
      <p>我们收到了您的密码重置请求。请点击下面的按钮重置您的密码：</p>

      <div class="text-center" style="margin: 30px 0;">
        ${EmailTemplateBase.generateButton('重置密码', resetUrl)}
      </div>

      <p>如果按钮无法点击，请复制以下链接到浏览器地址栏：</p>
      ${EmailTemplateBase.generateCodeBlock(resetUrl)}

      ${EmailTemplateBase.generateAlert(
      `<strong>重要：</strong>此链接将在${expiryHours}小时后过期，且只能使用一次。`,
      'warning'
    )}

      ${requestIp || requestTime ? `
        <h3>请求详情</h3>
        <ul>
          ${requestTime ? `<li><strong>请求时间：</strong>${EmailTemplateBase.escapeHtml(requestTime)}</li>` : ''}
          ${requestIp ? `<li><strong>请求IP：</strong>${EmailTemplateBase.escapeHtml(requestIp)}</li>` : ''}
        </ul>
      ` : ''}

      ${EmailTemplateBase.generateAlert(
      `如果您没有请求密码重置，请忽略此邮件。您的密码不会被更改。`,
      'info'
    )}

      ${EmailTemplateBase.generateDivider()}

      <p class="text-small text-muted">
        为了保护您的账户安全，请不要将此邮件转发给他人。如果您怀疑账户被盗用，请立即联系我们的客服团队。
      </p>
    `;

    const html = EmailTemplateBase.generateEmailHTML(content, config);
    const text = this.generatePasswordResetPlainText(variables, config);

    return { subject, html, text };
  }

  /**
   * 生成邮箱验证成功邮件
   */
  static generateVerificationSuccessEmail(
    variables: { username: string },
    config?: Partial<EmailTemplateConfig>
  ): EmailContent {
    const { username } = variables;

    const subject = `${config?.brandName || 'CoserEden'} - 邮箱验证成功`;

    const content = `
      <h2>邮箱验证成功</h2>
      <p>亲爱的 <strong>${EmailTemplateBase.escapeHtml(username)}</strong>，</p>

      ${EmailTemplateBase.generateAlert(
      '🎉 恭喜！您的邮箱已成功验证。',
      'success'
    )}

      <p>您现在可以享受${config?.brandName || 'CoserEden'}的所有功能：</p>
      <ul>
        <li>发布和分享您的cosplay作品</li>
        <li>与其他创作者互动交流</li>
        <li>参与社区活动和挑战</li>
        <li>获得专属会员权益</li>
      </ul>

      <div class="text-center" style="margin: 30px 0;">
        ${EmailTemplateBase.generateButton('开始探索', config?.websiteUrl || process.env.COSEREEDEN_NEXT_PUBLIC_APP_URL || 'https://cosereeden.com')}
      </div>

      <p>感谢您加入我们的创作者社区！</p>
    `;

    const html = EmailTemplateBase.generateEmailHTML(content, config);
    const text = EmailTemplateBase.generatePlainText(content, config);

    return { subject, html, text };
  }

  /**
   * 生成密码重置成功邮件
   */
  static generatePasswordResetSuccessEmail(
    variables: { username: string; resetTime?: string },
    config?: Partial<EmailTemplateConfig>
  ): EmailContent {
    const { username, resetTime } = variables;

    const subject = `${config?.brandName || 'CoserEden'} - 密码重置成功`;

    const content = `
      <h2>密码重置成功</h2>
      <p>亲爱的 <strong>${EmailTemplateBase.escapeHtml(username)}</strong>，</p>

      ${EmailTemplateBase.generateAlert(
      '✅ 您的密码已成功重置。',
      'success'
    )}

      ${resetTime ? `<p><strong>重置时间：</strong>${EmailTemplateBase.escapeHtml(resetTime)}</p>` : ''}

      <p>为了保护您的账户安全，建议您：</p>
      <ul>
        <li>使用强密码，包含字母、数字和特殊字符</li>
        <li>不要在其他网站使用相同密码</li>
        <li>定期更新密码</li>
        <li>启用两步验证（如果可用）</li>
      </ul>

      ${EmailTemplateBase.generateAlert(
      '如果您没有进行此操作，请立即联系我们的客服团队。',
      'error'
    )}

      <div class="text-center" style="margin: 30px 0;">
        ${EmailTemplateBase.generateButton('登录账户', config?.websiteUrl || process.env.COSEREEDEN_NEXT_PUBLIC_APP_URL || 'https://cosereeden.com')}
      </div>
    `;

    const html = EmailTemplateBase.generateEmailHTML(content, config);
    const text = EmailTemplateBase.generatePlainText(content, config);

    return { subject, html, text };
  }

  /**
   * 生成验证邮件纯文本版本
   */
  private static generateVerificationPlainText(
    variables: VerificationEmailVariables,
    config?: Partial<EmailTemplateConfig>
  ): string {
    const { username, verificationUrl, expiryHours = 24 } = variables;
    const brandName = config?.brandName || 'CoserEden';

    return `
${brandName} - 邮箱验证

亲爱的 ${username}，

感谢您注册${brandName}！请访问以下链接验证您的邮箱地址：

${verificationUrl}

注意：此链接将在${expiryHours}小时后过期。

如果您没有注册账户，请忽略此邮件。

为了保护您的账户安全，请不要将此邮件转发给他人。

© 2025 ${brandName}
如有疑问，请联系 ${config?.supportEmail || process.env.COSEREEDEN_EMAIL_FROM || process.env.COSEREEDEN_SUPPORT_EMAIL || 'support@cosereeden.com'}
    `.trim();
  }

  /**
   * 生成密码重置邮件纯文本版本
   */
  private static generatePasswordResetPlainText(
    variables: PasswordResetEmailVariables,
    config?: Partial<EmailTemplateConfig>
  ): string {
    const { username, resetUrl, expiryHours = 1, requestIp, requestTime } = variables;
    const brandName = config?.brandName || 'CoserEden';

    return `
${brandName} - 密码重置

亲爱的 ${username}，

我们收到了您的密码重置请求。请访问以下链接重置您的密码：

${resetUrl}

重要：此链接将在${expiryHours}小时后过期，且只能使用一次。

${requestTime ? `请求时间：${requestTime}` : ''}
${requestIp ? `请求IP：${requestIp}` : ''}

如果您没有请求密码重置，请忽略此邮件。您的密码不会被更改。

为了保护您的账户安全，请不要将此邮件转发给他人。

© 2025 ${brandName}
如有疑问，请联系 ${config?.supportEmail || 'support@cosereeden.com'}
    `.trim();
  }
}

/**
 * 导出服务创建函数
 */
export const createVerificationTemplateService = () => VerificationTemplateService;
