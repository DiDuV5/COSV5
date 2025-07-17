/**
 * @fileoverview 热门推荐组件
 * @description PC端两排八格，手机端八排两格的热门推荐内容展示，布局参考近期发布
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - react: ^18.0.0
 * - next: ^14.0.0
 * - @trpc/react-query: ^10.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，参考近期发布布局
 */

"use client";

import Link from "next/link";
import Image from "next/image";
import { TrendingUp, Eye, Heart, MessageCircle, User, Calendar, Flame, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";
import { useBestMediaUrl, useVideoThumbnailUrl } from "@/lib/media/cdn-url-fixer";

interface TrendingPostsSectionProps {
  className?: string;
}

// 媒体封面组件，使用URL转换hook
function PostCoverMedia({ media, title }: {
  media: {
    url: string;
    cdnUrl?: string | null;
    thumbnailUrl?: string | null;
    mediaType: string;
  };
  title: string;
}) {
  // 获取最佳媒体URL - 视频使用缩略图用于预览
  const videoThumbnailUrl = useVideoThumbnailUrl({...media, mediaType: media.mediaType});
  const bestMediaUrl = useBestMediaUrl({...media, mediaType: media.mediaType});
  const displayUrl = media.mediaType === 'VIDEO' ? videoThumbnailUrl : bestMediaUrl;

  if (media.mediaType === 'VIDEO') {
    // 视频：使用缩略图URL
    return displayUrl ? (
      <Image
        src={displayUrl}
        alt={title}
        fill
        sizes="(max-width: 768px) 50vw, 25vw"
        className="object-cover group-hover:scale-105 transition-transform duration-300"
      />
    ) : (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <Play className="h-8 w-8 mx-auto mb-2" />
          <span className="text-xs">视频内容</span>
        </div>
      </div>
    );
  } else {
    // 图片：使用转换后的URL
    return (
      <Image
        src={displayUrl}
        alt={title}
        fill
        sizes="(max-width: 768px) 50vw, 25vw"
        className="object-cover group-hover:scale-105 transition-transform duration-300"
      />
    );
  }
}

export function TrendingPostsSection({ className }: TrendingPostsSectionProps) {
  // 获取热门推荐内容 - 只获取作品类型
  const { data: trendingPosts, isPending, error } = api.recommendation.getTrending.useQuery({
    limit: 8, // 获取8个内容，PC端显示8个（2排4格），手机端显示8个（4排2格）
    period: "week", // 默认显示本周热门
    contentType: "POST", // 只获取作品，不包括动态
  });

  // 调试信息
  console.log("🔥 热门推荐数据:", { trendingPosts, isPending, error });

  // 调试信息（可选）
  // console.log("🔥 热门推荐数据:", { trendingPosts, isPending, error });

  // 渲染标题组件
  const renderTitle = () => (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <TrendingUp className="h-5 w-5 text-red-500" />
        <h2 className="text-xl font-semibold">热门推荐</h2>
        <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">
          <Flame className="h-3 w-3 mr-1" />
          本周热门
        </Badge>
      </div>

      <Link
        href="/trending"
        className="text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        查看更多 →
      </Link>
    </div>
  );

  // 错误状态处理
  if (error) {
    console.error("🔥 热门推荐API错误:", error);
    return (
      <div id="trending-posts-section" className={cn("space-y-4", className)}>
        {renderTitle()}

        <Card className="h-64">
          <CardContent className="p-6 h-full flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-red-700 mb-2">加载失败</h3>
              <p className="text-sm text-muted-foreground">
                热门推荐暂时无法加载，请稍后再试
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isPending) {
    return (
      <div id="trending-posts-section" className={cn("space-y-4", className)}>
        {renderTitle()}

        {/* PC端：2行4列，手机端：4行2列 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-0">
                <div className="aspect-square bg-muted"></div>
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="flex space-x-2">
                    <div className="h-5 bg-muted rounded w-12"></div>
                    <div className="h-5 bg-muted rounded w-12"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!trendingPosts || trendingPosts.length === 0) {
    return (
      <div id="trending-posts-section" className={cn("space-y-4", className)}>
        {renderTitle()}

        {/* 显示空状态的网格布局 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                    <span className="text-xs">暂无内容</span>
                  </div>
                </div>
                <div className="p-3">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground">
            还没有足够的互动数据，快去为喜欢的内容点赞吧！
          </p>
        </div>
      </div>
    );
  }

  // PC端显示8个（2行4列），手机端显示8个（4行2列）
  const displayPosts = trendingPosts.slice(0, 8);

  return (
    <div id="trending-posts-section" className={cn("space-y-4", className)}>
      {renderTitle()}

      {/* PC端：2行4列，总共8格 */}
      <div className="hidden md:grid md:grid-cols-4 gap-4">
        {displayPosts.slice(0, 8).map((post, index) => (
          <Link key={post.id} href={`/posts/${post.id}`}>
            <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 group cursor-pointer h-full">
              <CardContent className="p-0">
                {/* 封面图片 */}
                <div className="relative aspect-square overflow-hidden">
                  {post.media && post.media.length > 0 ? (
                    <PostCoverMedia media={post.media[0]} title={post.title} />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-red-100 to-orange-200 flex items-center justify-center">
                      <div className="text-center text-red-400">
                        <User className="h-8 w-8 mx-auto mb-2" />
                        <span className="text-xs">暂无图片</span>
                      </div>
                    </div>
                  )}

                  {/* 热门排名标签 */}
                  <div className="absolute top-2 left-2">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs font-bold",
                        index < 3
                          ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white"
                          : "bg-red-500/90 backdrop-blur-sm text-white"
                      )}
                    >
                      {index < 3 ? `TOP ${index + 1}` : "热门"}
                    </Badge>
                  </div>

                  {/* 多图标识 */}
                  {post.media && post.media.length > 1 && (
                    <div className="absolute top-2 right-2">
                      <Badge
                        variant="secondary"
                        className="bg-black/50 backdrop-blur-sm text-white text-xs"
                      >
                        +{post.media.length - 1}
                      </Badge>
                    </div>
                  )}

                  {/* 热度分数显示 */}
                  {post.heatScore && post.heatScore > 0 && (
                    <div className="absolute bottom-2 right-2">
                      <Badge
                        variant="secondary"
                        className="bg-red-500/90 backdrop-blur-sm text-white text-xs"
                      >
                        <Flame className="h-3 w-3 mr-1" />
                        {Math.round(post.heatScore)}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* 内容信息 */}
                <div className="p-3 space-y-2">
                  <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>

                  {/* 作者信息 */}
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span className="truncate max-w-16">
                        {post.author.displayName || post.author.username}
                      </span>
                    </div>
                    {post.author.isVerified && (
                      <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>

                  {/* 统计信息 */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <Heart className="h-3 w-3 text-red-500" />
                        <span>{post._count.likes}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="h-3 w-3" />
                        <span>{post._count.comments}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(post.createdAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* 手机端：4行2列，总共8格 */}
      <div className="grid grid-cols-2 gap-4 md:hidden">
        {displayPosts.slice(0, 8).map((post, index) => (
          <Link key={post.id} href={`/posts/${post.id}`}>
            <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 group cursor-pointer h-full">
              <CardContent className="p-0">
                {/* 封面图片 */}
                <div className="relative aspect-square overflow-hidden">
                  {post.media && post.media.length > 0 ? (
                    <PostCoverMedia media={post.media[0]} title={post.title} />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-red-100 to-orange-200 flex items-center justify-center">
                      <div className="text-center text-red-400">
                        <User className="h-8 w-8 mx-auto mb-2" />
                        <span className="text-xs">暂无图片</span>
                      </div>
                    </div>
                  )}

                  {/* 热门排名标签 */}
                  <div className="absolute top-2 left-2">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs font-bold",
                        index < 3
                          ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white"
                          : "bg-red-500/90 backdrop-blur-sm text-white"
                      )}
                    >
                      {index < 3 ? `TOP ${index + 1}` : "热门"}
                    </Badge>
                  </div>

                  {/* 多图标识 */}
                  {post.media && post.media.length > 1 && (
                    <div className="absolute top-2 right-2">
                      <Badge
                        variant="secondary"
                        className="bg-black/50 backdrop-blur-sm text-white text-xs"
                      >
                        +{post.media.length - 1}
                      </Badge>
                    </div>
                  )}

                  {/* 热度分数显示 */}
                  {post.heatScore && post.heatScore > 0 && (
                    <div className="absolute bottom-2 right-2">
                      <Badge
                        variant="secondary"
                        className="bg-red-500/90 backdrop-blur-sm text-white text-xs"
                      >
                        <Flame className="h-3 w-3 mr-1" />
                        {Math.round(post.heatScore)}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* 内容信息 */}
                <div className="p-3 space-y-2">
                  <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>

                  {/* 作者信息 */}
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span className="truncate max-w-16">
                        {post.author.displayName || post.author.username}
                      </span>
                    </div>
                    {post.author.isVerified && (
                      <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>

                  {/* 统计信息 */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <Heart className="h-3 w-3 text-red-500" />
                        <span>{post._count.likes}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="h-3 w-3" />
                        <span>{post._count.comments}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(post.createdAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* 查看更多按钮 */}
      <div className="text-center pt-4">
        <Link href="/trending">
          <button className="text-sm text-muted-foreground hover:text-primary transition-colors border border-border rounded-full px-6 py-2 hover:border-primary">
            查看更多热门内容
          </button>
        </Link>
      </div>
    </div>
  );
}
