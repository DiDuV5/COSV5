/**
 * @fileoverview 邮件模板工具方法
 * @description 邮件模板生成和处理的通用工具函数
 * @author Augment AI
 * @date 2025-07-03
 */

import { EmailContent } from '../email-template-base';
import { COSEREEDEN_STYLES } from '../config/cosereeden-config';

/**
 * 生成完整的HTML邮件
 */
export function generateEmailHTML(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CoserEden</title>
      ${COSEREEDEN_STYLES}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎭 CoserEden</h1>
          <div class="subtitle">专业Cosplay创作者平台</div>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <div class="social-links">
            <a href="https://cosereeden.com" title="官网">🏠</a>
            <a href="https://t.me/CoserYYbot" title="客服">💬</a>
            <a href="https://cosereeden.com/community" title="社区">👥</a>
          </div>
          <p>© 2025 CoserEden. 专业Cosplay创作者平台</p>
          <p>
            <a href="https://cosereeden.com">访问官网</a> | 
            <a href="https://cosereeden.com/privacy">隐私政策</a> | 
            <a href="https://cosereeden.com/terms">服务条款</a>
          </p>
          <p style="font-size: 12px; color: #999;">
            如果您不希望收到此类邮件，请<a href="https://cosereeden.com/unsubscribe">取消订阅</a>
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
export function generatePlainText(content: string): string {
  // 简单的HTML到文本转换
  return content
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 创建邮件内容对象
 */
export function createEmailContent(
  subject: string,
  htmlContent: string,
  textContent?: string
): EmailContent {
  return {
    subject,
    html: generateEmailHTML(htmlContent),
    text: textContent || generatePlainText(htmlContent),
  };
}

/**
 * 格式化特性列表为HTML
 */
export function formatFeatureList(features: string[]): string {
  if (!features || features.length === 0) {
    return '<p>暂无特殊权益</p>';
  }

  return `
    <ul class="feature-list">
      ${features.map(feature => `<li>${feature}</li>`).join('')}
    </ul>
  `;
}

/**
 * 生成统计网格HTML
 */
export function generateStatsGrid(stats: Array<{ label: string; value: string }>): string {
  return `
    <div class="stats-grid">
      ${stats.map(stat => `
        <div class="stat-item">
          <span class="stat-number">${stat.value}</span>
          <div class="stat-label">${stat.label}</div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * 生成按钮HTML
 */
export function generateButton(
  text: string,
  url: string,
  type: 'primary' | 'secondary' = 'primary'
): string {
  const className = type === 'secondary' ? 'btn btn-secondary' : 'btn';
  return `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${url}" class="${className}">${text}</a>
    </div>
  `;
}

/**
 * 生成高亮框HTML
 */
export function generateHighlightBox(title: string, content: string): string {
  return `
    <div class="highlight-box">
      <h3 style="margin-top: 0;">${title}</h3>
      ${content}
    </div>
  `;
}

/**
 * 生成信息框HTML
 */
export function generateInfoBox(content: string): string {
  return `
    <div class="info-box">
      ${content}
    </div>
  `;
}

/**
 * 生成警告框HTML
 */
export function generateWarningBox(content: string): string {
  return `
    <div class="warning-box">
      ${content}
    </div>
  `;
}

/**
 * 生成成功框HTML
 */
export function generateSuccessBox(content: string): string {
  return `
    <div class="success-box">
      ${content}
    </div>
  `;
}

/**
 * 生成代码块HTML
 */
export function generateCodeBlock(content: string): string {
  return `
    <div class="code-block">${content}</div>
  `;
}
