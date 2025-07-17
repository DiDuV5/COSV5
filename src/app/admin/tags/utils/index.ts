/**
 * @fileoverview 标签管理工具函数
 * @description 包含标签管理相关的辅助函数
 */

import type { TagData, FilterState } from "../types";

/**
 * 格式化数字显示
 */
export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

/**
 * 格式化日期显示
 */
export const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('zh-CN');
};

/**
 * 格式化相对时间
 */
export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 60) {
    return `${minutes}分钟前`;
  } else if (hours < 24) {
    return `${hours}小时前`;
  } else if (days < 30) {
    return `${days}天前`;
  } else {
    return formatDate(date);
  }
};

/**
 * 验证标签名称
 */
export const validateTagName = (name: string): {
  isValid: boolean;
  error?: string;
} => {
  const trimmedName = name.trim();
  
  if (!trimmedName) {
    return { isValid: false, error: '标签名称不能为空' };
  }
  
  if (trimmedName.length < 1) {
    return { isValid: false, error: '标签名称至少需要1个字符' };
  }
  
  if (trimmedName.length > 50) {
    return { isValid: false, error: '标签名称不能超过50个字符' };
  }
  
  // 检查特殊字符
  const invalidChars = /[<>\"'&]/;
  if (invalidChars.test(trimmedName)) {
    return { isValid: false, error: '标签名称不能包含特殊字符 < > " \' &' };
  }
  
  return { isValid: true };
};

/**
 * 验证合并操作
 */
export const validateMergeOperation = (
  sourceTagNames: string[],
  targetTagName: string
): {
  isValid: boolean;
  error?: string;
} => {
  if (sourceTagNames.length < 2) {
    return { isValid: false, error: '至少需要选择2个标签进行合并' };
  }
  
  const targetValidation = validateTagName(targetTagName);
  if (!targetValidation.isValid) {
    return { isValid: false, error: `目标标签名称无效: ${targetValidation.error}` };
  }
  
  if (sourceTagNames.includes(targetTagName.trim())) {
    return { isValid: false, error: '目标标签不能与源标签相同' };
  }
  
  return { isValid: true };
};

/**
 * 验证重命名操作
 */
export const validateRenameOperation = (
  oldName: string,
  newName: string
): {
  isValid: boolean;
  error?: string;
} => {
  const newNameValidation = validateTagName(newName);
  if (!newNameValidation.isValid) {
    return { isValid: false, error: `新标签名称无效: ${newNameValidation.error}` };
  }
  
  if (oldName.trim() === newName.trim()) {
    return { isValid: false, error: '新标签名称不能与原名称相同' };
  }
  
  return { isValid: true };
};

/**
 * 获取标签状态的显示信息
 */
export const getTagStatusInfo = (status: TagData['status']) => {
  switch (status) {
    case 'active':
      return {
        label: '活跃',
        variant: 'default' as const,
        color: 'text-green-600',
      };
    case 'disabled':
      return {
        label: '已禁用',
        variant: 'secondary' as const,
        color: 'text-gray-600',
      };
    case 'deleted':
      return {
        label: '已删除',
        variant: 'destructive' as const,
        color: 'text-red-600',
      };
    default:
      return {
        label: '未知',
        variant: 'secondary' as const,
        color: 'text-gray-600',
      };
  }
};

/**
 * 计算标签的热度分数
 */
export const calculateTagHeatScore = (tag: TagData): number => {
  const weights = {
    count: 0.4,
    views: 0.3,
    likes: 0.2,
    comments: 0.1,
  };
  
  return (
    tag.count * weights.count +
    tag.views * weights.views +
    tag.likes * weights.likes +
    tag.comments * weights.comments
  );
};

/**
 * 排序标签数据
 */
export const sortTags = (
  tags: TagData[],
  sortBy: FilterState['sortBy'],
  sortOrder: FilterState['sortOrder']
): TagData[] => {
  return [...tags].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'count':
        comparison = a.count - b.count;
        break;
      case 'created':
        comparison = a.firstUsed.getTime() - b.firstUsed.getTime();
        break;
      case 'updated':
        comparison = a.lastUsed.getTime() - b.lastUsed.getTime();
        break;
      default:
        comparison = a.count - b.count;
    }
    
    return sortOrder === 'desc' ? -comparison : comparison;
  });
};

/**
 * 过滤标签数据
 */
export const filterTags = (
  tags: TagData[],
  searchQuery: string,
  statusFilter: FilterState['statusFilter']
): TagData[] => {
  return tags.filter(tag => {
    // 状态过滤
    if (statusFilter !== 'all' && tag.status !== statusFilter) {
      return false;
    }
    
    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return tag.name.toLowerCase().includes(query);
    }
    
    return true;
  });
};

/**
 * 生成操作摘要
 */
export const generateOperationSummary = (
  operation: 'merge' | 'rename' | 'delete' | 'restore',
  data: {
    sourceTagNames?: string[];
    targetTagName?: string;
    oldName?: string;
    newName?: string;
    tagNames?: string[];
    softDelete?: boolean;
  }
): string => {
  switch (operation) {
    case 'merge':
      return `将 ${data.sourceTagNames?.length} 个标签合并为 "${data.targetTagName}"`;
    case 'rename':
      return `将标签 "${data.oldName}" 重命名为 "${data.newName}"`;
    case 'delete':
      const deleteType = data.softDelete ? '软删除' : '永久删除';
      return `${deleteType} ${data.tagNames?.length} 个标签`;
    case 'restore':
      return `恢复 ${data.tagNames?.length} 个标签`;
    default:
      return '未知操作';
  }
};

/**
 * 检查是否可以执行批量操作
 */
export const canPerformBatchOperation = (
  operation: 'merge' | 'delete' | 'restore',
  selectedTags: string[]
): {
  canPerform: boolean;
  reason?: string;
} => {
  if (selectedTags.length === 0) {
    return { canPerform: false, reason: '未选择任何标签' };
  }
  
  switch (operation) {
    case 'merge':
      if (selectedTags.length < 2) {
        return { canPerform: false, reason: '合并操作至少需要选择2个标签' };
      }
      break;
    case 'delete':
    case 'restore':
      if (selectedTags.length === 0) {
        return { canPerform: false, reason: '未选择任何标签' };
      }
      break;
  }
  
  return { canPerform: true };
};

/**
 * 生成分页信息文本
 */
export const generatePaginationText = (
  currentPage: number,
  pageSize: number,
  total: number
): string => {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);
  return `显示第 ${start} - ${end} 条，共 ${total} 条记录`;
};

/**
 * 防抖函数
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
