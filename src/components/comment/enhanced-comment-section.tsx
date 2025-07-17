/**
 * @component EnhancedCommentSection (重构版)
 * @description 增强评论区组件，采用模块化架构
 * @author Augment AI
 * @date 2024-01-XX
 * @version 2.0.0
 *
 * @props
 * - postId: string - 内容ID
 * - commentCount: number - 评论总数
 * - allowGuestComments?: boolean - 是否允许游客评论
 *
 * @example
 * <EnhancedCommentSection
 *   postId="post_123"
 *   commentCount={10}
 *   allowGuestComments={true}
 * />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - shadcn/ui
 * - tRPC
 * - next-auth
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2025-06-29: v2.0.0 重构为模块化架构
 */

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";

// 导入拆分的组件
import { useGuestSession } from "./hooks/use-guest-session";
import { CommentInputSection } from "./components/CommentInputSection";
import { CommentList, type Comment } from "./components/CommentList";
import { useCommentActions, type LikeState } from "./components/CommentActions";
import { GuestCommentForm, type GuestCommentData } from "./guest-comment-form";

export interface EnhancedCommentSectionProps {
  postId: string;
  commentCount: number;
  allowGuestComments?: boolean;
}

/**
 * 重构后的增强评论区组件
 */
export function EnhancedCommentSection({
  postId,
  commentCount,
  allowGuestComments = true,
}: EnhancedCommentSectionProps) {
  const { data: session } = useSession();
  const [likeStates, setLikeStates] = useState<Record<string, LikeState>>({});
  const { toast } = useToast();
  const guestSessionId = useGuestSession();

  // 获取评论列表
  const {
    data: commentsData,
    isPending: isLoadingComments,
    error: commentsError,
    refetch: refetchComments,
  } = api.comment.getComments.useQuery({
    contentId: postId,
    includeOwn: true,
    guestSessionId: guestSessionId || undefined,
  });

  const comments = (commentsData?.comments || []) as any[];

  // 初始化点赞状态
  useEffect(() => {
    if (comments.length > 0) {
      setLikeStates(prevStates => {
        const newStates = { ...prevStates };
        comments.forEach(comment => {
          if (!newStates[comment.id]) {
            newStates[comment.id] = {
              liked: false,
              count: comment.likeCount,
            };
          }
        });
        return newStates;
      });
    }
  }, [comments]);

  // 获取 tRPC utils 用于缓存失效
  const utils = api.useUtils();

  // 创建评论 mutation
  const createCommentMutation = api.comment.create.create.useMutation({
    onSuccess: async (data) => {
      toast({
        title: "评论发布成功",
        description: data.message,
      });

      await utils.comment.getComments.invalidate({ contentId: postId });
      refetchComments();
    },
    onError: (error) => {
      toast({
        title: "评论发布失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 处理注册用户评论提交
  const handleUserCommentSubmit = (content: string) => {
    createCommentMutation.mutate({
      contentId: postId,
      content,
    });
  };

  // 处理游客评论提交
  const handleGuestCommentSubmit = (data: GuestCommentData) => {
    createCommentMutation.mutate({
      contentId: postId,
      content: data.content,
      guestName: data.guestName,
      guestContact: data.guestContact,
      guestSessionId: guestSessionId || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            评论 ({commentCount})
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchComments()}
            disabled={isLoadingComments}
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingComments ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 评论输入区 */}
        <CommentInputSection
          allowGuestComments={allowGuestComments}
          onUserCommentSubmit={handleUserCommentSubmit}
          onGuestCommentSubmit={handleGuestCommentSubmit}
          isPending={createCommentMutation.isPending}
        />

        <Separator />

        {/* 评论列表 */}
        <CommentList
          postId={postId}
          comments={comments}
          isPending={isLoadingComments}
          error={commentsError as Error | null}
          onRefresh={refetchComments}
          likeStates={likeStates}
          onLikeStatesChange={setLikeStates}
        />
      </CardContent>
    </Card>
  );
}
