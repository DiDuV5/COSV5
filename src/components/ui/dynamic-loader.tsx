/**
 * @fileoverview 动态加载组件包装器
 * @description 提供动态导入组件的加载状态和错误处理
 * @author Augment AI
 * @date 2025-06-16
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * const LazyComponent = dynamic(() => import('./HeavyComponent'), {
 *   loading: () => <DynamicLoader />,
 *   error: (error) => <DynamicLoader error={error} />
 * })
 *
 * @dependencies
 * - React 18+
 * - next/dynamic: ^14.0.0
 *
 * @changelog
 * - 2025-06-16: 初始版本创建，支持动态加载和错误处理
 */

'use client';

import React, { Suspense, ComponentType, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';

/**
 * 动态加载器属性接口
 */
export interface DynamicLoaderProps {
  /** 加载状态文本 */
  loadingText?: string;
  /** 错误信息 */
  error?: Error | null;
  /** 自定义类名 */
  className?: string;
  /** 加载器大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示骨架屏 */
  showSkeleton?: boolean;
  /** 骨架屏行数 */
  skeletonLines?: number;
  /** 最小加载时间（毫秒） */
  minLoadTime?: number;
}

/**
 * 动态导入选项
 */
export interface DynamicImportOptions {
  /** 加载组件 */
  loading?: ComponentType<any>;
  /** 错误组件 */
  error?: ComponentType<{ error: Error; retry: () => void }>;
  /** 是否启用SSR */
  ssr?: boolean;
  /** 最小加载时间 */
  minLoadTime?: number;
}

/**
 * 骨架屏组件
 */
const SkeletonLoader: React.FC<{ lines: number; className?: string }> = ({
  lines,
  className
}) => (
  <div className={cn('animate-pulse space-y-3', className)}>
    {Array.from({ length: lines }).map((_, index) => (
      <div key={index} className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    ))}
  </div>
);

/**
 * 加载指示器组件
 */
const LoadingSpinner: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex items-center justify-center">
      <div className={cn(
        'border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin',
        sizeClasses[size]
      )} />
    </div>
  );
};

/**
 * 动态加载器组件
 */
export const DynamicLoader: React.FC<DynamicLoaderProps> = ({
  loadingText = '加载中...',
  error,
  className,
  size = 'md',
  showSkeleton = false,
  skeletonLines = 3,
  minLoadTime = 0
}) => {
  if (error) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center p-6 text-center',
        className
      )}>
        <div className="text-red-500 mb-2">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-600 mb-2">组件加载失败</p>
        <p className="text-sm text-gray-500">{error.message}</p>
      </div>
    );
  }

  if (showSkeleton) {
    return (
      <div className={cn('p-4', className)}>
        <SkeletonLoader lines={skeletonLines} />
      </div>
    );
  }

  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-6',
      className
    )}>
      <LoadingSpinner size={size} />
      <p className="mt-2 text-sm text-gray-600">{loadingText}</p>
    </div>
  );
};

/**
 * 错误边界组件
 */
class DynamicErrorBoundary extends React.Component<
  { children: ReactNode; fallback: ComponentType<{ error: Error; retry: () => void }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: any) {
    console.error('动态组件加载错误:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback;
      return <FallbackComponent error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}

/**
 * 创建动态导入组件的高阶函数
 */
export function createDynamicComponent<T = {}>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: DynamicImportOptions = {}
) {
  const {
    loading: LoadingComponent = DynamicLoader,
    error: ErrorComponent,
    ssr = false,
    minLoadTime = 0
  } = options;

  // 创建带最小加载时间的导入函数
  const delayedImport = minLoadTime > 0
    ? async () => {
        const [component] = await Promise.all([
          importFn(),
          new Promise(resolve => setTimeout(resolve, minLoadTime))
        ]);
        return component;
      }
    : importFn;

  const DynamicComponent = dynamic(delayedImport, {
    loading: () => <LoadingComponent />,
    ssr
  });

  // 如果提供了错误组件，包装错误边界
  if (ErrorComponent) {
    return React.forwardRef<any, T>((props, ref) => (
      <DynamicErrorBoundary fallback={ErrorComponent}>
        <DynamicComponent {...(props as any)} ref={ref} />
      </DynamicErrorBoundary>
    ));
  }

  return DynamicComponent;
}

/**
 * 预设的动态组件加载器
 */
export const DynamicLoaders = {
  /** 管理后台组件加载器 */
  admin: () => (
    <DynamicLoader
      loadingText="加载管理面板..."
      showSkeleton
      skeletonLines={5}
      className="min-h-[400px]"
    />
  ),

  /** 图片编辑器加载器 */
  imageEditor: () => (
    <DynamicLoader
      loadingText="加载图片编辑器..."
      size="lg"
      className="min-h-[300px]"
    />
  ),

  /** 视频播放器加载器 */
  videoPlayer: () => (
    <DynamicLoader
      loadingText="加载视频播放器..."
      showSkeleton
      skeletonLines={2}
      className="aspect-video bg-gray-100 rounded-lg"
    />
  ),

  /** 图表组件加载器 */
  chart: () => (
    <DynamicLoader
      loadingText="加载图表..."
      showSkeleton
      skeletonLines={4}
      className="h-64"
    />
  ),

  /** 富文本编辑器加载器 */
  richEditor: () => (
    <DynamicLoader
      loadingText="加载编辑器..."
      showSkeleton
      skeletonLines={6}
      className="min-h-[200px]"
    />
  )
};

/**
 * 错误回退组件
 */
export const DynamicErrorFallback: React.FC<{
  error: Error;
  retry: () => void;
  componentName?: string;
}> = ({ error, retry, componentName = '组件' }) => (
  <div className="flex flex-col items-center justify-center p-6 border border-red-200 rounded-lg bg-red-50">
    <div className="text-red-500 mb-3">
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-red-800 mb-2">{componentName}加载失败</h3>
    <p className="text-sm text-red-600 mb-4 text-center">{error.message}</p>
    <button
      onClick={retry}
      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
    >
      重试
    </button>
  </div>
);

/**
 * 延迟加载包装器
 */
export const LazyWrapper: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
  delay?: number;
}> = ({ children, fallback = <DynamicLoader />, delay = 0 }) => {
  return (
    <Suspense fallback={fallback}>
      {delay > 0 ? (
        <div style={{ minHeight: '100px' }}>
          {children}
        </div>
      ) : children}
    </Suspense>
  );
};

export default DynamicLoader;
