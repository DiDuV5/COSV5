/**
 * @component PostCard
 * @description 内容卡片组件，用于展示用户发布的内容
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - post: Post - 内容数据
 * - className?: string - 自定义样式类名
 *
 * @example
 * <PostCard post={postData} />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - shadcn/ui components
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
// 简化的时间格式化函数
const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return '刚刚';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}天前`;
  return date.toLocaleDateString('zh-CN');
};
import {
  Heart,
  MessageCircle,
  Share,
  MoreHorizontal,
  Play,
  Eye,
  Shield
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { UnifiedAvatar } from "@/components/ui/unified-avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { ReactionButton } from "@/components/ui/reaction-button";
import { ProtectedPostActions } from "@/components/post/PostActions";

interface PostCardProps {
  post: any; // 简化类型定义
  className?: string;
}

export function PostCard({ post, className }: PostCardProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  // 本地状态管理（简化，主要由ReactionButton处理）
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);

  // 获取用户点赞状态
  const { data: likeStatusData, refetch: refetchLikeStatus } = api.post.getLikeStatus.useQuery(
    { postIds: [post.id] },
    {
      enabled: !!session?.user,
      refetchOnWindowFocus: false,
    }
  );

  // tRPC utils for cache invalidation
  const utils = api.useUtils();

  // 初始化点赞数
  useEffect(() => {
    if (post) {
      setLikeCount(post._count?.likes ?? post.likeCount ?? 0);
    }
  }, [post?.likeCount, post?._count?.likes]);

  const getMediaPreview = () => {
    if (!post.media || post.media.length === 0) {
      return null;
    }

    const firstMedia = post.media[0];

    if (firstMedia.mediaType === "IMAGE") {
      return (
        <div className="relative aspect-square overflow-hidden rounded-lg">
          <Image
            src={firstMedia.url}
            alt={post.title || 'Post image'}
            fill
            className="object-cover transition-transform duration-300 hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {post.media.length > 1 && (
            <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-semibold">
              +{post.media.length - 1}
            </div>
          )}
        </div>
      );
    }

    if (firstMedia.mediaType === "VIDEO") {
      return (
        <div className="relative aspect-video overflow-hidden rounded-lg bg-black group">
          {/* 视频缩略图：优先使用thumbnailUrl，如果没有则显示占位符 */}
          {firstMedia.thumbnailUrl ? (
            <Image
              src={firstMedia.thumbnailUrl}
              alt={post.title || 'Video thumbnail'}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Play className="h-12 w-12 mx-auto mb-2" />
                <span className="text-sm">视频预览</span>
              </div>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity group-hover:opacity-75">
            <div className="bg-black/70 rounded-full p-3 transform transition-transform group-hover:scale-110">
              <Play className="h-6 w-6 text-white" />
            </div>
          </div>
          {post.media.length > 1 && (
            <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-semibold">
              +{post.media.length - 1}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="relative aspect-video overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
        <p className="text-gray-500 text-sm">不支持的媒体类型</p>
      </div>
    );
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/users/${post.author.username}`}>
              <UnifiedAvatar
                user={{
                  username: post.author.username,
                  displayName: post.author.displayName,
                  avatarUrl: post.author.avatarUrl,
                  isVerified: post.author.isVerified,
                  userLevel: post.author.userLevel,
                }}
                size="md"
                showVerifiedBadge={true}
                fallbackType="initials"
              />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/users/${post.author.username}`}
                  className="font-medium hover:text-blue-500 transition-colors"
                >
                  {post.author.displayName || post.author.username}
                </Link>
                {post.author.isVerified && (
                  <Shield className="h-4 w-4 text-blue-500" />
                )}
              </div>
              <div className="text-sm text-gray-500">
                {formatTimeAgo(new Date(post.publishedAt || post.createdAt))}
              </div>
            </div>
          </div>

          {/* 作品操作按钮 */}
          <ProtectedPostActions
            post={{
              id: post.id,
              title: post.title,
              contentType: post.contentType || 'POST',
              authorId: post.authorId,
              mediaCount: post.media?.length || 0,
              commentCount: post.commentCount || 0,
              likeCount: post.likeCount || 0,
              publishedAt: post.publishedAt,
            }}
            variant="dropdown"
            size="sm"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 内容标题和描述 */}
        <div>
          <Link href={`/posts/${post.id}`}>
            <h3 className="font-semibold text-lg hover:text-blue-500 transition-colors line-clamp-2">
              {post.title}
            </h3>
          </Link>
          {post.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-1 line-clamp-3">
              {post.description}
            </p>
          )}
        </div>

        {/* 媒体预览 */}
        <Link href={`/posts/${post.id}`}>
          {getMediaPreview()}
        </Link>

        {/* 标签 */}
        {post.tags && (
          <div className="flex flex-wrap gap-2">
            {JSON.parse(post.tags).slice(0, 3).map((tag: string, index: number) => (
              <Badge key={index} variant="secondary" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* 互动按钮 */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4">
            {/* 多表情反应按钮 */}
            <ReactionButton
              targetId={post.id}
              targetType="post"
              currentReaction={likeStatusData?.[post.id]?.reactionType}
              likeCount={likeCount}
              userLevel={session?.user?.userLevel || 'GUEST'}
              size="md"
              showPicker={true}
              enableLongPress={true}
              showStats={true}
              onReactionChange={(reaction) => {
                console.log('PostCard反应变化:', reaction);

                // 乐观更新本地状态
                const wasLiked = !!likeStatusData?.[post.id]?.reactionType;
                const willBeLiked = !!reaction;
                const currentCount = likeCount;

                let newCount = currentCount;
                if (wasLiked && !willBeLiked) {
                  // 取消反应
                  newCount = Math.max(0, currentCount - 1);
                } else if (!wasLiked && willBeLiked) {
                  // 添加反应
                  newCount = currentCount + 1;
                }
                // 如果是切换表情类型（wasLiked && willBeLiked），数量不变

                console.log('PostCard状态更新:', {
                  postId: post.id,
                  wasLiked,
                  willBeLiked,
                  currentCount,
                  newCount,
                  reaction
                });

                setLikeCount(newCount);

                // 延迟刷新缓存以确保数据一致性
                setTimeout(() => {
                  refetchLikeStatus();
                  utils.post.getInfinite.invalidate();
                  utils.post.getById.invalidate({ id: post.id });
                }, 100);
              }}
            />

            {/* 评论按钮 */}
            <Link href={`/posts/${post.id}#comments`}>
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <span>{post.commentCount || 0}</span>
              </Button>
            </Link>

            {/* 分享按钮 */}
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <Share className="h-4 w-4" />
              <span>分享</span>
            </Button>
          </div>

          {/* 浏览量 */}
          {post.viewCount && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Eye className="h-4 w-4" />
              <span>{post.viewCount}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
