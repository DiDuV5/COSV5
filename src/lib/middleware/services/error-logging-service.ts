/**
 * @fileoverview 错误日志服务
 * @description 专门处理错误日志记录、审计和监控
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import type { NextRequest } from 'next/server';
import { ErrorType, ErrorSeverity } from './error-classification-service';

/**
 * 标准错误接口
 */
export interface StandardError {
  type: ErrorType;
  severity: ErrorSeverity;
  code: string;
  message: string;
  userMessage: string;
  details: any;
  timestamp: string;
  requestId: string;
  userId?: string;
  retryable: boolean;
  recoveryActions: any[];
}

/**
 * 错误处理选项接口
 */
export interface ErrorHandlerOptions {
  userId?: string;
  userLevel?: string;
  requestId?: string;
  context?: string;
  logToAudit?: boolean;
  includeStack?: boolean;
}

/**
 * 错误日志服务类
 */
export class ErrorLoggingService {
  /**
   * 记录错误日志
   */
  static async logError(
    error: StandardError,
    request?: NextRequest,
    options: ErrorHandlerOptions = {}
  ): Promise<void> {
    try {
      const logEntry = this.createLogEntry(error, request, options);
      
      // 根据严重程度选择日志级别
      switch (error.severity) {
        case ErrorSeverity.CRITICAL:
          console.error('🚨 CRITICAL ERROR:', logEntry);
          break;
        case ErrorSeverity.HIGH:
          console.error('❌ HIGH SEVERITY ERROR:', logEntry);
          break;
        case ErrorSeverity.MEDIUM:
          console.warn('⚠️ MEDIUM SEVERITY ERROR:', logEntry);
          break;
        case ErrorSeverity.LOW:
          console.info('ℹ️ LOW SEVERITY ERROR:', logEntry);
          break;
        default:
          console.log('📝 ERROR:', logEntry);
      }

      // 异步记录到外部系统
      if (options.logToAudit !== false) {
        this.logToExternalSystems(logEntry, error.severity);
      }

      // 触发告警（如果需要）
      if (this.shouldTriggerAlert(error)) {
        await this.triggerAlert(error, logEntry);
      }

    } catch (loggingError) {
      // 记录日志失败不应该影响主流程
      console.error('❌ 错误日志记录失败:', loggingError);
    }
  }

  /**
   * 异步记录错误日志
   */
  static async logErrorAsync(
    error: StandardError,
    options: ErrorHandlerOptions = {}
  ): Promise<void> {
    // 使用 setImmediate 确保不阻塞主线程
    setImmediate(async () => {
      try {
        await this.logError(error, undefined, options);
      } catch (err) {
        console.error('异步错误日志记录失败:', err);
      }
    });
  }

  /**
   * 创建日志条目
   */
  private static createLogEntry(
    error: StandardError,
    request?: NextRequest,
    options: ErrorHandlerOptions = {}
  ): any {
    const baseEntry = {
      // 错误基本信息
      errorId: error.requestId,
      type: error.type,
      severity: error.severity,
      code: error.code,
      message: error.message,
      userMessage: error.userMessage,
      timestamp: error.timestamp,
      
      // 用户信息
      userId: error.userId || options.userId,
      userLevel: options.userLevel,
      
      // 请求信息
      requestId: error.requestId,
      context: options.context,
      
      // 恢复信息
      retryable: error.retryable,
      recoveryActions: error.recoveryActions,
    };

    // 添加请求相关信息
    if (request) {
      Object.assign(baseEntry, {
        url: request.url,
        method: request.method,
        userAgent: request.headers.get('user-agent'),
        ip: this.getClientIP(request),
        referer: request.headers.get('referer'),
      });
    }

    // 添加错误详情（根据环境和用户级别）
    if (this.shouldIncludeDetails(error, options)) {
      Object.assign(baseEntry, {
        details: error.details,
        stack: options.includeStack ? error.details?.stack : undefined,
      });
    }

    // 添加环境信息
    Object.assign(baseEntry, {
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform,
    });

    return baseEntry;
  }

  /**
   * 获取客户端IP
   */
  private static getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const remoteAddr = request.headers.get('remote-addr');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return realIP || remoteAddr || 'unknown';
  }

  /**
   * 是否应该包含详细信息
   */
  private static shouldIncludeDetails(
    error: StandardError,
    options: ErrorHandlerOptions
  ): boolean {
    // 开发环境总是包含详情
    if (process.env.NODE_ENV === 'development') return true;
    
    // 管理员用户可以看到详情
    if (options.userLevel === 'ADMIN' || options.userLevel === 'SUPER_ADMIN') return true;
    
    // 低严重程度错误可以显示详情
    if (error.severity === ErrorSeverity.LOW) return true;
    
    return false;
  }

  /**
   * 记录到外部系统
   */
  private static logToExternalSystems(logEntry: any, severity: ErrorSeverity): void {
    // 这里可以集成外部日志系统
    // 例如：Sentry, LogRocket, DataDog 等
    
    try {
      // 示例：发送到监控系统
      if (severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH) {
        // await this.sendToMonitoringSystem(logEntry);
        console.log('📊 发送到监控系统:', {
          errorId: logEntry.errorId,
          type: logEntry.type,
          severity: logEntry.severity,
        });
      }

      // 示例：发送到日志聚合系统
      // await this.sendToLogAggregator(logEntry);
      
    } catch (error) {
      console.error('发送到外部系统失败:', error);
    }
  }

  /**
   * 是否应该触发告警
   */
  private static shouldTriggerAlert(error: StandardError): boolean {
    // 严重错误总是触发告警
    if (error.severity === ErrorSeverity.CRITICAL) return true;
    
    // 高严重程度错误在生产环境触发告警
    if (error.severity === ErrorSeverity.HIGH && process.env.NODE_ENV === 'production') {
      return true;
    }
    
    // 特定类型的错误触发告警
    const alertTypes = [
      ErrorType.AUTHENTICATION,
      ErrorType.PERMISSION,
      ErrorType.SERVER,
    ];
    
    return alertTypes.includes(error.type);
  }

  /**
   * 触发告警
   */
  private static async triggerAlert(error: StandardError, logEntry: any): Promise<void> {
    try {
      console.warn('🚨 触发错误告警:', {
        errorId: error.requestId,
        type: error.type,
        severity: error.severity,
        message: error.message,
        timestamp: error.timestamp,
      });

      // 这里可以集成告警系统
      // 例如：邮件、短信、Slack、钉钉等
      
      // 示例：发送邮件告警
      // if (error.severity === ErrorSeverity.CRITICAL) {
      //   await this.sendEmailAlert(error, logEntry);
      // }
      
      // 示例：发送Slack通知
      // await this.sendSlackNotification(error, logEntry);
      
    } catch (alertError) {
      console.error('告警发送失败:', alertError);
    }
  }

  /**
   * 生成请求ID
   */
  static generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `req_${timestamp}_${random}`;
  }

  /**
   * 提取错误详情
   */
  static extractErrorDetails(error: any): any {
    const details: any = {
      name: error?.name,
      code: error?.code,
      status: error?.status,
    };

    // 在开发环境包含堆栈信息
    if (process.env.NODE_ENV === 'development') {
      details.stack = error?.stack;
    }

    // 包含原因链
    if (error?.cause) {
      details.cause = this.extractErrorDetails(error.cause);
    }

    // 包含额外的错误属性
    const additionalProps = ['errno', 'syscall', 'path', 'hostname', 'port'];
    additionalProps.forEach(prop => {
      if (error?.[prop] !== undefined) {
        details[prop] = error[prop];
      }
    });

    return details;
  }

  /**
   * 获取错误统计信息
   */
  static getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<ErrorType, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recentErrors: number;
  } {
    // 这里应该从实际的日志存储中获取统计信息
    // 暂时返回模拟数据
    return {
      totalErrors: 0,
      errorsByType: {
        [ErrorType.NETWORK]: 0,
        [ErrorType.FILE]: 0,
        [ErrorType.PERMISSION]: 0,
        [ErrorType.SERVER]: 0,
        [ErrorType.VALIDATION]: 0,
        [ErrorType.UPLOAD]: 0,
        [ErrorType.AUTHENTICATION]: 0,
        [ErrorType.RATE_LIMIT]: 0,
        [ErrorType.UNKNOWN]: 0,
      },
      errorsBySeverity: {
        [ErrorSeverity.LOW]: 0,
        [ErrorSeverity.MEDIUM]: 0,
        [ErrorSeverity.HIGH]: 0,
        [ErrorSeverity.CRITICAL]: 0,
      },
      recentErrors: 0,
    };
  }

  /**
   * 清理旧的错误日志
   */
  static async cleanupOldLogs(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    // 这里应该实现实际的日志清理逻辑
    // 暂时返回模拟数据
    console.log(`🧹 清理 ${maxAge / (24 * 60 * 60 * 1000)} 天前的错误日志`);
    return 0;
  }
}

/**
 * 导出服务创建函数
 */
export const createErrorLoggingService = () => ErrorLoggingService;
