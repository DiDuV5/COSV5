/**
 * SMTP测试API端点
 * 用于测试邮件发送功能
 */

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 获取SMTP配置
    const smtpConfig = {
      host: process.env.COSEREEDEN_SMTP_HOST || process.env.SMTP_HOST,
      port: parseInt(process.env.COSEREEDEN_SMTP_PORT || process.env.SMTP_PORT || '587'),
      secure: (process.env.COSEREEDEN_SMTP_SECURE || process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
      auth: {
        user: process.env.COSEREEDEN_SMTP_USER || process.env.SMTP_USER,
        pass: process.env.COSEREEDEN_SMTP_PASS || process.env.SMTP_PASS,
      },
    };

    console.log('📧 SMTP配置测试:', {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      user: smtpConfig.auth.user,
      hasPassword: !!smtpConfig.auth.pass,
    });

    // 创建传输器
    const transporter = nodemailer.createTransport(smtpConfig);

    // 验证连接
    console.log('🔌 验证SMTP连接...');
    await transporter.verify();
    console.log('✅ SMTP连接验证成功');

    // 发送测试邮件
    const testEmail = {
      from: process.env.COSEREEDEN_SMTP_FROM || process.env.SMTP_FROM || smtpConfig.auth.user,
      to: smtpConfig.auth.user, // 发送给自己
      subject: '🧪 CoserEden SMTP测试邮件',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">🎭 CoserEden SMTP测试</h2>
          <p>这是一封测试邮件，用于验证SMTP配置是否正确。</p>
          <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>测试信息:</h3>
            <ul>
              <li><strong>SMTP服务器:</strong> ${smtpConfig.host}</li>
              <li><strong>端口:</strong> ${smtpConfig.port}</li>
              <li><strong>发送时间:</strong> ${new Date().toLocaleString('zh-CN')}</li>
            </ul>
          </div>
          <p style="color: #059669;">✅ 如果您收到这封邮件，说明SMTP配置正确！</p>
        </div>
      `,
    };

    console.log('📤 发送测试邮件...');
    const result = await transporter.sendMail(testEmail);
    console.log('✅ 测试邮件发送成功:', result.messageId);

    res.status(200).json({
      success: true,
      message: 'SMTP测试成功',
      config: {
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        user: smtpConfig.auth.user,
      },
      messageId: result.messageId,
    });

  } catch (error) {
    console.error('❌ SMTP测试失败:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      config: {
        host: process.env.COSEREEDEN_SMTP_HOST || process.env.SMTP_HOST,
        port: process.env.COSEREEDEN_SMTP_PORT || process.env.SMTP_PORT,
        user: process.env.COSEREEDEN_SMTP_USER || process.env.SMTP_USER,
      },
    });
  }
}
