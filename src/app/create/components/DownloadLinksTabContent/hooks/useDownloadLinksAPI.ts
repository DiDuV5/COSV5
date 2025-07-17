/**
 * @fileoverview 下载链接API调用管理Hook
 * @description 管理下载链接相关的tRPC API调用
 */

import { api } from '@/trpc/react';
import { toast } from 'sonner';

/**
 * 下载链接API调用管理Hook
 */
export function useDownloadLinksAPI(onSave: (links: any[]) => void) {
  // 获取tRPC utils用于缓存管理
  const utils = api.useUtils();

  // 创建链接mutation
  const saveLinks = api.downloadLink.create.useMutation({
    onSuccess: (data: any) => {
      console.log('✅ 下载链接保存成功:', data);
      // 注意：不在这里显示toast，因为可能是批量操作的一部分
      onSave([data]);
    },
    onError: (error: any) => {
      console.error('❌ 保存单个链接失败:', error);
      // 错误处理将在调用方统一处理
    },
  });

  // 更新链接mutation
  const updateLinks = api.downloadLink.update.useMutation({
    onSuccess: (data: any) => {
      console.log('✅ 下载链接更新成功:', data);
      // 注意：不在这里显示toast，因为可能是批量操作的一部分
    },
    onError: (error: any) => {
      console.error('❌ 更新单个链接失败:', error);
      // 错误处理将在调用方统一处理
    },
  });

  // 删除链接mutation
  const deleteLink = api.downloadLink.delete.useMutation({
    onSuccess: () => {
      toast.success("链接删除成功");
    },
    onError: (error: any) => {
      toast.error("删除失败", {
        description: error.message,
      });
    },
  });

  // 刷新缓存
  const refreshCache = async (postId: string) => {
    console.log('🔄 刷新下载链接缓存...');
    await utils.downloadLink.getByPostId.invalidate({ postId });
  };

  return {
    // Mutations
    saveLinks,
    updateLinks,
    deleteLink,
    
    // 工具函数
    refreshCache,
    utils,
  };
}
