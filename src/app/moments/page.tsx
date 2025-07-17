/**
 * @fileoverview 动态列表页面
 * @description 展示所有用户的动态内容
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - next: ^14.0.0
 * - @trpc/react-query: ^10.45.0
 * - lucide-react: ^0.263.1
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
import { MessageCircle, Plus, Filter, Grid, List, Heart, Eye, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MainNav } from "@/components/layout/main-nav";
import { ReactionButton } from "@/components/ui/reaction-button";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { fixMediaUrl } from "@/lib/media/cdn-url-fixer";

type SortBy = "latest" | "popular" | "trending";
type ViewMode = "grid" | "list";

export default function MomentsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [sortBy, setSortBy] = useState<SortBy>("latest");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [likeStates, setLikeStates] = useState<Record<string, { isLiked: boolean; count: number }>>({});

  // 获取动态列表
  const {
    data: moments,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchMoments
  } = api.post.getInfinite.useInfiniteQuery(
    {
      limit: 10,
      type: "MOMENT",
      sortBy,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const allMoments = moments?.pages.flatMap((page) => page.posts) ?? [];

  // tRPC utils for cache invalidation
  const utils = api.useUtils();

  // 获取用户对动态的点赞状态
  const { data: likeStatusData, refetch: refetchLikeStatus } = api.post.getLikeStatus.useQuery(
    { postIds: allMoments.map(m => m.id) },
    { enabled: !!session?.user && allMoments.length > 0 }
  );

  // 初始化点赞状态（简化版本，主要由ReactionButton处理）
  useEffect(() => {
    if (allMoments.length > 0) {
      setLikeStates(prevStates => {
        const newStates = { ...prevStates };

        allMoments.forEach(moment => {
          const dbCount = moment._count?.likes ?? moment.likeCount ?? 0;

          // 只有当状态不存在时才初始化
          if (!newStates[moment.id]) {
            newStates[moment.id] = {
              isLiked: likeStatusData?.[moment.id]?.isLiked || false,
              count: dbCount
            };
          }
        });

        return newStates;
      });
    }
  }, [allMoments, likeStatusData]);



  const sortOptions = [
    { value: "latest", label: "最新" },
    { value: "popular", label: "热门" },
    { value: "trending", label: "趋势" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <MainNav />

      <div className="container mx-auto px-4 py-8">
        {/* 页面头部 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <MessageCircle className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">动态</h1>
            </div>
            <p className="text-muted-foreground">
              分享生活点滴，记录创作过程
            </p>
          </div>

          <Link href="/moments/create">
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>发布动态</span>
            </Button>
          </Link>
        </div>

        {/* 筛选和排序 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">排序:</span>
            </div>
            <div className="flex space-x-1">
              {sortOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={sortBy === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortBy(option.value as SortBy)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 视图切换 */}
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 社交化动态列表 */}
        <div className="max-w-2xl mx-auto">
          {isPending ? (
            <div className="space-y-6">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-muted rounded-full"></div>
                      <div className="flex-1 space-y-3">
                        <div className="h-4 bg-muted rounded w-1/4"></div>
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-32 bg-muted rounded-lg"></div>
                        <div className="flex space-x-4">
                          <div className="h-8 bg-muted rounded w-16"></div>
                          <div className="h-8 bg-muted rounded w-16"></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : allMoments.length > 0 ? (
          <div className={`${
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 gap-6"
              : "space-y-6"
          }`}>
            {allMoments.map((moment) => (
              <Card key={moment.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Link href={`/users/${moment.author.username}`}>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center overflow-hidden">
                          {moment.author.avatarUrl ? (
                            <Image
                              src={moment.author.avatarUrl}
                              alt={moment.author.displayName || moment.author.username}
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded-full object-cover"
                              priority={false}
                              sizes="40px"
                            />
                          ) : (
                            <span className="text-white font-medium text-sm">
                              {(moment.author.displayName || moment.author.username).charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </Link>
                      <div>
                        <Link
                          href={`/users/${moment.author.username}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {moment.author.displayName || moment.author.username}
                        </Link>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span>@{moment.author.username}</span>
                          <span>•</span>
                          <span>{new Date(moment.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">动态</Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <Link href={`/posts/${moment.id}`}>
                    <div className="space-y-4">
                      {/* 标题 */}
                      {moment.title && (
                        <h3 className="font-semibold text-lg line-clamp-2 hover:text-primary transition-colors">
                          {moment.title}
                        </h3>
                      )}

                      {/* 内容 */}
                      <p className="text-muted-foreground line-clamp-3">
                        {moment.content}
                      </p>

                      {/* 媒体内容 */}
                      {moment.media && moment.media.length > 0 && (
                        <div className={`grid gap-2 ${
                          moment.media.length === 1
                            ? "grid-cols-1"
                            : moment.media.length === 2
                            ? "grid-cols-2"
                            : "grid-cols-3"
                        }`}>
                          {moment.media.slice(0, 6).map((media, index) => (
                            <div key={media.id} className="relative overflow-hidden rounded-md">
                              {media.mediaType === "IMAGE" ? (
                                <Image
                                  src={fixMediaUrl(media.url)}
                                  alt={`媒体 ${index + 1}`}
                                  width={200}
                                  height={128}
                                  className="w-full h-32 object-cover"
                                  priority={index < 2}
                                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                />
                              ) : (
                                <Image
                                  src={fixMediaUrl(media.thumbnailUrl || media.url)}
                                  alt={`视频 ${index + 1}`}
                                  width={200}
                                  height={128}
                                  className="w-full h-32 object-cover"
                                  priority={index < 2}
                                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                />
                              )}
                              {moment.media.length > 6 && index === 5 && (
                                <div className="absolute inset-0 bg-black/50 rounded-md flex items-center justify-center">
                                  <span className="text-white font-medium">
                                    +{moment.media.length - 6}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* 互动按钮 */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                      {/* 多表情反应按钮 */}
                      <ReactionButton
                        targetId={moment.id}
                        targetType="post"
                        currentReaction={likeStatusData?.[moment.id]?.reactionType || null}
                        likeCount={likeStates[moment.id]?.count ?? moment._count?.likes ?? moment.likeCount ?? 0}
                        userLevel={session?.user?.userLevel || 'GUEST'}
                        size="sm"
                        showPicker={true}
                        enableLongPress={true}
                        showStats={true}
                        onReactionChange={(reaction) => {
                          console.log('Moment反应变化:', reaction);

                          // 乐观更新本地状态
                          const wasLiked = likeStates[moment.id]?.isLiked || false;
                          const willBeLiked = !!reaction;
                          const currentCount = likeStates[moment.id]?.count ?? moment._count?.likes ?? moment.likeCount ?? 0;

                          let newCount = currentCount;
                          if (wasLiked && !willBeLiked) {
                            // 取消反应
                            newCount = Math.max(0, currentCount - 1);
                          } else if (!wasLiked && willBeLiked) {
                            // 添加反应
                            newCount = currentCount + 1;
                          }
                          // 如果是切换表情类型（wasLiked && willBeLiked），数量不变

                          console.log('动态状态更新:', {
                            momentId: moment.id,
                            wasLiked,
                            willBeLiked,
                            currentCount,
                            newCount,
                            reaction
                          });

                          setLikeStates(prev => ({
                            ...prev,
                            [moment.id]: {
                              isLiked: willBeLiked,
                              count: newCount
                            }
                          }));

                          // 延迟刷新缓存以确保数据一致性
                          setTimeout(() => {
                            refetchLikeStatus();
                            utils.post.getInfinite.invalidate();
                            utils.post.getById.invalidate({ id: moment.id });
                          }, 100);
                        }}
                      />

                      {/* 评论按钮 */}
                      <Link href={`/posts/${moment.id}#comments`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center space-x-1 h-auto p-1 text-muted-foreground hover:text-blue-500 transition-colors"
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span>{moment._count?.comments || 0}</span>
                        </Button>
                      </Link>

                      {/* 浏览量 */}
                      <div className="flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span>{moment.viewCount || 0}</span>
                      </div>
                    </div>

                    {/* 分享按钮 */}
                    <Button variant="ghost" size="sm">
                      <Share className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无动态</h3>
            <p className="text-muted-foreground mb-4">
              还没有人发布动态，成为第一个分享者吧！
            </p>
            <Link href="/moments/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                发布动态
              </Button>
            </Link>
          </div>
        )}

        {/* 加载更多 */}
        {hasNextPage && (
          <div className="text-center mt-8">
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "加载中..." : "加载更多"}
            </Button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
