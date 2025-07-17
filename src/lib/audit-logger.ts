/**
 * @fileoverview 审计日志系统
 * @description 记录用户操作和系统事件的安全审计日志
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

import { prisma } from './prisma';
import { NextRequest } from 'next/server';

/**
 * 审计事件类型
 */
export enum AuditEventType {
  // 认证相关
  USER_LOGIN = 'USER_LOGIN',
  // USER_LOGOUT = 'USER_LOGOUT', // 暂时未使用
  USER_REGISTER = 'USER_REGISTER',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  LOGIN_FAILED = 'LOGIN_FAILED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',

  // 用户管理
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_BANNED = 'USER_BANNED',
  USER_UNBANNED = 'USER_UNBANNED',
  PERMISSION_CHANGED = 'PERMISSION_CHANGED',

  // 内容管理
  POST_CREATED = 'POST_CREATED',
  POST_UPDATED = 'POST_UPDATED',
  POST_DELETED = 'POST_DELETED',
  POST_PUBLISHED = 'POST_PUBLISHED',
  POST_UNPUBLISHED = 'POST_UNPUBLISHED',

  // 文件上传
  UPLOAD_STARTED = 'UPLOAD_STARTED',
  UPLOAD_COMPLETED = 'UPLOAD_COMPLETED',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  BATCH_UPLOAD_STARTED = 'BATCH_UPLOAD_STARTED',
  BATCH_UPLOAD_COMPLETED = 'BATCH_UPLOAD_COMPLETED',
  MEDIA_DELETED = 'MEDIA_DELETED',
  MEDIA_UPDATED = 'MEDIA_UPDATED',
  MEDIA_ORDER_UPDATED = 'MEDIA_ORDER_UPDATED',
  CLEANUP_COMPLETED = 'CLEANUP_COMPLETED',

  // 系统管理
  SYSTEM_SETTING_CHANGED = 'SYSTEM_SETTING_CHANGED',
  ADMIN_ACTION = 'ADMIN_ACTION',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_IMPORT = 'DATA_IMPORT',

  // 安全事件
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
}

/**
 * 审计日志级别
 */
export enum AuditLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * 审计日志接口
 */
interface AuditLogEntry {
  userId?: string;
  eventType: AuditEventType;
  level: AuditLevel;
  message: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  resourceId?: string;
  sessionId?: string;
}

/**
 * 获取客户端信息
 */
function getClientInfo(req?: NextRequest): {
  ipAddress: string;
  userAgent: string;
} {
  if (!req) {
    return {
      ipAddress: 'unknown',
      userAgent: 'unknown',
    };
  }

  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ipAddress = forwarded?.split(',')[0] || realIp || req.ip || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  return { ipAddress, userAgent };
}

/**
 * 审计日志记录器
 */
export class AuditLogger {
  private static instance: AuditLogger;
  private enabled: boolean;

  private constructor() {
    this.enabled = process.env.COSEREEDEN_ENABLE_AUDIT_LOGGING === 'true';
  }

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * 记录审计日志
   */
  async log(entry: AuditLogEntry): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      // 记录到数据库
      await prisma.auditLog.create({
        data: {
          userId: entry.userId || null,
          action: entry.eventType,
          level: entry.level,
          message: entry.message,
          details: entry.details ? JSON.stringify(entry.details) : null,
          ipAddress: entry.ipAddress || 'unknown',
          userAgent: entry.userAgent || 'unknown',
          resource: entry.resource || null,
          resourceId: entry.resourceId || null,
          sessionId: entry.sessionId || null,
        },
      });

      // 对于关键事件，同时记录到控制台
      if (entry.level === AuditLevel.CRITICAL || entry.level === AuditLevel.ERROR) {
        console.error(`[AUDIT ${entry.level}] ${entry.eventType}: ${entry.message}`, entry.details);
      }
    } catch (error) {
      // 审计日志记录失败不应影响主要功能
      console.error('审计日志记录失败:', error);
    }
  }

  /**
   * 记录用户登录
   */
  async logUserLogin(userId: string, req?: NextRequest, details?: Record<string, any>): Promise<void> {
    const clientInfo = getClientInfo(req);
    await this.log({
      userId,
      eventType: AuditEventType.USER_LOGIN,
      level: AuditLevel.INFO,
      message: '用户登录成功',
      details,
      ...clientInfo,
    });
  }

  /**
   * 记录用户登录失败
   */
  async logLoginFailed(identifier: string, req?: NextRequest, reason?: string): Promise<void> {
    const clientInfo = getClientInfo(req);
    await this.log({
      eventType: AuditEventType.LOGIN_FAILED,
      level: AuditLevel.WARNING,
      message: `登录失败: ${identifier}`,
      details: { identifier, reason },
      ...clientInfo,
    });
  }

  /**
   * 记录用户注册
   */
  async logUserRegister(userId: string, username: string, req?: NextRequest): Promise<void> {
    const clientInfo = getClientInfo(req);
    await this.log({
      userId,
      eventType: AuditEventType.USER_REGISTER,
      level: AuditLevel.INFO,
      message: `新用户注册: ${username}`,
      details: { username },
      ...clientInfo,
    });
  }

  /**
   * 记录密码修改
   */
  async logPasswordChange(userId: string, req?: NextRequest): Promise<void> {
    const clientInfo = getClientInfo(req);
    await this.log({
      userId,
      eventType: AuditEventType.PASSWORD_CHANGE,
      level: AuditLevel.INFO,
      message: '用户修改密码',
      ...clientInfo,
    });
  }

  /**
   * 记录安全违规
   */
  async logSecurityViolation(
    eventType: AuditEventType,
    message: string,
    req?: NextRequest,
    details?: Record<string, any>
  ): Promise<void> {
    const clientInfo = getClientInfo(req);
    await this.log({
      eventType,
      level: AuditLevel.CRITICAL,
      message,
      details,
      ...clientInfo,
    });
  }

  /**
   * 记录管理员操作
   */
  async logAdminAction(
    adminId: string,
    action: string,
    resource?: string,
    resourceId?: string,
    req?: NextRequest,
    details?: Record<string, any>
  ): Promise<void> {
    const clientInfo = getClientInfo(req);
    await this.log({
      userId: adminId,
      eventType: AuditEventType.ADMIN_ACTION,
      level: AuditLevel.INFO,
      message: `管理员操作: ${action}`,
      resource,
      resourceId,
      details,
      ...clientInfo,
    });
  }

  /**
   * 记录系统设置变更
   */
  async logSystemSettingChange(
    adminId: string,
    settingKey: string,
    oldValue: any,
    newValue: any,
    req?: NextRequest
  ): Promise<void> {
    const clientInfo = getClientInfo(req);
    await this.log({
      userId: adminId,
      eventType: AuditEventType.SYSTEM_SETTING_CHANGED,
      level: AuditLevel.INFO,
      message: `系统设置变更: ${settingKey}`,
      details: {
        settingKey,
        oldValue,
        newValue,
      },
      ...clientInfo,
    });
  }

  /**
   * 记录可疑活动
   */
  async logSuspiciousActivity(
    message: string,
    req?: NextRequest,
    details?: Record<string, any>
  ): Promise<void> {
    const clientInfo = getClientInfo(req);
    await this.log({
      eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
      level: AuditLevel.WARNING,
      message,
      details,
      ...clientInfo,
    });
  }

  /**
   * 查询审计日志
   */
  async queryLogs(filters: {
    userId?: string;
    eventType?: AuditEventType;
    level?: AuditLevel;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.eventType) where.action = filters.eventType;
    if (filters.level) where.level = filters.level;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    return await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
      include: {
        user: {
          select: {
            username: true,
            displayName: true,
          },
        },
      },
    });
  }

  /**
   * 清理过期日志
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}

// 导出单例实例
export const auditLogger = AuditLogger.getInstance();
