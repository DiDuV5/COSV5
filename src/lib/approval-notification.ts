/**
 * @fileoverview 用户审核通知服务
 * @description 处理用户审核结果的通知发送
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @/lib/email-service: 邮件服务
 * - @/lib/user-approval-helper: 审核辅助函数
 *
 * @changelog
 * - 2025-06-22: 初始版本创建，审核通知服务
 */

import { getApprovalConfig } from "@/lib/user-approval-helper";

/**
 * 用户信息接口
 */
interface UserInfo {
  id: string;
  username: string;
  email?: string | null;
  displayName?: string | null;

}

/**
 * 审核通知数据接口
 */
interface ApprovalNotificationData {
  user: UserInfo;
  action: "APPROVE" | "REJECT";
  reason?: string;
  adminName?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
}

/**
 * 邮件模板配置
 */
const EMAIL_TEMPLATES = {
  APPROVE: {
    subject: "🎉 您的CoserEden账号审核已通过",
    getContent: (data: ApprovalNotificationData) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>账号审核通过通知</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .success-icon { font-size: 48px; margin-bottom: 20px; }
        .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="success-icon">✅</div>
            <h1>恭喜！审核通过</h1>
        </div>
        <div class="content">
            <p>亲爱的 <strong>${data.user.displayName || data.user.username}</strong>，</p>

            <p>我们很高兴地通知您，您的CoserEden账号审核已经通过！</p>

            <p><strong>审核详情：</strong></p>
            <ul>
                <li>用户名: ${data.user.username}</li>
                <li>审核时间: ${data.approvedAt?.toLocaleString('zh-CN') || '刚刚'}</li>
                ${data.adminName ? `<li>审核人员: ${data.adminName}</li>` : ''}
                ${data.reason ? `<li>审核备注: ${data.reason}</li>` : ''}
            </ul>

            <p>现在您可以：</p>
            <ul>
                <li>🎭 浏览和发布cosplay作品</li>
                <li>💬 与其他创作者互动交流</li>
                <li>📸 上传您的精彩作品</li>
                <li>🌟 参与社区活动</li>
            </ul>

            <div style="text-align: center;">
                <a href="${process.env.COSEREEDEN_NEXTAUTH_URL || 'https://cosereeden.com'}" class="button">
                    立即开始使用
                </a>
            </div>

            <p>感谢您加入CoserEden社区，期待看到您的精彩作品！</p>
        </div>
        <div class="footer">
            <p>CoserEden - 专业cosplay创作者社区</p>
            <p>如有疑问，请联系我们：support@cosereeden.com</p>
        </div>
    </div>
</body>
</html>
    `,
  },

  REJECT: {
    subject: "❌ 关于您的CoserEden账号审核结果",
    getContent: (data: ApprovalNotificationData) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>账号审核结果通知</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .warning-icon { font-size: 48px; margin-bottom: 20px; }
        .button { display: inline-block; background: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .reason-box { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="warning-icon">⚠️</div>
            <h1>审核结果通知</h1>
        </div>
        <div class="content">
            <p>亲爱的 <strong>${data.user.displayName || data.user.username}</strong>，</p>

            <p>很抱歉，您的CoserEden账号审核暂时未能通过。</p>

            <p><strong>审核详情：</strong></p>
            <ul>
                <li>用户名: ${data.user.username}</li>
                <li>审核时间: ${data.rejectedAt?.toLocaleString('zh-CN') || '刚刚'}</li>
                ${data.adminName ? `<li>审核人员: ${data.adminName}</li>` : ''}
            </ul>

            ${data.reason ? `
            <div class="reason-box">
                <strong>审核说明：</strong><br>
                ${data.reason}
            </div>
            ` : ''}

            <p><strong>下一步操作：</strong></p>
            <ul>
                <li>📧 如有疑问，请联系我们的客服团队</li>
                <li>📝 您可以根据审核说明调整后重新申请</li>
                <li>💬 我们的客服会协助您解决问题</li>
            </ul>

            <div style="text-align: center;">
                <a href="mailto:support@cosereeden.com" class="button">
                    联系客服
                </a>
            </div>

            <p>我们致力于为所有用户提供优质的社区环境，感谢您的理解与配合。</p>
        </div>
        <div class="footer">
            <p>CoserEden - 专业cosplay创作者社区</p>
            <p>客服邮箱：support@cosereeden.com</p>
        </div>
    </div>
</body>
</html>
    `,
  },
};

/**
 * 发送注册申请提交通知（邮件）
 */
export async function sendRegistrationSubmittedNotification(user: UserInfo): Promise<boolean> {
  try {
    // 检查是否启用了通知功能
    const config = await getApprovalConfig();
    if (!config.notificationEnabled) {
      console.log("审核通知功能已禁用，跳过发送通知");
      return true;
    }

    // 检查用户是否有邮箱
    if (!user.email) {
      console.log(`用户 ${user.username} 没有邮箱，无法发送注册申请通知`);
      return false;
    }

    const appName = process.env.COSEREEDEN_NEXT_PUBLIC_APP_NAME || 'CoserEden';
    const appUrl = process.env.COSEREEDEN_NEXT_PUBLIC_APP_URL || 'https://cosereeden.com';

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>注册申请已提交</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .pending-icon { font-size: 48px; margin-bottom: 20px; }
        .button { display: inline-block; background: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .info-box { background: #e3f2fd; border: 1px solid #2196f3; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="pending-icon">⏳</div>
            <h1>注册申请已提交</h1>
        </div>
        <div class="content">
            <p>亲爱的 <strong>${user.displayName || user.username}</strong>，</p>

            <p>感谢您注册${appName}！您的注册申请已成功提交，正在等待管理员审核。</p>

            <div class="info-box">
                <p><strong>申请详情：</strong></p>
                <ul>
                    <li>用户名: ${user.username}</li>
                    <li>提交时间: ${new Date().toLocaleString('zh-CN')}</li>
                    <li>审核状态: 待审核</li>
                </ul>
            </div>

            <p><strong>审核说明：</strong></p>
            <ul>
                <li>⏰ 管理员将在24小时内完成审核</li>
                <li>📧 审核结果将通过邮件通知您</li>
                <li>✅ 审核通过后即可正常使用所有功能</li>
                <li>💬 如有疑问可联系客服</li>
            </ul>

            <div style="text-align: center;">
                <a href="${appUrl}" class="button">
                    访问${appName}
                </a>
            </div>

            <p>感谢您的耐心等待，我们会尽快完成审核！</p>
        </div>
        <div class="footer">
            <p>${appName} - 专业cosplay创作者社区</p>
            <p>如有疑问，请联系我们：support@cosereeden.com</p>
        </div>
    </div>
</body>
</html>
    `;

    // TODO: 集成实际的邮件服务
    console.log(`发送注册申请通知邮件给 ${user.email}:`, {
      subject: `🎉 您的${appName}注册申请已提交`,
      username: user.username,
    });

    // const emailService = await import("@/lib/email-service");
    // await emailService.sendEmail({
    //   to: user.email,
    //   subject: `🎉 您的${appName}注册申请已提交`,
    //   html,
    // });

    return true;
  } catch (error) {
    console.error("发送注册申请通知失败:", error);
    return false;
  }
}

/**
 * 发送审核结果通知（支持邮件）
 */
export async function sendApprovalNotification(data: ApprovalNotificationData): Promise<boolean> {
  try {
    // 检查是否启用了通知功能
    const config = await getApprovalConfig();
    if (!config.notificationEnabled) {
      console.log("审核通知功能已禁用，跳过发送通知");
      return true;
    }

    let emailSuccess = false;

    // 发送邮件通知（如果用户有邮箱）
    if (data.user.email) {
      try {
        // 获取邮件模板
        const template = EMAIL_TEMPLATES[data.action];
        if (template) {
          // 准备邮件内容
          const emailContent = {
            to: data.user.email,
            subject: template.subject,
            html: template.getContent(data),
          };

          // 发送邮件（这里需要集成实际的邮件服务）
          console.log(`发送审核通知邮件给 ${data.user.email}:`, {
            subject: emailContent.subject,
            action: data.action,
            username: data.user.username,
          });

          // TODO: 集成实际的邮件服务
          // const emailService = await import("@/lib/email-service");
          // await emailService.sendEmail(emailContent);

          emailSuccess = true;
        }
      } catch (error) {
        console.error(`发送邮件通知给 ${data.user.username} 失败:`, error);
      }
    }

    // 如果邮件通知成功，就认为通知发送成功
    const success = emailSuccess;

    if (!success) {
      console.warn(`用户 ${data.user.username} 没有有效的通知方式（邮箱）`);
    }

    return success;
  } catch (error) {
    console.error("发送审核通知失败:", error);
    return false;
  }
}

/**
 * 批量发送审核通知
 */
export async function sendBatchApprovalNotifications(
  users: UserInfo[],
  action: "APPROVE" | "REJECT",
  reason?: string,
  adminName?: string
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const notificationData: ApprovalNotificationData = {
        user,
        action,
        reason,
        adminName,
        approvedAt: action === "APPROVE" ? new Date() : undefined,
        rejectedAt: action === "REJECT" ? new Date() : undefined,
      };

      const result = await sendApprovalNotification(notificationData);
      if (result) {
        success++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`发送通知给用户 ${user.username} 失败:`, error);
      failed++;
    }
  }

  return { success, failed };
}

/**
 * 发送审核状态变更通知（站内消息）
 */
export async function sendInAppNotification(
  userId: string,
  action: "APPROVE" | "REJECT",
  reason?: string
): Promise<boolean> {
  try {
    // TODO: 集成站内消息系统
    console.log(`发送站内通知给用户 ${userId}:`, {
      action,
      reason,
      timestamp: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error("发送站内通知失败:", error);
    return false;
  }
}

/**
 * 获取通知模板预览
 */
export function getNotificationPreview(
  action: "APPROVE" | "REJECT",
  sampleData?: Partial<ApprovalNotificationData>
): { subject: string; content: string } {
  const template = EMAIL_TEMPLATES[action];
  const defaultData: ApprovalNotificationData = {
    user: {
      id: "sample-id",
      username: "示例用户",
      email: "user@example.com",
      displayName: "示例用户",
    },
    action,
    reason: sampleData?.reason || "示例审核原因",
    adminName: "管理员",
    approvedAt: action === "APPROVE" ? new Date() : undefined,
    rejectedAt: action === "REJECT" ? new Date() : undefined,
    ...sampleData,
  };

  return {
    subject: template.subject,
    content: template.getContent(defaultData),
  };
}
