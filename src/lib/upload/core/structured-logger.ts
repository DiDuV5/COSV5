/**
 * @fileoverview 结构化日志系统
 * @description 统一的JSON格式日志输出，支持请求追踪和敏感信息过滤
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * 日志上下文接口
 */
export interface LogContext {
  /** 服务名称 */
  service?: string;
  /** 请求ID */
  requestId?: string;
  /** 用户ID */
  userId?: string;
  /** 会话ID */
  sessionId?: string;
  /** 操作名称 */
  action?: string;
  /** 额外的上下文数据 */
  [key: string]: any;
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  /** 时间戳 */
  timestamp: string;
  /** 日志级别 */
  level: LogLevel;
  /** 服务名称 */
  service: string;
  /** 请求ID */
  requestId?: string;
  /** 用户ID */
  userId?: string;
  /** 会话ID */
  sessionId?: string;
  /** 操作名称 */
  action?: string;
  /** 日志消息 */
  message: string;
  /** 上下文数据 */
  context?: Record<string, any>;
  /** 错误信息 */
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  /** 性能指标 */
  metrics?: {
    duration?: number;
    memoryUsage?: number;
    fileSize?: number;
    [key: string]: any;
  };
}

/**
 * 敏感信息字段列表
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'key',
  'authorization',
  'cookie',
  'session',
  'credential',
  'auth',
  'bearer'
];

/**
 * 结构化日志器配置
 */
export interface StructuredLoggerConfig {
  /** 最小日志级别 */
  minLevel: LogLevel;
  /** 是否启用控制台输出 */
  enableConsole: boolean;
  /** 是否美化JSON输出 */
  prettyPrint: boolean;
  /** 是否包含堆栈信息 */
  includeStack: boolean;
  /** 最大日志消息长度 */
  maxMessageLength: number;
  /** 是否过滤敏感信息 */
  filterSensitive: boolean;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: StructuredLoggerConfig = {
  minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  prettyPrint: process.env.NODE_ENV !== 'production',
  includeStack: process.env.NODE_ENV !== 'production',
  maxMessageLength: 1000,
  filterSensitive: true
};

/**
 * 结构化日志器
 */
export class StructuredLogger {
  private context: LogContext;
  private config: StructuredLoggerConfig;

  constructor(
    context: LogContext = {},
    config: Partial<StructuredLoggerConfig> = {}
  ) {
    this.context = { ...context };
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 创建子日志器
   */
  child(additionalContext: LogContext): StructuredLogger {
    return new StructuredLogger(
      { ...this.context, ...additionalContext },
      this.config
    );
  }

  /**
   * 更新上下文
   */
  updateContext(updates: LogContext): void {
    Object.assign(this.context, updates);
  }

  /**
   * 记录调试信息
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * 记录信息
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * 记录警告
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * 记录错误
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    const errorInfo = error ? this.serializeError(error) : undefined;
    this.log(LogLevel.ERROR, message, context, errorInfo);
  }

  /**
   * 记录性能指标
   */
  metric(
    message: string,
    metrics: Record<string, number>,
    context?: Record<string, any>
  ): void {
    this.log(LogLevel.INFO, message, context, undefined, metrics);
  }

  /**
   * 记录请求开始
   */
  requestStart(
    requestId: string,
    method: string,
    path: string,
    context?: Record<string, any>
  ): void {
    this.log(LogLevel.INFO, 'Request started', {
      requestId,
      method,
      path,
      ...context
    });
  }

  /**
   * 记录请求结束
   */
  requestEnd(
    requestId: string,
    statusCode: number,
    duration: number,
    context?: Record<string, any>
  ): void {
    this.log(LogLevel.INFO, 'Request completed', {
      requestId,
      statusCode,
      ...context
    }, undefined, { duration });
  }

  /**
   * 核心日志方法
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: { name: string; message: string; stack?: string; code?: string },
    metrics?: Record<string, number>
  ): void {
    // 检查日志级别
    if (!this.shouldLog(level)) {
      return;
    }

    // 构建日志条目
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.context.service || 'upload-system',
      message: this.truncateMessage(message),
    };

    // 添加上下文信息
    if (this.context.requestId) logEntry.requestId = this.context.requestId;
    if (this.context.userId) logEntry.userId = this.context.userId;
    if (this.context.sessionId) logEntry.sessionId = this.context.sessionId;
    if (this.context.action) logEntry.action = this.context.action;

    // 添加额外上下文
    if (context || Object.keys(this.context).length > 0) {
      const mergedContext = { ...this.context, ...context };
      logEntry.context = this.config.filterSensitive 
        ? this.filterSensitiveData(mergedContext)
        : mergedContext;
    }

    // 添加错误信息
    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        code: error.code
      };
      
      if (this.config.includeStack && error.stack) {
        logEntry.error.stack = error.stack;
      }
    }

    // 添加性能指标
    if (metrics) {
      logEntry.metrics = metrics;
    }

    // 输出日志
    this.output(logEntry);
  }

  /**
   * 检查是否应该记录日志
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.config.minLevel);
    const logLevelIndex = levels.indexOf(level);
    return logLevelIndex >= currentLevelIndex;
  }

  /**
   * 截断过长的消息
   */
  private truncateMessage(message: string): string {
    if (message.length <= this.config.maxMessageLength) {
      return message;
    }
    return message.substring(0, this.config.maxMessageLength) + '...';
  }

  /**
   * 序列化错误对象
   */
  private serializeError(error: Error): {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  } {
    const serialized = {
      name: error.name,
      message: error.message,
      code: (error as any).code
    };

    if (this.config.includeStack && error.stack) {
      (serialized as any).stack = error.stack;
    }

    return serialized;
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
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = SENSITIVE_FIELDS.some(field => 
        lowerKey.includes(field)
      );

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

  /**
   * 输出日志
   */
  private output(logEntry: LogEntry): void {
    if (!this.config.enableConsole) {
      return;
    }

    const logString = this.config.prettyPrint
      ? JSON.stringify(logEntry, null, 2)
      : JSON.stringify(logEntry);

    // 根据日志级别选择输出方法
    switch (logEntry.level) {
      case LogLevel.ERROR:
        console.error(logString);
        break;
      case LogLevel.WARN:
        console.warn(logString);
        break;
      case LogLevel.DEBUG:
        console.debug(logString);
        break;
      default:
        console.log(logString);
    }
  }
}

/**
 * 生成唯一请求ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 创建带请求ID的日志器
 */
export function createRequestLogger(
  requestId?: string,
  additionalContext?: LogContext
): StructuredLogger {
  const id = requestId || generateRequestId();
  return new StructuredLogger({
    requestId: id,
    ...additionalContext
  });
}

/**
 * 默认日志器实例
 */
export const defaultLogger = new StructuredLogger({
  service: 'upload-system'
});
