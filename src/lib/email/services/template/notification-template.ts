/**
 * @fileoverview 通知邮件模板服务
 * @description 专门处理系统通知、欢迎邮件和用户通知模板
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import { EmailTemplateBase, type EmailContent, type EmailTemplateConfig } from './email-template-base';

/**
 * 欢迎邮件变量接口
 */
export interface WelcomeEmailVariables {
  username: string;
  displayName?: string;
  joinDate?: string;
  dashboardUrl?: string;
  guideUrl?: string;
}

/**
 * 系统通知邮件变量接口
 */
export interface SystemNotificationVariables {
  username: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  category?: string;
}

/**
 * 用户通知邮件变量接口
 */
export interface UserNotificationVariables {
  username: string;
  notificationType: 'like' | 'comment' | 'follow' | 'mention' | 'system';
  actorName?: string;
  actorAvatar?: string;
  contentTitle?: string;
  contentUrl?: string;
  message: string;
  timestamp?: string;
}

/**
 * 通知邮件模板服务类
 */
export class NotificationTemplateService {
  /**
   * 生成欢迎邮件
   */
  static generateWelcomeEmail(
    variables: WelcomeEmailVariables,
    config?: Partial<EmailTemplateConfig>
  ): EmailContent {
    const { 
      username, 
      displayName, 
      joinDate, 
      dashboardUrl, 
      guideUrl 
    } = variables;

    const brandName = config?.brandName || 'CoserEden';
    const subject = `欢迎加入${brandName}！`;

    const content = `
      <h2>欢迎来到${brandName}！</h2>
      <p>亲爱的 <strong>${EmailTemplateBase.escapeHtml(displayName || username)}</strong>，</p>
      
      ${EmailTemplateBase.generateAlert(
        `🎉 欢迎加入${brandName}创作者社区！`,
        'success'
      )}
      
      <p>我们很高兴您成为我们大家庭的一员。${brandName}是一个专为cosplay爱好者和创作者打造的平台，在这里您可以：</p>
      
      <ul>
        <li><strong>展示作品</strong> - 分享您精彩的cosplay作品和创作过程</li>
        <li><strong>互动交流</strong> - 与全球4600+专业创作者交流心得</li>
        <li><strong>学习成长</strong> - 获取专业的cosplay技巧和教程</li>
        <li><strong>参与活动</strong> - 加入各种主题活动和挑战赛</li>
        <li><strong>获得收益</strong> - 通过优质内容获得罐头奖励</li>
      </ul>
      
      ${joinDate ? `<p><strong>加入时间：</strong>${EmailTemplateBase.escapeHtml(joinDate)}</p>` : ''}
      
      <h3>快速开始</h3>
      <p>为了帮助您更好地使用平台，我们为您准备了以下资源：</p>
      
      <div class="text-center" style="margin: 20px 0;">
        ${dashboardUrl ? EmailTemplateBase.generateButton('进入控制台', dashboardUrl) : ''}
        ${guideUrl ? EmailTemplateBase.generateButton('新手指南', guideUrl, 'secondary') : ''}
      </div>
      
      ${EmailTemplateBase.generateAlert(
        '💡 <strong>小贴士：</strong>完善您的个人资料可以获得更多关注和互动！',
        'info'
      )}
      
      <p>如果您在使用过程中遇到任何问题，随时可以联系我们的客服团队。我们期待看到您的精彩作品！</p>
    `;

    const html = EmailTemplateBase.generateEmailHTML(content, config);
    const text = this.generateWelcomePlainText(variables, config);

    return { subject, html, text };
  }

  /**
   * 生成系统通知邮件
   */
  static generateSystemNotificationEmail(
    variables: SystemNotificationVariables,
    config?: Partial<EmailTemplateConfig>
  ): EmailContent {
    const { 
      username, 
      title, 
      message, 
      actionUrl, 
      actionText, 
      priority = 'normal',
      category 
    } = variables;

    const brandName = config?.brandName || 'CoserEden';
    const subject = `${brandName} - ${title}`;

    // 根据优先级设置警告类型
    const alertType = priority === 'urgent' ? 'error' :
                     priority === 'high' ? 'warning' :
                     priority === 'low' ? 'info' : 'info';

    const priorityText = priority === 'urgent' ? '🚨 紧急' :
                        priority === 'high' ? '⚠️ 重要' :
                        priority === 'low' ? 'ℹ️ 提醒' : '';

    const content = `
      <h2>${priorityText ? `${priorityText} - ` : ''}${EmailTemplateBase.escapeHtml(title)}</h2>
      <p>亲爱的 <strong>${EmailTemplateBase.escapeHtml(username)}</strong>，</p>
      
      ${category ? `<p class="text-small text-muted"><strong>分类：</strong>${EmailTemplateBase.escapeHtml(category)}</p>` : ''}
      
      ${EmailTemplateBase.generateAlert(message, alertType)}
      
      ${actionUrl && actionText ? `
        <div class="text-center" style="margin: 30px 0;">
          ${EmailTemplateBase.generateButton(actionText, actionUrl)}
        </div>
      ` : ''}
      
      <p>感谢您对${brandName}的关注和支持。</p>
    `;

    const html = EmailTemplateBase.generateEmailHTML(content, config);
    const text = EmailTemplateBase.generatePlainText(content, config);

    return { subject, html, text };
  }

  /**
   * 生成用户通知邮件
   */
  static generateUserNotificationEmail(
    variables: UserNotificationVariables,
    config?: Partial<EmailTemplateConfig>
  ): EmailContent {
    const { 
      username, 
      notificationType, 
      actorName, 
      contentTitle, 
      contentUrl, 
      message, 
      timestamp 
    } = variables;

    const brandName = config?.brandName || 'CoserEden';
    
    // 根据通知类型设置主题和图标
    const typeConfig = this.getNotificationTypeConfig(notificationType);
    const subject = `${brandName} - ${typeConfig.title}`;

    const content = `
      <h2>${typeConfig.icon} ${typeConfig.title}</h2>
      <p>亲爱的 <strong>${EmailTemplateBase.escapeHtml(username)}</strong>，</p>
      
      <div style="background: #f8f9fa; border-left: 4px solid ${typeConfig.color}; padding: 15px; margin: 20px 0;">
        ${actorName ? `<p><strong>${EmailTemplateBase.escapeHtml(actorName)}</strong> ${message}</p>` : `<p>${message}</p>`}
        ${contentTitle ? `<p class="text-small text-muted">内容：${EmailTemplateBase.escapeHtml(contentTitle)}</p>` : ''}
        ${timestamp ? `<p class="text-small text-muted">时间：${EmailTemplateBase.escapeHtml(timestamp)}</p>` : ''}
      </div>
      
      ${contentUrl ? `
        <div class="text-center" style="margin: 30px 0;">
          ${EmailTemplateBase.generateButton('查看详情', contentUrl)}
        </div>
      ` : ''}
      
      <p class="text-small text-muted">
        您可以在账户设置中管理邮件通知偏好。
      </p>
    `;

    const html = EmailTemplateBase.generateEmailHTML(content, config);
    const text = EmailTemplateBase.generatePlainText(content, config);

    return { subject, html, text };
  }

  /**
   * 生成批量通知摘要邮件
   */
  static generateNotificationDigestEmail(
    variables: {
      username: string;
      notifications: UserNotificationVariables[];
      period: string;
      unreadCount: number;
      dashboardUrl?: string;
    },
    config?: Partial<EmailTemplateConfig>
  ): EmailContent {
    const { username, notifications, period, unreadCount, dashboardUrl } = variables;
    const brandName = config?.brandName || 'CoserEden';
    const subject = `${brandName} - ${period}通知摘要 (${unreadCount}条新消息)`;

    const content = `
      <h2>📬 ${period}通知摘要</h2>
      <p>亲爱的 <strong>${EmailTemplateBase.escapeHtml(username)}</strong>，</p>
      
      <p>您在${period}共收到 <strong>${unreadCount}</strong> 条新通知：</p>
      
      ${notifications.slice(0, 5).map(notification => {
        const typeConfig = this.getNotificationTypeConfig(notification.notificationType);
        return `
          <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 10px 0;">
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              <span style="margin-right: 8px;">${typeConfig.icon}</span>
              <strong>${typeConfig.title}</strong>
              ${notification.timestamp ? `<span style="margin-left: auto; font-size: 12px; color: #6b7280;">${notification.timestamp}</span>` : ''}
            </div>
            <p style="margin: 0; color: #4b5563;">${notification.message}</p>
            ${notification.contentTitle ? `<p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">内容：${EmailTemplateBase.escapeHtml(notification.contentTitle)}</p>` : ''}
          </div>
        `;
      }).join('')}
      
      ${notifications.length > 5 ? `
        <p class="text-center text-muted">还有 ${notifications.length - 5} 条通知...</p>
      ` : ''}
      
      ${dashboardUrl ? `
        <div class="text-center" style="margin: 30px 0;">
          ${EmailTemplateBase.generateButton('查看所有通知', dashboardUrl)}
        </div>
      ` : ''}
      
      <p class="text-small text-muted">
        您可以在账户设置中调整通知摘要的频率或关闭此功能。
      </p>
    `;

    const html = EmailTemplateBase.generateEmailHTML(content, config);
    const text = EmailTemplateBase.generatePlainText(content, config);

    return { subject, html, text };
  }

  /**
   * 获取通知类型配置
   */
  private static getNotificationTypeConfig(type: string): {
    title: string;
    icon: string;
    color: string;
  } {
    const configs: Record<string, { title: string; icon: string; color: string }> = {
      like: { title: '新的点赞', icon: '❤️', color: '#ef4444' },
      comment: { title: '新的评论', icon: '💬', color: '#3b82f6' },
      follow: { title: '新的关注', icon: '👥', color: '#10b981' },
      mention: { title: '有人提到了您', icon: '@', color: '#8b5cf6' },
      system: { title: '系统通知', icon: '🔔', color: '#f59e0b' },
    };

    return configs[type] || configs.system;
  }

  /**
   * 生成欢迎邮件纯文本版本
   */
  private static generateWelcomePlainText(
    variables: WelcomeEmailVariables,
    config?: Partial<EmailTemplateConfig>
  ): string {
    const { username, displayName, joinDate, dashboardUrl, guideUrl } = variables;
    const brandName = config?.brandName || 'CoserEden';

    return `
欢迎加入${brandName}！

亲爱的 ${displayName || username}，

欢迎加入${brandName}创作者社区！

我们很高兴您成为我们大家庭的一员。${brandName}是一个专为cosplay爱好者和创作者打造的平台，在这里您可以：

- 展示作品 - 分享您精彩的cosplay作品和创作过程
- 互动交流 - 与全球4600+专业创作者交流心得
- 学习成长 - 获取专业的cosplay技巧和教程
- 参与活动 - 加入各种主题活动和挑战赛
- 获得收益 - 通过优质内容获得罐头奖励

${joinDate ? `加入时间：${joinDate}` : ''}

快速开始：
${dashboardUrl ? `控制台：${dashboardUrl}` : ''}
${guideUrl ? `新手指南：${guideUrl}` : ''}

小贴士：完善您的个人资料可以获得更多关注和互动！

如果您在使用过程中遇到任何问题，随时可以联系我们的客服团队。我们期待看到您的精彩作品！

© 2025 ${brandName}
如有疑问，请联系 ${config?.supportEmail || 'support@cosereeden.com'}
    `.trim();
  }
}

/**
 * 导出服务创建函数
 */
export const createNotificationTemplateService = () => NotificationTemplateService;
