/**
 * @fileoverview 用户等级配置Hook
 * @description 处理用户等级配置的表单逻辑和API调用
 */

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import type { CansConfigForm, UserLevel } from "../types/user-level-types";

export interface UseUserLevelConfigProps {
  userLevel: UserLevel;
  displayName: string;
}

export interface UseUserLevelConfigReturn {
  // 状态
  isEditing: boolean;
  config: CansConfigForm | undefined;
  isPending: boolean;

  // 表单
  register: ReturnType<typeof useForm<CansConfigForm>>['register'];
  handleSubmit: ReturnType<typeof useForm<CansConfigForm>>['handleSubmit'];
  reset: ReturnType<typeof useForm<CansConfigForm>>['reset'];
  errors: ReturnType<typeof useForm<CansConfigForm>>['formState']['errors'];
  isDirty: boolean;

  // 操作
  handleEdit: () => void;
  handleCancel: () => void;
  handleSave: (data: CansConfigForm) => void;
  handleReset: () => void;

  // 状态
  isSaving: boolean;
  isResetting: boolean;
}

/**
 * 用户等级配置Hook
 */
export function useUserLevelConfig({
  userLevel,
  displayName
}: UseUserLevelConfigProps): UseUserLevelConfigReturn {
  const [isEditing, setIsEditing] = useState(false);

  // 获取配置数据
  const { data: config, isPending, refetch } = api.cans.config.getConfig.useQuery({ userLevel });

  // 表单处理
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<CansConfigForm>();

  // 更新配置
  const updateConfigMutation = api.cans.config.updateConfig.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setIsEditing(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // 重置配置（暂时模拟实现）
  const resetConfigMutation = {
    mutate: (data: { userLevel: string }) => {
      try {
        toast.success('重置功能暂未实现');
        setIsEditing(false);
        refetch();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '重置失败';
        toast.error(errorMessage);
      }
    },
    isPending: false
  };

  /**
   * 开始编辑
   */
  const handleEdit = () => {
    if (config) {
      reset(config);
      setIsEditing(true);
    }
  };

  /**
   * 取消编辑
   */
  const handleCancel = () => {
    setIsEditing(false);
    reset();
  };

  /**
   * 保存配置
   */
  const handleSave = (data: CansConfigForm) => {
    // 映射字段名以匹配API schema
    updateConfigMutation.mutate({
      userLevel,
      dailySigninCans: data.dailySigninCans,
      consecutiveBonus: data.consecutiveBonus,
      likeCans: data.likeCans,
      commentCans: data.commentCans,
      shareCans: data.shareCans,
      publishMomentCans: data.momentCans,
      publishPostCans: data.postCans,
      dailyLikeLimit: data.dailyLikeLimit,
      dailyCommentLimit: data.dailyCommentLimit,
      dailyShareLimit: data.dailyShareLimit,
      dailyMomentLimit: data.dailyMomentLimit,
      dailyPostLimit: data.dailyPostLimit,
      beLikedCans: data.beLikedCans,
      beCommentedCans: data.beCommentedCans,
      beSharedCans: data.beSharedCans,
      dailyExperienceLimit: 1000, // 默认值
      cansToExperienceRatio: 1, // 默认值
    });
  };

  /**
   * 重置配置
   */
  const handleReset = () => {
    if (confirm(`确定要重置 ${displayName} 等级的配置吗？此操作不可撤销。`)) {
      resetConfigMutation.mutate({ userLevel });
    }
  };

  return {
    // 状态
    isEditing,
    config,
    isPending,

    // 表单
    register,
    handleSubmit,
    reset,
    errors,
    isDirty,

    // 操作
    handleEdit,
    handleCancel,
    handleSave,
    handleReset,

    // 状态
    isSaving: updateConfigMutation.isPending,
    isResetting: resetConfigMutation.isPending,
  };
}

/**
 * 配置验证Hook
 */
export function useConfigValidation() {
  /**
   * 验证配置数据的合理性
   */
  const validateConfig = (config: CansConfigForm): { isValid: boolean; warnings: string[] } => {
    const warnings: string[] = [];

    // 检查奖励是否过高
    if (config.dailySigninCans > 100) {
      warnings.push('每日基础罐头设置过高，可能导致通胀');
    }

    if (config.postCans > 200) {
      warnings.push('发布作品奖励过高，可能导致低质量内容泛滥');
    }

    // 检查限制是否过低
    if (config.dailyPostLimit < 1) {
      warnings.push('每日作品上限过低，可能影响用户体验');
    }

    // 检查被动奖励是否合理
    if (config.beLikedCans > config.likeCans * 2) {
      warnings.push('被点赞奖励过高，可能导致刷赞行为');
    }

    return {
      isValid: warnings.length === 0,
      warnings
    };
  };

  /**
   * 获取推荐配置
   */
  const getRecommendedConfig = (userLevel: UserLevel): Partial<CansConfigForm> => {
    const configs = {
      GUEST: {
        dailySigninCans: 5,
        likeCans: 1,
        commentCans: 2,
        postCans: 10,
        dailyLikeLimit: 50,
        dailyCommentLimit: 10,
        dailyPostLimit: 1
      },
      USER: {
        dailySigninCans: 10,
        likeCans: 1,
        commentCans: 3,
        postCans: 20,
        dailyLikeLimit: 100,
        dailyCommentLimit: 20,
        dailyPostLimit: 3
      },
      VIP: {
        dailySigninCans: 20,
        likeCans: 2,
        commentCans: 5,
        postCans: 50,
        dailyLikeLimit: 200,
        dailyCommentLimit: 50,
        dailyPostLimit: 5
      },
      CREATOR: {
        dailySigninCans: 30,
        likeCans: 2,
        commentCans: 5,
        postCans: 100,
        dailyLikeLimit: 300,
        dailyCommentLimit: 100,
        dailyPostLimit: 10
      },
      ADMIN: {
        dailySigninCans: 50,
        likeCans: 3,
        commentCans: 5,
        postCans: 200,
        dailyLikeLimit: 500,
        dailyCommentLimit: 200,
        dailyPostLimit: 20
      },
      SUPER_ADMIN: {
        dailySigninCans: 100,
        likeCans: 5,
        commentCans: 10,
        postCans: 500,
        dailyLikeLimit: 1000,
        dailyCommentLimit: 500,
        dailyPostLimit: 50
      }
    };

    return configs[userLevel] || configs.USER;
  };

  return {
    validateConfig,
    getRecommendedConfig
  };
}
