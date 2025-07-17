/**
 * @fileoverview 简单日志包装器
 * @description 为上传系统提供基本的结构化日志功能，避免循环依赖
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

/**
 * 简单的日志条目接口
 */
interface SimpleLogEntry {
  timestamp: string;
  level: string;
  service: string;
  message: string;
  context?: Record<string, any>;
}

/**
 * 简单日志器类
 */
export class SimpleLogger {
  private service: string;

  constructor(service: string = 'upload-system') {
    this.service = service;
  }

  /**
   * 记录信息
   */
  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  /**
   * 记录警告
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  /**
   * 记录错误
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    const errorContext = error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      ...context
    } : context;
    
    this.log('error', message, errorContext);
  }

  /**
   * 记录调试信息
   */
  debug(message: string, context?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, context);
    }
  }

  /**
   * 核心日志方法
   */
  private log(level: string, message: string, context?: Record<string, any>): void {
    const logEntry: SimpleLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message
    };

    if (context) {
      logEntry.context = this.filterSensitiveData(context);
    }

    const logString = JSON.stringify(logEntry);

    // 根据级别选择输出方法
    switch (level) {
      case 'error':
        console.error(logString);
        break;
      case 'warn':
        console.warn(logString);
        break;
      case 'debug':
        console.debug(logString);
        break;
      default:
        console.log(logString);
    }
  }

  /**
   * 过滤敏感数据
   */
  private filterSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.filterSensitiveData(item));
    }

    const filtered: any = {};
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveFields.some(field => lowerKey.includes(field));

      if (isSensitive) {
        filtered[key] = '[FILTERED]';
      } else if (typeof value === 'object' && value !== null) {
        filtered[key] = this.filterSensitiveData(value);
      } else {
        filtered[key] = value;
      }
    }

    return filtered;
  }
}

/**
 * 默认日志器实例
 */
export const defaultLogger = new SimpleLogger('upload-system');
