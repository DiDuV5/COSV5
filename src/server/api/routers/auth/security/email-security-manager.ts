/**
 * @fileoverview 邮箱验证安全管理器
 * @description 处理邮箱验证过程中的安全事件记录和告警
 * @author Augment AI
 * @date 2025-07-03
 */

/**
 * 安全事件类型
 */
export enum SecurityEventType {
  REPLAY_ATTACK_ATTEMPT = 'REPLAY_ATTACK_ATTEMPT',
  INVALID_VERIFICATION_TOKEN = 'INVALID_VERIFICATION_TOKEN',
  EXPIRED_VERIFICATION_TOKEN = 'EXPIRED_VERIFICATION_TOKEN',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUCCESSFUL_VERIFICATION = 'SUCCESSFUL_VERIFICATION',
  VERIFICATION_EMAIL_SENT = 'VERIFICATION_EMAIL_SENT',
  ADMIN_CONFIG_ACCESS = 'ADMIN_CONFIG_ACCESS',
  TEST_EMAIL_SENT = 'TEST_EMAIL_SENT'
}

/**
 * 安全事件严重程度
 */
export enum SecuritySeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * 安全事件详情接口
 */
export interface SecurityEventDetails {
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  timestamp: Date;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  tokenId?: string;
  additionalData?: Record<string, any>;
}

/**
 * 邮箱安全管理器
 */
export class EmailSecurityManager {
  /**
   * 记录安全事件
   */
  static async logSecurityEvent(
    eventType: SecurityEventType,
    details: Partial<SecurityEventDetails>
  ): Promise<void> {
    try {
      const severity = this.getEventSeverity(eventType);
      
      const logEntry: SecurityEventDetails = {
        eventType,
        severity,
        timestamp: new Date(),
        ...details
      };

      // 记录到控制台（生产环境应该记录到专门的日志系统）
      console.log(`[EMAIL_SECURITY] ${severity} - ${eventType}:`, logEntry);

      // 如果是高危事件，发送告警
      if (severity === SecuritySeverity.HIGH || severity === SecuritySeverity.CRITICAL) {
        await this.sendSecurityAlert(logEntry);
      }

      // 这里可以集成到专门的安全日志系统
      // await this.saveToSecurityLog(logEntry);

    } catch (error) {
      console.error('记录安全事件失败:', error);
      // 安全日志记录失败不应该影响主要业务流程
    }
  }

  /**
   * 获取邮箱安全事件严重程度
   */
  private static getEventSeverity(eventType: SecurityEventType): SecuritySeverity {
    const criticalEvents = [SecurityEventType.REPLAY_ATTACK_ATTEMPT];
    const highEvents = [SecurityEventType.INVALID_VERIFICATION_TOKEN];
    const mediumEvents = [
      SecurityEventType.EXPIRED_VERIFICATION_TOKEN,
      SecurityEventType.RATE_LIMIT_EXCEEDED
    ];
    const lowEvents = [
      SecurityEventType.SUCCESSFUL_VERIFICATION,
      SecurityEventType.VERIFICATION_EMAIL_SENT,
      SecurityEventType.ADMIN_CONFIG_ACCESS,
      SecurityEventType.TEST_EMAIL_SENT
    ];

    if (criticalEvents.includes(eventType)) return SecuritySeverity.CRITICAL;
    if (highEvents.includes(eventType)) return SecuritySeverity.HIGH;
    if (mediumEvents.includes(eventType)) return SecuritySeverity.MEDIUM;
    return SecuritySeverity.LOW;
  }

  /**
   * 发送邮箱安全告警
   */
  private static async sendSecurityAlert(logEntry: SecurityEventDetails): Promise<void> {
    try {
      // 这里应该集成实际的告警系统（如邮件、短信、Slack等）
      console.error(`[EMAIL_SECURITY_ALERT] ${logEntry.eventType}:`, logEntry);

      // 示例：发送到监控系统
      // await this.sendToMonitoringSystem(logEntry);
      
      // 示例：发送邮件告警
      // await this.sendEmailAlert(logEntry);
      
      // 示例：发送到Slack
      // await this.sendSlackAlert(logEntry);

    } catch (error) {
      console.error('发送安全告警失败:', error);
    }
  }

  /**
   * 检测重放攻击
   */
  static async detectReplayAttack(
    token: string,
    ctx: any
  ): Promise<boolean> {
    try {
      // 检查令牌是否已经被使用过
      const usedToken = await ctx.db.verificationToken.findUnique({
        where: { token },
        select: { 
          token: true, 
          identifier: true,
          expires: true,
          // 假设有一个 usedAt 字段记录使用时间
          // usedAt: true 
        }
      });

      if (usedToken) {
        // 如果令牌存在但已过期，可能是重放攻击
        if (usedToken.expires < new Date()) {
          await this.logSecurityEvent(SecurityEventType.REPLAY_ATTACK_ATTEMPT, {
            tokenId: token,
            email: usedToken.identifier,
            additionalData: {
              tokenExpiry: usedToken.expires,
              attemptTime: new Date()
            }
          });
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('重放攻击检测失败:', error);
      return false;
    }
  }

  /**
   * 记录验证成功事件
   */
  static async logSuccessfulVerification(
    userId: string,
    email: string,
    tokenId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logSecurityEvent(SecurityEventType.SUCCESSFUL_VERIFICATION, {
      userId,
      email,
      tokenId,
      ipAddress,
      userAgent,
      additionalData: {
        verificationTime: new Date()
      }
    });
  }

  /**
   * 记录验证邮件发送事件
   */
  static async logVerificationEmailSent(
    email: string,
    tokenId: string,
    userId?: string,
    ipAddress?: string
  ): Promise<void> {
    await this.logSecurityEvent(SecurityEventType.VERIFICATION_EMAIL_SENT, {
      userId,
      email,
      tokenId,
      ipAddress,
      additionalData: {
        sentTime: new Date()
      }
    });
  }

  /**
   * 记录无效令牌事件
   */
  static async logInvalidToken(
    token: string,
    email?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logSecurityEvent(SecurityEventType.INVALID_VERIFICATION_TOKEN, {
      email,
      tokenId: token,
      ipAddress,
      userAgent,
      additionalData: {
        attemptTime: new Date()
      }
    });
  }

  /**
   * 记录过期令牌事件
   */
  static async logExpiredToken(
    token: string,
    email: string,
    expiryDate: Date,
    ipAddress?: string
  ): Promise<void> {
    await this.logSecurityEvent(SecurityEventType.EXPIRED_VERIFICATION_TOKEN, {
      email,
      tokenId: token,
      ipAddress,
      additionalData: {
        tokenExpiry: expiryDate,
        attemptTime: new Date()
      }
    });
  }

  /**
   * 记录速率限制事件
   */
  static async logRateLimitExceeded(
    email: string,
    attemptCount: number,
    timeWindow: string,
    ipAddress?: string
  ): Promise<void> {
    await this.logSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, {
      email,
      ipAddress,
      additionalData: {
        attemptCount,
        timeWindow,
        blockedTime: new Date()
      }
    });
  }

  /**
   * 记录管理员配置访问事件
   */
  static async logAdminConfigAccess(
    userId: string,
    userLevel: string,
    action: string,
    ipAddress?: string
  ): Promise<void> {
    await this.logSecurityEvent(SecurityEventType.ADMIN_CONFIG_ACCESS, {
      userId,
      ipAddress,
      additionalData: {
        userLevel,
        action,
        accessTime: new Date()
      }
    });
  }

  /**
   * 记录测试邮件发送事件
   */
  static async logTestEmailSent(
    adminUserId: string,
    testEmail: string,
    success: boolean,
    ipAddress?: string
  ): Promise<void> {
    await this.logSecurityEvent(SecurityEventType.TEST_EMAIL_SENT, {
      userId: adminUserId,
      email: testEmail,
      ipAddress,
      additionalData: {
        success,
        sentTime: new Date()
      }
    });
  }
}
