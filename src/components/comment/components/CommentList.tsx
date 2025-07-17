/**
 * @fileoverview 评论列表组件
 * @description 显示评论列表，支持排序和分页
 */

"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  TrendingUp,
  Users,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { EnhancedCommentItem } from "../enhanced-comment-item";
import { useCommentActions, type LikeState } from "./CommentActions";

export interface Comment {
  id: string;
  content: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  likeCount: number;
  replyCount: number;
  isPinned?: boolean;
  status: string;
  replies?: Comment[];
  // 其他评论字段...
}

export interface CommentListProps {
  postId: string;
  comments: Comment[];
  isPending: boolean;
  error?: Error | null;
  onRefresh: () => void;
  likeStates: Record<string, LikeState>;
  onLikeStatesChange: (states: Record<string, LikeState>) => void;
}

/**
 * 评论列表组件
 */
export function CommentList({
  postId,
  comments,
  isPending,
  error,
  onRefresh,
  likeStates,
  onLikeStatesChange,
}: CommentListProps) {
  const { data: session } = useSession();
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "following">("newest");

  const {
    handleLike,
    handleDelete,
    handleAdminAction,
    isLiking,
    isDeleting,
    isModerating,
    isPinning,
  } = useCommentActions({
    postId,
    onCommentUpdate: onRefresh,
  });

  // 排序评论
  const sortedComments = [...comments].sort((a, b) => {
    // 置顶评论始终在前
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    switch (sortBy) {
      case "popular":
        return b.likeCount - a.likeCount;
      case "following":
        // 这里可以根据关注关系排序
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "newest":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const isAdmin = session?.user?.userLevel === "ADMIN" || session?.user?.userLevel === "SUPER_ADMIN";

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          加载评论失败：{error.message}
          <Button
            variant="link"
            className="p-0 h-auto ml-2"
            onClick={onRefresh}
          >
            重试
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">加载评论中...</span>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-lg mb-2">暂无评论</div>
        <div className="text-sm">成为第一个评论的人吧！</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 排序选择器 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          共 {comments.length} 条评论
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">排序：</span>
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as "newest" | "popular" | "following")}
          >
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  最新
                </div>
              </SelectItem>
              <SelectItem value="popular">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  热门
                </div>
              </SelectItem>
              <SelectItem value="following">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  关注
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* 评论列表 */}
      <div className="space-y-4">
        {sortedComments.map((comment, index) => (
          <div key={comment.id}>
            <EnhancedCommentItem
              comment={comment}
              isLiked={likeStates[comment.id]?.liked || false}
              onAdminAction={(action: string, commentId: string, data?: any) => handleAdminAction(action as "approve" | "reject" | "pin" | "unpin" | "delete", commentId, data)}
              isPending={false}
              onLikeChange={(commentId: string, liked: boolean, likeCount: number) => {
                onLikeStatesChange({
                  ...likeStates,
                  [commentId]: { liked, count: likeCount }
                });
              }}
            />
            {index < sortedComments.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}
      </div>

      {/* 加载更多按钮（如果需要分页） */}
      {comments.length >= 20 && (
        <div className="text-center pt-4">
          <Button variant="outline" onClick={onRefresh}>
            加载更多评论
          </Button>
        </div>
      )}
    </div>
  );
}
