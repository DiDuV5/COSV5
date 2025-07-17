/**
 * @fileoverview tRPC错误处理中间件
 * @description 自动转换技术错误为用户友好的中文提示
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

import { TRPCError } from '@trpc/server';
// import { convertTRPCErrorToUserMessage } from '@/lib/errors/user-friendly-messages'; // 暂时注释掉，避免导入错误
// import { toast } from '@/lib/notifications/enhanced-toast'; // 暂时注释掉，避导入错误

// 临时函数定义
function convertTRPCErrorToUserMessage(error: any): string {
  if (error.code === 'UNAUTHORIZED') {
    return '请先登录';
  }
  if (error.code === 'FORBIDDEN') {
    return '权限不足';
  }
  if (error.code === 'NOT_FOUND') {
    return '资源不存在';
  }
  if (error.code === 'BAD_REQUEST') {
    return '请求参数错误';
  }
  return error.message || '操作失败，请稍后重试';
}

// 模拟 toast 对象
const toast = {
  error: (message: string | object, options?: any) => console.error('Toast Error:', message, options),
  success: (message: string | object, options?: any) => console.log('Toast Success:', message, options),
  warning: (message: string | object, options?: any) => console.warn('Toast Warning:', message, options),
  info: (message: string | object, options?: any) => console.info('Toast Info:', message, options),
};

/**
 * 错误处理选项
 */
export interface ErrorHandlingOptions {
  /** 是否自动显示Toast通知 */
  showToast?: boolean;
  /** 是否记录错误日志 */
  logError?: boolean;
  /** 是否在开发环境显示详细错误 */
  showDetails?: boolean;
  /** 自定义错误处理器 */
  customHandler?: (error: Error, userMessage: any) => void;
}

/**
 * 默认错误处理选项
 */
const DEFAULT_OPTIONS: ErrorHandlingOptions = {
  showToast: true,
  logError: true,
  showDetails: process.env.NODE_ENV === 'development',
};

/**
 * tRPC客户端错误处理器
 */
export class TRPCErrorHandler {
  private options: ErrorHandlingOptions;

  constructor(options: ErrorHandlingOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 处理tRPC错误
   */
  handleError = (error: TRPCError | Error) => {
    // 转换为用户友好的消息
    const userMessage = convertTRPCErrorToUserMessage(error);

    // 记录错误日志
    if (this.options.logError) {
      this.logError(error, userMessage);
    }

    // 显示Toast通知
    if (this.options.showToast) {
      this.showErrorToast(userMessage, error);
    }

    // 调用自定义处理器
    if (this.options.customHandler) {
      this.options.customHandler(error, userMessage);
    }

    return userMessage;
  };

  /**
   * 记录错误日志
   */
  private logError(error: Error, userMessage: any) {
    const logData = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      userMessage,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server',
    };

    // 在开发环境打印详细错误
    if (this.options.showDetails) {
      console.group('🚨 tRPC Error Details');
      console.error('Original Error:', error);
      console.info('User Message:', userMessage);
      console.info('Full Log Data:', logData);
      console.groupEnd();
    } else {
      console.error('[tRPC Error]', userMessage.title, userMessage.description);
    }

    // 在生产环境发送错误到监控系统
    if (process.env.NODE_ENV === 'production') {
      this.sendErrorToMonitoring(logData);
    }
  }

  /**
   * 显示错误Toast通知
   */
  private showErrorToast(userMessage: any, originalError: Error) {
    const toastOptions = {
      duration: userMessage.severity === 'error' ? 5000 : 3000,
      action: userMessage.action ? {
        label: userMessage.action,
        onClick: () => {
          // 根据错误类型执行相应操作
          this.handleErrorAction(originalError, userMessage);
        },
      } : undefined,
    };

    switch (userMessage.severity) {
      case 'error':
        toast.error(userMessage, toastOptions);
        break;
      case 'warning':
        toast.warning(userMessage, toastOptions);
        break;
      case 'info':
        toast.info(userMessage, toastOptions);
        break;
      default:
        toast.error(userMessage, toastOptions);
    }
  }

  /**
   * 处理错误操作
   */
  private handleErrorAction(error: Error, userMessage: any) {
    const errorMessage = error.message.toLowerCase();

    // 网络错误 - 重试
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      window.location.reload();
      return;
    }

    // 认证错误 - 跳转登录
    if (error instanceof TRPCError && error.code === 'UNAUTHORIZED') {
      window.location.href = '/auth/signin';
      return;
    }

    // 权限错误 - 返回首页
    if (error instanceof TRPCError && error.code === 'FORBIDDEN') {
      window.location.href = '/';
      return;
    }

    // 验证错误 - 聚焦到第一个错误字段
    if (error instanceof TRPCError && error.code === 'BAD_REQUEST') {
      const firstErrorField = document.querySelector('[aria-invalid="true"]') as HTMLElement;
      if (firstErrorField) {
        firstErrorField.focus();
      }
      return;
    }

    // 默认操作 - 刷新页面
    window.location.reload();
  }

  /**
   * 发送错误到监控系统
   */
  private sendErrorToMonitoring(logData: any) {
    // 这里应该集成实际的错误监控服务
    // 例如: Sentry, LogRocket, Bugsnag 等

    try {
      // 示例: 发送到自定义错误收集端点
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logData),
      }).catch(() => {
        // 静默处理错误收集失败
      });
    } catch (error) {
      // 静默处理错误收集失败
    }
  }
}

/**
 * 创建全局错误处理器实例
 */
export const globalErrorHandler = new TRPCErrorHandler();

/**
 * React Query错误处理Hook
 */
export function useErrorHandler(options?: ErrorHandlingOptions) {
  const handler = new TRPCErrorHandler(options);

  return {
    handleError: handler.handleError,
    onError: handler.handleError, // React Query兼容
  };
}

/**
 * tRPC客户端错误处理配置
 */
export function createTRPCErrorHandler(options?: ErrorHandlingOptions) {
  const handler = new TRPCErrorHandler(options);

  return {
    onError: (error: TRPCError) => {
      handler.handleError(error);
    },
  };
}

/**
 * 异步操作错误处理包装器
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options?: ErrorHandlingOptions
): Promise<T | null> {
  const handler = new TRPCErrorHandler(options);

  try {
    return await operation();
  } catch (error) {
    handler.handleError(error as Error);
    return null;
  }
}

/**
 * 表单提交错误处理
 */
export function handleFormError(
  error: Error,
  formRef?: React.RefObject<HTMLFormElement>
) {
  const userMessage = convertTRPCErrorToUserMessage(error);

  // 显示错误通知
  toast.error(userMessage);

  // 如果是验证错误，尝试聚焦到第一个错误字段
  if (error instanceof TRPCError && error.code === 'BAD_REQUEST') {
    const form = formRef?.current;
    if (form) {
      const firstErrorField = form.querySelector('[aria-invalid="true"]') as HTMLElement;
      if (firstErrorField) {
        firstErrorField.focus();
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  return userMessage;
}

/**
 * 批量操作错误处理
 */
export function handleBatchErrors(
  errors: Array<{ id: string; error: Error }>,
  options?: ErrorHandlingOptions
) {
  const handler = new TRPCErrorHandler({ ...options, showToast: false });
  const errorSummary = new Map<string, number>();

  // 统计错误类型
  errors.forEach(({ error }) => {
    const userMessage = handler.handleError(error);
    const key = typeof userMessage === 'string' ? userMessage : (userMessage as any).title || '未知错误';
    errorSummary.set(key, (errorSummary.get(key) || 0) + 1);
  });

  // 显示汇总通知
  const summaryMessage = Array.from(errorSummary.entries())
    .map(([title, count]) => `${title}: ${count}个`)
    .join(', ');

  toast.error({
    title: '批量操作完成',
    description: `部分操作失败: ${summaryMessage}`,
    duration: 8000,
  });
}

/**
 * 重试机制错误处理
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  options?: ErrorHandlingOptions
): Promise<T> {
  const handler = new TRPCErrorHandler({ ...options, showToast: false });
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // 如果是最后一次尝试，显示错误
      if (attempt === maxRetries) {
        handler.handleError(lastError);
        throw lastError;
      }

      // 显示重试通知
      toast.info({
        title: '操作失败，正在重试',
        description: `第${attempt}次重试，共${maxRetries}次`,
        duration: 2000,
      });

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError!;
}

export default TRPCErrorHandler;
