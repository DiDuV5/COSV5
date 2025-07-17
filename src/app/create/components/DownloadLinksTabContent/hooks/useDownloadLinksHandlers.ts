/**
 * @fileoverview 下载链接操作处理Hook
 * @description 管理下载链接的增删改查操作
 */

import { toast } from 'sonner';
import { DownloadLinkService, type DownloadLink } from '@/components/download';
import type { LinkHandlers } from '../types';

interface UseDownloadLinksHandlersProps {
  links: DownloadLink[];
  updateLinks: (links: DownloadLink[]) => void;
  clearError: (index: number) => void;
  updateErrors: (errors: Record<number, string>) => void;
  deleteLink: any; // tRPC mutation
}

/**
 * 下载链接操作处理Hook
 */
export function useDownloadLinksHandlers({
  links,
  updateLinks,
  clearError,
  updateErrors,
  deleteLink,
}: UseDownloadLinksHandlersProps): LinkHandlers {
  
  /**
   * 添加新链接
   */
  const handleAddLink = () => {
    const newLink = DownloadLinkService.createEmptyLink(links.length);
    updateLinks([...links, newLink]);
  };

  /**
   * 删除链接
   */
  const handleRemoveLink = async (index: number) => {
    const link = links[index];

    if (link.id) {
      // 如果是已保存的链接，调用删除API
      try {
        await deleteLink.mutateAsync({ id: link.id });
        const newLinks = DownloadLinkService.removeLink(links, index);
        updateLinks(newLinks);
      } catch (error) {
        console.error('删除链接失败:', error);
      }
    } else {
      // 如果是新链接，直接从数组中移除
      const newLinks = DownloadLinkService.removeLink(links, index);
      updateLinks(newLinks);
    }
  };

  /**
   * 更新链接字段
   */
  const handleUpdateLinkField = (index: number, field: keyof DownloadLink, value: any) => {
    const updatedLinks = DownloadLinkService.updateLinkField(links, index, field, value);
    updateLinks(updatedLinks);

    // 清除该行的错误
    clearError(index);
  };

  /**
   * 保存链接 - 占位符，实际实现在主组件中
   */
  const handleSaveLinks = async () => {
    // 这个函数将在主组件中被重写
    console.log('handleSaveLinks placeholder called');
  };

  return {
    handleAddLink,
    handleRemoveLink,
    handleUpdateLinkField,
    handleSaveLinks,
  };
}
