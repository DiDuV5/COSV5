/**
 * @fileoverview Turnstile验证日志记录
 * @description 处理Turnstile验证的日志记录和审计
 * @author Augment AI
 * @date 2025-07-14
 * @version 1.0.0
 */

import { auditLogger, AuditEventType } from '@/lib/audit-logger';
import type { TurnstileFeatureId } from '@/types/turnstile';
import type {
  IValidationLogger,
  TurnstileValidationResult,
  ValidationLogData
} from './types';

/**
 * Turnstile验证日志记录实现
 */
export class ValidationLogger implements IValidationLogger {
  /**
   * 记录验证日志
   */
  async logValidation(
    result: TurnstileValidationResult,
    featureId?: TurnstileFeatureId,
    remoteIp?: string,
    _token?: string
  ): Promise<void> {
    try {
      const logData: ValidationLogData = {
        featureId: featureId || 'unknown',
        success: result.success,
        responseTime: result.responseTime,
        errorCode: result.errorCode,
        remoteIp: remoteIp || 'unknown',
        timestamp: result.timestamp
      };

      if (result.success) {
        console.log('✅ Turnstile验证成功:', this.formatLogData(logData));
        
        // 记录成功的验证事件
        await this.logSuccessfulValidation(logData, result);
      } else {
        console.warn('❌ Turnstile验证失败:', this.formatLogData(logData));

        // 记录失败的验证事件
        await this.logFailedValidation(logData, result);
      }

      // TODO: 保存到数据库统计表
      // await this.saveValidationStats(logData);

    } catch (error) {
      console.error('记录Turnstile验证日志失败:', error);
    }
  }

  /**
   * 记录验证错误日志
   */
  async logValidationError(
    error: unknown,
    featureId?: TurnstileFeatureId,
    remoteIp?: string,
    token?: string
  ): Promise<void> {
    try {
      const errorMessage = error instanceof Error ? error.message : String(error);

      const errorLogData = {
        featureId: featureId || 'unknown',
        error: errorMessage,
        remoteIp: remoteIp || 'unknown',
        tokenLength: token?.length || 0,
        timestamp: new Date().toISOString()
      };

      console.error('❌ Turnstile验证异常:', errorLogData);

      // 记录系统错误
      await auditLogger.logSecurityViolation(
        AuditEventType.SECURITY_VIOLATION,
        `Turnstile验证异常: ${errorMessage}`,
        {
          url: `/${featureId}`,
          headers: new Map([['x-forwarded-for', remoteIp || '']])
        } as any
      );

    } catch (logError) {
      console.error('记录Turnstile错误日志失败:', logError);
    }
  }

  /**
   * 记录成功的验证事件
   */
  private async logSuccessfulValidation(
    logData: ValidationLogData,
    result: TurnstileValidationResult
  ): Promise<void> {
    try {
      // 如果使用了降级模式，记录特殊事件
      if (result.fallbackUsed) {
        await auditLogger.logSecurityViolation(
          AuditEventType.SECURITY_VIOLATION,
          `Turnstile验证使用降级模式: ${result.message}`,
          {
            url: `/${logData.featureId}`,
            headers: new Map([['x-forwarded-for', logData.remoteIp]])
          } as any
        );
      }

      // 记录性能指标
      if (result.responseTime > 5000) { // 超过5秒的慢响应
        console.warn(`⚠️ Turnstile验证响应较慢: ${result.responseTime}ms`);
      }

    } catch (error) {
      console.error('记录成功验证事件失败:', error);
    }
  }

  /**
   * 记录失败的验证事件
   */
  private async logFailedValidation(
    logData: ValidationLogData,
    result: TurnstileValidationResult
  ): Promise<void> {
    try {
      // 记录安全事件
      await auditLogger.logSecurityViolation(
        AuditEventType.SECURITY_VIOLATION,
        `Turnstile验证失败: ${result.errorMessage}`,
        {
          url: `/${logData.featureId}`,
          headers: new Map([['x-forwarded-for', logData.remoteIp]])
        } as any
      );

      // 根据错误类型记录不同级别的日志
      if (result.errorCode === 'invalid-input-response') {
        console.warn(`🚫 可能的机器人攻击: ${logData.featureId} from ${logData.remoteIp}`);
      } else if (result.errorCode === 'timeout-or-duplicate') {
        console.warn(`⏰ Token超时或重复使用: ${logData.featureId} from ${logData.remoteIp}`);
      }

    } catch (error) {
      console.error('记录失败验证事件失败:', error);
    }
  }

  /**
   * 格式化日志数据
   */
  private formatLogData(logData: ValidationLogData): Record<string, any> {
    return {
      featureId: logData.featureId,
      success: logData.success,
      responseTime: `${logData.responseTime}ms`,
      errorCode: logData.errorCode,
      remoteIp: logData.remoteIp,
      timestamp: logData.timestamp.toISOString()
    };
  }

  /**
   * 记录批量验证统计
   */
  async logBatchValidationStats(
    results: TurnstileValidationResult[],
    featureId?: TurnstileFeatureId
  ): Promise<void> {
    try {
      const totalCount = results.length;
      const successCount = results.filter(r => r.success).length;
      const failureCount = totalCount - successCount;
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / totalCount;

      const batchStats = {
        featureId: featureId || 'unknown',
        totalCount,
        successCount,
        failureCount,
        successRate: (successCount / totalCount * 100).toFixed(2) + '%',
        avgResponseTime: Math.round(avgResponseTime) + 'ms',
        timestamp: new Date().toISOString()
      };

      console.log('📊 批量验证统计:', batchStats);

      // 如果失败率过高，记录警告
      if (failureCount / totalCount > 0.5) {
        console.warn(`⚠️ 批量验证失败率过高: ${failureCount}/${totalCount}`);
      }

    } catch (error) {
      console.error('记录批量验证统计失败:', error);
    }
  }

  /**
   * 获取验证统计摘要
   */
  getValidationSummary(results: TurnstileValidationResult[]): {
    total: number;
    successful: number;
    failed: number;
    avgResponseTime: number;
    errorBreakdown: Record<string, number>;
  } {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = total - successful;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / total;

    const errorBreakdown: Record<string, number> = {};
    results.forEach(result => {
      if (!result.success && result.errorCode) {
        errorBreakdown[result.errorCode] = (errorBreakdown[result.errorCode] || 0) + 1;
      }
    });

    return {
      total,
      successful,
      failed,
      avgResponseTime: Math.round(avgResponseTime),
      errorBreakdown
    };
  }
}
