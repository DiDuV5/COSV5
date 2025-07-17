/**
 * @fileoverview 权限审计日志模块
 * @description 权限审计和安全事件记录
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import type {
  PermissionAuditLog,
  SecurityEventLog,
  AuditConfig,
} from './types';
import {
  DEFAULT_PERMISSION_CONFIG,
  SECURITY_EVENTS,
} from './types';

/**
 * 审计日志管理器
 */
export class AuditLogManager {
  private auditLogBuffer: PermissionAuditLog[] = [];
  private config: AuditConfig;
  private flushInterval?: NodeJS.Timeout;

  constructor(config: AuditConfig = DEFAULT_PERMISSION_CONFIG.audit) {
    this.config = config;

    if (config.enabled) {
      this.startFlushTask();
    }
  }

  /**
   * 记录权限审计日志
   */
  async logPermissionAudit(auditLog: PermissionAuditLog): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    // 根据配置决定是否记录
    if (auditLog.result === 'GRANTED' && !this.config.logSuccessfulOperations) {
      return;
    }

    if (auditLog.result === 'DENIED' && !this.config.logFailedOperations) {
      return;
    }

    this.auditLogBuffer.push(auditLog);

    // 当缓冲区满时，批量写入
    if (this.auditLogBuffer.length >= this.config.bufferSize) {
      await this.flushAuditLogs();
    }
  }

  /**
   * 记录安全事件
   */
  async logSecurityEvent(
    eventType: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      const logEntry: SecurityEventLog = {
        timestamp: new Date().toISOString(),
        eventType,
        details,
        severity: this.getSeverityLevel(eventType),
      };

      // 记录到控制台（生产环境应该使用专业的日志系统）
      console.warn(`[SECURITY EVENT] ${eventType}:`, logEntry);

      // 如果是高危事件，发送告警
      if (logEntry.severity === 'HIGH' || logEntry.severity === 'CRITICAL') {
        await this.sendSecurityAlert(logEntry);
      }

      // 可以在这里添加其他日志存储方式
      await this.storeSecurityEvent(logEntry);
    } catch (error) {
      console.error('记录安全事件失败:', error);
    }
  }

  /**
   * 刷新审计日志到存储系统
   */
  private async flushAuditLogs(): Promise<void> {
    if (this.auditLogBuffer.length === 0) {
      return;
    }

    try {
      const logs = this.auditLogBuffer.splice(0, this.auditLogBuffer.length);

      // 批量处理日志
      await this.batchProcessAuditLogs(logs);
    } catch (error) {
      console.error('审计日志写入失败:', error);
      // 重新加入缓冲区，避免丢失
      this.auditLogBuffer.unshift(...this.auditLogBuffer);
    }
  }

  /**
   * 批量处理审计日志
   */
  private async batchProcessAuditLogs(logs: PermissionAuditLog[]): Promise<void> {
    // 记录到控制台
    for (const log of logs) {
      console.log('PERMISSION_AUDIT:', JSON.stringify({
        userId: log.userId,
        operation: log.operation,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        result: log.result,
        reason: log.reason,
        userLevel: log.userLevel,
        timestamp: log.timestamp.toISOString(),
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
      }));
    }

    // 可以在这里添加其他存储方式：
    // 1. 写入文件
    // 2. 发送到外部日志服务
    // 3. 存储到数据库
    // 4. 发送到消息队列

    await this.storeAuditLogs(logs);
  }

  /**
   * 存储审计日志（可扩展）
   */
  private async storeAuditLogs(logs: PermissionAuditLog[]): Promise<void> {
    // 这里可以实现具体的存储逻辑
    // 例如：写入数据库、文件或外部服务

    // 示例：如果有审计日志表
    // await prisma.auditLog.createMany({
    //   data: logs.map(log => ({
    //     userId: log.userId,
    //     operation: log.operation,
    //     resourceType: log.resourceType,
    //     resourceId: log.resourceId,
    //     result: log.result,
    //     reason: log.reason,
    //     userLevel: log.userLevel,
    //     timestamp: log.timestamp,
    //     ipAddress: log.ipAddress,
    //     userAgent: log.userAgent,
    //   }))
    // });
  }

  /**
   * 存储安全事件（可扩展）
   */
  private async storeSecurityEvent(logEntry: SecurityEventLog): Promise<void> {
    // 这里可以实现具体的存储逻辑
    // 例如：写入数据库、文件或外部服务

    // 示例：如果有安全事件表
    // await prisma.securityEvent.create({
    //   data: {
    //     eventType: logEntry.eventType,
    //     details: logEntry.details,
    //     severity: logEntry.severity,
    //     timestamp: new Date(logEntry.timestamp),
    //   }
    // });
  }

  /**
   * 获取安全事件严重程度
   */
  private getSeverityLevel(eventType: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalEvents = [
      SECURITY_EVENTS.UNAUTHORIZED_ACCESS_ATTEMPT,
      SECURITY_EVENTS.INVALID_SESSION_FORMAT,
    ];

    const highEvents = [
      SECURITY_EVENTS.REJECTED_USER_ACCESS_ATTEMPT,
      SECURITY_EVENTS.INSUFFICIENT_USER_LEVEL,
    ];

    const mediumEvents = [
      SECURITY_EVENTS.UNVERIFIED_USER_ACCESS_ATTEMPT,
      SECURITY_EVENTS.INACTIVE_USER_ACCESS_ATTEMPT,
    ];

    if (criticalEvents.includes(eventType as any)) return 'CRITICAL';
    if (highEvents.includes(eventType as any)) return 'HIGH';
    if (mediumEvents.includes(eventType as any)) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * 发送安全告警
   */
  private async sendSecurityAlert(logEntry: SecurityEventLog): Promise<void> {
    // 这里应该集成实际的告警系统（如邮件、短信、Slack等）
    console.error(`[SECURITY ALERT] ${logEntry.eventType}:`, logEntry);

    // 可以在这里添加具体的告警逻辑：
    // 1. 发送邮件
    // 2. 发送短信
    // 3. 推送到Slack
    // 4. 调用Webhook
  }

  /**
   * 启动定期刷新任务
   */
  private startFlushTask(): void {
    this.flushInterval = setInterval(async () => {
      if (this.auditLogBuffer.length > 0) {
        try {
          await this.flushAuditLogs();
        } catch (error) {
          console.error('定期审计日志刷新失败:', error);
        }
      }
    }, this.config.flushInterval);
  }

  /**
   * 停止刷新任务
   */
  stopFlushTask(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = undefined;
    }
  }

  /**
   * 获取审计日志缓冲区大小
   */
  getBufferSize(): number {
    return this.auditLogBuffer.length;
  }

  /**
   * 强制刷新所有缓冲的日志
   */
  async forceFlush(): Promise<void> {
    await this.flushAuditLogs();
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<AuditConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (this.config.enabled && !this.flushInterval) {
      this.startFlushTask();
    } else if (!this.config.enabled && this.flushInterval) {
      this.stopFlushTask();
    }
  }

  /**
   * 销毁审计日志管理器
   */
  async destroy(): Promise<void> {
    this.stopFlushTask();
    await this.forceFlush();
  }
}

// 创建默认的审计日志管理器实例
export const auditLogManager = new AuditLogManager();

/**
 * 兼容性函数 - 保持向后兼容
 */
export async function logPermissionAudit(auditLog: PermissionAuditLog): Promise<void> {
  return auditLogManager.logPermissionAudit(auditLog);
}

export async function logSecurityEvent(
  eventType: string,
  details: Record<string, any>
): Promise<void> {
  return auditLogManager.logSecurityEvent(eventType, details);
}

/**
 * 获取审计日志缓冲区大小（兼容性函数）
 */
export function getAuditLogBufferSize(): number {
  return auditLogManager.getBufferSize();
}
