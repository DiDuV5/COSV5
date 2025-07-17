/**
 * @fileoverview 表情反应处理Hook
 * @description 管理表情反应的状态和逻辑处理
 */
"use client";


import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/trpc/react';
import { 
  REACTION_CONFIGS,
  type ReactionType,
  canUseReaction
} from '@/lib/reaction-types';

import type { 
  UseReactionHandlerProps, 
  UseReactionHandlerReturn,
  ReactionHandlerConfig 
} from '../types';
import { 
  parseErrorMessage, 
  validateProps, 
  shouldRetryError,
  logError,
  logInfo 
} from '../utils';
import { 
  DEFAULT_REACTION_HANDLER_CONFIG, 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES 
} from '../constants';

/**
 * @hook useReactionHandler
 * @description 处理表情反应的自定义Hook
 */
export function useReactionHandler({
  enableQuickReaction,
  targetId,
  targetType,
  currentUserReaction,
  userLevel,
  onReactionChange,
  config = {},
}: UseReactionHandlerProps): UseReactionHandlerReturn {
  // 合并配置
  const handlerConfig: ReactionHandlerConfig = {
    ...DEFAULT_REACTION_HANDLER_CONFIG,
    ...config,
  };

  // 状态管理
  const [clickingReaction, setClickingReaction] = useState<ReactionType | null>(null);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Hooks
  const { toast } = useToast();
  const router = useRouter();
  const { data: session } = useSession();

  // 网络状态监听
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setError(null);
      logInfo('网络状态', '网络连接已恢复');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setError('网络连接已断开');
      logError('网络状态', new Error('网络连接已断开'));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 初始状态检查
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * @function handleApiError
   * @description 统一的API错误处理函数
   */
  const handleApiError = useCallback((error: any, context: string) => {
    const errorInfo = parseErrorMessage(error);

    logError(context, error, {
      targetId,
      targetType,
      userLevel,
      sessionExists: !!session?.user,
      isOnline
    });

    setClickingReaction(null);
    setError(errorInfo.message);

    toast({
      title: "操作失败",
      description: errorInfo.message,
      variant: "destructive",
    });
  }, [targetId, targetType, userLevel, session?.user, isOnline, toast]);

  // API mutations for quick reactions
  const postReactMutation = api.post.react.useMutation({
    onMutate: async (variables) => {
      logInfo('帖子反应', '开始操作', {
        ...variables,
        userLevel,
        isOnline
      });
      setClickingReaction(variables.reactionType as ReactionType);
      setError(null);

      // 乐观更新
      if (onReactionChange) {
        onReactionChange(variables.reactionType);
      }
    },
    onSuccess: (data) => {
      logInfo('帖子反应', '操作成功', { result: data });
      setClickingReaction(null);
      setError(null);

      onReactionChange?.(data.reactionType);

      toast({
        title: SUCCESS_MESSAGES.REACTION_UPDATED,
        description: data.reactionType
          ? `已添加${REACTION_CONFIGS[data.reactionType as ReactionType]?.label || ''}反应`
          : SUCCESS_MESSAGES.REACTION_REMOVED,
      });
    },
    onError: (error) => {
      handleApiError(error, '帖子表情反应');
      // 回滚乐观更新
      if (onReactionChange) {
        onReactionChange(currentUserReaction || null);
      }
    },
    retry: (failureCount, error) => {
      return shouldRetryError(error, failureCount, handlerConfig.maxRetryCount);
    },
    retryDelay: handlerConfig.retryDelay,
  });

  const commentReactMutation = api.comment.interaction.react.useMutation({
    onMutate: async (variables: any) => {
      logInfo('评论反应', '开始操作', {
        ...variables,
        userLevel,
        isOnline
      });
      setClickingReaction(variables.reactionType as ReactionType);
      setError(null);

      // 乐观更新
      if (onReactionChange) {
        onReactionChange(variables.reactionType);
      }
    },
    onSuccess: (data: any) => {
      logInfo('评论反应', '操作成功', { result: data });
      setClickingReaction(null);
      setError(null);

      onReactionChange?.(data.reactionType);

      toast({
        title: SUCCESS_MESSAGES.REACTION_UPDATED,
        description: data.reactionType
          ? `已添加${REACTION_CONFIGS[data.reactionType as ReactionType]?.label || ''}反应`
          : SUCCESS_MESSAGES.REACTION_REMOVED,
      });
    },
    onError: (error: any) => {
      handleApiError(error, '评论表情反应');
      // 回滚乐观更新
      if (onReactionChange) {
        onReactionChange(currentUserReaction || null);
      }
    },
    retry: (failureCount: number, error: any) => {
      return shouldRetryError(error, failureCount, handlerConfig.maxRetryCount);
    },
    retryDelay: handlerConfig.retryDelay,
  });

  /**
   * @function handleReactionClick
   * @description 处理表情反应点击
   */
  const handleReactionClick = useCallback((reactionType: ReactionType) => {
    const currentTime = Date.now();

    // 1. 基础参数验证
    if (!enableQuickReaction) {
      logError('反应点击', new Error('快速反应功能未启用'));
      toast({
        title: ERROR_MESSAGES.FEATURE_DISABLED,
        description: "快速反应功能当前未启用",
        variant: "destructive",
      });
      return;
    }

    if (!targetId?.trim()) {
      logError('反应点击', new Error('targetId 无效'), { targetId });
      toast({
        title: ERROR_MESSAGES.CONFIG_ERROR,
        description: "目标ID未配置或无效，无法进行反应操作",
        variant: "destructive",
      });
      return;
    }

    // 2. 网络状态检查
    if (!isOnline) {
      logError('反应点击', new Error('网络连接已断开'));
      toast({
        title: ERROR_MESSAGES.NETWORK_ERROR,
        description: ERROR_MESSAGES.NETWORK_ERROR,
        variant: "destructive",
      });
      return;
    }

    // 3. 防抖检查
    if (currentTime - lastClickTime < handlerConfig.debounceDelay) {
      logInfo('反应点击', '防抖拦截', {
        timeDiff: currentTime - lastClickTime,
        debounceDelay: handlerConfig.debounceDelay
      });
      return;
    }

    // 4. 检查是否正在处理中
    if (clickingReaction) {
      logInfo('反应点击', '正在处理中，忽略点击', { clickingReaction });
      return;
    }

    // 5. 检查表情类型有效性
    if (!REACTION_CONFIGS[reactionType]) {
      logError('反应点击', new Error('无效的表情类型'), { reactionType });
      toast({
        title: ERROR_MESSAGES.VALIDATION_ERROR,
        description: "无效的表情类型",
        variant: "destructive",
      });
      return;
    }

    // 更新最后点击时间
    setLastClickTime(currentTime);

    // 6. 检查登录状态
    if (!session?.user) {
      logInfo('反应点击', '用户未登录，跳转到登录页');
      toast({
        title: ERROR_MESSAGES.LOGIN_REQUIRED,
        description: "登录后即可使用表情反应功能",
      });
      router.push('/auth/signin');
      return;
    }

    // 7. 检查用户权限
    if (!canUseReaction(userLevel, reactionType)) {
      logError('反应点击', new Error('用户权限不足'), { userLevel, reactionType });
      const config = REACTION_CONFIGS[reactionType];
      toast({
        title: ERROR_MESSAGES.PERMISSION_DENIED,
        description: `您的用户等级暂时无法使用${config?.label || '此'}表情反应`,
        variant: "destructive",
      });
      return;
    }

    // 8. 确定新的反应类型
    const newReaction = currentUserReaction === reactionType ? null : reactionType;

    logInfo('反应点击', '执行表情反应', {
      targetType,
      targetId,
      currentReaction: currentUserReaction,
      clickedReaction: reactionType,
      newReaction,
      userLevel,
      sessionUser: session.user.username,
      isOnline
    });

    // 9. 调用对应的API
    try {
      if (targetType === 'post') {
        postReactMutation.mutate({
          postId: targetId,
          reactionType: newReaction
        });
      } else if (targetType === 'comment') {
        commentReactMutation.mutate({
          commentId: targetId,
          reactionType: newReaction
        });
      } else {
        throw new Error(`不支持的目标类型: ${targetType}`);
      }
    } catch (error) {
      logError('反应点击', error, { context: 'API调用异常' });
      handleApiError(error, 'API调用');
    }
  }, [
    enableQuickReaction,
    targetId,
    isOnline,
    lastClickTime,
    clickingReaction,
    session?.user,
    userLevel,
    currentUserReaction,
    targetType,
    handlerConfig.debounceDelay,
    postReactMutation,
    commentReactMutation,
    toast,
    router,
    handleApiError
  ]);

  return {
    // 状态
    clickingReaction,
    lastClickTime,
    error,
    isOnline,
    
    // 操作
    handleReactionClick,
    handleApiError,
    setClickingReaction,
    setError,
  };
}
