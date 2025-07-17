/**
 * @fileoverview 编辑用户对话框工具函数
 * @description 提供编辑用户对话框相关的工具函数
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

/**
 * 格式化日期
 */
export const formatDate = (date: Date | null): string => {
  if (!date) return "从未";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

/**
 * 清理表单数据，移除空字符串字段
 */
export const cleanFormData = (data: any, userId: string) => {
  return {
    userId,
    ...data,
    email: data.email || undefined,
    displayName: data.displayName || undefined,
    bio: data.bio || undefined,
    avatarUrl: data.avatarUrl || undefined,
  };
};
