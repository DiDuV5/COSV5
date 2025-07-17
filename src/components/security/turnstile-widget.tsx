/**
 * @fileoverview Cloudflare Turnstile React组件
 * @description 提供Turnstile人机验证的React组件
 * @author Augment AI
 * @date 2025-07-09
 * @version 1.0.0
 */

"use client";

import React, { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';
import {
  detectDeviceType,
  createTurnstileConfig
} from '@/lib/security/turnstile-client-config';
import type { TurnstileWidgetProps, TurnstileConfig, TurnstileWidgetRef } from '@/types/turnstile';

/**
 * Turnstile全局对象类型定义
 */
declare global {
  interface Window {
    turnstile?: {
      render: (element: string | HTMLElement, config: TurnstileConfig) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string;
      isExpired: (widgetId?: string) => boolean;
    };
  }
}

/**
 * Turnstile Widget组件
 */
export const TurnstileWidget = forwardRef<TurnstileWidgetRef, TurnstileWidgetProps>(({
  sitekey,
  theme = 'light',
  size,
  language = 'zh-cn',
  onSuccess,
  onError,
  onExpired,
  onTimeout,
  className,
  disabled = false,
  autoReset = true
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  /**
   * 检测设备类型并设置合适的大小
   */
  const getResponsiveSize = useCallback(() => {
    if (size) return size;

    const deviceType = detectDeviceType();
    return deviceType === 'mobile' ? 'compact' : 'normal';
  }, [size]);

  /**
   * 加载Turnstile脚本
   */
  const loadTurnstileScript = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      // 检查脚本是否已加载
      if (window.turnstile) {
        setIsScriptLoaded(true);
        resolve();
        return;
      }

      // 检查是否已有脚本标签
      const existingScript = document.querySelector('script[src*="challenges.cloudflare.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          setIsScriptLoaded(true);
          resolve();
        });
        existingScript.addEventListener('error', reject);
        return;
      }

      // 创建新的脚本标签
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        setIsScriptLoaded(true);
        resolve();
      };

      script.onerror = () => {
        setHasError(true);
        reject(new Error('Failed to load Turnstile script'));
      };

      document.head.appendChild(script);
    });
  }, []);

  /**
   * 安全清理widget
   */
  const safeRemoveWidget = useCallback((widgetId: string) => {
    if (!window.turnstile) {
      return false;
    }

    try {
      // 检查widget是否存在
      const response = window.turnstile.getResponse(widgetId);
      // 如果能获取到响应或响应为空字符串，说明widget存在
      if (response !== undefined) {
        window.turnstile.remove(widgetId);
        return true;
      }
    } catch (error) {
      // widget不存在或其他错误，静默处理
      console.debug('Widget removal skipped:', error);
    }
    return false;
  }, []);

  /**
   * 渲染Turnstile widget
   */
  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || !isScriptLoaded) {
      return;
    }

    try {
      // 安全清理现有widget
      if (widgetIdRef.current) {
        console.log('🧹 清理现有Turnstile widget:', widgetIdRef.current);
        safeRemoveWidget(widgetIdRef.current);
        widgetIdRef.current = null;
      }

      // 检查容器是否已经有Turnstile内容
      if (containerRef.current.children.length > 0) {
        console.log('🧹 清理容器中的现有内容');
        containerRef.current.innerHTML = '';
      }

      // 获取配置
      const config = createTurnstileConfig({
        theme,
        size: getResponsiveSize(),
        language
      });

      console.log('🔧 Turnstile配置:', {
        sitekey: sitekey.substring(0, 10) + '...',
        theme,
        size: getResponsiveSize(),
        language
      });

      // 设置回调函数
      const widgetConfig: TurnstileConfig = {
        ...config,
        sitekey,
        callback: (token: string) => {
          console.log('✅ TurnstileWidget验证成功:', { tokenLength: token.length });
          setIsLoading(false);
          setHasError(false);
          onSuccess?.(token);
        },
        'error-callback': (error: string) => {
          console.error('❌ TurnstileWidget验证错误:', error);
          setIsLoading(false);
          setHasError(true);
          onError?.(error);
        },
        'expired-callback': () => {
          setHasError(true);
          console.warn('Turnstile token expired');
          onExpired?.();

          // 移除自动重置，避免无限循环
          // 只在用户主动操作时重置，防止重复验证问题
          if (autoReset) {
            console.log('Token过期，等待用户主动重置');
          }
        },
        'timeout-callback': () => {
          setIsLoading(false);
          setHasError(true);
          console.warn('Turnstile timeout');
          onTimeout?.();
        }
      };

      // 渲染widget
      console.log('🎨 开始渲染Turnstile widget');
      widgetIdRef.current = window.turnstile.render(containerRef.current, widgetConfig);
      console.log('✅ Turnstile widget渲染完成:', widgetIdRef.current);
      setIsLoading(false);

    } catch (error) {
      console.error('❌ Turnstile widget渲染失败:', error);
      setIsLoading(false);
      setHasError(true);
      onError?.(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [sitekey, theme, getResponsiveSize, language, onSuccess, onError, onExpired, onTimeout, autoReset, isScriptLoaded, safeRemoveWidget]);

  /**
   * 重置widget
   */
  const reset = useCallback(() => {
    if (window.turnstile && widgetIdRef.current) {
      try {
        // 检查widget是否存在再重置
        const response = window.turnstile.getResponse(widgetIdRef.current);
        if (response !== undefined) {
          window.turnstile.reset(widgetIdRef.current);
          setIsLoading(true);
          setHasError(false);
        }
      } catch (error) {
        console.debug('Failed to reset Turnstile widget:', error);
        // 如果重置失败，尝试重新渲染
        renderWidget();
      }
    }
  }, [renderWidget]);

  /**
   * 获取当前token
   */
  const getResponse = useCallback((): string | null => {
    if (window.turnstile && widgetIdRef.current) {
      try {
        return window.turnstile.getResponse(widgetIdRef.current) || null;
      } catch (error) {
        console.error('Failed to get Turnstile response:', error);
        return null;
      }
    }
    return null;
  }, []);

  /**
   * 检查token是否过期
   */
  const isExpired = useCallback((): boolean => {
    if (window.turnstile && widgetIdRef.current) {
      try {
        return window.turnstile.isExpired(widgetIdRef.current);
      } catch (error) {
        console.error('Failed to check Turnstile expiration:', error);
        return true;
      }
    }
    return true;
  }, []);

  /**
   * 组件挂载时加载脚本并渲染widget
   */
  useEffect(() => {
    let mounted = true;

    const initializeWidget = async () => {
      try {
        await loadTurnstileScript();

        if (mounted) {
          // 等待一小段时间确保脚本完全加载
          setTimeout(() => {
            if (mounted) {
              renderWidget();
            }
          }, 100);
        }
      } catch (error) {
        if (mounted) {
          console.error('Failed to initialize Turnstile widget:', error);
          setIsLoading(false);
          setHasError(true);
          onError?.(error instanceof Error ? error.message : 'Failed to load');
        }
      }
    };

    initializeWidget();

    return () => {
      mounted = false;

      // 安全清理widget
      if (widgetIdRef.current) {
        safeRemoveWidget(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [loadTurnstileScript, renderWidget, onError, safeRemoveWidget]);

  /**
   * 监听配置变化并重新渲染
   */
  useEffect(() => {
    if (isScriptLoaded && !disabled) {
      renderWidget();
    }
  }, [sitekey, theme, size, language, disabled, renderWidget, isScriptLoaded]);

  /**
   * 暴露方法给父组件
   */
  useImperativeHandle(ref, () => ({
    reset,
    getResponse,
    isExpired
  }), [reset, getResponse, isExpired]);

  // 如果禁用，不渲染任何内容
  if (disabled) {
    return null;
  }

  return (
    <div className={cn('turnstile-widget', className)}>
      {/* Turnstile容器 */}
      <div
        ref={containerRef}
        className="turnstile-container"
        style={{
          minHeight: getResponsiveSize() === 'compact' ? '65px' : '65px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      />

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">加载人机验证...</span>
        </div>
      )}

      {/* 错误状态 */}
      {hasError && (
        <div className="text-center py-4">
          <div className="text-red-600 text-sm mb-2">
            人机验证加载失败
          </div>
          <button
            type="button"
            onClick={() => {
              setHasError(false);
              setIsLoading(true);
              renderWidget();
            }}
            className="text-blue-600 hover:text-blue-800 text-sm underline"
          >
            点击重试
          </button>
        </div>
      )}
    </div>
  );
});

TurnstileWidget.displayName = 'TurnstileWidget';
