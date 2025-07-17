/**
 * @fileoverview 创作页面主要业务逻辑Hook
 * @description 处理帖子创建、草稿保存等核心功能
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/trpc/react';
import { removeHashtagSymbols } from '@/components/ui/tag';
import { createPostSchema, type CreatePostForm } from '../utils/form-schemas';
import type { MediaFile } from '@/components/upload/MediaPreview';

/**
 * 生成唯一的草稿ID
 */
function generateDraftId(): string {
  // 使用时间戳 + 随机数生成唯一ID
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `draft_${timestamp}_${randomStr}`;
}

// 扩展MediaFile类型以包含额外属性
interface ExtendedMediaFile extends MediaFile {
  mediaId?: string;
  file?: File;
}

export function useCreatePost() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [publishedPostId, setPublishedPostId] = useState<string | null>(null);
  const [downloadLinks, setDownloadLinks] = useState<any[]>([]);

  // 在组件顶层获取 utils 实例
  const utils = api.useUtils();

  // 编辑模式相关状态
  const editPostId = searchParams?.get('edit');
  const loadDraftId = searchParams?.get('draft');
  const [isEditMode, setIsEditMode] = useState(!!editPostId);
  const [editingPostId, setEditingPostId] = useState<string | null>(editPostId || null);

  // 草稿相关状态
  const [draftId, setDraftId] = useState<string>('');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // 初始化草稿ID或加载模式
  useEffect(() => {
    if (loadDraftId) {
      setDraftId(loadDraftId);
      console.log('加载草稿ID:', loadDraftId);
    } else if (!draftId) {
      const newDraftId = generateDraftId();
      setDraftId(newDraftId);
      console.log('生成新的草稿ID:', newDraftId);
    }
  }, [draftId, loadDraftId]);

  // 创建帖子
  const createPost = api.post.create.useMutation({
    onSuccess: (result) => {
      console.log('创建帖子成功:', result);
      // 后端返回的是包装对象，需要从 result.post.id 获取ID
      const postId = result.post?.id;
      if (postId) {
        setPublishedPostId(postId);
        setIsPublishing(false);
        // 发布成功后，不自动打开下载链接管理模态框，让用户手动选择
        // setShowDownloadLinkModal(true); // 移除自动打开
      } else {
        console.error('帖子ID不存在:', result);
        router.push('/posts');
      }
    },
    onError: (error) => {
      console.error('发布失败:', error);
      setIsPublishing(false);
      setIsDraft(false);

      // 显示错误提示给用户
      form.setError('root', {
        type: 'manual',
        message: error.message || '发布失败，请稍后重试'
      });
    },
  });

  // 更新媒体文件顺序
  const updateMediaOrder = api.upload.updateMediaOrder.useMutation({
    onError: (error) => {
      console.error('更新媒体文件顺序失败:', error);
    },
  });

  // 作者更新自己的作品
  const updateMyPost = api.post.updateMyPost.useMutation({
    onSuccess: (result) => {
      console.log('更新作品成功:', result);
      setIsPublishing(false);

      // 清除相关缓存，确保下次编辑时获取最新数据
      utils.post.getById.invalidate({ id: editingPostId! });
      utils.draft.loadPostForEdit.invalidate({ postId: editingPostId! });
      utils.post.getAll.invalidate();

      // 编辑成功后跳转到作品详情页
      router.push(`/posts/${editingPostId}`);
    },
    onError: (error) => {
      console.error('更新作品失败:', error);
      setIsPublishing(false);
      form.setError('root', {
        type: 'manual',
        message: error.message || '更新作品失败，请稍后重试'
      });
    },
  });

  // 管理员更新作品
  const updatePost = api.post.update.useMutation({
    onSuccess: (result) => {
      console.log('管理员更新作品成功:', result);
      setIsPublishing(false);

      // 清除相关缓存，确保下次编辑时获取最新数据
      utils.post.getById.invalidate({ id: editingPostId! });
      utils.draft.loadPostForEdit.invalidate({ postId: editingPostId! });
      utils.post.getAll.invalidate();

      router.push(`/posts/${editingPostId}`);
    },
    onError: (error) => {
      console.error('管理员更新作品失败:', error);
      setIsPublishing(false);
      form.setError('root', {
        type: 'manual',
        message: error.message || '更新作品失败，请稍后重试'
      });
    },
  });

  // 加载草稿数据
  const { data: draftData, isLoading: isDraftLoading } = api.draft.loadDraft.useQuery(
    { draftId: loadDraftId! },
    { enabled: !!loadDraftId }
  );

  // 加载编辑作品数据
  const { data: editData, isLoading: isEditLoading } = api.draft.loadPostForEdit.useQuery(
    { postId: editPostId! },
    { enabled: !!editPostId }
  );

  // 表单处理
  const form = useForm<CreatePostForm>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      title: '',
      description: '',
      content: '',
      visibility: 'PUBLIC',
      allowComments: true,
      allowDownload: false,
    },
  });

  // 加载草稿或编辑数据到表单
  useEffect(() => {
    if (draftData) {
      console.log('加载草稿数据:', draftData);
      form.reset({
        title: draftData.title || '',
        description: draftData.description || '',
        content: draftData.content || '',
        visibility: draftData.visibility || 'PUBLIC',
        allowComments: draftData.allowComments ?? true,
        allowDownload: draftData.allowDownload ?? false,
      });
      setDownloadLinks(draftData.downloadLinks || []);
      if (draftData.editingPostId) {
        setEditingPostId(draftData.editingPostId);
        setIsEditMode(true);
      }
    }
  }, [draftData, form]);

  useEffect(() => {
    if (editData) {
      console.log('加载编辑数据:', editData);
      form.reset({
        title: editData.title || '',
        description: editData.description || '',
        content: editData.content || '',
        visibility: editData.visibility || 'PUBLIC',
        allowComments: editData.allowComments ?? true,
        allowDownload: editData.allowDownload ?? false,
      });
      setDownloadLinks(editData.downloadLinks || []);
      setEditingPostId(editData.editingPostId);
      setIsEditMode(true);
    }
  }, [editData, form]);

  // 草稿保存API
  const saveDraftMutation = api.draft.saveDraft.useMutation({
    onSuccess: (result) => {
      console.log('草稿保存成功:', result);
      setLastSavedAt(new Date());
      setDraftId(result.draftId);
    },
    onError: (error) => {
      console.error('保存草稿失败:', error);
      form.setError('root', {
        type: 'manual',
        message: error.message || '保存草稿失败，请稍后重试'
      });
    },
  });

  // 保存草稿
  const saveDraft = async (data: CreatePostForm, uploadedFiles: MediaFile[], extractedTags: string[]) => {
    try {
      // 使用mediaId而不是文件id，确保正确关联数据库中的媒体记录
      const extendedFiles = uploadedFiles as ExtendedMediaFile[];
      const mediaIds = extendedFiles.map(file => file.mediaId || file.id).filter(Boolean);
      console.log(`保存草稿 [${draftId}]，媒体文件IDs:`, mediaIds);

      // 清理文本内容，移除hashtag符号
      const cleanTitle = removeHashtagSymbols(data.title);
      const cleanDescription = data.description ? removeHashtagSymbols(data.description) : undefined;
      const cleanContent = data.content ? removeHashtagSymbols(data.content) : undefined;

      await saveDraftMutation.mutateAsync({
        id: loadDraftId || undefined, // 如果是加载的草稿，传入ID进行更新
        title: cleanTitle || `草稿 ${draftId}`,
        description: cleanDescription,
        content: cleanContent,
        visibility: data.visibility === 'PREMIUM_ONLY' ? 'PRIVATE' : data.visibility,
        allowComments: data.allowComments,
        allowDownload: data.allowDownload,
        mediaIds,
        tags: extractedTags,
        downloadLinks,
        editingPostId: editingPostId || undefined, // 如果是编辑模式，记录原作品ID
      });
    } catch (error: any) {
      console.error('保存草稿失败:', error);
    }
  };

  // 发布内容
  const publishPost = async (data: CreatePostForm, uploadedFiles: MediaFile[], extractedTags: string[]) => {
    console.log('开始发布内容:', data);
    console.log('编辑模式:', isEditMode, '编辑作品ID:', editingPostId);

    // 验证是否上传了媒体文件（编辑模式下可能不需要重新上传）
    if (!isEditMode && uploadedFiles.length === 0) {
      form.setError('root', {
        type: 'manual',
        message: '请至少上传一张图片或视频'
      });
      return;
    }

    setIsPublishing(true);

    try {
      // 确保媒体文件按照当前顺序排列
      const sortedFiles = [...uploadedFiles].sort((a, b) => (a.order || 0) - (b.order || 0));
      // 使用mediaId而不是文件id，确保正确关联数据库中的媒体记录
      const extendedSortedFiles = sortedFiles as ExtendedMediaFile[];
      const mediaIds = extendedSortedFiles.map(file => file.mediaId || file.id).filter(Boolean);
      console.log('媒体文件IDs（按顺序）:', mediaIds);

      // 清理文本内容，移除hashtag符号
      const cleanTitle = removeHashtagSymbols(data.title);
      const cleanDescription = data.description ? removeHashtagSymbols(data.description) : undefined;
      const cleanContent = data.content ? removeHashtagSymbols(data.content) : undefined;

      console.log('提取的标签:', extractedTags);
      console.log('清理后的文本:', { cleanTitle, cleanDescription, cleanContent });

      let result;
      if (isEditMode && editingPostId) {
        // 编辑模式：更新现有作品
        // 从session获取用户权限 - 暂时设为false，避免编译错误
        // TODO: 需要修复API调用方式
        const isAdmin = false;
        const updateAPI = isAdmin ? updatePost : updateMyPost;

        result = await updateAPI.mutateAsync({
          id: editingPostId,
          title: cleanTitle,
          description: cleanDescription,
          content: cleanContent,
          tags: extractedTags,
          visibility: data.visibility === 'PREMIUM_ONLY' ? 'PRIVATE' : data.visibility,
          // allowComments: data.allowComments, // 暂时注释，API不支持
          // allowDownload: data.allowDownload, // 暂时注释，API不支持
          isDraft: false,
          // 在编辑模式下，总是传递媒体文件ID（包括空数组，用于清除所有媒体文件）
          mediaIds,
        });
      } else {
        // 创建模式：创建新作品
        result = await createPost.mutateAsync({
          ...data,
          title: cleanTitle,
          description: cleanDescription,
          content: cleanContent,
          tags: extractedTags,
          isDraft: false,
          mediaIds,
          downloadLinks,
        });
      }

      console.log('发布成功:', result);

      // 发布成功后更新媒体文件顺序
      if (sortedFiles.length > 0) {
        try {
          const mediaUpdates = sortedFiles.map((file, index) => ({
            id: file.id,
            order: index,
          }));

          await updateMediaOrder.mutateAsync({ mediaUpdates });
          console.log('发布后媒体文件顺序已更新:', mediaUpdates);
        } catch (orderError) {
          console.error('更新媒体文件顺序失败:', orderError);
          // 不影响发布结果，只是记录错误
        }
      }

      // 编辑模式下，跳转逻辑由API回调处理
      if (isEditMode && editingPostId) {
        // 编辑模式：跳转由updateMyPost或updatePost的onSuccess回调处理
        console.log('编辑模式：跳转由API回调处理');
      } else {
        // 创建模式：跳转到新创建的作品详情页
        const postId = result.post?.id;
        if (postId) {
          router.push(`/posts/${postId}`);
        } else {
          console.error('帖子ID不存在:', result);
          router.push('/posts');
        }
      }
    } catch (error: any) {
      console.error('发布失败:', error);
      setIsPublishing(false);

      // 显示错误提示给用户
      form.setError('root', {
        type: 'manual',
        message: error.message || '发布失败，请稍后重试'
      });
    }
  };

  /**
   * 自动保存草稿（可选功能）
   */
  const autoSaveDraft = async (data: CreatePostForm, uploadedFiles: MediaFile[], extractedTags: string[]) => {
    // 只有在有标题或内容时才自动保存
    if (!data.title?.trim() && !data.content?.trim()) {
      return;
    }

    setIsAutoSaving(true);
    try {
      await saveDraft(data, uploadedFiles, extractedTags);
      console.log(`自动保存草稿成功 [${draftId}]`);
    } catch (error) {
      console.error('自动保存草稿失败:', error);
    } finally {
      setIsAutoSaving(false);
    }
  };

  return {
    form,
    isPublishing,
    isDraft,
    publishedPostId,
    downloadLinks,
    setDownloadLinks,
    saveDraft,
    publishPost,
    updateMediaOrder,
    // 新增的草稿相关功能
    draftId,
    lastSavedAt,
    isAutoSaving,
    autoSaveDraft,
    // 编辑模式相关
    isEditMode,
    editingPostId,
    isDraftLoading,
    isEditLoading,
    editData, // 暴露editData以便在页面中处理媒体文件
  };
}
