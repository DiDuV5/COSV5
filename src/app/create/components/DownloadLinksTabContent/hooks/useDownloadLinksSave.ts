/**
 * @fileoverview 下载链接保存逻辑Hook
 * @description 处理下载链接的保存、验证和错误处理
 */

import { toast } from 'sonner';
import { DownloadLinkService, type DownloadLink } from '@/components/download';
import type { SaveContext } from '../types';

interface UseDownloadLinksSaveProps {
  links: DownloadLink[];
  setSavingState: (saving: boolean) => void;
  setEditingState: (editing: boolean) => void;
  updateErrors: (errors: Record<number, string>) => void;
  saveLinks: any; // tRPC mutation
  updateLinks: any; // tRPC mutation
  refreshCache: (postId: string) => Promise<void>;
  onSave: (links: DownloadLink[]) => void;
  postId?: string;
}

/**
 * 下载链接保存逻辑Hook
 */
export function useDownloadLinksSave({
  links,
  setSavingState,
  setEditingState,
  updateErrors,
  saveLinks,
  updateLinks,
  refreshCache,
  onSave,
  postId,
}: UseDownloadLinksSaveProps) {

  /**
   * 验证链接数据
   */
  const validateLinks = () => {
    const validation = DownloadLinkService.validateLinks(links);
    console.log('✅ 验证结果:', validation);

    if (!validation.isValid) {
      console.log('❌ 验证失败:', validation.errors);
      updateErrors(validation.errors);
      toast.error("请检查并修正错误", {
        description: "部分链接信息不完整或格式错误",
      });
      return false;
    }

    return true;
  };

  /**
   * 检查重复链接
   */
  const checkDuplicates = () => {
    const currentDuplicateCheck = DownloadLinkService.checkDuplicateUrls(links);
    console.log('🔍 重复检查结果:', currentDuplicateCheck);
    console.log('📋 链接URL列表:', links.map((link, index) => ({
      index,
      url: link.url,
      title: link.title,
      isPlaceholder: link.url?.includes('***已保存的下载链接***')
    })));

    if (currentDuplicateCheck.hasDuplicates) {
      console.log('❌ 发现重复链接，重复的索引:', currentDuplicateCheck.duplicateIndices);
      toast.error("发现重复的下载链接", {
        description: `重复的链接索引: ${currentDuplicateCheck.duplicateIndices.join(', ')}`,
      });
      return false;
    }

    console.log('✅ 重复检查通过，继续保存流程');
    return true;
  };

  /**
   * 处理编辑模式保存
   */
  const handleEditModeSave = async () => {
    if (!postId) return;

    // 分离新链接和现有链接
    const newLinks = links.filter(link => !link.id);
    const existingLinks = links.filter(link => link.id);

    const promises: Promise<any>[] = [];

    // 保存新链接
    if (newLinks.length > 0) {
      const savePromises = newLinks.map(link =>
        saveLinks.mutateAsync({
          postId: postId,
          platform: link.platform,
          url: link.url && !link.url.includes('***已保存的下载链接***') ? link.url.trim() : '',
          extractCode: link.extractCode && !link.extractCode.includes('***已保存的提取码***') ? link.extractCode.trim() : '',
          cansPrice: link.cansPrice,
          title: link.title ? link.title.trim() : '',
          description: link.description?.trim() || '',
          sortOrder: link.sortOrder,
        })
      );
      promises.push(...savePromises);
    }

    // 更新现有链接
    if (existingLinks.length > 0) {
      const updatePromises = existingLinks.map(link => {
        const updateData: any = {
          id: link.id!,
          platform: link.platform,
          cansPrice: link.cansPrice,
          title: link.title ? link.title.trim() : '',
          description: link.description?.trim() || '',
          sortOrder: link.sortOrder,
        };

        // 只有当用户输入了新的URL时才更新URL
        if (link.url && !link.url.includes('***已保存的下载链接***')) {
          updateData.url = link.url.trim();
        }

        // 只有当用户输入了新的提取码时才更新提取码
        if (link.extractCode && !link.extractCode.includes('***已保存的提取码***')) {
          updateData.extractCode = link.extractCode.trim();
        }

        return updateLinks.mutateAsync(updateData);
      });
      promises.push(...updatePromises);
    }

    if (promises.length === 0) {
      toast.info("没有需要保存的更改", {
        description: "所有链接都是最新的",
      });
      setSavingState(false);
      setEditingState(false);
      return;
    }

    const results = await Promise.all(promises);
    console.log('✅ 所有下载链接保存操作完成:', results);

    // 刷新缓存
    await refreshCache(postId);

    // 显示成功消息
    toast.success("资源下载保存成功", {
      description: `已处理${promises.length}个链接操作`,
    });

    setEditingState(false);
  };

  /**
   * 处理创建模式保存
   */
  const handleCreateModeSave = () => {
    const validLinks = links.filter(link =>
      link.platform && link.url && link.title
    );

    if (validLinks.length === 0) {
      toast.error("没有有效的链接可以保存", {
        description: "请至少添加一个完整的下载链接",
      });
      setSavingState(false);
      return;
    }

    toast.success("资源下载已暂存", {
      description: `已暂存${validLinks.length}个资源下载链接，发布内容后将自动保存`,
    });

    onSave(validLinks);
    setEditingState(false);
  };

  /**
   * 主保存函数
   */
  const handleSaveLinks = async () => {
    console.log('🔍 handleSaveLinks 被调用');
    console.log('📊 当前状态:', {
      linksCount: links.length,
      postId
    });
    console.log('📝 链接数据:', links);

    // 验证链接数据
    if (!validateLinks()) return;

    // 检查重复链接
    if (!checkDuplicates()) return;

    console.log('🚀 开始保存流程');
    setSavingState(true);

    try {
      if (postId) {
        await handleEditModeSave();
      } else {
        handleCreateModeSave();
      }
    } catch (error) {
      console.error('保存链接失败:', error);
      toast.error("保存失败", {
        description: error instanceof Error ? error.message : "保存过程中发生错误，请稍后重试",
      });
    } finally {
      setSavingState(false);
    }
  };

  return {
    handleSaveLinks,
  };
}
