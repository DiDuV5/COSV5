/**
 * @fileoverview 客户端错误处理工具
 * @description 专为客户端组件设计的错误处理，避免导入服务端模块
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

import { UserLevel } from '@/types/user-level';

export interface ClientErrorContext {
  userLevel: UserLevel;
  environment: 'development' | 'production';
  context: string;
}

export interface ClientUploadError {
  filename: string;
  error: string;
  userMessage?: string;
  recoveryActions?: string[];
  retryable?: boolean;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

/**
 * 客户端错误消息生成
 */
export function getClientErrorMessage(error: any, context: ClientErrorContext): string {
  const errorMessage = error?.message || error?.toString() || '未知错误';
  
  // 根据用户等级返回不同详细程度的错误信息
  if (context.userLevel === 'ADMIN' || context.environment === 'development') {
    return `详细错误: ${errorMessage}`;
  }
  
  // 为普通用户提供友好的错误消息
  if (errorMessage.includes('File size')) {
    return '文件大小超出限制，请选择较小的文件';
  }
  
  if (errorMessage.includes('Network') || errorMessage.includes('timeout')) {
    return '网络连接不稳定，请检查网络后重试';
  }
  
  if (errorMessage.includes('permission') || errorMessage.includes('403')) {
    return '权限不足，请联系管理员';
  }
  
  if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
    return '操作过于频繁，请稍后再试';
  }
  
  if (errorMessage.includes('Unsupported file type')) {
    return '不支持的文件类型，请选择图片或视频文件';
  }
  
  return '上传失败，请重试或联系客服';
}

/**
 * 获取上传错误的恢复建议
 */
export function getClientUploadRecoveryActions(error: any): string[] {
  const errorMessage = error?.message || error?.toString() || '';
  const actions: string[] = [];
  
  if (errorMessage.includes('File size')) {
    actions.push('压缩文件大小');
    actions.push('选择较小的文件');
  }
  
  if (errorMessage.includes('Network') || errorMessage.includes('timeout')) {
    actions.push('检查网络连接');
    actions.push('稍后重试');
    actions.push('尝试使用移动网络');
  }
  
  if (errorMessage.includes('Unsupported file type')) {
    actions.push('选择支持的文件格式 (JPG, PNG, MP4)');
    actions.push('转换文件格式');
  }
  
  if (errorMessage.includes('rate limit')) {
    actions.push('等待几分钟后重试');
    actions.push('减少同时上传的文件数量');
  }
  
  if (actions.length === 0) {
    actions.push('刷新页面重试');
    actions.push('联系客服支持');
  }
  
  return actions;
}

/**
 * 判断错误是否可重试
 */
export function isRetryableError(error: any): boolean {
  const errorMessage = error?.message || error?.toString() || '';
  
  // 网络错误通常可重试
  if (errorMessage.includes('Network') || errorMessage.includes('timeout')) {
    return true;
  }
  
  // 服务器错误可重试
  if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
    return true;
  }
  
  // 权限错误不可重试
  if (errorMessage.includes('403') || errorMessage.includes('401')) {
    return false;
  }
  
  // 文件大小错误不可重试
  if (errorMessage.includes('File size')) {
    return false;
  }
  
  // 文件类型错误不可重试
  if (errorMessage.includes('Unsupported file type')) {
    return false;
  }
  
  // 默认可重试
  return true;
}

/**
 * 客户端重试机制
 */
export async function retryClientOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
  } = {}
): Promise<RetryResult<T>> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000 } = options;
  
  let lastError: Error | null = null;
  let attempts = 0;
  const startTime = Date.now();
  
  for (let i = 0; i <= maxRetries; i++) {
    attempts++;
    
    try {
      const result = await operation();
      return {
        success: true,
        data: result,
        attempts,
        totalTime: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 如果是最后一次尝试，或者错误不可重试，直接失败
      if (i === maxRetries || !isRetryableError(error)) {
        break;
      }
      
      // 计算延迟时间（指数退避）
      const delay = Math.min(baseDelay * Math.pow(2, i), maxDelay);
      console.log(`${operationName} 重试 ${i + 1}/${maxRetries + 1}，${delay}ms 后重试`);
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return {
    success: false,
    error: lastError || new Error('操作失败'),
    attempts,
    totalTime: Date.now() - startTime,
  };
}

/**
 * 处理上传错误并生成客户端错误对象
 */
export function handleClientUploadError(error: any, filename: string, context: ClientErrorContext): ClientUploadError {
  const userMessage = getClientErrorMessage(error, context);
  const recoveryActions = getClientUploadRecoveryActions(error);
  const retryable = isRetryableError(error);
  
  return {
    filename,
    error: error?.message || '上传失败',
    userMessage,
    recoveryActions,
    retryable,
  };
}
