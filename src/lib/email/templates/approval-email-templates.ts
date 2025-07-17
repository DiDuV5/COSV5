/**
 * @fileoverview 用户审核邮件模板
 * @description CoserEden平台用户注册审核相关的邮件模板
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - nodemailer: ^6.9.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，审核邮件模板
 */

import { sendEmail } from '@/lib/email';

/**
 * 发送注册审核通知邮件给管理员
 */
export async function sendAdminApprovalNotification(
  adminEmail: string,
  newUser: {
    username: string;
    email?: string;
    displayName?: string;
    registrationDate: Date;
  }
): Promise<boolean> {
  const adminUrl = `${process.env.COSEREEDEN_NEXTAUTH_URL}/admin/user-approval`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>新用户注册审核</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .user-info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .button { 
          display: inline-block; 
          background: #f59e0b; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 4px; 
          margin: 20px 0;
        }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        .urgent { color: #dc2626; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎭 CoserEden</h1>
          <h2>新用户注册审核通知</h2>
        </div>
        <div class="content">
          <p class="urgent">⚠️ 有新用户注册，需要您的审核</p>
          
          <div class="user-info">
            <h3>用户信息</h3>
            <p><strong>用户名：</strong>${newUser.username}</p>
            <p><strong>显示名称：</strong>${newUser.displayName || '未设置'}</p>
            <p><strong>邮箱：</strong>${newUser.email || '未提供'}</p>
            <p><strong>注册时间：</strong>${newUser.registrationDate.toLocaleString('zh-CN')}</p>
          </div>

          <p>作为CoserEden平台的管理员，请及时审核新用户注册申请，确保平台内容质量和用户安全。</p>
          
          <p style="text-align: center;">
            <a href="${adminUrl}" class="button">立即审核</a>
          </p>
          
          <p><strong>审核要点：</strong></p>
          <ul>
            <li>检查用户名是否符合平台规范</li>
            <li>验证邮箱地址的真实性</li>
            <li>评估用户注册意图的合理性</li>
            <li>确认无恶意注册行为</li>
          </ul>

          <p style="color: #666; font-size: 14px;">
            💡 建议在24小时内完成审核，以提供良好的用户体验。
          </p>
        </div>
        <div class="footer">
          <p>© 2025 CoserEden. 专业cosplay创作者平台</p>
          <p>此邮件由系统自动发送，请勿回复</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    CoserEden - 新用户注册审核通知
    
    有新用户注册，需要您的审核：
    
    用户名：${newUser.username}
    显示名称：${newUser.displayName || '未设置'}
    邮箱：${newUser.email || '未提供'}
    注册时间：${newUser.registrationDate.toLocaleString('zh-CN')}
    
    请访问管理后台进行审核：${adminUrl}
    
    © 2025 CoserEden
  `;

  return await sendEmail({
    to: adminEmail,
    subject: '🎭 CoserEden - 新用户注册审核通知',
    html,
    text,
  });
}

/**
 * 发送审核结果通知邮件给用户
 */
export async function sendApprovalNotificationEmail(
  userEmail: string,
  username: string,
  approved: boolean,
  reason?: string
): Promise<boolean> {
  const loginUrl = `${process.env.COSEREEDEN_NEXTAUTH_URL}/auth/signin`;
  const supportUrl = `${process.env.COSEREEDEN_NEXTAUTH_URL}/support`;

  const html = approved ? `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>账户审核通过</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .success-box { background: #d1fae5; border: 1px solid #10b981; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .button { 
          display: inline-block; 
          background: #10b981; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 4px; 
          margin: 20px 0;
        }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎭 CoserEden</h1>
          <h2>账户审核通过</h2>
        </div>
        <div class="content">
          <div class="success-box">
            <h3>🎉 恭喜！您的账户已通过审核</h3>
            <p>亲爱的 <strong>${username}</strong>，</p>
            <p>您的CoserEden账户已成功通过管理员审核，现在可以享受平台的所有功能！</p>
          </div>

          <h3>您现在可以：</h3>
          <ul>
            <li>🖼️ 上传和分享您的cosplay作品</li>
            <li>💬 与其他创作者互动交流</li>
            <li>❤️ 点赞和评论精彩内容</li>
            <li>👥 关注喜欢的创作者</li>
            <li>🏷️ 使用标签系统组织内容</li>
          </ul>
          
          <p style="text-align: center;">
            <a href="${loginUrl}" class="button">立即登录</a>
          </p>

          <h3>平台使用指南：</h3>
          <p>作为专业的cosplay创作者平台，我们建议您：</p>
          <ul>
            <li>完善个人资料，展示您的创作风格</li>
            <li>上传高质量的cosplay作品</li>
            <li>积极参与社区互动</li>
            <li>遵守平台社区规范</li>
          </ul>

          <p>如有任何问题，请随时联系我们的客服团队。</p>
        </div>
        <div class="footer">
          <p>© 2025 CoserEden. 专业cosplay创作者平台</p>
          <p>欢迎加入我们的创作者大家庭！</p>
        </div>
      </div>
    </body>
    </html>
  ` : `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>账户审核未通过</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ef4444; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .error-box { background: #fee2e2; border: 1px solid #ef4444; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .button { 
          display: inline-block; 
          background: #6b7280; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 4px; 
          margin: 20px 0;
        }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎭 CoserEden</h1>
          <h2>账户审核结果</h2>
        </div>
        <div class="content">
          <div class="error-box">
            <h3>😔 很抱歉，您的账户审核未通过</h3>
            <p>亲爱的 <strong>${username}</strong>，</p>
            <p>经过我们的审核，您的账户暂时无法通过审核。</p>
            ${reason ? `<p><strong>审核意见：</strong>${reason}</p>` : ''}
          </div>

          <h3>可能的原因：</h3>
          <ul>
            <li>用户名不符合平台规范</li>
            <li>注册信息不完整或不真实</li>
            <li>违反了平台社区准则</li>
            <li>存在重复注册行为</li>
          </ul>

          <h3>申诉和重新申请：</h3>
          <p>如果您认为审核结果有误，可以：</p>
          <ul>
            <li>联系客服团队进行申诉</li>
            <li>完善注册信息后重新申请</li>
            <li>提供更多身份验证材料</li>
          </ul>
          
          <p style="text-align: center;">
            <a href="${supportUrl}" class="button">联系客服</a>
          </p>

          <p>我们致力于维护一个安全、友好的创作者社区，感谢您的理解。</p>
        </div>
        <div class="footer">
          <p>© 2025 CoserEden. 专业cosplay创作者平台</p>
          <p>如有疑问，请联系客服团队</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = approved ? `
    CoserEden - 账户审核通过
    
    恭喜！亲爱的 ${username}，
    
    您的CoserEden账户已成功通过管理员审核，现在可以享受平台的所有功能！
    
    立即登录：${loginUrl}
    
    欢迎加入我们的创作者大家庭！
    
    © 2025 CoserEden
  ` : `
    CoserEden - 账户审核未通过
    
    很抱歉，亲爱的 ${username}，
    
    您的账户审核暂时未通过。
    ${reason ? `审核意见：${reason}` : ''}
    
    如有疑问，请联系客服：${supportUrl}
    
    © 2025 CoserEden
  `;

  return await sendEmail({
    to: userEmail,
    subject: approved ? '🎉 CoserEden - 账户审核通过' : '😔 CoserEden - 账户审核未通过',
    html,
    text,
  });
}

/**
 * 发送注册成功等待审核邮件
 */
export async function sendRegistrationPendingEmail(
  userEmail: string,
  username: string
): Promise<boolean> {
  const statusUrl = `${process.env.COSEREEDEN_NEXTAUTH_URL}/auth/approval-status`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>注册成功，等待审核</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .info-box { background: #dbeafe; border: 1px solid #3b82f6; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .button { 
          display: inline-block; 
          background: #3b82f6; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 4px; 
          margin: 20px 0;
        }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎭 CoserEden</h1>
          <h2>注册成功</h2>
        </div>
        <div class="content">
          <div class="info-box">
            <h3>📋 您的注册申请已提交</h3>
            <p>亲爱的 <strong>${username}</strong>，</p>
            <p>感谢您注册CoserEden！您的账户已创建成功，目前正在等待管理员审核。</p>
          </div>

          <h3>审核流程说明：</h3>
          <ul>
            <li>⏰ 审核时间：通常在24小时内完成</li>
            <li>📧 结果通知：审核完成后会发送邮件通知</li>
            <li>🔍 审核内容：用户名、邮箱、注册信息等</li>
            <li>✅ 通过后：即可正常使用所有功能</li>
          </ul>
          
          <p style="text-align: center;">
            <a href="${statusUrl}" class="button">查看审核状态</a>
          </p>

          <h3>为什么需要审核？</h3>
          <p>CoserEden是专业的cosplay创作者平台，为了维护社区质量和用户安全，我们对新用户进行人工审核。这有助于：</p>
          <ul>
            <li>防止恶意注册和垃圾账户</li>
            <li>确保用户信息的真实性</li>
            <li>维护良好的社区环境</li>
            <li>保护创作者的权益</li>
          </ul>

          <p>感谢您的耐心等待，我们会尽快完成审核！</p>
        </div>
        <div class="footer">
          <p>© 2025 CoserEden. 专业cosplay创作者平台</p>
          <p>期待您成为我们社区的一员！</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    CoserEden - 注册成功，等待审核
    
    亲爱的 ${username}，
    
    感谢您注册CoserEden！您的账户已创建成功，目前正在等待管理员审核。
    
    审核时间：通常在24小时内完成
    结果通知：审核完成后会发送邮件通知
    
    查看审核状态：${statusUrl}
    
    感谢您的耐心等待！
    
    © 2025 CoserEden
  `;

  return await sendEmail({
    to: userEmail,
    subject: '📋 CoserEden - 注册成功，等待审核',
    html,
    text,
  });
}
