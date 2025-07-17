/**
 * @fileoverview 下载链接状态管理Hook
 * @description 管理下载链接组件的状态和数据初始化
 */

import { useState, useEffect, useMemo } from 'react';
import { DownloadLinkService, type DownloadLink } from '@/components/download';
import type { DownloadLinksState, LinkStats, DuplicateCheckResult } from '../types';

/**
 * 下载链接状态管理Hook
 */
export function useDownloadLinksState(
  downloadLinks: DownloadLink[],
  existingLinks?: any,
  postId?: string
) {
  // 基础状态
  const [links, setLinks] = useState<DownloadLink[]>([]);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // 初始化链接数据
  useEffect(() => {
    console.log('🔄 初始化链接数据:', {
      postId,
      existingLinksLength: existingLinks?.length,
      downloadLinksLength: downloadLinks.length,
      existingLinks: existingLinks
    });

    if (postId && existingLinks && Array.isArray(existingLinks) && existingLinks.length > 0) {
      // 编辑模式：转换现有链接数据格式
      console.log('📝 编辑模式：格式化现有链接');
      const formattedLinks = DownloadLinkService.formatExistingLinks(existingLinks);
      console.log('✅ 格式化后的链接:', formattedLinks);
      setLinks(formattedLinks);
    } else if (downloadLinks.length > 0) {
      // 创建模式：使用初始链接数据
      console.log('🆕 创建模式：使用初始链接数据');
      setLinks(downloadLinks);
    } else {
      // 默认：创建一个空链接
      console.log('🔧 默认：创建空链接');
      setLinks([DownloadLinkService.createEmptyLink()]);
    }
    setErrors({});
  }, [downloadLinks, existingLinks, postId]);

  // 计算统计数据
  const stats = useMemo((): LinkStats => {
    return DownloadLinkService.calculateStats(links);
  }, [links]);

  // 重复检查
  const duplicateCheck = useMemo((): DuplicateCheckResult => {
    return DownloadLinkService.checkDuplicateUrls(links);
  }, [links]);

  // 状态更新函数
  const updateLinks = (newLinks: DownloadLink[]) => {
    setLinks(newLinks);
  };

  const updateErrors = (newErrors: Record<number, string>) => {
    setErrors(newErrors);
  };

  const setSavingState = (isSaving: boolean) => {
    setSaving(isSaving);
  };

  const setEditingState = (editing: boolean) => {
    setIsEditing(editing);
  };

  // 清除特定错误
  const clearError = (index: number) => {
    if (errors[index]) {
      const newErrors = { ...errors };
      delete newErrors[index];
      setErrors(newErrors);
    }
  };

  // 重置所有错误
  const clearAllErrors = () => {
    setErrors({});
  };

  return {
    // 状态
    links,
    errors,
    saving,
    isEditing,
    stats,
    duplicateCheck,
    
    // 状态更新函数
    updateLinks,
    updateErrors,
    setSavingState,
    setEditingState,
    clearError,
    clearAllErrors,
  };
}
