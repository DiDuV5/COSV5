/**
 * @fileoverview Turnstile表单包装器组件
 * @description 为表单提供Turnstile验证的包装器组件
 * @author Augment AI
 * @date 2025-07-09
 * @version 1.0.0
 */

"use client";

import React, { useState, useCallback, useRef, createContext, useContext, useMemo } from 'react';
import { TurnstileWidget } from './turnstile-widget';
import { useTurnstile } from '@/hooks/use-turnstile-client';
import type { TurnstileFeatureId, TurnstileTheme, TurnstileSize, TurnstileWidgetRef } from '@/types/turnstile';

/**
 * Turnstile验证上下文
 */
interface TurnstileContextValue {
  isEnabled: boolean;
  isVerified: boolean;
  token: string | null;
  error: string | null;
  validateSubmission: () => { isValid: boolean; token?: string | null; error?: string | null };
}

const TurnstileContext = createContext<TurnstileContextValue | null>(null);

/**
 * 使用Turnstile验证上下文的Hook
 */
export function useTurnstileContext(): TurnstileContextValue {
  const context = useContext(TurnstileContext);
  if (!context) {
    throw new Error('useTurnstileContext must be used within a TurnstileFormWrapper');
  }
  return context;
}

/**
 * 安全地使用Turnstile验证上下文的Hook
 * 在没有TurnstileFormWrapper时返回默认值而不是抛出错误
 */
export function useTurnstileContextSafe(): TurnstileContextValue {
  const context = useContext(TurnstileContext);

  // 如果没有context，返回默认值
  if (!context) {
    return {
      isEnabled: false,
      isVerified: false,
      token: null,
      error: null,
      validateSubmission: () => ({ isValid: true })
    };
  }

  return context;
}

/**
 * Turnstile表单包装器属性
 */
export interface TurnstileFormWrapperProps {
  /** 功能ID */
  featureId: TurnstileFeatureId;
  /** 子组件 */
  children: React.ReactNode;
  /** 主题 */
  theme?: TurnstileTheme;
  /** 大小 */
  size?: TurnstileSize;
  /** 自定义CSS类名 */
  className?: string;
  /** 验证成功回调 */
  onVerificationSuccess?: (token: string) => void;
  /** 验证失败回调 */
  onVerificationError?: (error: string) => void;
  /** 是否在表单提交时自动验证 */
  autoValidateOnSubmit?: boolean;
  /** 自定义站点密钥（可选） */
  customSitekey?: string;
}

/**
 * Turnstile表单包装器组件
 */
export function TurnstileFormWrapper({
  featureId,
  children,
  theme = 'light',
  size,
  className,
  onVerificationSuccess,
  onVerificationError,
  autoValidateOnSubmit = true,
  customSitekey
}: TurnstileFormWrapperProps) {
  const turnstileRef = useRef<TurnstileWidgetRef>(null);

  // 使用Turnstile Hook
  const turnstile = useTurnstile({
    featureId,
    onSuccess: (token) => {
      onVerificationSuccess?.(token);
    },
    onError: (error) => {
      onVerificationError?.(error);
    },
    onExpired: () => {
      // 处理过期
      turnstile.reset();
    }
  });

  const {
    isEnabled,
    isLoading,
    token: currentToken,
    error: verificationError,
    isVerified
  } = turnstile;

  /**
   * 处理验证成功
   */
  const handleVerificationSuccess = useCallback((token: string) => {
    console.log('✅ TurnstileFormWrapper验证成功:', { featureId, tokenLength: token.length });
    turnstile.setToken(token);
  }, [turnstile, featureId]);

  /**
   * 处理验证错误
   */
  const handleVerificationError = useCallback((error: string) => {
    console.log('❌ TurnstileFormWrapper验证错误:', { featureId, error });
    turnstile.setError(error);
  }, [turnstile, featureId]);

  /**
   * 处理验证过期
   */
  const handleVerificationExpired = useCallback(() => {
    console.log('⏰ TurnstileFormWrapper验证过期:', { featureId });
    turnstile.setError('验证已过期，请重新验证');

    // 重置Turnstile组件
    if (turnstileRef.current) {
      turnstileRef.current.reset();
    }
  }, [turnstile, featureId]);

  /**
   * 重置验证状态
   */
  const resetVerification = useCallback(() => {
    turnstile.setToken(null);
    turnstile.setError(null);
    turnstileRef.current?.reset();
  }, [turnstile]);

  /**
   * 获取当前验证token
   */
  const getCurrentToken = useCallback((): string | null => {
    if (!isEnabled) return null;
    return currentToken || turnstileRef.current?.getResponse() || null;
  }, [isEnabled, currentToken]);

  /**
   * 检查验证状态
   */
  const isValidationRequired = useCallback((): boolean => {
    return isEnabled && !isVerified;
  }, [isEnabled, isVerified]);

  /**
   * 验证表单提交
   */
  const validateFormSubmission = useCallback((): {
    isValid: boolean;
    token: string | null;
    error: string | null;
  } => {
    if (!isEnabled) {
      return { isValid: true, token: null, error: null };
    }

    const token = getCurrentToken();

    if (!token) {
      return {
        isValid: false,
        token: null,
        error: '请完成人机验证'
      };
    }

    if (turnstileRef.current?.isExpired()) {
      return {
        isValid: false,
        token: null,
        error: '验证已过期，请重新验证'
      };
    }

    return { isValid: true, token, error: null };
  }, [isEnabled, getCurrentToken]);

  /**
   * 包装表单提交处理
   */
  const wrapFormSubmission = useCallback((
    originalHandler: (data: any, token?: string) => void | Promise<void>
  ) => {
    return async (data: any) => {
      if (autoValidateOnSubmit) {
        const validation = validateFormSubmission();

        if (!validation.isValid) {
          turnstile.setError(validation.error);
          return;
        }

        return originalHandler(data, validation.token || undefined);
      }

      return originalHandler(data);
    };
  }, [autoValidateOnSubmit, validateFormSubmission]);

  /**
   * 获取站点密钥
   */
  const getSitekey = useCallback((): string => {
    if (customSitekey) return customSitekey;

    // 从环境变量获取（客户端使用NEXT_PUBLIC_前缀）
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || process.env.COSEREEDEN_TURNSTILE_SITE_KEY;
    if (!siteKey) {
      console.error('Turnstile站点密钥未配置，请检查NEXT_PUBLIC_TURNSTILE_SITE_KEY环境变量');
      return '';
    }
    return siteKey;
  }, [customSitekey]);

  // 创建上下文值 - 直接使用Hook状态，避免状态管理冲突
  // 必须在所有条件判断之前定义，遵循React Hooks规则
  const contextValue: TurnstileContextValue = useMemo(() => ({
    isEnabled: turnstile.isEnabled,
    isVerified: turnstile.isVerified,
    token: turnstile.token,
    error: turnstile.error,
    validateSubmission: validateFormSubmission
  }), [turnstile.isEnabled, turnstile.isVerified, turnstile.token, turnstile.error, validateFormSubmission]);

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className={className}>
        {children}
      </div>
    );
  }

  // 如果功能未启用，直接渲染子组件
  if (!isEnabled) {
    return (
      <div className={className}>
        {children}
      </div>
    );
  }

  return (
    <TurnstileContext.Provider value={contextValue}>
      <div className={className}>
        {/* 渲染子组件 */}
        {children}

      {/* Turnstile验证组件 */}
      <div className="mt-4">
        <TurnstileWidget
          ref={turnstileRef}
          sitekey={getSitekey()}
          theme={theme}
          size={size}
          onSuccess={handleVerificationSuccess}
          onError={handleVerificationError}
          onExpired={handleVerificationExpired}
          className="flex justify-center"
        />

        {/* 验证错误提示 */}
        {verificationError && (
          <div className="mt-2 text-center">
            <div className="text-red-600 text-sm mb-2">
              {verificationError}
            </div>
            <button
              type="button"
              onClick={resetVerification}
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              重新验证
            </button>
          </div>
        )}

        {/* 验证成功提示 */}
        {isVerified && (
          <div className="mt-2 text-center">
            <div className="text-green-600 text-sm flex items-center justify-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              人机验证通过
            </div>
          </div>
        )}
      </div>
    </div>
    </TurnstileContext.Provider>
  );
}

/**
 * 高阶组件：为表单添加Turnstile验证
 */
export function withTurnstileVerification<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  featureId: TurnstileFeatureId,
  options: {
    theme?: TurnstileTheme;
    size?: TurnstileSize;
    autoValidateOnSubmit?: boolean;
  } = {}
) {
  const TurnstileEnhancedComponent = (props: T) => {
    return (
      <TurnstileFormWrapper
        featureId={featureId}
        theme={options.theme}
        size={options.size}
        autoValidateOnSubmit={options.autoValidateOnSubmit}
      >
        <WrappedComponent {...props} />
      </TurnstileFormWrapper>
    );
  };

  TurnstileEnhancedComponent.displayName = `withTurnstileVerification(${WrappedComponent.displayName || WrappedComponent.name})`;

  return TurnstileEnhancedComponent;
}

/**
 * 导出验证相关的工具函数
 */
export const TurnstileFormUtils = {
  /**
   * 创建表单提交验证器
   */
  createSubmissionValidator: (_featureId: TurnstileFeatureId) => {
    return async (token?: string): Promise<{ isValid: boolean; error?: string }> => {
      // 在客户端组件中，功能启用状态由useTurnstile hook管理
      // 这里只进行基本的token验证
      if (!token) {
        return { isValid: false, error: '请完成人机验证' };
      }

      return { isValid: true };
    };
  },

  /**
   * 检查功能是否启用（同步版本，用于兼容性）
   */
  isFeatureEnabled: (_featureId: TurnstileFeatureId): boolean => {
    // 在客户端组件中，我们无法直接访问服务器端的功能管理器
    // 这里返回true，实际的功能启用状态由useTurnstile hook管理
    return true;
  }
};
