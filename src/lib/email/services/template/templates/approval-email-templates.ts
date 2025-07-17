/**
 * @fileoverview 审核相关邮件模板
 * @description 包含注册审核和审核通过邮件模板
 * @author Augment AI
 * @date 2025-07-03
 */

import { EmailContent } from '../email-template-base';
import {
  createEmailContent,
  generateButton,
  generateHighlightBox,
  generateInfoBox,
  generateStatsGrid,
  generateSuccessBox,
} from '../utils/email-template-utils';

/**
 * 注册审核模板变量接口
 */
export interface RegistrationPendingEmailVariables {
  username?: string;
  applicationId?: string;
  estimatedTime?: string;
  supportContact?: string;
}

/**
 * 审核通过模板变量接口
 */
export interface RegistrationApprovedEmailVariables {
  username?: string;
  loginUrl?: string;
  welcomeGuideUrl?: string;
  communityUrl?: string;
}

/**
 * 生成等待注册审核模板
 */
export function generateRegistrationPendingEmail(variables: RegistrationPendingEmailVariables): EmailContent {
  const {
    username = '用户',
    applicationId = 'APP' + Date.now(),
    estimatedTime = '1-3个工作日',
    supportContact = 'https://t.me/CoserYYbot'
  } = variables;

  const content = `
    <h2>⏳ 注册申请已提交</h2>
    <p>亲爱的 <strong>${username}</strong>，</p>
    <p>感谢您申请加入CoserEden！您的注册申请已成功提交，我们正在审核中。</p>

    ${generateHighlightBox('✅ 申请确认', `
      <h3 style="margin-top: 0;">申请信息</h3>
      ${generateStatsGrid([
        { label: '申请编号', value: applicationId },
        { label: '预计审核时间', value: estimatedTime }
      ])}
    `)}

    <h3>📋 审核流程</h3>
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-number">✅</span>
        <div class="stat-label">提交申请</div>
      </div>
      <div class="stat-item">
        <span class="stat-number">⏳</span>
        <div class="stat-label">审核中</div>
      </div>
      <div class="stat-item">
        <span class="stat-number">📧</span>
        <div class="stat-label">结果通知</div>
      </div>
      <div class="stat-item">
        <span class="stat-number">🎉</span>
        <div class="stat-label">开始使用</div>
      </div>
    </div>

    ${generateInfoBox(`
      <h4 style="margin-top: 0;">📝 审核标准</h4>
      <p>我们会根据以下标准进行审核：</p>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>个人信息的真实性和完整性</li>
        <li>对Cosplay文化的理解和热爱</li>
        <li>遵守社区规范的承诺</li>
        <li>账户安全设置的完善程度</li>
      </ul>
    `)}

    <h3>⏰ 审核期间您可以：</h3>
    <ul class="feature-list">
      <li>浏览CoserEden社区内容</li>
      <li>了解平台功能和特色</li>
      <li>准备您的第一个Cosplay作品</li>
      <li>关注我们的社交媒体获取最新动态</li>
      <li>阅读Cosplay创作指南和技巧</li>
    </ul>

    <h3>🎭 关于CoserEden</h3>
    <p>CoserEden是专业的Cosplay创作者平台，我们致力于：</p>
    <ul>
      <li><strong>品质保证：</strong>严格的审核机制确保社区质量</li>
      <li><strong>专业支持：</strong>为创作者提供专业的技术和创作支持</li>
      <li><strong>活跃社区：</strong>4600+专业创作者的活跃交流</li>
      <li><strong>成长平台：</strong>从新手到专业创作者的成长路径</li>
    </ul>

    ${generateInfoBox(`
      <h4 style="margin-top: 0;">📞 需要帮助？</h4>
      <p>如果您有任何疑问或需要帮助，请联系我们：</p>
      <p><strong>客服支持：</strong><a href="${supportContact}">@CoserYYbot</a></p>
      <p><strong>工作时间：</strong>周一至周五 9:00-18:00</p>
      <p><strong>响应时间：</strong>通常在2小时内回复</p>
    `)}

    <p style="margin-top: 30px;">
      我们会在审核完成后第一时间通知您结果。感谢您的耐心等待！
    </p>
  `;

  return createEmailContent(
    '⏳ CoserEden注册申请确认 - 审核中',
    content
  );
}

/**
 * 生成审核通过通知模板
 */
export function generateRegistrationApprovedEmail(variables: RegistrationApprovedEmailVariables): EmailContent {
  const {
    username = '用户',
    loginUrl = 'https://cosereeden.com/login',
    welcomeGuideUrl = 'https://cosereeden.com/guide/welcome',
    communityUrl = 'https://cosereeden.com/community'
  } = variables;

  const content = `
    <h2>🎉 欢迎加入CoserEden大家庭！</h2>
    <p>亲爱的 <strong>${username}</strong>，</p>
    <p>恭喜您！您的注册申请已通过审核，现在可以开始您的CoserEden创作之旅了！</p>

    ${generateSuccessBox(`
      <h3 style="margin-top: 0;">🎊 审核通过</h3>
      <p>您的账户已激活，可以立即开始使用所有功能！</p>
      ${generateButton('🚀 立即登录', loginUrl)}
    `)}

    <h3>🌟 现在您可以：</h3>
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-number">📸</span>
        <div class="stat-label">上传作品</div>
      </div>
      <div class="stat-item">
        <span class="stat-number">👥</span>
        <div class="stat-label">关注创作者</div>
      </div>
      <div class="stat-item">
        <span class="stat-number">💬</span>
        <div class="stat-label">参与讨论</div>
      </div>
      <div class="stat-item">
        <span class="stat-number">🏆</span>
        <div class="stat-label">参加活动</div>
      </div>
    </div>

    <h3>🎯 快速开始指南</h3>
    <ol style="padding-left: 20px;">
      <li><strong>完善个人资料：</strong>添加头像、简介和社交链接</li>
      <li><strong>上传首个作品：</strong>分享您的Cosplay照片或视频</li>
      <li><strong>关注感兴趣的创作者：</strong>发现优秀的Cosplay作品</li>
      <li><strong>参与社区互动：</strong>点赞、评论、分享</li>
      <li><strong>加入讨论群组：</strong>与同好交流创作心得</li>
    </ol>

    ${generateHighlightBox('📚 新手资源', `
      <p>为了帮助您更好地开始，我们准备了丰富的资源：</p>
      <ul class="feature-list">
        <li>Cosplay化妆技巧教程</li>
        <li>摄影构图和后期处理指南</li>
        <li>服装制作和道具制作教程</li>
        <li>角色理解和表演技巧</li>
        <li>社区活动和比赛信息</li>
      </ul>
      ${generateButton('📖 查看新手指南', welcomeGuideUrl, 'secondary')}
    `)}

    <h3>🎭 CoserEden特色功能</h3>
    <ul class="feature-list">
      <li><strong>高清上传：</strong>支持4K高清图片和视频</li>
      <li><strong>智能标签：</strong>自动识别角色和作品标签</li>
      <li><strong>创作者认证：</strong>获得官方认证标识</li>
      <li><strong>作品保护：</strong>水印和版权保护功能</li>
      <li><strong>数据分析：</strong>详细的作品数据和粉丝分析</li>
      <li><strong>商业合作：</strong>品牌合作和商业机会</li>
    </ul>

    ${generateInfoBox(`
      <h4 style="margin-top: 0;">🎁 新用户福利</h4>
      <p>作为新加入的创作者，您将获得：</p>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>7天VIP体验权限</li>
        <li>首次上传作品获得额外曝光</li>
        <li>新手任务奖励积分</li>
        <li>专属新手交流群邀请</li>
      </ul>
    `)}

    <div style="text-align: center; margin: 30px 0;">
      ${generateButton('🏠 进入社区', communityUrl, 'secondary')}
    </div>

    <p>再次欢迎您加入CoserEden！如果有任何问题，请随时联系我们的客服：<a href="https://t.me/CoserYYbot">@CoserYYbot</a></p>
  `;

  return createEmailContent(
    '🎉 CoserEden注册成功 - 开始您的创作之旅！',
    content
  );
}
