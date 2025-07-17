/**
 * @fileoverview 全局加载指示器组件
 * @description 显示全局加载状态的指示器
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

'use client';

import React from 'react';
import { Loader2, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useLoadingState,
  formatLoadingDuration,
  getLoadingDuration
} from '@/lib/loading/global-loading-manager';

/**
 * 全局加载指示器属性
 */
export interface GlobalLoadingIndicatorProps {
  /** 显示位置 */
  position?: 'top' | 'bottom' | 'center' | 'top-right';
  /** 是否显示进度条 */
  showProgress?: boolean;
  /** 是否显示持续时间 */
  showDuration?: boolean;
  /** 是否显示取消按钮 */
  showCancel?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 最小显示时间（毫秒） */
  minDisplayTime?: number;
}

/**
 * 顶部加载条组件
 */
const TopLoadingBar: React.FC<{
  progress?: number;
  message: string;
  showCancel?: boolean;
  onCancel?: () => void;
}> = ({ progress, message, showCancel, onCancel }) => (
  <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm">
    <div className="flex items-center justify-between px-4 py-2">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <span className="text-sm font-medium">{message}</span>
      </div>

      {showCancel && onCancel && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>

    {typeof progress === 'number' && (
      <Progress value={progress} className="h-1 rounded-none" />
    )}
  </div>
);

/**
 * 底部加载条组件
 */
const BottomLoadingBar: React.FC<{
  progress?: number;
  message: string;
  showCancel?: boolean;
  onCancel?: () => void;
}> = ({ progress, message, showCancel, onCancel }) => (
  <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-sm">
    {typeof progress === 'number' && (
      <Progress value={progress} className="h-1 rounded-none" />
    )}

    <div className="flex items-center justify-between px-4 py-2">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <span className="text-sm font-medium">{message}</span>
      </div>

      {showCancel && onCancel && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  </div>
);

/**
 * 中心加载覆盖层组件
 */
const CenterLoadingOverlay: React.FC<{
  progress?: number;
  message: string;
  showDuration?: boolean;
  showCancel?: boolean;
  onCancel?: () => void;
  startTime: number;
}> = ({ progress, message, showDuration, showCancel, onCancel, startTime }) => {
  const [duration, setDuration] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setDuration(getLoadingDuration(startTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="font-medium">{message}</span>
          </div>

          {showCancel && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {typeof progress === 'number' && (
          <div className="space-y-2">
            <Progress value={progress} />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{progress}%</span>
              {showDuration && (
                <span>{formatLoadingDuration(duration)}</span>
              )}
            </div>
          </div>
        )}

        {showDuration && typeof progress !== 'number' && (
          <div className="text-xs text-gray-500 text-center">
            已用时: {formatLoadingDuration(duration)}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 右上角加载提示组件
 */
const TopRightLoadingToast: React.FC<{
  progress?: number;
  message: string;
  showCancel?: boolean;
  onCancel?: () => void;
}> = ({ progress, message, showCancel, onCancel }) => (
  <div className="fixed top-4 right-4 z-50 bg-white border rounded-lg shadow-lg p-4 max-w-sm">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <span className="text-sm font-medium">{message}</span>
      </div>

      {showCancel && onCancel && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>

    {typeof progress === 'number' && (
      <Progress value={progress} className="h-2" />
    )}
  </div>
);

/**
 * 全局加载指示器主组件
 */
export const GlobalLoadingIndicator: React.FC<GlobalLoadingIndicatorProps> = ({
  position = 'top',
  showProgress = true,
  showDuration = false,
  showCancel = true,
  className,
  minDisplayTime = 500,
}) => {
  const loadingState = useLoadingState();
  const { isLoading, primaryLoading } = loadingState as { isLoading: boolean; primaryLoading: any; allLoadingStates: any[] };
  const [shouldShow, setShouldShow] = React.useState(false);
  const [showStartTime, setShowStartTime] = React.useState<number | null>(null);

  // 处理最小显示时间
  React.useEffect(() => {
    if (isLoading && !shouldShow) {
      setShouldShow(true);
      setShowStartTime(Date.now());
    } else if (!isLoading && shouldShow) {
      const elapsed = showStartTime ? Date.now() - showStartTime : 0;
      const remainingTime = Math.max(0, minDisplayTime - elapsed);

      if (remainingTime > 0) {
        const timer = setTimeout(() => {
          setShouldShow(false);
          setShowStartTime(null);
        }, remainingTime);

        return () => clearTimeout(timer);
      } else {
        setShouldShow(false);
        setShowStartTime(null);
      }
    }
    // 如果不满足条件，返回undefined（可选的清理函数）
    return undefined;
  }, [isLoading, shouldShow, showStartTime, minDisplayTime]);

  if (!shouldShow || !primaryLoading) {
    return null;
  }

  const commonProps = {
    progress: showProgress ? primaryLoading.progress : undefined,
    message: primaryLoading.message,
    showCancel: showCancel && primaryLoading.cancelable,
    onCancel: primaryLoading.onCancel,
  };

  const overlayProps = {
    ...commonProps,
    showDuration,
    startTime: primaryLoading.startTime,
  };

  switch (position) {
    case 'top':
      return <TopLoadingBar {...commonProps} />;
    case 'bottom':
      return <BottomLoadingBar {...commonProps} />;
    case 'center':
      return <CenterLoadingOverlay {...overlayProps} />;
    case 'top-right':
      return <TopRightLoadingToast {...commonProps} />;
    default:
      return <TopLoadingBar {...commonProps} />;
  }
};

/**
 * 页面级加载指示器
 */
export const PageLoadingIndicator: React.FC<{
  message?: string;
  showProgress?: boolean;
}> = ({
  message = '正在加载页面...',
  showProgress = false
}) => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
      <p className="text-gray-600">{message}</p>
      {showProgress && (
        <div className="w-64 mx-auto">
          <Progress value={undefined} />
        </div>
      )}
    </div>
  </div>
);

/**
 * 按钮加载指示器
 */
export const ButtonLoadingIndicator: React.FC<{
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
}> = ({ isLoading, children, loadingText, className }) => (
  <div className={cn('flex items-center gap-2', className)}>
    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
    <span>{isLoading && loadingText ? loadingText : children}</span>
  </div>
);

export default GlobalLoadingIndicator;
