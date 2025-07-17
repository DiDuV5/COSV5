/**
 * @fileoverview 标签管理自定义Hook
 * @description 管理标签页面的状态和API调用
 */
"use client";


import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import type {
  UseTagManagementReturn,
  FilterState,
  DialogState,
  SelectionState
} from '../types';
import {
  validateMergeOperation,
  validateRenameOperation,
  canPerformBatchOperation
} from '../utils';

export const useTagManagement = (): UseTagManagementReturn => {
  const { toast } = useToast();

  // 筛选器状态
  const [filters, setFiltersState] = useState<FilterState>({
    searchQuery: '',
    debouncedSearchQuery: '',
    statusFilter: 'all',
    sortBy: 'count',
    sortOrder: 'desc',
    currentPage: 1,
    pageSize: 20,
  });

  // 对话框状态
  const [dialogs, setDialogsState] = useState<DialogState>({
    mergeDialogOpen: false,
    renameDialogOpen: false,
    deleteDialogOpen: false,
    selectedTagForRename: '',
    newTagName: '',
    targetTagName: '',
    operationReason: '',
    softDelete: true,
  });

  // 选择状态
  const [selection, setSelectionState] = useState<SelectionState>({
    selectedTags: [],
  });

  // 错误状态
  const [error, setError] = useState<string | null>(null);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setFiltersState(prev => ({
        ...prev,
        debouncedSearchQuery: prev.searchQuery,
        currentPage: 1, // 重置到第一页
      }));
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.searchQuery]);

  // API调用
  const { data: tagsData, isPending, error: tagsError, refetch } = api.tag.admin.getAllForAdmin.useQuery({
    page: filters.currentPage,
    limit: filters.pageSize,
    search: filters.debouncedSearchQuery,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    status: filters.statusFilter,
  });

  // Handle errors using useEffect in React Query v5
  useEffect(() => {
    if (tagsError) {
      setError(tagsError.message);
      toast({
        variant: 'destructive',
        title: '加载失败: ' + (tagsError.message || '未知错误'),
      });
    }
  }, [tagsError]);

  const { data: statsData, error: statsError } = api.tag.admin.getStatsForAdmin.useQuery({
    timeRange: 'month',
    limit: 10,
  });

  // Handle stats errors using useEffect in React Query v5
  useEffect(() => {
    if (statsError) {
      toast({
        variant: 'destructive',
        title: '统计数据加载失败: ' + (statsError.message || '未知错误'),
      });
    }
  }, [statsError]);

  // Mutations
  const mergeTagsMutation = api.tag.mutations.mergeTags.useMutation({
    onSuccess: (data) => {
      setDialogsState(prev => ({
        ...prev,
        mergeDialogOpen: false,
        targetTagName: '',
        operationReason: '',
      }));
      setSelectionState(prev => ({ ...prev, selectedTags: [] }));
      toast({
        title: '合并成功: ' + ((data as any)?.message || '标签已合并'),
      });
      refetch();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: '合并失败: ' + ((error as any)?.message || '未知错误'),
      });
    },
  });

  const renameTagMutation = api.tag.mutations.renameTag.useMutation({
    onSuccess: (data) => {
      setDialogsState(prev => ({
        ...prev,
        renameDialogOpen: false,
        selectedTagForRename: '',
        newTagName: '',
        operationReason: '',
      }));
      toast({
        title: '重命名成功: ' + ((data as any)?.message || '标签已重命名'),
      });
      refetch();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: '重命名失败: ' + ((error as any)?.message || '未知错误'),
      });
    },
  });

  const deleteTagsMutation = api.tag.mutations.deleteTags.useMutation({
    onSuccess: (data) => {
      setDialogsState(prev => ({
        ...prev,
        deleteDialogOpen: false,
        operationReason: '',
      }));
      setSelectionState(prev => ({ ...prev, selectedTags: [] }));
      toast({
        title: '删除成功: ' + ((data as any)?.message || '标签已删除'),
      });
      refetch();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: '删除失败: ' + ((error as any)?.message || '未知错误'),
      });
    },
  });

  const restoreTagMutation = api.tag.mutations.restoreTag.useMutation({
    onSuccess: (data) => {
      toast({
        title: '恢复成功: ' + ((data as any)?.message || '标签已恢复'),
      });
      refetch();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: '恢复失败: ' + ((error as any)?.message || '未知错误'),
      });
    },
  });

  const batchRestoreTagsMutation = api.tag.mutations.batchRestoreTags.useMutation({
    onSuccess: (data) => {
      setSelectionState(prev => ({ ...prev, selectedTags: [] }));
      toast({
        title: '批量恢复成功: ' + ((data as any)?.message || '标签已恢复'),
      });
      refetch();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: '批量恢复失败: ' + ((error as any)?.message || '未知错误'),
      });
    },
  });

  // 筛选器操作
  const setFilters = {
    setSearchQuery: (query: string) => {
      setFiltersState(prev => ({ ...prev, searchQuery: query }));
    },
    setStatusFilter: (filter: FilterState['statusFilter']) => {
      setFiltersState(prev => ({ ...prev, statusFilter: filter, currentPage: 1 }));
    },
    setSortBy: (sortBy: FilterState['sortBy']) => {
      setFiltersState(prev => ({ ...prev, sortBy }));
    },
    setSortOrder: (order: FilterState['sortOrder']) => {
      setFiltersState(prev => ({ ...prev, sortOrder: order }));
    },
    setCurrentPage: (page: number) => {
      setFiltersState(prev => ({ ...prev, currentPage: page }));
    },
  };

  // 对话框操作
  const setDialogs = {
    setMergeDialogOpen: (open: boolean) => {
      setDialogsState(prev => ({ ...prev, mergeDialogOpen: open }));
    },
    setRenameDialogOpen: (open: boolean) => {
      setDialogsState(prev => ({ ...prev, renameDialogOpen: open }));
    },
    setDeleteDialogOpen: (open: boolean) => {
      setDialogsState(prev => ({ ...prev, deleteDialogOpen: open }));
    },
    setSelectedTagForRename: (tag: string) => {
      setDialogsState(prev => ({ ...prev, selectedTagForRename: tag }));
    },
    setNewTagName: (name: string) => {
      setDialogsState(prev => ({ ...prev, newTagName: name }));
    },
    setTargetTagName: (name: string) => {
      setDialogsState(prev => ({ ...prev, targetTagName: name }));
    },
    setOperationReason: (reason: string) => {
      setDialogsState(prev => ({ ...prev, operationReason: reason }));
    },
    setSoftDelete: (softDelete: boolean) => {
      setDialogsState(prev => ({ ...prev, softDelete }));
    },
  };

  // 选择操作
  const setSelection = {
    setSelectedTags: (tags: string[]) => {
      setSelectionState(prev => ({ ...prev, selectedTags: tags }));
    },
  };

  // 业务操作
  const actions = {
    handleSelectAll: (checked: boolean) => {
      if (checked) {
        const tags = tagsData?.tags || [];
        setSelection.setSelectedTags(tags.map(tag => tag.name));
      } else {
        setSelection.setSelectedTags([]);
      }
    },

    handleSelectTag: (tagName: string, checked: boolean) => {
      if (checked) {
        setSelection.setSelectedTags([...selection.selectedTags, tagName]);
      } else {
        setSelection.setSelectedTags(selection.selectedTags.filter(name => name !== tagName));
      }
    },

    handleMergeTags: () => {
      const validation = canPerformBatchOperation('merge', selection.selectedTags);
      if (!validation.canPerform) {
        toast({
          variant: 'destructive',
          title: '操作失败: ' + (validation.reason || '未知错误'),
        });
        return;
      }
      setDialogs.setMergeDialogOpen(true);
    },

    handleRenameTag: (tagName: string) => {
      setDialogs.setSelectedTagForRename(tagName);
      setDialogs.setNewTagName(tagName);
      setDialogs.setRenameDialogOpen(true);
    },

    handleDeleteTags: () => {
      const validation = canPerformBatchOperation('delete', selection.selectedTags);
      if (!validation.canPerform) {
        toast({
          variant: 'destructive',
          title: '操作失败: ' + (validation.reason || '未知错误'),
        });
        return;
      }
      setDialogs.setDeleteDialogOpen(true);
    },

    handleRestoreTag: (tagName: string) => {
      restoreTagMutation.mutate({
        tagName,
        reason: '单个标签恢复',
      });
    },

    handleBatchRestore: () => {
      const validation = canPerformBatchOperation('restore', selection.selectedTags);
      if (!validation.canPerform) {
        toast({
          variant: 'destructive',
          title: '操作失败: ' + (validation.reason || '未知错误'),
        });
        return;
      }

      batchRestoreTagsMutation.mutate({
        tagNames: selection.selectedTags,
        reason: '批量恢复标签',
      });
    },

    handleRefresh: () => {
      setError(null);
      refetch();
    },

    confirmMerge: () => {
      const validation = validateMergeOperation(selection.selectedTags, dialogs.targetTagName);
      if (!validation.isValid) {
        toast({
          variant: 'destructive',
          title: '验证失败: ' + (validation.error || '未知错误'),
        });
        return;
      }

      mergeTagsMutation.mutate({
        sourceTagNames: selection.selectedTags,
        targetTagName: dialogs.targetTagName.trim(),
        reason: dialogs.operationReason,
      });
    },

    confirmRename: () => {
      const validation = validateRenameOperation(dialogs.selectedTagForRename, dialogs.newTagName);
      if (!validation.isValid) {
        toast({
          variant: 'destructive',
          title: '验证失败: ' + (validation.error || '未知错误'),
        });
        return;
      }

      renameTagMutation.mutate({
        oldName: dialogs.selectedTagForRename,
        newName: dialogs.newTagName.trim(),
        reason: dialogs.operationReason,
      });
    },

    confirmDelete: () => {
      deleteTagsMutation.mutate({
        tagNames: selection.selectedTags,
        softDelete: dialogs.softDelete,
        reason: dialogs.operationReason,
      });
    },
  };

  return {
    // 状态
    filters,
    dialogs,
    selection,
    error,

    // 数据
    tagsData,
    statsData: statsData as any,
    isPending,

    // 操作函数
    setFilters,
    setDialogs,
    setSelection,
    actions,

    // Mutations
    mutations: {
      mergeTagsMutation,
      renameTagMutation,
      deleteTagsMutation,
      restoreTagMutation,
      batchRestoreTagsMutation,
    },
  };
};
