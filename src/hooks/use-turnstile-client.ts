/**
 * @fileoverview Turnstile客户端Hook
 * @description 客户端专用的Turnstile验证Hook，不包含服务端代码
 * @author Augment AI
 * @date 2025-07-09
 * @version 1.0.0
 */

"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  getClientTurnstileConfig,
  loadTurnstileScript,
  getTurnstileErrorMessage
} from '@/lib/security/turnstile-client-config';
import { getClientSafeConfig } from '@/lib/security/turnstile-env-config';
import type { TurnstileFeatureId } from '@/types/turnstile';
import { api } from '@/trpc/react';

/**
 * Turnstile Hook返回值类型
 */
export interface UseTurnstileReturn {
  /** 是否启用验证 */
  isEnabled: boolean;
  /** 验证token */
  token: string | null;
  /** 是否已验证 */
  isVerified: boolean;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 设置token */
  setToken: (token: string | null) => void;
  /** 设置错误 */
  setError: (error: string | null) => void;
  /** 验证提交 */
  validateSubmission: () => Promise<boolean>;
  /** 重置状态 */
  reset: () => void;
}

/**
 * Turnstile Hook配置
 */
export interface UseTurnstileConfig {
  /** 功能ID */
  featureId: TurnstileFeatureId;
  /** 成功回调 */
  onSuccess?: (token: string) => void;
  /** 错误回调 */
  onError?: (error: string) => void;
  /** 过期回调 */
  onExpired?: () => void;
  /** 超时回调 */
  onTimeout?: () => void;
}

/**
 * Turnstile验证Hook
 */
export function useTurnstile({
  featureId,
  onSuccess,
  onError,
  onExpired,
  onTimeout
}: UseTurnstileConfig): UseTurnstileReturn {
  // 状态管理
  const [isEnabled, setIsEnabled] = useState(false);
  const [token, setTokenState] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setErrorState] = useState<string | null>(null);

  // 使用tRPC查询功能状态
  const { data: featureStates, isLoading: isQueryLoading } = api.turnstile.getFeatureStates.useQuery();

  // 更新功能状态
  useEffect(() => {
    if (featureStates) {
      const enabled = featureStates.features[featureId]?.enabled || false;
      setIsEnabled(enabled);
    }
    setIsLoading(isQueryLoading);
  }, [featureId, featureStates, isQueryLoading]);

  /**
   * 设置验证token
   */
  const setToken = useCallback((newToken: string | null) => {
    console.log('🔄 Turnstile setToken:', { newToken: !!newToken, featureId });

    setTokenState(newToken);
    setIsVerified(!!newToken);
    setErrorState(null);

    if (newToken && onSuccess) {
      onSuccess(newToken);
    }
  }, [onSuccess, featureId]);

  /**
   * 设置错误
   */
  const setError = useCallback((newError: string | null) => {
    console.log('❌ Turnstile setError:', { error: newError, featureId });

    setErrorState(newError);
    setIsVerified(false);
    setTokenState(null);

    if (newError && onError) {
      onError(newError);
    }
  }, [onError, featureId]);

  /**
   * 验证提交
   */
  const validateSubmission = useCallback(async (): Promise<boolean> => {
    console.log('🔍 Turnstile validateSubmission:', {
      isEnabled,
      hasToken: !!token,
      isVerified,
      featureId
    });

    // 如果功能未启用，直接通过
    if (!isEnabled) {
      console.log('✅ Turnstile功能未启用，跳过验证');
      return true;
    }

    // 检查是否有有效token
    if (!token) {
      const errorMsg = '请完成人机验证';
      console.log('❌ Turnstile验证失败：缺少token');
      setError(errorMsg);
      return false;
    }

    // 验证token有效性 - 改进逻辑：有token就认为验证成功
    if (token && token.length > 0) {
      console.log('✅ Turnstile验证成功：token存在');
      // 确保isVerified状态正确
      if (!isVerified) {
        setIsVerified(true);
      }
      return true;
    }

    console.log('❌ Turnstile验证失败：token无效');
    setError('验证token无效，请重新验证');
    return false;
  }, [isEnabled, token, isVerified, setError, featureId]);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setTokenState(null);
    setIsVerified(false);
    setErrorState(null);
  }, []);

  return {
    isEnabled,
    token,
    isVerified,
    isLoading,
    error,
    setToken,
    setError,
    validateSubmission,
    reset
  };
}

/**
 * Turnstile表单提交Hook配置
 */
export interface UseTurnstileFormSubmissionConfig<T> {
  /** 功能ID */
  featureId: TurnstileFeatureId;
  /** 提交处理函数 */
  onSubmit: (data: T, turnstileToken?: string) => Promise<void>;
  /** 成功回调 */
  onSuccess?: () => void;
  /** 错误回调 */
  onError?: (error: string) => void;
}

/**
 * Turnstile表单提交Hook返回值
 */
export interface UseTurnstileFormSubmissionReturn<T> {
  /** 是否正在提交 */
  isSubmitting: boolean;
  /** 处理提交 */
  handleSubmit: (data: T) => Promise<void>;
  /** 错误信息 */
  error: string | null;
  /** 设置错误 */
  setError: (error: string | null) => void;
  /** Turnstile状态 */
  turnstile: UseTurnstileReturn;
}

/**
 * Turnstile表单提交Hook
 */
export function useTurnstileFormSubmission<T>({
  featureId,
  onSubmit,
  onSuccess,
  onError
}: UseTurnstileFormSubmissionConfig<T>): UseTurnstileFormSubmissionReturn<T> {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);

  // 使用Turnstile Hook
  const turnstile = useTurnstile({
    featureId,
    onError: (error) => {
      setErrorState(error);
      onError?.(error);
    }
  });

  /**
   * 设置错误
   */
  const setError = useCallback((newError: string | null) => {
    setErrorState(newError);
    if (newError && onError) {
      onError(newError);
    }
  }, [onError]);

  /**
   * 处理表单提交
   */
  const handleSubmit = useCallback(async (data: T) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorState(null);

    try {
      // 验证Turnstile
      const isValid = await turnstile.validateSubmission();
      if (!isValid) {
        return;
      }

      // 执行提交
      await onSubmit(data, turnstile.token || undefined);

      // 重置Turnstile状态
      turnstile.reset();

      // 调用成功回调
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '提交失败';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, turnstile, onSubmit, onSuccess, setError]);

  return {
    isSubmitting,
    handleSubmit,
    error,
    setError,
    turnstile
  };
}

/**
 * 批量验证Hook配置
 */
export interface UseTurnstileBatchValidationConfig {
  /** 功能ID列表 */
  featureIds: TurnstileFeatureId[];
}

/**
 * 批量验证Hook返回值
 */
export interface UseTurnstileBatchValidationReturn {
  /** 功能状态映射 */
  featureStates: Record<TurnstileFeatureId, boolean>;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 刷新状态 */
  refresh: () => void;
}

/**
 * 批量验证Hook
 */
export function useTurnstileBatchValidation({
  featureIds
}: UseTurnstileBatchValidationConfig): UseTurnstileBatchValidationReturn {
  const [error, setError] = useState<string | null>(null);

  // 使用tRPC查询功能状态
  const {
    data: featureStates,
    isLoading,
    refetch
  } = api.turnstile.getFeatureStates.useQuery();

  // 提取需要的功能状态
  const relevantStates: Record<TurnstileFeatureId, boolean> = {
    USER_REGISTER: false,
    USER_LOGIN: false,
    PASSWORD_RESET: false,
    GUEST_COMMENT: false,
    CONTENT_PUBLISH: false,
    FILE_UPLOAD: false,
    PAYMENT_PROCESS: false,
    ADMIN_OPERATIONS: false
  };

  if (featureStates) {
    for (const featureId of featureIds) {
      relevantStates[featureId] = featureStates.features[featureId]?.enabled || false;
    }
  }

  /**
   * 刷新状态
   */
  const refresh = useCallback(() => {
    setError(null);
    refetch();
  }, [refetch]);

  return {
    featureStates: relevantStates,
    isLoading,
    error,
    refresh
  };
}
