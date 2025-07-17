/**
 * @fileoverview 管理员评论系统工具函数
 * @description 包含评论管理相关的辅助函数
 */

import { USER_LEVEL_OPTIONS } from "@/lib/constants/user-levels";

/**
 * 获取用户组显示名称
 */
export const getUserLevelName = (level: string): string => {
  const userLevel = USER_LEVEL_OPTIONS.find(option => option.value === level);
  return userLevel?.label || level;
};

/**
 * 获取内容类型显示名称
 */
export const getContentTypeName = (type: string): string => {
  switch (type) {
    case "POST":
      return "作品";
    case "MOMENT":
      return "动态";
    default:
      return type;
  }
};

/**
 * 获取评论状态显示信息
 */
export const getCommentStatusInfo = (status: string) => {
  switch (status) {
    case "APPROVED":
      return {
        label: "已通过",
        variant: "default" as const,
        color: "text-green-600",
        bgColor: "bg-green-100",
        borderColor: "border-green-200",
      };
    case "PENDING":
      return {
        label: "待审核",
        variant: "secondary" as const,
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        borderColor: "border-yellow-200",
      };
    case "REJECTED":
      return {
        label: "已拒绝",
        variant: "destructive" as const,
        color: "text-red-600",
        bgColor: "bg-red-100",
        borderColor: "border-red-200",
      };
    default:
      return {
        label: status,
        variant: "outline" as const,
        color: "text-gray-600",
        bgColor: "bg-gray-100",
        borderColor: "border-gray-200",
      };
  }
};

/**
 * 截断文本内容
 */
export const truncateContent = (content: string, maxLength: number = 100): string => {
  if (content.length <= maxLength) {
    return content;
  }
  return `${content.substring(0, maxLength)}...`;
};

/**
 * 格式化热度分数显示
 */
export const formatHotScore = (score: number): string => {
  if (score >= 1000) {
    return `${(score / 1000).toFixed(1)}k`;
  }
  return score.toString();
};

/**
 * 检查是否为游客评论
 */
export const isGuestComment = (comment: { author?: any; guestName?: string }): boolean => {
  return !comment.author && !!comment.guestName;
};

/**
 * 获取评论作者显示名称
 */
export const getCommentAuthorName = (comment: { 
  author?: { displayName?: string; username: string }; 
  guestName?: string; 
}): string => {
  if (comment.author) {
    return comment.author.displayName || comment.author.username;
  }
  return comment.guestName || "匿名用户";
};

/**
 * 验证配置表单数据
 */
export const validateConfigForm = (form: {
  likeWeight: number;
  dislikeWeight: number;
  enableLike: boolean;
  enableDislike: boolean;
  showCounts: boolean;
  description: string;
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // 验证权重范围
  if (form.likeWeight < -10 || form.likeWeight > 10) {
    errors.push("点赞权重必须在 -10 到 10 之间");
  }

  if (form.dislikeWeight < -10 || form.dislikeWeight > 10) {
    errors.push("点踩权重必须在 -10 到 10 之间");
  }

  // 验证逻辑合理性
  if (form.enableLike && form.likeWeight <= 0) {
    errors.push("启用点赞功能时，点赞权重应该为正数");
  }

  if (form.enableDislike && form.dislikeWeight >= 0) {
    errors.push("启用点踩功能时，点踩权重应该为负数");
  }

  // 验证描述长度
  if (form.description && form.description.length > 500) {
    errors.push("配置说明不能超过 500 个字符");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * 生成默认配置表单
 */
export const getDefaultConfigForm = () => ({
  likeWeight: 1,
  dislikeWeight: -3,
  enableLike: true,
  enableDislike: true,
  showCounts: true,
  description: "默认评论反应系统配置：点赞权重+1，点踩权重-3，启用所有功能",
});

/**
 * 计算热度分数预览
 */
export const calculateHotScorePreview = (
  likeCount: number,
  dislikeCount: number,
  likeWeight: number,
  dislikeWeight: number
): number => {
  return likeCount * likeWeight + dislikeCount * dislikeWeight;
};

/**
 * 过滤评论列表
 */
export const filterComments = (
  comments: any[],
  searchQuery: string
): any[] => {
  if (!searchQuery.trim()) {
    return comments;
  }

  const query = searchQuery.toLowerCase();
  return comments.filter(comment =>
    comment.content.toLowerCase().includes(query) ||
    comment.author?.username.toLowerCase().includes(query) ||
    comment.author?.displayName?.toLowerCase().includes(query) ||
    comment.guestName?.toLowerCase().includes(query)
  );
};

/**
 * 获取评论统计信息
 */
export const getCommentStats = (comments: any[]) => {
  const stats = {
    total: comments.length,
    approved: 0,
    pending: 0,
    rejected: 0,
    guest: 0,
    registered: 0,
    totalLikes: 0,
    totalReplies: 0,
  };

  comments.forEach(comment => {
    // 状态统计
    switch (comment.status) {
      case "APPROVED":
        stats.approved++;
        break;
      case "PENDING":
        stats.pending++;
        break;
      case "REJECTED":
        stats.rejected++;
        break;
    }

    // 用户类型统计
    if (comment.author) {
      stats.registered++;
    } else {
      stats.guest++;
    }

    // 互动统计
    stats.totalLikes += comment.likeCount || 0;
    stats.totalReplies += comment.replyCount || 0;
  });

  return stats;
};

/**
 * 格式化时间显示
 */
export const formatTimeAgo = (date: string | Date): string => {
  const now = new Date();
  const target = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - target.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "刚刚";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}分钟前`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}小时前`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays}天前`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths}个月前`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears}年前`;
};

/**
 * 生成批量操作确认消息
 */
export const getBatchActionMessage = (
  action: "APPROVE" | "REJECT",
  count: number
): string => {
  const actionText = action === "APPROVE" ? "通过" : "拒绝";
  return `确定要${actionText} ${count} 条评论吗？此操作不可撤销。`;
};

/**
 * 检查是否有权限执行操作
 */
export const canPerformAction = (
  action: string,
  comment: any,
  userRole: string
): boolean => {
  // 基本权限检查
  if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    return false;
  }

  // 特定操作权限检查
  switch (action) {
    case "DELETE":
      // 只有超级管理员可以删除评论
      return userRole === "SUPER_ADMIN";
    case "APPROVE":
    case "REJECT":
      // 管理员和超级管理员都可以审核
      return true;
    case "TOGGLE_PIN":
      // 管理员和超级管理员都可以置顶
      return true;
    default:
      return false;
  }
};
