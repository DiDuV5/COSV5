/**
 * @fileoverview 权益相关邮件模板
 * @description 包含权益开通和到期提醒邮件模板
 * @author Augment AI
 * @date 2025-07-03
 */

import { EmailContent } from '../email-template-base';
import {
  createEmailContent,
  generateButton,
  generateHighlightBox,
  generateWarningBox,
  generateStatsGrid,
  formatFeatureList,
} from '../utils/email-template-utils';

/**
 * 权益开通模板变量接口
 */
export interface PrivilegeActivationEmailVariables {
  username?: string;
  privilegeType?: string;
  privilegeLevel?: string;
  expirationDate?: string;
  features?: string[];
  guideUrl?: string;
}

/**
 * 权益到期模板变量接口
 */
export interface PrivilegeExpirationEmailVariables {
  username?: string;
  privilegeType?: string;
  daysLeft?: number;
  expirationDate?: string;
  renewUrl?: string;
  discountCode?: string;
  discountPercent?: number;
}

/**
 * 生成权益开通通知模板
 */
export function generatePrivilegeActivationEmail(variables: PrivilegeActivationEmailVariables): EmailContent {
  const {
    username = '用户',
    privilegeType = 'VIP会员',
    privilegeLevel = 'VIP',
    expirationDate = '2025年12月31日',
    features = ['高清上传', '优先展示', '专属标识', '客服优先'],
    guideUrl = 'https://cosereeden.com/guide/vip'
  } = variables;

  const content = `
    <h2>🎊 权益开通成功！</h2>
    <p>亲爱的 <strong>${username}</strong>，</p>
    <p>恭喜您！您的<span class="privilege-badge">${privilegeType}</span>权益已成功开通！</p>

    ${generateHighlightBox('✨ 权益详情', `
      <h3 style="margin-top: 0;">您的专属权益</h3>
      ${generateStatsGrid([
        { label: '权益类型', value: privilegeType },
        { label: '权益等级', value: privilegeLevel },
        { label: '到期时间', value: expirationDate }
      ])}
    `)}

    <h3>🌟 专享特权</h3>
    ${formatFeatureList(features)}

    <h3>🚀 立即体验</h3>
    <p>您的专属权益已激活，现在就可以享受以下特色功能：</p>
    
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-number">📸</span>
        <div class="stat-label">高清上传</div>
      </div>
      <div class="stat-item">
        <span class="stat-number">⭐</span>
        <div class="stat-label">优先展示</div>
      </div>
      <div class="stat-item">
        <span class="stat-number">👑</span>
        <div class="stat-label">专属标识</div>
      </div>
      <div class="stat-item">
        <span class="stat-number">🎯</span>
        <div class="stat-label">数据分析</div>
      </div>
    </div>

    ${generateHighlightBox('📚 使用指南', `
      <p>为了帮助您充分利用${privilegeType}权益，我们准备了详细的使用指南：</p>
      <ul class="feature-list">
        <li>如何上传高清作品并获得最佳展示效果</li>
        <li>专属标识的显示位置和使用方法</li>
        <li>优先展示算法和推荐机制说明</li>
        <li>高级数据分析功能使用教程</li>
        <li>专属客服联系方式和服务时间</li>
      </ul>
      ${generateButton('📖 查看完整指南', guideUrl, 'secondary')}
    `)}

    <h3>💎 ${privilegeType}专属福利</h3>
    <ul class="feature-list">
      <li><strong>作品优先推荐：</strong>您的作品将获得更多曝光机会</li>
      <li><strong>高清无损上传：</strong>支持最高4K分辨率图片和视频</li>
      <li><strong>专属身份标识：</strong>个人资料显示${privilegeLevel}专属徽章</li>
      <li><strong>数据深度分析：</strong>详细的粉丝画像和作品数据</li>
      <li><strong>优先客服支持：</strong>专属客服通道，快速响应</li>
      <li><strong>活动优先参与：</strong>优先参与平台举办的各类活动</li>
    </ul>

    <h3>🎯 充分利用您的权益</h3>
    <ol style="padding-left: 20px;">
      <li><strong>更新个人资料：</strong>展示您的${privilegeLevel}身份标识</li>
      <li><strong>上传高清作品：</strong>利用高清上传功能展示细节</li>
      <li><strong>查看数据分析：</strong>了解您的粉丝和作品表现</li>
      <li><strong>参与专属活动：</strong>关注${privilegeType}专属活动通知</li>
      <li><strong>联系专属客服：</strong>遇到问题可优先获得支持</li>
    </ol>

    <p style="margin-top: 30px;">
      感谢您对CoserEden的支持！我们将持续为您提供更好的服务和体验。
    </p>
  `;

  return createEmailContent(
    `🎊 ${privilegeType}开通成功 - 专属权益已激活`,
    content
  );
}

/**
 * 生成权益到期提醒模板
 */
export function generatePrivilegeExpirationEmail(variables: PrivilegeExpirationEmailVariables): EmailContent {
  const {
    username = '用户',
    privilegeType = 'VIP会员',
    daysLeft = 7,
    expirationDate = '2025年12月31日',
    renewUrl = 'https://cosereeden.com/renew',
    discountCode = 'RENEW20',
    discountPercent = 20
  } = variables;

  const urgencyLevel = daysLeft <= 3 ? 'high' : daysLeft <= 7 ? 'medium' : 'low';
  const urgencyEmoji = urgencyLevel === 'high' ? '🚨' : urgencyLevel === 'medium' ? '⚠️' : '📅';

  const content = `
    <h2>${urgencyEmoji} ${privilegeType}即将到期</h2>
    <p>亲爱的 <strong>${username}</strong>，</p>
    <p>您的<span class="privilege-badge">${privilegeType}</span>权益还有 <strong>${daysLeft}天</strong> 就要到期了。</p>

    ${generateWarningBox(`
      <h4 style="margin-top: 0;">${urgencyEmoji} 到期提醒</h4>
      ${generateStatsGrid([
        { label: '剩余天数', value: `${daysLeft}天` },
        { label: '到期日期', value: expirationDate }
      ])}
    `)}

    <h3>💔 到期后您将失去：</h3>
    <ul class="feature-list">
      <li>高清无损上传功能</li>
      <li>作品优先推荐权益</li>
      <li>专属身份标识显示</li>
      <li>高级数据分析功能</li>
      <li>优先客服支持服务</li>
      <li>专属活动参与资格</li>
    </ul>

    ${generateHighlightBox('🎁 续费优惠', `
      <h3 style="margin-top: 0;">限时续费优惠</h3>
      <p>现在续费可享受 <strong>${discountPercent}%</strong> 折扣！</p>
      <div class="code-block">优惠码：${discountCode}</div>
      ${generateButton('💎 立即续费', renewUrl)}
      
      <p style="margin-top: 15px; font-size: 14px; color: #666;">
        * 优惠码有效期至到期后7天，过期不可用
      </p>
    `)}

    <h3>📊 您的${privilegeType}使用统计</h3>
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-number">📸</span>
        <div class="stat-label">高清上传</div>
      </div>
      <div class="stat-item">
        <span class="stat-number">👀</span>
        <div class="stat-label">额外曝光</div>
      </div>
      <div class="stat-item">
        <span class="stat-number">💬</span>
        <div class="stat-label">客服支持</div>
      </div>
      <div class="stat-item">
        <span class="stat-number">🎯</span>
        <div class="stat-label">数据分析</div>
      </div>
    </div>

    <h3>🌟 续费的理由</h3>
    <ol style="padding-left: 20px;">
      <li><strong>保持竞争优势：</strong>继续享受作品优先推荐</li>
      <li><strong>维护专业形象：</strong>保持${privilegeType}身份标识</li>
      <li><strong>数据不中断：</strong>持续获得详细的数据分析</li>
      <li><strong>客服优先级：</strong>遇到问题快速解决</li>
      <li><strong>新功能抢先体验：</strong>优先使用平台新功能</li>
    </ol>

    ${daysLeft <= 3 ? generateWarningBox(`
      <h4 style="margin-top: 0;">🚨 紧急提醒</h4>
      <p>您的权益将在${daysLeft}天后到期！为避免影响使用，请尽快续费。</p>
      <p><strong>到期后将无法享受任何${privilegeType}特权。</strong></p>
    `) : ''}

    <div style="text-align: center; margin: 30px 0;">
      ${generateButton('🔄 一键续费', renewUrl)}
    </div>

    <p>如有任何疑问，请联系我们的专属客服：<a href="https://t.me/CoserYYbot">@CoserYYbot</a></p>
  `;

  return createEmailContent(
    `${urgencyEmoji} ${privilegeType}到期提醒 - 还有${daysLeft}天`,
    content
  );
}
