/**
 * @fileoverview 邮件发送日志服务
 * @description 记录和监控邮件发送状态，便于调试和分析
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import {
  EmailSendLog,
  EmailSendContext,
  EmailSendResult,
  EmailError,
  EmailErrorType,
} from '../types/email-error-types';

/**
 * 邮件发送日志服务
 */
export class EmailLoggerService {
  private static logs: EmailSendLog[] = [];
  private static readonly MAX_LOGS = 1000; // 最多保存1000条日志

  /**
   * 记录邮件发送日志
   */
  static logEmailSend(
    context: EmailSendContext,
    result: EmailSendResult
  ): void {
    const log: EmailSendLog = {
      id: this.generateLogId(),
      context,
      result,
      createdAt: new Date(),
    };

    this.logs.push(log);

    // 保持日志数量在限制内
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }

    // 输出结构化日志
    this.outputStructuredLog(log);
  }

  /**
   * 获取邮件发送统计信息
   */
  static getEmailStats(timeRange?: { start: Date; end: Date }) {
    const filteredLogs = timeRange
      ? this.logs.filter(log =>
          log.createdAt >= timeRange.start && log.createdAt <= timeRange.end
        )
      : this.logs;

    const total = filteredLogs.length;
    const successful = filteredLogs.filter(log => log.result.success).length;
    const failed = total - successful;

    // 按错误类型分组
    const errorsByType: Record<string, number> = {};
    filteredLogs
      .filter(log => !log.result.success && log.result.error)
      .forEach(log => {
        const errorType = log.result.error!.type;
        errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
      });

    // 按邮件类型分组
    const byEmailType: Record<string, { total: number; successful: number; failed: number }> = {};
    filteredLogs.forEach(log => {
      const emailType = log.context.emailType;
      if (!byEmailType[emailType]) {
        byEmailType[emailType] = { total: 0, successful: 0, failed: 0 };
      }
      byEmailType[emailType].total++;
      if (log.result.success) {
        byEmailType[emailType].successful++;
      } else {
        byEmailType[emailType].failed++;
      }
    });

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total * 100).toFixed(2) + '%' : '0%',
      errorsByType,
      byEmailType,
      averageTime: this.calculateAverageTime(filteredLogs),
      retryRate: this.calculateRetryRate(filteredLogs),
    };
  }

  /**
   * 获取最近的邮件发送日志
   */
  static getRecentLogs(limit: number = 50): EmailSendLog[] {
    return this.logs
      .slice(-limit)
      .reverse(); // 最新的在前面
  }

  /**
   * 获取失败的邮件发送日志
   */
  static getFailedLogs(limit: number = 50): EmailSendLog[] {
    return this.logs
      .filter(log => !log.result.success)
      .slice(-limit)
      .reverse();
  }

  /**
   * 获取特定邮箱的发送历史
   */
  static getEmailHistory(email: string, limit: number = 20): EmailSendLog[] {
    return this.logs
      .filter(log => log.context.recipientEmail === email)
      .slice(-limit)
      .reverse();
  }

  /**
   * 清理旧日志
   */
  static cleanupOldLogs(olderThanDays: number = 7): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const initialCount = this.logs.length;
    this.logs = this.logs.filter(log => log.createdAt > cutoffDate);
    const removedCount = initialCount - this.logs.length;

    if (removedCount > 0) {
      console.log(`🧹 清理了 ${removedCount} 条超过 ${olderThanDays} 天的邮件日志`);
    }

    return removedCount;
  }

  /**
   * 导出日志为JSON格式
   */
  static exportLogs(timeRange?: { start: Date; end: Date }): string {
    const filteredLogs = timeRange
      ? this.logs.filter(log =>
          log.createdAt >= timeRange.start && log.createdAt <= timeRange.end
        )
      : this.logs;

    return JSON.stringify({
      exportTime: new Date().toISOString(),
      timeRange,
      stats: this.getEmailStats(timeRange),
      logs: filteredLogs,
    }, null, 2);
  }

  /**
   * 生成日志ID
   */
  private static generateLogId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 输出结构化日志
   */
  private static outputStructuredLog(log: EmailSendLog): void {
    const logData = {
      id: log.id,
      timestamp: log.createdAt.toISOString(),
      emailType: log.context.emailType,
      recipient: log.context.recipientEmail,
      success: log.result.success,
      attempts: log.result.attempts,
      totalTime: log.result.totalTime,
      messageId: log.result.messageId,
    };

    if (!log.result.success && log.result.error) {
      Object.assign(logData, {
        errorType: log.result.error.type,
        errorMessage: log.result.error.message,
        userMessage: log.result.error.userMessage,
        retryable: log.result.error.retryable,
      });
    }

    if (log.result.success) {
      console.log('📧 邮件发送成功:', logData);
    } else {
      console.error('❌ 邮件发送失败:', logData);
    }
  }

  /**
   * 计算平均发送时间
   */
  private static calculateAverageTime(logs: EmailSendLog[]): number {
    if (logs.length === 0) return 0;

    const totalTime = logs.reduce((sum, log) => sum + log.result.totalTime, 0);
    return Math.round(totalTime / logs.length);
  }

  /**
   * 计算重试率
   */
  private static calculateRetryRate(logs: EmailSendLog[]): string {
    if (logs.length === 0) return '0%';

    const retriedLogs = logs.filter(log => log.result.attempts > 1);
    return (retriedLogs.length / logs.length * 100).toFixed(2) + '%';
  }

  /**
   * 清除所有日志
   */
  static clearLogs(): void {
    this.logs = [];
  }

  /**
   * 检查邮件发送健康状态
   */
  static checkEmailHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    message: string;
    details: any;
  } {
    const recentLogs = this.getRecentLogs(100);
    const stats = this.getEmailStats();

    // 计算最近的成功率
    const recentSuccessRate = recentLogs.length > 0
      ? (recentLogs.filter(log => log.result.success).length / recentLogs.length * 100)
      : 100;

    // 检查是否有大量失败
    const recentFailures = recentLogs.filter(log => !log.result.success);
    const criticalErrors = recentFailures.filter(log =>
      log.result.error?.type === EmailErrorType.SMTP_AUTH_FAILED ||
      log.result.error?.type === EmailErrorType.MISSING_CONFIG ||
      log.result.error?.type === EmailErrorType.INVALID_CONFIG
    );

    if (criticalErrors.length > 0) {
      return {
        status: 'critical',
        message: '邮件服务存在严重配置问题',
        details: {
          recentSuccessRate: recentSuccessRate.toFixed(2) + '%',
          criticalErrors: criticalErrors.length,
          stats,
        },
      };
    }

    if (recentSuccessRate < 80) {
      return {
        status: 'warning',
        message: '邮件发送成功率较低',
        details: {
          recentSuccessRate: recentSuccessRate.toFixed(2) + '%',
          recentFailures: recentFailures.length,
          stats,
        },
      };
    }

    return {
      status: 'healthy',
      message: '邮件服务运行正常',
      details: {
        recentSuccessRate: recentSuccessRate.toFixed(2) + '%',
        stats,
      },
    };
  }
}

/**
 * 单例邮件日志服务
 */
export const emailLogger = EmailLoggerService;
