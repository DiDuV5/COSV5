/**
 * @fileoverview 评论系统类型定义
 * @description 定义评论相关的TypeScript类型和接口
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - Prisma Client Types
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，包含反应系统类型
 */

// 评论反应类型
export type CommentReactionType = 'like' | 'dislike';

// 评论反应状态
export interface CommentReactionStatus {
  reactionType: CommentReactionType | null;
  isLiked: boolean;
  isDisliked: boolean;
}

// 评论反应统计
export interface CommentReactionStats {
  likeCount: number;
  dislikeCount: number;
  hotScore: number; // 热度分数：点赞数 - (点踩数 * 权重)
}

// 评论反应配置
export interface CommentReactionConfig {
  likeWeight: number; // 点赞权重，默认 +1
  dislikeWeight: number; // 点踩权重，默认 -3
  enableDislike: boolean; // 是否启用点踩功能
  showCounts: boolean; // 是否显示具体数量
}

// 评论反应按钮属性
export interface CommentReactionButtonProps {
  commentId: string;
  currentReaction?: CommentReactionType | null;
  likeCount?: number;
  dislikeCount?: number;
  hotScore?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'minimal';
  disabled?: boolean;
  showCounts?: boolean;
  onReactionChange?: (_reaction: CommentReactionType | null, _stats: CommentReactionStats) => void;
}

// 评论热度排序选项
export type CommentSortBy = 'newest' | 'oldest' | 'popular' | 'hot' | 'following';

// 评论状态
export type CommentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// 扩展的评论类型（包含反应数据）
export interface CommentWithReactions {
  id: string;
  content: string;
  authorId?: string | null;
  guestName?: string | null;
  status: CommentStatus;
  isDeleted: boolean;
  likeCount: number;
  replyCount: number;
  createdAt: Date;
  updatedAt: Date;

  // 反应相关
  reactions?: {
    likeCount: number;
    dislikeCount: number;
    hotScore: number;
    userReaction?: CommentReactionType | null;
  };

  // 关联数据
  author?: {
    id: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    userLevel: string;
    isVerified: boolean;
  } | null;

  replies?: CommentWithReactions[];
  parent?: CommentWithReactions | null;
}

// 评论列表响应类型
export interface CommentListResponse {
  comments: CommentWithReactions[];
  nextCursor?: string;
  totalCount: number;
  hasMore: boolean;
}

// 评论反应API响应类型
export interface CommentReactionResponse {
  success: boolean;
  message: string;
  reactionType: CommentReactionType | null;
  likeCount: number;
  dislikeCount: number;
  hotScore: number;
}

// 评论反应统计API响应类型
export interface CommentReactionStatsResponse {
  totalLikes: number;
  totalDislikes: number;
  hotScore: number;
  reactions: Array<{
    type: CommentReactionType;
    count: number;
    users?: Array<{
      id: string;
      username: string;
      displayName?: string | null;
      avatarUrl?: string | null;
      isVerified: boolean;
    }>;
  }>;
}

// 管理后台评论反应配置
export interface AdminCommentReactionConfig {
  id: string;
  likeWeight: number;
  dislikeWeight: number;
  enableDislike: boolean;
  showCounts: boolean;
  hotScoreThreshold: number; // 热门评论阈值
  autoHideThreshold: number; // 自动隐藏阈值（负分）
  createdAt: Date;
  updatedAt: Date;
}

// 评论反应管理数据
export interface CommentReactionManagement {
  commentId: string;
  commentContent: string;
  authorName: string;
  likeCount: number;
  dislikeCount: number;
  hotScore: number;
  createdAt: Date;
  reactions: Array<{
    userId: string;
    username: string;
    reactionType: CommentReactionType;
    createdAt: Date;
  }>;
}

// 热度计算函数类型
export type HotScoreCalculator = (likes: number, dislikes: number, config: CommentReactionConfig) => number;

// 默认热度计算配置
export const DEFAULT_REACTION_CONFIG: CommentReactionConfig = {
  likeWeight: 1,
  dislikeWeight: 3,
  enableDislike: true,
  showCounts: true,
};

// 热度计算函数
export const calculateHotScore: HotScoreCalculator = (likes, dislikes, config) => {
  return likes * config.likeWeight - dislikes * config.dislikeWeight;
};

// 评论排序函数类型
export type CommentSorter = (comments: CommentWithReactions[], sortBy: CommentSortBy) => CommentWithReactions[];

// 评论过滤函数类型
export type CommentFilter = (comment: CommentWithReactions) => boolean;
