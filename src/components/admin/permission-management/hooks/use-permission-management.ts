/**
 * @fileoverview 权限管理自定义Hook
 * @description 管理权限配置的状态和API调用
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/trpc/react";
import {
  permissionConfigSchema,
  DEFAULT_PERMISSION_VALUES,
  type PermissionConfigForm,
  type UsePermissionManagementReturn
} from "../types";
import {
  validatePermissionConfig,
  formatPermissionConfigForSave
} from "../utils";

export const usePermissionManagement = (
  onUpdate?: () => void
): UsePermissionManagementReturn => {
  const [selectedLevel, setSelectedLevel] = useState("USER");
  const [isSaving, setIsSaving] = useState(false);

  // 获取所有权限配置
  const {
    data: configs,
    isPending,
    refetch
  } = api.permission.getAllConfigs.useQuery();

  // 获取特定等级的权限配置
  const { data: currentConfig } = api.permission.getConfigByLevel.useQuery(
    { userLevel: selectedLevel },
    { enabled: !!selectedLevel }
  );

  // 更新权限配置
  const updateConfig = api.permission.updateConfig.useMutation({
    onSuccess: () => {
      refetch();
      onUpdate?.();
    },
    onError: (error) => {
      console.error("更新权限配置失败:", error);
    },
  });

  // 初始化默认配置 - 使用重置配置方法
  const initializeDefaults = api.permission.resetConfigToDefault.useMutation({
    onSuccess: () => {
      refetch();
      onUpdate?.();
    },
    onError: (error: any) => {
      console.error("初始化默认配置失败:", error);
    },
  });

  // 表单处理
  const form = useForm<PermissionConfigForm>({
    resolver: zodResolver(permissionConfigSchema),
    defaultValues: DEFAULT_PERMISSION_VALUES,
  });

  // 当选择的用户等级或配置数据变化时，更新表单
  useEffect(() => {
    if (currentConfig) {
      form.reset({
        canPublishMoments: currentConfig.canPublishMoments,
        canPublishPosts: currentConfig.canPublishPosts,
        dailyMomentsLimit: currentConfig.dailyMomentsLimit,
        dailyPostsLimit: currentConfig.dailyPostsLimit,
        canUploadImages: currentConfig.canUploadImages,
        canUploadVideos: currentConfig.canUploadVideos,
        maxImagesPerUpload: currentConfig.maxImagesPerUpload,
        maxVideosPerUpload: currentConfig.maxVideosPerUpload,
        momentMinLength: currentConfig.momentMinLength,
        momentMaxLength: currentConfig.momentMaxLength,
        canViewPosts: currentConfig.canViewPosts ?? true,
        canViewProfiles: currentConfig.canViewProfiles ?? true,
        canViewComments: currentConfig.canViewComments ?? true,
        canPlayVideos: currentConfig.canPlayVideos ?? true,
        canDownloadImages: currentConfig.canDownloadImages ?? true,
        canSearchContent: currentConfig.canSearchContent ?? true,
        canViewTags: currentConfig.canViewTags ?? true,
        canLikePosts: currentConfig.canLikePosts ?? false,
        canComment: currentConfig.canComment ?? false,
        canFollow: currentConfig.canFollow ?? false,
        canShare: currentConfig.canShare ?? true,
        requireLoginForPosts: currentConfig.requireLoginForPosts ?? false,
        requireLoginForProfiles: currentConfig.requireLoginForProfiles ?? false,
        requireLoginForVideos: currentConfig.requireLoginForVideos ?? false,
        // 评论权限配置
        requiresCommentApproval: currentConfig.requiresCommentApproval ?? true,
        canCommentWithImages: currentConfig.canCommentWithImages ?? false,
        dailyCommentLimit: currentConfig.dailyCommentLimit ?? 10,
        // 社交账号权限配置
        canUseSocialLinks: (currentConfig as any).canUseSocialLinks ?? true,
        maxSocialLinks: (currentConfig as any).maxSocialLinks ?? 10,
        canUseCustomLinks: (currentConfig as any).canUseCustomLinks ?? true,
      });
    } else {
      // 如果没有配置，重置为默认值
      form.reset(DEFAULT_PERMISSION_VALUES);
    }
  }, [currentConfig, form]);

  // 保存配置
  const handleSave = async (data: PermissionConfigForm) => {
    setIsSaving(true);

    try {
      // 验证数据
      const validation = validatePermissionConfig(data);
      if (!validation.isValid) {
        throw new Error(`配置验证失败: ${validation.errors.join(", ")}`);
      }

      // 格式化数据
      const formattedData = formatPermissionConfigForSave(data, selectedLevel);

      // 保存配置
      await updateConfig.mutateAsync(formattedData);

      console.log("权限配置保存成功:", {
        userLevel: selectedLevel,
        changes: Object.keys(data).length,
      });
    } catch (error) {
      console.error("保存权限配置失败:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // 初始化默认配置
  const handleInitializeDefaults = async () => {
    try {
      if (selectedLevel) {
        await initializeDefaults.mutateAsync({ userLevel: selectedLevel });
        console.log("默认权限配置初始化成功");
      }
    } catch (error) {
      console.error("初始化默认配置失败:", error);
      throw error;
    }
  };

  return {
    // 状态
    selectedLevel,
    setSelectedLevel,
    isSaving,

    // 数据
    configs,
    currentConfig: currentConfig as any,
    isPending,

    // 表单
    form,

    // 操作函数
    handleSave,
    handleInitializeDefaults,
    refetch,
  };
};
