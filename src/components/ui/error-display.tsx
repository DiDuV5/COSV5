/**
 * @fileoverview 统一错误显示组件
 * @description 提供用户友好的错误信息显示
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

'use client';

import React from 'react';
import { AlertCircle, RefreshCw, Home, Info, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { 
  convertTRPCErrorToUserMessage, 
  getErrorSeverityColor,
  type UserFriendlyMessage 
} from '@/lib/errors/user-friendly-messages';

/**
 * 错误显示组件属性
 */
export interface ErrorDisplayProps {
  /** 错误对象 */
  error?: Error | null;
  /** 自定义错误消息 */
  message?: UserFriendlyMessage;
  /** 是否显示重试按钮 */
  showRetry?: boolean;
  /** 重试回调函数 */
  onRetry?: () => void;
  /** 是否显示返回首页按钮 */
  showHome?: boolean;
  /** 返回首页回调函数 */
  onHome?: () => void;
  /** 是否可关闭 */
  dismissible?: boolean;
  /** 关闭回调函数 */
  onDismiss?: () => void;
  /** 自定义类名 */
  className?: string;
  /** 显示模式 */
  variant?: 'inline' | 'card' | 'banner';
  /** 是否显示详细错误信息（开发模式） */
  showDetails?: boolean;
}

/**
 * 获取错误图标
 */
function getErrorIcon(severity: UserFriendlyMessage['severity']) {
  switch (severity) {
    case 'error':
      return <AlertCircle className="h-5 w-5" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5" />;
    case 'info':
      return <Info className="h-5 w-5" />;
    default:
      return <AlertCircle className="h-5 w-5" />;
  }
}

/**
 * 获取错误样式
 */
function getErrorVariant(severity: UserFriendlyMessage['severity']) {
  switch (severity) {
    case 'error':
      return 'destructive';
    case 'warning':
      return 'default';
    case 'info':
      return 'default';
    default:
      return 'destructive';
  }
}

/**
 * 内联错误显示组件
 */
const InlineErrorDisplay: React.FC<ErrorDisplayProps & { userMessage: UserFriendlyMessage }> = ({
  userMessage,
  showRetry,
  onRetry,
  showHome,
  onHome,
  dismissible,
  onDismiss,
  className,
  showDetails,
  error,
}) => (
  <Alert variant={getErrorVariant(userMessage.severity)} className={cn('relative', className)}>
    {getErrorIcon(userMessage.severity)}
    <AlertTitle className="flex items-center justify-between">
      {userMessage.title}
      {dismissible && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-6 w-6 p-0 hover:bg-transparent"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </AlertTitle>
    <AlertDescription className="space-y-3">
      <p>{userMessage.description}</p>
      
      {showDetails && error && (
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer">技术详情</summary>
          <pre className="mt-2 whitespace-pre-wrap">{error.message}</pre>
        </details>
      )}
      
      <div className="flex gap-2">
        {showRetry && onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            {userMessage.action || '重试'}
          </Button>
        )}
        
        {showHome && onHome && (
          <Button
            variant="outline"
            size="sm"
            onClick={onHome}
            className="flex items-center gap-1"
          >
            <Home className="h-3 w-3" />
            返回首页
          </Button>
        )}
      </div>
    </AlertDescription>
  </Alert>
);

/**
 * 卡片错误显示组件
 */
const CardErrorDisplay: React.FC<ErrorDisplayProps & { userMessage: UserFriendlyMessage }> = ({
  userMessage,
  showRetry,
  onRetry,
  showHome,
  onHome,
  dismissible,
  onDismiss,
  className,
  showDetails,
  error,
}) => (
  <div className={cn(
    'rounded-lg border p-6 text-center space-y-4',
    getErrorSeverityColor(userMessage.severity),
    className
  )}>
    {dismissible && (
      <Button
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        className="absolute top-2 right-2 h-6 w-6 p-0"
      >
        <X className="h-4 w-4" />
      </Button>
    )}
    
    <div className="flex justify-center">
      {getErrorIcon(userMessage.severity)}
    </div>
    
    <div className="space-y-2">
      <h3 className="font-semibold">{userMessage.title}</h3>
      <p className="text-sm">{userMessage.description}</p>
    </div>
    
    {showDetails && error && (
      <details className="text-xs text-left">
        <summary className="cursor-pointer text-center">技术详情</summary>
        <pre className="mt-2 whitespace-pre-wrap bg-white/50 p-2 rounded">
          {error.message}
        </pre>
      </details>
    )}
    
    <div className="flex justify-center gap-2">
      {showRetry && onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="flex items-center gap-1"
        >
          <RefreshCw className="h-3 w-3" />
          {userMessage.action || '重试'}
        </Button>
      )}
      
      {showHome && onHome && (
        <Button
          variant="outline"
          size="sm"
          onClick={onHome}
          className="flex items-center gap-1"
        >
          <Home className="h-3 w-3" />
          返回首页
        </Button>
      )}
    </div>
  </div>
);

/**
 * 横幅错误显示组件
 */
const BannerErrorDisplay: React.FC<ErrorDisplayProps & { userMessage: UserFriendlyMessage }> = ({
  userMessage,
  showRetry,
  onRetry,
  dismissible,
  onDismiss,
  className,
}) => (
  <div className={cn(
    'flex items-center justify-between p-4 border-l-4',
    getErrorSeverityColor(userMessage.severity),
    className
  )}>
    <div className="flex items-center gap-3">
      {getErrorIcon(userMessage.severity)}
      <div>
        <p className="font-medium">{userMessage.title}</p>
        <p className="text-sm">{userMessage.description}</p>
      </div>
    </div>
    
    <div className="flex items-center gap-2">
      {showRetry && onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="flex items-center gap-1"
        >
          <RefreshCw className="h-3 w-3" />
          {userMessage.action || '重试'}
        </Button>
      )}
      
      {dismissible && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  </div>
);

/**
 * 统一错误显示组件
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  message,
  variant = 'inline',
  showDetails = process.env.NODE_ENV === 'development',
  ...props
}) => {
  // 获取用户友好的错误消息
  const userMessage = message || (error ? convertTRPCErrorToUserMessage(error) : null);
  
  if (!userMessage) {
    return null;
  }
  
  const commonProps = {
    userMessage,
    error,
    showDetails,
    ...props,
  };
  
  switch (variant) {
    case 'card':
      return <CardErrorDisplay {...commonProps} />;
    case 'banner':
      return <BannerErrorDisplay {...commonProps} />;
    case 'inline':
    default:
      return <InlineErrorDisplay {...commonProps} />;
  }
};

/**
 * 简化的错误显示组件
 */
export const SimpleErrorDisplay: React.FC<{
  message: string;
  onRetry?: () => void;
  className?: string;
}> = ({ message, onRetry, className }) => (
  <ErrorDisplay
    message={{
      title: '操作失败',
      description: message,
      action: '重试',
      severity: 'error',
    }}
    showRetry={!!onRetry}
    onRetry={onRetry}
    variant="inline"
    className={className}
  />
);

/**
 * 网络错误显示组件
 */
export const NetworkErrorDisplay: React.FC<{
  onRetry?: () => void;
  className?: string;
}> = ({ onRetry, className }) => (
  <ErrorDisplay
    message={{
      title: '网络连接失败',
      description: '请检查您的网络连接，然后重试',
      action: '重试',
      severity: 'error',
    }}
    showRetry={!!onRetry}
    onRetry={onRetry}
    variant="card"
    className={className}
  />
);

/**
 * 权限错误显示组件
 */
export const PermissionErrorDisplay: React.FC<{
  onHome?: () => void;
  className?: string;
}> = ({ onHome, className }) => (
  <ErrorDisplay
    message={{
      title: '权限不足',
      description: '您没有权限访问此页面或执行此操作',
      action: '返回首页',
      severity: 'warning',
    }}
    showHome={!!onHome}
    onHome={onHome}
    variant="card"
    className={className}
  />
);

export default ErrorDisplay;
