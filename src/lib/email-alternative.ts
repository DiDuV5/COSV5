/**
 * 替代邮件服务 - 使用原生 SMTP 实现
 * 用于解决 nodemailer 认证字符串缓存问题
 */

import * as net from 'net';
import * as tls from 'tls';
import { prisma } from '@/lib/prisma';

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpFromName: string;
  smtpFromEmail: string;
}

async function getEmailConfig(): Promise<EmailConfig | null> {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        category: 'email',
      },
    });

    const config: Record<string, any> = {};
    settings.forEach(setting => {
      try {
        config[setting.key] = JSON.parse(setting.value);
      } catch {
        config[setting.key] = setting.value;
      }
    });

    // 检查必需的配置
    const requiredKeys = [
      'email.smtp_host',
      'email.smtp_port',
      'email.smtp_user',
      'email.smtp_password',
      'email.smtp_from_name',
      'email.smtp_from_email'
    ];

    const hasAllKeys = requiredKeys.every(key => config[key]);
    if (!hasAllKeys) {
      console.warn('❌ 邮箱配置不完整');
      return null;
    }

    return {
      smtpHost: config['email.smtp_host'],
      smtpPort: config['email.smtp_port'],
      smtpUser: config['email.smtp_user'],
      smtpPassword: config['email.smtp_password'],
      smtpFromName: config['email.smtp_from_name'],
      smtpFromEmail: config['email.smtp_from_email'],
    };
  } catch (error) {
    console.error('获取邮件配置失败:', error);
    return null;
  }
}

class SMTPClient {
  private socket: net.Socket | tls.TLSSocket | null = null;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  private async sendCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Command timeout'));
      }, 30000);

      const onData = (data: Buffer) => {
        clearTimeout(timeout);
        this.socket?.off('data', onData);
        const response = data.toString();
        console.log(`🔧 SMTP响应: ${response.trim()}`);
        resolve(response);
      };

      this.socket.on('data', onData);
      console.log(`🔧 SMTP命令: ${command.trim()}`);
      this.socket.write(command);
    });
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`🔧 连接到 ${this.config.smtpHost}:${this.config.smtpPort}`);

      this.socket = net.createConnection({
        host: this.config.smtpHost,
        port: this.config.smtpPort,
      });

      this.socket.on('connect', async () => {
        try {
          console.log('🔧 TCP连接建立');

          // 等待服务器问候
          const greeting = await this.sendCommand('');
          if (!greeting.startsWith('220')) {
            throw new Error(`Unexpected greeting: ${greeting}`);
          }

          // 发送 EHLO
          const ehlo = await this.sendCommand('EHLO localhost\r\n');
          if (!ehlo.startsWith('250')) {
            throw new Error(`EHLO failed: ${ehlo}`);
          }

          // 启动 STARTTLS
          const starttls = await this.sendCommand('STARTTLS\r\n');
          if (!starttls.startsWith('220')) {
            throw new Error(`STARTTLS failed: ${starttls}`);
          }

          // 升级到 TLS
          console.log('🔧 升级到TLS连接');
          if (!this.socket) {
            throw new Error('Socket连接不存在，无法升级到TLS');
          }
          const tlsSocket = tls.connect({
            socket: this.socket,
            servername: this.config.smtpHost,
            rejectUnauthorized: false,
          });

          tlsSocket.on('secureConnect', async () => {
            try {
              console.log('🔧 TLS连接建立');
              this.socket = tlsSocket;

              // 重新发送 EHLO
              const ehlo2 = await this.sendCommand('EHLO localhost\r\n');
              if (!ehlo2.startsWith('250')) {
                throw new Error(`EHLO after TLS failed: ${ehlo2}`);
              }

              resolve();
            } catch (error) {
              reject(error);
            }
          });

          tlsSocket.on('error', reject);
        } catch (error) {
          reject(error);
        }
      });

      this.socket.on('error', reject);
    });
  }

  async authenticate(): Promise<void> {
    // 手动构建认证字符串
    const authString = Buffer.from(`\0${this.config.smtpUser}\0${this.config.smtpPassword}`).toString('base64');
    console.log(`🔧 开始SMTP认证，用户: ${this.config.smtpUser}`);

    const authResponse = await this.sendCommand(`AUTH PLAIN ${authString}\r\n`);
    if (!authResponse.startsWith('235')) {
      throw new Error(`Authentication failed: ${authResponse}`);
    }

    console.log('🔧 认证成功');
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    // 发送 MAIL FROM
    const mailFrom = await this.sendCommand(`MAIL FROM:<${this.config.smtpFromEmail}>\r\n`);
    if (!mailFrom.startsWith('250')) {
      throw new Error(`MAIL FROM failed: ${mailFrom}`);
    }

    // 发送 RCPT TO
    const rcptTo = await this.sendCommand(`RCPT TO:<${options.to}>\r\n`);
    if (!rcptTo.startsWith('250')) {
      throw new Error(`RCPT TO failed: ${rcptTo}`);
    }

    // 发送 DATA
    const data = await this.sendCommand('DATA\r\n');
    if (!data.startsWith('354')) {
      throw new Error(`DATA failed: ${data}`);
    }

    // 构建邮件内容
    const emailContent = [
      `From: "${this.config.smtpFromName}" <${this.config.smtpFromEmail}>`,
      `To: ${options.to}`,
      `Subject: ${options.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      options.html || options.text || '',
      '.',
      ''
    ].join('\r\n');

    const sendResult = await this.sendCommand(emailContent);
    if (!sendResult.startsWith('250')) {
      throw new Error(`Send failed: ${sendResult}`);
    }

    console.log('🔧 邮件发送成功');
  }

  async quit(): Promise<void> {
    if (this.socket) {
      await this.sendCommand('QUIT\r\n');
      this.socket.end();
      this.socket = null;
    }
  }
}

export async function sendEmailAlternative(options: EmailOptions): Promise<boolean> {
  try {
    console.log('🔧 使用替代邮件服务发送邮件');

    const config = await getEmailConfig();
    if (!config) {
      console.error('邮箱配置未设置');
      return false;
    }

    console.log('🔧 邮件配置:', {
      host: config.smtpHost,
      port: config.smtpPort,
      user: config.smtpUser,
      passwordLength: config.smtpPassword.length
    });

    const client = new SMTPClient(config);

    await client.connect();
    await client.authenticate();
    await client.sendEmail(options);
    await client.quit();

    console.log('✅ 替代邮件服务发送成功');
    return true;
  } catch (error) {
    console.error('❌ 替代邮件服务发送失败:', error);
    return false;
  }
}
