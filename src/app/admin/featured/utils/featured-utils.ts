/**
 * @fileoverview 精选内容工具函数
 * @description 提供精选内容相关的工具函数
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

export interface FeaturedItem {
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
}

export interface StatusInfo {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
}

export interface ContentTypeInfo {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
}

/**
 * 格式化日期显示
 */
export const formatDate = (date: Date | null): string => {
  if (!date) return "无限制";
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * 获取状态信息
 */
export const getStatusInfo = (item: FeaturedItem): StatusInfo => {
  const now = new Date();

  if (!item.isActive) {
    return { label: "已禁用", variant: "secondary" };
  }

  if (item.startDate && new Date(item.startDate) > now) {
    return { label: "未开始", variant: "outline" };
  }

  if (item.endDate && new Date(item.endDate) < now) {
    return { label: "已过期", variant: "destructive" };
  }

  return { label: "进行中", variant: "default" };
};

/**
 * 获取内容类型信息
 */
export const getContentTypeInfo = (type: string): ContentTypeInfo => {
  const typeMap = {
    POST: { label: "作品", variant: "default" as const },
    ANNOUNCEMENT: { label: "公告", variant: "secondary" as const },
    TUTORIAL: { label: "教程", variant: "outline" as const },
  };

  return typeMap[type as keyof typeof typeMap] || {
    label: type,
    variant: "outline" as const
  };
};
