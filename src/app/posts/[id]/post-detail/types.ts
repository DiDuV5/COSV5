/**
 * @fileoverview 帖子详情页面类型定义
 * @description 定义帖子详情页面相关的类型和接口
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

/**
 * 表情反应统计验证结果
 */
export interface ReactionStatsValidation {
  isValid: boolean;
  error: string | null;
  data: ProcessedReactionStats | null;
}

/**
 * 处理后的表情反应统计数据
 */
export interface ProcessedReactionStats {
  reactions: ProcessedReaction[];
  totalCount: number;
}

/**
 * 处理后的表情反应
 */
export interface ProcessedReaction {
  type: string;
  count: number;
  users: ReactionUser[];
}

/**
 * 表情反应用户
 */
export interface ReactionUser {
  id: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

/**
 * 帖子头部组件属性
 */
export interface PostHeaderProps {
  post: any;
  onBack: () => void;
}

/**
 * 帖子内容组件属性
 */
export interface PostContentProps {
  post: any;
}

/**
 * 帖子媒体组件属性
 */
export interface PostMediaProps {
  post: any;
  userLevel: string;
  onMediaClick: (media: any, index: number) => void;
  onPermissionUpgrade: () => void;
}

/**
 * 帖子互动组件属性
 */
export interface PostInteractionsProps {
  post: any;
  postId: string;
  session: any;
  likeStatusData: any;
  processedReactionStats: ProcessedReactionStats | null;
  reactionStatsLoading: boolean;
  reactionStatsRefetching: boolean;
  reactionStatsError: any;
  onReactionChange: (reaction: string | null, context?: string) => void;
  onRefetchReactionStats: () => void;
}

/**
 * 帖子标签组件属性
 */
export interface PostTagsProps {
  tags: string[];
}

/**
 * 媒体点击处理函数类型
 */
export type MediaClickHandler = (media: any, index: number) => void;

/**
 * 表情反应变化处理函数类型
 */
export type ReactionChangeHandler = (reactionType: string | null, context?: string) => Promise<void>;

/**
 * 权限升级处理函数类型
 */
export type PermissionUpgradeHandler = () => void;
