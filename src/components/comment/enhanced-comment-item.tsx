/**
 * @component EnhancedCommentItem
 * @description 增强的评论项组件，支持游客评论、审核状态显示和管理员操作
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - comment: Comment - 评论数据
 * - currentUser?: User - 当前用户
 * - onReply?: (commentId: string) => void - 回复回调
 * - onAdminAction?: (action: string, commentId: string, data?: any) => void - 管理员操作回调
 * - isPending?: boolean - 是否加载中
 *
 * @example
 * <EnhancedCommentItem
 *   comment={comment}
 *   currentUser={user}
 *   onReply={handleReply}
 *   onAdminAction={handleAdminAction}
 * />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - shadcn/ui
 * - date-fns
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { UnifiedAvatar } from "@/components/ui/unified-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AdminCommentActions } from "./admin-comment-actions";
import { UserCardDialog, useUserCardDialog } from "@/components/ui/user-card-dialog";
import { MentionRenderer } from "@/components/ui/mention-renderer";
import { ReactionButton } from "@/components/ui/reaction-button";
import { CommentReactionButton } from "@/components/comment/comment-reaction-button";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
import {
  Reply,
  Heart,
  User,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Pin,
} from "lucide-react";

interface Comment {
  id: string;
  content: string;
  status: string;
  isPinned?: boolean;
  guestName?: string | null;
  guestContact?: string | null;
  guestSessionId?: string | null;
  author?: {
    id: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    userLevel: string;
    isVerified: boolean;
  } | null;
  likeCount: number;
  replyCount: number;
  createdAt: string | Date;
  rejectionReason?: string | null;
  mentions?: any[]; // 添加 mentions 字段，暂时使用 any[] 类型
}

interface User {
  id: string;
  username: string;
  userLevel: string;
}

interface EnhancedCommentItemProps {
  comment: Comment;
  currentUser?: User;
  guestSessionId?: string; // 游客会话ID，用于判断是否为游客自己的评论
  onReply?: (commentId: string) => void;
  onAdminAction?: (action: string, commentId: string, data?: any) => void;
  isPending?: boolean;
  isLiked?: boolean; // 是否已点赞（兼容性保留）
  currentReaction?: string | null; // 当前用户的表情反应类型
  onLikeChange?: (commentId: string, liked: boolean, likeCount: number) => void; // 点赞状态变化回调
}

export function EnhancedCommentItem({
  comment,
  currentUser,
  guestSessionId,
  onReply,
  onAdminAction,
  isPending: isLoadingProp = false,
  isLiked = false,
  currentReaction = null,
  onLikeChange,
}: EnhancedCommentItemProps) {
  const { isOpen, selectedUsername, openDialog, closeDialog } = useUserCardDialog();
  const { toast } = useToast();

  // tRPC utils for cache invalidation
  const utils = api.useUtils();

  const isGuest = !comment.author;
  const isOwnComment = currentUser
    ? comment.author?.id === currentUser.id
    : isGuest && guestSessionId && comment.guestSessionId === guestSessionId;
  const isAdmin = currentUser?.userLevel === "ADMIN" || currentUser?.userLevel === "SUPER_ADMIN";
  const isPending = comment.status === "PENDING";
  const isRejected = comment.status === "REJECTED";

  // 点赞功能
  const toggleLikeMutation = api.comment.toggleLike.useMutation({
    onMutate: async () => {
      // 乐观更新
      const currentCount = comment.likeCount || 0;
      const newLiked = !isLiked;
      const newCount = newLiked ? currentCount + 1 : Math.max(0, currentCount - 1);

      console.log('=== 评论点赞乐观更新 ===');
      console.log('评论ID:', comment.id);
      console.log('当前点赞状态:', isLiked);
      console.log('当前点赞数:', currentCount);
      console.log('乐观更新后状态:', newLiked);
      console.log('乐观更新后数量:', newCount);
      console.log('========================');

      // 立即更新UI
      onLikeChange?.(comment.id, newLiked, newCount);

      return {
        previousLiked: isLiked,
        previousCount: currentCount
      };
    },
    onSuccess: (data: any) => {
      // 使用服务器返回的准确数据
      onLikeChange?.(comment.id, data.liked, data.likeCount);

      // 刷新相关缓存
      utils.comment.getComments.invalidate();
      utils.comment.interactionExtended.getLikeStatus.invalidate();

      console.log('=== 评论点赞成功 ===');
      console.log('评论ID:', comment.id);
      console.log('服务器返回状态:', data.liked);
      console.log('服务器返回数量:', data.likeCount);
      console.log('========================');
    },
    onError: (error: any, variables: any, context: any) => {
      // 回滚乐观更新
      if (context) {
        onLikeChange?.(comment.id, context.previousLiked, context.previousCount);

        console.log('=== 评论点赞失败回滚 ===');
        console.log('评论ID:', comment.id);
        console.log('回滚到状态:', context.previousLiked);
        console.log('回滚到数量:', context.previousCount);
        console.log('错误信息:', error.message);
        console.log('错误代码:', error.data?.code);
        console.log('========================');
      }

      // 显示用户友好的错误信息
      let errorMessage = "操作失败，请稍后重试";
      if (error.message.includes("评论不存在")) {
        errorMessage = "评论不存在或已被删除";
      } else if (error.message.includes("已被删除")) {
        errorMessage = "评论已被删除";
      } else if (error.message.includes("审核")) {
        errorMessage = "只能对已审核通过的评论进行点赞";
      } else if (error.message.includes("登录")) {
        errorMessage = "请先登录后再进行操作";
      }

      toast({
        title: "点赞失败",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // 处理用户点击事件
  const handleUserClick = () => {
    if (!isGuest && comment.author?.username) {
      openDialog(comment.author.username);
    }
  };

  // 处理点赞
  const handleLike = () => {
    if (!currentUser) {
      toast({
        title: "请先登录",
        description: "登录后才能点赞评论",
        variant: "destructive",
      });
      return;
    }

    // 防止重复点击
    if (toggleLikeMutation.isPending) {
      console.log('=== 评论点赞防重复点击 ===');
      console.log('评论ID:', comment.id);
      console.log('当前状态: 正在处理中');
      console.log('========================');
      return;
    }

    console.log('=== 评论点赞处理开始 ===');
    console.log('评论ID:', comment.id);
    console.log('当前点赞状态:', isLiked);
    console.log('当前点赞数:', comment.likeCount);
    console.log('用户ID:', currentUser.id);
    console.log('========================');

    toggleLikeMutation.mutate({
      commentId: comment.id,
    });
  };

  // 获取显示名称
  const getDisplayName = () => {
    if (isGuest) {
      return comment.guestName || "匿名用户";
    }
    return comment.author?.displayName || comment.author?.username || "用户";
  };



  // 获取用户级别标识
  const getUserLevelBadge = () => {
    if (isGuest) {
      return (
        <Badge variant="secondary" className="text-xs">
          游客
        </Badge>
      );
    }

    const level = comment.author?.userLevel;
    if (level === "ADMIN") {
      return (
        <Badge className="text-xs bg-red-100 text-red-700 hover:bg-red-100">
          <Shield className="h-3 w-3 mr-1" />
          管理员
        </Badge>
      );
    }
    if (level === "SUPER_ADMIN") {
      return (
        <Badge className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">
          运营
        </Badge>
      );
    }
    if (comment.author?.isVerified) {
      return (
        <Badge variant="outline" className="text-xs">
          <CheckCircle className="h-3 w-3 mr-1" />
          认证
        </Badge>
      );
    }
    return null;
  };

  // 获取状态提示
  const getStatusAlert = () => {
    if (isPending && (isOwnComment || isAdmin)) {
      return (
        <Alert className="mt-2">
          <Clock className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {isAdmin ? (
              "此评论正在等待审核"
            ) : (
              "您的评论正在审核中，审核通过后其他用户即可看到。"
            )}
          </AlertDescription>
        </Alert>
      );
    }

    if (isRejected && (isOwnComment || isAdmin)) {
      return (
        <Alert variant="destructive" className="mt-2">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {isAdmin ? "此评论已被拒绝" : "您的评论未通过审核。"}
            {comment.rejectionReason && (
              <div className="mt-1 text-xs">
                原因：{comment.rejectionReason}
              </div>
            )}
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  return (
    <div className="flex gap-3 group">
      {/* 头像 */}
      <UnifiedAvatar
        user={{
          username: isGuest ? 'guest' : (comment.author?.username || 'user'),
          displayName: isGuest ? comment.guestName : comment.author?.displayName,
          avatarUrl: isGuest ? null : comment.author?.avatarUrl,
          isVerified: isGuest ? false : (comment.author?.isVerified || false),
          userLevel: isGuest ? 'USER' : (comment.author?.userLevel || 'USER'),
        }}
        size="sm"
        showVerifiedBadge={!isGuest}
        fallbackType={isGuest ? "icon" : "gradient"}
        onClick={!isGuest ? handleUserClick : undefined}
        className={!isGuest ? 'cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all' : ''}
      />

      {/* 评论内容 */}
      <div className="flex-1 min-w-0">
        {/* 用户信息和时间 */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`font-medium text-sm text-gray-900 ${!isGuest ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''}`}
            onClick={!isGuest ? handleUserClick : undefined}
          >
            {getDisplayName()}
          </span>
          {getUserLevelBadge()}
          {comment.isPinned && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              <Pin className="h-3 w-3 mr-1" />
              置顶
            </Badge>
          )}
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(comment.createdAt), {
              addSuffix: true,
              locale: zhCN,
            })}
          </span>
        </div>

        {/* 评论文本 */}
        <div className="text-sm text-gray-700 mb-2">
          <MentionRenderer
            content={comment.content}
            mentions={comment.mentions || []}
            enableUserCard={true}
            enableTagLinks={true}
            maxLength={500}
            showReadMore={true}
          />
        </div>

        {/* 状态提示 */}
        {getStatusAlert()}

        {/* 操作按钮 */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-4">
            {/* 点赞/点踩反应按钮 */}
            <CommentReactionButton
              commentId={comment.id}
              currentReaction={currentReaction === 'HEART' ? 'like' :
                             currentReaction === 'DISLIKE' ? 'dislike' :
                             currentReaction === 'like' ? 'like' :
                             currentReaction === 'dislike' ? 'dislike' : null}
              likeCount={comment.likeCount}
              dislikeCount={0} // 将从API自动获取
              size="sm"
              variant="compact"
              showCounts={true}
              onReactionChange={(reaction, stats) => {
                console.log('评论反应变化:', reaction, stats);
                // 更新本地状态 - 保持向后兼容
                onLikeChange?.(comment.id, reaction === 'like', stats.likeCount);
              }}
            />

            {/* 回复按钮 */}
            {onReply && comment.status === "APPROVED" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReply(comment.id)}
                className="h-7 px-2 text-gray-500 hover:text-blue-500"
              >
                <Reply className="h-3 w-3 mr-1" />
                回复
                {comment.replyCount > 0 && ` (${comment.replyCount})`}
              </Button>
            )}
          </div>

          {/* 管理员操作 */}
          {isAdmin && onAdminAction && (
            <AdminCommentActions
              comment={{
                ...comment,
                guestName: comment.guestName || undefined,
                createdAt: typeof comment.createdAt === 'string' ? comment.createdAt : comment.createdAt.toISOString(),
                rejectionReason: comment.rejectionReason || undefined,
                author: comment.author ? {
                  ...comment.author,
                  displayName: comment.author.displayName || undefined
                } : undefined
              }}
              onAction={onAdminAction}
              isPending={isPending}
            />
          )}
        </div>
      </div>

      {/* 用户名片弹窗 */}
      <UserCardDialog
        username={selectedUsername}
        open={isOpen}
        onOpenChange={closeDialog}
      />
    </div>
  );
}
