/**
 * @fileoverview 权限配置日志记录器
 * @description 提供权限配置变更的审计日志功能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import {
  PermissionChangeLogParams,
  BatchPermissionChangeLogParams,
} from './types';

/**
 * 权限配置日志记录器类
 */
export class PermissionConfigLogger {
  constructor(private db: PrismaClient) {}

  /**
   * 记录权限变更日志
   */
  async logPermissionChange(params: PermissionChangeLogParams): Promise<void> {
    try {
      const { adminId, action, userLevel, changes } = params;

      // 创建详细的日志记录
      const logEntry = {
        adminId,
        action,
        userLevel,
        changes: JSON.stringify(changes),
        timestamp: new Date().toISOString(),
        ipAddress: 'unknown', // 在实际应用中应该从请求中获取
        userAgent: 'unknown', // 在实际应用中应该从请求中获取
      };

      // 记录到审计日志表（如果存在）
      try {
        await this.db.auditLog.create({
          data: {
            userId: adminId,
            action: `PERMISSION_${action}`,
            message: `权限配置变更: ${userLevel}`,
            details: JSON.stringify({
              userLevel,
              changes,
              action,
            }),
            ipAddress: logEntry.ipAddress,
          },
        });
      } catch (auditError) {
        // 如果审计日志表不存在或写入失败，使用控制台日志作为备选
        console.warn('Failed to write to audit log table:', auditError);
      }

      // 控制台日志作为备选方案
      console.log('[PERMISSION_CHANGE]', {
        timestamp: logEntry.timestamp,
        adminId: logEntry.adminId,
        action: logEntry.action,
        userLevel: logEntry.userLevel,
        changes: logEntry.changes,
      });

      // 如果是敏感操作，额外记录安全日志
      if (this.isSensitiveAction(action)) {
        await this.logSecurityEvent({
          adminId,
          action,
          userLevel,
          changes,
          severity: 'HIGH',
        });
      }
    } catch (error) {
      console.error('Failed to log permission change:', error);
      // 日志记录失败不应该影响主要业务流程
    }
  }

  /**
   * 记录批量权限变更日志
   */
  async logBatchPermissionChange(params: BatchPermissionChangeLogParams): Promise<void> {
    try {
      const { adminId, updates, reason } = params;

      const logEntry = {
        adminId,
        action: 'BATCH_UPDATE_PERMISSION_CONFIG',
        updatesCount: updates.length,
        reason: reason || '无原因',
        updates: JSON.stringify(updates),
        timestamp: new Date().toISOString(),
      };

      // 记录到审计日志表
      try {
        await this.db.auditLog.create({
          data: {
            userId: adminId,
            action: 'PERMISSION_BATCH_UPDATE',
            message: `批量权限配置更新: ${updates.length}个配置`,
            details: JSON.stringify({
              updatesCount: updates.length,
              reason,
              updates,
            }),
            ipAddress: 'unknown',
          },
        });
      } catch (auditError) {
        console.warn('Failed to write batch update to audit log table:', auditError);
      }

      // 控制台日志
      console.log('[BATCH_PERMISSION_CHANGE]', logEntry);

      // 为每个更新项记录详细日志
      for (const update of updates) {
        await this.logPermissionChange({
          adminId,
          action: 'BATCH_UPDATE_ITEM',
          userLevel: update.userLevel,
          changes: update,
        });
      }

      // 批量操作安全日志
      await this.logSecurityEvent({
        adminId,
        action: 'BATCH_UPDATE_PERMISSION_CONFIG',
        userLevel: 'MULTIPLE',
        changes: { updatesCount: updates.length, reason },
        severity: 'MEDIUM',
      });
    } catch (error) {
      console.error('Failed to log batch permission change:', error);
    }
  }

  /**
   * 记录安全事件
   */
  private async logSecurityEvent(params: {
    adminId: string;
    action: string;
    userLevel: string;
    changes: any;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }): Promise<void> {
    try {
      const { adminId, action, userLevel, changes, severity } = params;

      const securityLog = {
        timestamp: new Date().toISOString(),
        severity,
        adminId,
        action,
        userLevel,
        changes: JSON.stringify(changes),
        category: 'PERMISSION_SECURITY',
      };

      // 记录安全日志
      console.log('[SECURITY_EVENT]', securityLog);

      // 如果是高危操作，可以发送告警
      if (severity === 'HIGH' || severity === 'CRITICAL') {
        await this.sendSecurityAlert(securityLog);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * 发送安全告警
   */
  private async sendSecurityAlert(securityLog: any): Promise<void> {
    try {
      // 这里可以集成告警系统，如邮件、短信、Slack等
      console.warn('[SECURITY_ALERT]', {
        message: '检测到高风险权限操作',
        details: securityLog,
        timestamp: new Date().toISOString(),
      });

      // 示例：记录到专门的安全事件表
      // await this.db.securityEvent.create({
      //   data: {
      //     severity: securityLog.severity,
      //     category: securityLog.category,
      //     adminId: securityLog.adminId,
      //     action: securityLog.action,
      //     details: securityLog.changes,
      //     timestamp: new Date(),
      //   },
      // });
    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }

  /**
   * 判断是否为敏感操作
   */
  private isSensitiveAction(action: string): boolean {
    const sensitiveActions = [
      'UPDATE_PERMISSION_CONFIG',
      'DELETE_PERMISSION_CONFIG',
      'BATCH_UPDATE_PERMISSION_CONFIG',
      'RESET_PERMISSION_CONFIG',
    ];

    return sensitiveActions.includes(action);
  }

  /**
   * 获取权限变更历史
   */
  async getPermissionChangeHistory(
    userLevel?: string,
    adminId?: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const whereClause: any = {
        action: {
          startsWith: 'PERMISSION_',
        },
      };

      if (adminId) {
        whereClause.userId = adminId;
      }

      const logs = await this.db.auditLog.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        select: {
          id: true,
          userId: true,
          action: true,
          message: true,
          details: true,
          createdAt: true,
          ipAddress: true,
        },
      });

      // 过滤特定用户等级的日志
      if (userLevel) {
        return logs.filter((log) => {
          try {
            const details = JSON.parse(log.details || '{}');
            return details.userLevel === userLevel;
          } catch {
            return false;
          }
        });
      }

      return logs;
    } catch (error) {
      console.error('Failed to get permission change history:', error);
      return [];
    }
  }

  /**
   * 获取权限变更统计
   */
  async getPermissionChangeStats(days: number = 30): Promise<{
    totalChanges: number;
    changesByAction: Record<string, number>;
    changesByAdmin: Record<string, number>;
    changesByDay: Record<string, number>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const logs = await this.db.auditLog.findMany({
        where: {
          action: {
            startsWith: 'PERMISSION_',
          },
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          action: true,
          userId: true,
          createdAt: true,
        },
      });

      const changesByAction: Record<string, number> = {};
      const changesByAdmin: Record<string, number> = {};
      const changesByDay: Record<string, number> = {};

      logs.forEach((log) => {
        // 按操作类型统计
        changesByAction[log.action] = (changesByAction[log.action] || 0) + 1;

        // 按管理员统计
        if (log.userId) {
          changesByAdmin[log.userId] = (changesByAdmin[log.userId] || 0) + 1;
        }

        // 按日期统计
        const day = log.createdAt.toISOString().split('T')[0];
        changesByDay[day] = (changesByDay[day] || 0) + 1;
      });

      return {
        totalChanges: logs.length,
        changesByAction,
        changesByAdmin,
        changesByDay,
      };
    } catch (error) {
      console.error('Failed to get permission change stats:', error);
      return {
        totalChanges: 0,
        changesByAction: {},
        changesByAdmin: {},
        changesByDay: {},
      };
    }
  }
}
