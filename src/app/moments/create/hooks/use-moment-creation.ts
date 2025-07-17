/**
 * @fileoverview 动态创建自定义Hook
 * @description 管理动态创建的状态和逻辑
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { extractAllTags } from '@/components/ui/tag';
import { api } from '@/trpc/react';

import type {
  MomentCreationState,
  PermissionInfo,
  DailyLimit,
  PublishConditionCheck,
  UseMomentCreationReturn,
  CreateMomentForm,
  CreateMomentResult,
  MomentVisibility
} from '../types';

import type { UploadedFile } from '@/components/upload/FileUploader';

import {
  getPermissionInfo,
  checkPublishConditions,
  generateSuccessRedirectUrl,
  getErrorMessage
} from '../utils';

/**
 * 动态创建Hook
 */
export function useMomentCreation(): UseMomentCreationReturn {
  const router = useRouter();
  const { data: session } = useSession();

  // 状态管理
  const [state, setState] = useState<MomentCreationState>({
    isPublishing: false,
    uploadedFiles: [],
    extractedTags: [],
  });

  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<MomentVisibility>('PUBLIC');

  // API查询
  const { data: permissionCheck, isPending: permissionLoading } = api.permission.checkPermission.useQuery(
    { action: 'PUBLISH_MOMENT' },
    { enabled: !!session?.user }
  );

  const { data: dailyLimit, isPending: dailyLimitLoading } = api.permission.checkDailyLimit.useQuery(
    { contentType: 'MOMENT' },
    { enabled: !!session?.user }
  );

  // 创建动态的 mutation
  const createMomentMutation = api.post.createMoment.useMutation();

  // 计算衍生状态
  const permissionInfo = useMemo(() => {
    return permissionCheck ? getPermissionInfo(permissionCheck as any) : null;
  }, [permissionCheck]);

  const isPending = permissionLoading || dailyLimitLoading;

  // 发布条件检查
  const publishCondition = useMemo((): PublishConditionCheck => {
    if (!permissionInfo || !dailyLimit) {
      return {
        contentLengthValid: false,
        hasRemainingPublishes: false,
        hasContent: false,
        canPublish: false,
        errors: ['正在加载权限信息...'],
      };
    }

    return checkPublishConditions(content, permissionInfo, dailyLimit as any);
  }, [content, permissionInfo, dailyLimit]);

  // 监听内容变化，提取标签
  useEffect(() => {
    if (content) {
      const tags = extractAllTags({ content });
      setState(prev => ({ ...prev, extractedTags: tags }));
    } else {
      setState(prev => ({ ...prev, extractedTags: [] }));
    }
  }, [content]);

  // 设置内容
  const handleSetContent = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  // 设置可见性
  const handleSetVisibility = useCallback((newVisibility: MomentVisibility) => {
    setVisibility(newVisibility);
  }, []);

  // 添加上传文件
  const handleAddUploadedFiles = useCallback((files: UploadedFile[]) => {
    setState(prev => ({
      ...prev,
      uploadedFiles: [...prev.uploadedFiles, ...files],
    }));
  }, []);

  // 删除文件
  const handleRemoveFile = useCallback((fileId: string) => {
    setState(prev => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.filter(file => file.id !== fileId),
    }));
  }, []);

  // 重排序文件
  const handleReorderFiles = useCallback((files: UploadedFile[]) => {
    setState(prev => ({
      ...prev,
      uploadedFiles: files,
    }));
  }, []);

  // 发布动态
  const handlePublishMoment = useCallback(async (data: CreateMomentForm): Promise<CreateMomentResult> => {
    if (!session?.user) {
      return {
        success: false,
        error: '用户未登录',
      };
    }

    setState(prev => ({ ...prev, isPublishing: true, formError: undefined }));

    try {
      const result = await createMomentMutation.mutateAsync({
        content: data.content,
        visibility: data.visibility,
        tags: state.extractedTags,
        mediaIds: state.uploadedFiles.map(file => file.id),
      });

      console.log('动态发布成功:', result);

      // 发布成功后跳转
      const redirectUrl = generateSuccessRedirectUrl(
        result.post?.id,
        session.user.username
      );

      router.push(redirectUrl);

      return {
        success: true,
        post: result.post as any,
      };
    } catch (error: any) {
      console.error('动态发布失败:', error);

      const errorMessage = getErrorMessage(error.message || '动态发布失败，请稍后重试');

      setState(prev => ({
        ...prev,
        isPublishing: false,
        formError: errorMessage,
      }));

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [session, state.extractedTags, state.uploadedFiles, createMomentMutation, router]);

  return {
    state: {
      ...state,
      isPublishing: state.isPublishing || createMomentMutation.isPending,
    },
    permissionInfo,
    dailyLimit: dailyLimit as any,
    isPending,
    publishCondition,
    actions: {
      setContent: handleSetContent,
      setVisibility: handleSetVisibility,
      addUploadedFiles: handleAddUploadedFiles,
      removeFile: handleRemoveFile,
      reorderFiles: handleReorderFiles,
      publishMoment: handlePublishMoment,
    },
  };
}

/**
 * 权限检查Hook
 */
export function usePermissionCheck() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // 获取用户权限信息
  const { data: permissionCheck, isPending: permissionLoading } = api.permission.checkPermission.useQuery(
    { action: 'PUBLISH_MOMENT' },
    { enabled: !!session?.user }
  );

  // 获取今日发布限制
  const { data: dailyLimit, isPending: dailyLimitLoading } = api.permission.checkDailyLimit.useQuery(
    { contentType: 'MOMENT' },
    { enabled: !!session?.user }
  );

  // 检查登录状态
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/moments/create');
    }
  }, [status, router]);

  const isPending = status === 'loading' || permissionLoading || dailyLimitLoading;
  const isAuthenticated = !!session?.user;
  const hasPermission = permissionCheck?.hasPermission ?? false;
  const canPublish = dailyLimit?.canPublish ?? false;

  return {
    session,
    permissionCheck,
    dailyLimit,
    isPending,
    isAuthenticated,
    hasPermission,
    canPublish,
  };
}

/**
 * 媒体上传Hook
 */
export function useMediaUpload(permissionInfo: PermissionInfo | null) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // 处理文件上传完成
  const handleUploadComplete = useCallback((files: UploadedFile[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
  }, []);

  // 处理文件删除
  const handleFileRemove = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  // 处理文件重排序
  const handleFileReorder = useCallback((files: UploadedFile[]) => {
    setUploadedFiles(files);
  }, []);

  // 计算最大上传文件数
  const maxFiles = useMemo(() => {
    if (!permissionInfo) return 10;

    const imageLimit = permissionInfo.maxImagesPerUpload === -1 ? 20 : permissionInfo.maxImagesPerUpload;
    const videoLimit = permissionInfo.maxVideosPerUpload === -1 ? 20 : permissionInfo.maxVideosPerUpload;

    return Math.max(imageLimit, videoLimit);
  }, [permissionInfo]);

  // 检查是否有上传权限
  const hasUploadPermission = useMemo(() => {
    return permissionInfo?.canUploadImages || permissionInfo?.canUploadVideos;
  }, [permissionInfo]);

  return {
    uploadedFiles,
    maxFiles,
    hasUploadPermission,
    actions: {
      handleUploadComplete,
      handleFileRemove,
      handleFileReorder,
    },
  };
}
