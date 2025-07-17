/**
 * @fileoverview 首页精选推荐展示组件
 * @description 展示管理员策展的精选内容，支持轮播和点击统计
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - react: ^18.0.0
 * - next: ^14.0.0
 * - @trpc/react-query: ^10.45.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/trpc/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Star, Eye, Clock, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { fixMediaUrl } from "@/lib/media/cdn-url-fixer";

interface FeaturedSectionProps {
  className?: string;
}

export function FeaturedSection({ className }: FeaturedSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // 获取精选内容
  const { data: featuredContents, isPending } = api.recommendation.getFeatured.useQuery({
    limit: 10,
    includeInactive: false,
  });

  // 更新点击统计
  const updateClickMutation = api.recommendation.updateFeaturedClick.useMutation();

  // 检查是否为视频文件
  const isVideoFile = (url: string): boolean => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.mkv', '.flv'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  // 自动轮播
  useEffect(() => {
    if (!isAutoPlaying || !featuredContents || featuredContents.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredContents.length);
    }, 5000); // 5秒切换一次

    return () => clearInterval(interval);
  }, [isAutoPlaying, featuredContents]);

  // 处理点击事件
  const handleClick = async (featuredId: string, type: 'view' | 'click' = 'click') => {
    try {
      await updateClickMutation.mutateAsync({ featuredId, type });
    } catch (error) {
      console.error('Failed to update click stats:', error);
    }
  };

  // 处理导航
  const goToPrevious = () => {
    if (!featuredContents) return;
    setCurrentIndex((prev) => (prev - 1 + featuredContents.length) % featuredContents.length);
    setIsAutoPlaying(false);
  };

  const goToNext = () => {
    if (!featuredContents) return;
    setCurrentIndex((prev) => (prev + 1) % featuredContents.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  if (isPending) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center space-x-2 mb-4">
          <Star className="h-5 w-5 text-yellow-500" />
          <h2 className="text-xl font-semibold">精选推荐</h2>
        </div>
        <Card className="h-64 animate-pulse">
          <CardContent className="p-0 h-full bg-muted rounded-lg" />
        </Card>
      </div>
    );
  }

  if (!featuredContents || featuredContents.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center space-x-2 mb-4">
          <Star className="h-5 w-5 text-yellow-500" />
          <h2 className="text-xl font-semibold">精选推荐</h2>
        </div>
        <Card className="h-64">
          <CardContent className="p-6 h-full flex items-center justify-center">
            <div className="text-center">
              <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">暂无精选内容</h3>
              <p className="text-sm text-muted-foreground">
                管理员还没有添加精选推荐内容
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentItem = featuredContents[currentIndex];

  return (
    <div id="featured-section" className={cn("space-y-4", className)}>
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <Link href="/featured" className="flex items-center space-x-2 hover:opacity-80 transition-opacity group">
          <Star className="h-5 w-5 text-yellow-500" />
          <h2 className="text-xl font-semibold">精选推荐</h2>
          <Badge variant="secondary" className="text-xs">
            {featuredContents?.length || 0}+
          </Badge>
          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>

      </div>

      {/* 主要内容区域 */}
      <div className="relative">
        <Card className="overflow-hidden shadow-xl">
          <CardContent className="p-0">
            <div className="relative h-80 md:h-96">


              {/* 背景图片 */}
              {currentItem.coverImage ? (
                isVideoFile(currentItem.coverImage) ? (
                  // 视频文件使用Image组件
                  <Image
                    src={fixMediaUrl(currentItem.coverImage)}
                    alt={currentItem.title || "精选内容"}
                    fill
                    className="object-cover transition-transform duration-700 hover:scale-105"
                  />
                ) : (
                  // 图片文件使用Next.js Image组件
                  <Image
                    src={fixMediaUrl(currentItem.coverImage)}
                    alt={currentItem.title || "精选内容"}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 60vw"
                    className="object-cover transition-transform duration-700 hover:scale-105"
                    priority
                  />
                )
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Star className="h-16 w-16 mx-auto mb-4 opacity-80" />
                    <h3 className="text-2xl font-bold">精选内容</h3>
                  </div>
                </div>
              )}

              {/* 增强的渐变遮罩 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* 装饰性光效 */}
              <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
                <div className="absolute bottom-20 left-8 w-16 h-16 bg-blue-400/20 rounded-full blur-lg"></div>
              </div>

              {/* 增强的内容信息 */}
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <div className="space-y-4">
                  {/* 内容类型标签和统计 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge
                        variant="secondary"
                        className="bg-white/20 backdrop-blur-sm text-white border-white/30 px-3 py-1"
                      >
                        {currentItem.contentType === 'POST' ? '✨ 精选作品' :
                         currentItem.contentType === 'ANNOUNCEMENT' ? '📢 重要公告' : '📚 教程指南'}
                      </Badge>
                      {currentItem.content && (
                        <div className="flex items-center space-x-1 text-sm text-white/90 bg-black/20 backdrop-blur-sm rounded-full px-3 py-1">
                          <Eye className="h-3 w-3" />
                          <span>{currentItem.content._count?.likes || 0}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-white/70 bg-black/20 backdrop-blur-sm rounded-full px-3 py-1">
                      {currentItem.viewCount} 次浏览
                    </div>
                  </div>

                  {/* 标题 */}
                  <h3 className="text-2xl md:text-3xl font-bold line-clamp-2 drop-shadow-lg">
                    {currentItem.title}
                  </h3>

                  {/* 描述 */}
                  {currentItem.description && (
                    <p className="text-white/95 line-clamp-2 text-base md:text-lg leading-relaxed drop-shadow-md">
                      {currentItem.description}
                    </p>
                  )}

                  {/* 作者信息 */}
                  {currentItem.content?.author && (
                    <div className="flex items-center space-x-3 text-sm text-white/90">
                      <div className="flex items-center space-x-2 bg-black/20 backdrop-blur-sm rounded-full px-4 py-2">
                        <span>创作者:</span>
                        <span className="font-medium">
                          {currentItem.content.author.displayName || currentItem.content.author.username}
                        </span>
                        {currentItem.content.author.isVerified && (
                          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 点击链接 */}
              {currentItem.content && (
                <Link
                  href={`/posts/${currentItem.content.id}`}
                  className="absolute inset-0 z-10"
                  onClick={() => handleClick(currentItem.id, 'click')}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* 增强的导航点 */}
        {featuredContents.length > 1 && (
          <div className="flex justify-center space-x-3 mt-6">
            {featuredContents.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300 hover:scale-110",
                  index === currentIndex
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 w-8 shadow-lg"
                    : "bg-muted-foreground/40 w-2 hover:bg-muted-foreground/60"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* 水平滑动的精选内容列表 */}
      {featuredContents.length > 1 && (
        <div className="relative">
          <div className="flex items-center space-x-2 mb-3">
            <span className="text-sm text-muted-foreground">滑动查看更多精选内容</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>

          {/* PC端：滑动容器 */}
          <div className="hidden md:block">
            <div
              className="overflow-x-scroll pb-4"
              style={{
                scrollbarWidth: 'thin',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <div className="flex space-x-3" style={{ width: 'max-content' }}>
                {featuredContents.map((item, index) => (
                  <Card
                    key={item.id}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:shadow-md flex-shrink-0 w-48 relative",
                      index === currentIndex && "ring-2 ring-primary"
                    )}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        {item.coverImage && (
                          <div className="relative h-24 rounded overflow-hidden">
                            {isVideoFile(item.coverImage) ? (
                              <Image
                                src={fixMediaUrl(item.coverImage)}
                                alt={item.title || "精选内容"}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <Image
                                src={fixMediaUrl(item.coverImage)}
                                alt={item.title || "精选内容"}
                                fill
                                sizes="(max-width: 768px) 50vw, 192px"
                                className="object-cover"
                              />
                            )}
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-medium line-clamp-2">
                            {item.title}
                          </h4>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                            <div className="flex items-center space-x-1">
                              <Eye className="h-3 w-3" />
                              <span>{item.viewCount}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {item.contentType === 'POST' ? '作品' :
                               item.contentType === 'ANNOUNCEMENT' ? '公告' : '教程'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>

                    {/* 点击链接覆盖整个卡片 */}
                    {item.content && (
                      <Link
                        href={`/posts/${item.content.id}`}
                        className="absolute inset-0 z-10"
                        onClick={() => handleClick(item.id, 'click')}
                      />
                    )}
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* 手机端：可滑动的2x2网格布局 */}
          <div className="block md:hidden">
            <div
              className="overflow-x-scroll pb-4"
              style={{
                scrollbarWidth: 'thin',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <div className="flex space-x-4" style={{ width: 'max-content' }}>
                {/* 将内容按4个一组分组，每组显示为2x2网格 */}
                {Array.from({ length: Math.ceil(featuredContents.length / 4) }, (_, groupIndex) => (
                  <div key={groupIndex} className="grid grid-cols-2 gap-3 flex-shrink-0" style={{ width: '320px' }}>
                    {featuredContents.slice(groupIndex * 4, (groupIndex + 1) * 4).map((item, index) => (
                      <Card
                        key={item.id}
                        className={cn(
                          "cursor-pointer transition-all duration-200 hover:shadow-md relative",
                          (groupIndex * 4 + index) === currentIndex && "ring-2 ring-primary"
                        )}
                      >
                        <CardContent className="p-2">
                          <div className="space-y-2">
                            {item.coverImage && (
                              <div className="relative h-16 rounded overflow-hidden">
                                {isVideoFile(item.coverImage) ? (
                                  <Image
                                    src={fixMediaUrl(item.coverImage)}
                                    alt={item.title || "精选内容"}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <Image
                                    src={fixMediaUrl(item.coverImage)}
                                    alt={item.title || "精选内容"}
                                    fill
                                    sizes="(max-width: 768px) 25vw, 96px"
                                    className="object-cover"
                                  />
                                )}
                              </div>
                            )}
                            <div>
                              <h4 className="text-xs font-medium line-clamp-2">
                                {item.title}
                              </h4>
                              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                                <div className="flex items-center space-x-1">
                                  <Eye className="h-2 w-2" />
                                  <span className="text-xs">{item.viewCount}</span>
                                </div>
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  {item.contentType === 'POST' ? '作品' :
                                   item.contentType === 'ANNOUNCEMENT' ? '公告' : '教程'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>

                        {/* 点击链接覆盖整个卡片 */}
                        {item.content && (
                          <Link
                            href={`/posts/${item.content.id}`}
                            className="absolute inset-0 z-10"
                            onClick={() => handleClick(item.id, 'click')}
                          />
                        )}
                      </Card>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
