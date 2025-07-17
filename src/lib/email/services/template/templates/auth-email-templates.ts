/**
 * @fileoverview 认证相关邮件模板
 * @description 包含邮箱验证和密码重置邮件模板
 * @author Augment AI
 * @date 2025-07-03
 */

import { EmailContent } from '../email-template-base';
import {
  createEmailContent,
  generateButton,
  generateHighlightBox,
  generateWarningBox,
  generateCodeBlock,
  generateStatsGrid,
} from '../utils/email-template-utils';

/**
 * 邮箱验证模板变量接口
 */
export interface VerificationEmailVariables {
  username?: string;
  verificationUrl?: string;
  expirationTime?: string;
}

/**
 * 密码重置模板变量接口
 */
export interface PasswordResetEmailVariables {
  username?: string;
  resetUrl?: string;
  expirationTime?: string;
  requestIp?: string;
  requestTime?: string;
}

/**
 * 生成注册邮箱验证模板
 */
export function generateVerificationEmail(variables: VerificationEmailVariables): EmailContent {
  const {
    username = '用户',
    verificationUrl = '#',
    expirationTime = '24小时'
  } = variables;

  const content = `
    <h2>🎉 欢迎加入CoserEden！</h2>
    <p>亲爱的 <strong>${username}</strong>，</p>
    <p>感谢您注册CoserEden！为了确保账户安全，请验证您的邮箱地址。</p>

    ${generateHighlightBox('📧 邮箱验证', `
      <p>点击下方按钮完成邮箱验证：</p>
      ${generateButton('🔐 验证邮箱', verificationUrl)}

      ${generateStatsGrid([
        { label: '验证状态', value: '待验证' },
        { label: '有效期', value: expirationTime }
      ])}
    `)}

    <p>如果按钮无法点击，请复制以下链接到浏览器地址栏：</p>
    ${generateCodeBlock(verificationUrl)}

    ${generateWarningBox(`
      <strong>⏰ 重要提醒：</strong>此验证链接将在${expirationTime}后过期，请尽快完成验证。
    `)}

    <h3>🌟 验证完成后您将可以：</h3>
    <ul class="feature-list">
      <li>上传和分享您的Cosplay作品</li>
      <li>关注其他优秀的Coser</li>
      <li>参与社区讨论和活动</li>
      <li>获得作品点赞和评论</li>
      <li>申请认证创作者身份</li>
    </ul>

    <h3>🎭 关于CoserEden</h3>
    <p>CoserEden是专为Cosplay爱好者打造的创作者平台，汇聚了4600+专业Cosplay创作者。在这里，您可以：</p>
    <ul>
      <li>展示您的精美Cosplay作品</li>
      <li>学习专业的化妆和摄影技巧</li>
      <li>结识志同道合的Cosplay伙伴</li>
      <li>参与线上线下的Cosplay活动</li>
    </ul>

    <p>如果您有任何问题，请随时联系我们的客服：<a href="https://t.me/CoserYYbot">@CoserYYbot</a></p>
  `;

  return createEmailContent(
    'CoserEden账户验证',
    content
  );
}

/**
 * 生成忘记密码邮箱验证模板
 */
export function generatePasswordResetEmail(variables: PasswordResetEmailVariables): EmailContent {
  const {
    username = '用户',
    resetUrl = '#',
    expirationTime = '1小时',
    requestIp = '未知',
    requestTime = new Date().toLocaleString('zh-CN')
  } = variables;

  const content = `
    <h2>🔐 密码重置请求</h2>
    <p>亲爱的 <strong>${username}</strong>，</p>
    <p>我们收到了您的密码重置请求。如果这是您本人的操作，请点击下方按钮重置密码。</p>

    ${generateHighlightBox('🔑 重置密码', `
      <p>点击下方按钮设置新密码：</p>
      ${generateButton('🔄 重置密码', resetUrl)}

      ${generateStatsGrid([
        { label: '请求时间', value: requestTime },
        { label: '有效期', value: expirationTime }
      ])}
    `)}

    <p>如果按钮无法点击，请复制以下链接到浏览器地址栏：</p>
    ${generateCodeBlock(resetUrl)}

    ${generateWarningBox(`
      <h4 style="margin-top: 0;">🛡️ 安全提醒</h4>
      <ul style="margin: 0; padding-left: 20px;">
        <li>此重置链接将在${expirationTime}后过期</li>
        <li>链接只能使用一次</li>
        <li>如果不是您本人操作，请忽略此邮件</li>
        <li>建议设置强密码，包含字母、数字和特殊字符</li>
      </ul>
    `)}

    <h3>📊 请求详情</h3>
    <div class="info-box">
      <p><strong>请求时间：</strong>${requestTime}</p>
      <p><strong>请求IP：</strong>${requestIp}</p>
      <p><strong>有效期：</strong>${expirationTime}</p>
      <p><strong>安全级别：</strong>高</p>
    </div>

    <h3>🔒 账户安全建议</h3>
    <ul class="feature-list">
      <li>使用强密码，至少8位字符</li>
      <li>不要在多个网站使用相同密码</li>
      <li>定期更换密码</li>
      <li>启用两步验证（如可用）</li>
      <li>不要在公共设备上保存密码</li>
    </ul>

    <p><strong>如果您没有请求重置密码，</strong>请立即联系我们的客服：<a href="https://t.me/CoserYYbot">@CoserYYbot</a></p>
  `;

  return createEmailContent(
    '🔐 CoserEden密码重置 - 安全验证',
    content
  );
}
