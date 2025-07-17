/**
 * @component CommentSection
 * @description 评论区组件 - 兼容性组件，重定向到增强评论区
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - postId: string - 内容ID
 * - commentCount: number - 评论总数
 * - allowGuestComments?: boolean - 是否允许游客评论
 *
 * @example
 * <CommentSection
 *   postId="post_123"
 *   commentCount={10}
 *   allowGuestComments={true}
 * />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，重定向到增强评论区
 */

"use client";

import { EnhancedCommentSection } from "../comment/enhanced-comment-section";

interface CommentSectionProps {
  postId: string;
  commentCount: number;
  allowGuestComments?: boolean;
}

/**
 * 评论区组件 - 兼容性包装器
 * 
 * 这个组件是为了保持向后兼容性而创建的，
 * 实际功能由 EnhancedCommentSection 提供
 */
export function CommentSection({
  postId,
  commentCount,
  allowGuestComments = true,
}: CommentSectionProps) {
  return (
    <EnhancedCommentSection
      postId={postId}
      commentCount={commentCount}
      allowGuestComments={allowGuestComments}
    />
  );
}

// 导出类型以供其他组件使用
export type { CommentSectionProps };
