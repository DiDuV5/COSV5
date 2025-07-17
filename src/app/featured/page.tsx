/**
 * @fileoverview 精选推荐独立页面
 * @description 展示所有精选推荐内容的独立页面
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - next: ^14.0.0
 * - react: ^18.0.0
 * - @trpc/react-query: ^10.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { ArrowLeft, Star, Eye, Clock, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

export default function FeaturedPage() {
  const { data: session } = useSession();

  // 获取所有精选内容
  const { data: featuredContents, isPending } = api.recommendation.getFeatured.useQuery({
    limit: 50,
    includeInactive: false,
  });

  // 处理点击事件
  const updateClickMutation = api.recommendation.updateFeaturedClick.useMutation();

  const handleClick = async (id: string, type: 'view' | 'click') => {
    try {
      await updateClickMutation.mutateAsync({ featuredId: id, type });
    } catch (error) {
      console.error('更新点击统计失败:', error);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">请先登录</h1>
          <p className="text-muted-foreground mb-6">登录后即可查看精选推荐内容</p>
          <Link href="/auth/signin">
            <Button>立即登录</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 页面头部 */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2 text-primary hover:opacity-80">
                <ArrowLeft className="h-4 w-4" />
                <span>返回首页</span>
              </Link>
              <div className="h-6 w-px bg-border"></div>
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <h1 className="text-xl font-semibold">精选推荐</h1>
                {featuredContents && (
                  <Badge variant="secondary" className="text-xs">
                    {featuredContents.length} 个内容
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {isPending ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-0">
                  <div className="h-48 bg-muted"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                    <div className="flex space-x-2">
                      <div className="h-6 bg-muted rounded w-16"></div>
                      <div className="h-6 bg-muted rounded w-20"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : featuredContents && featuredContents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredContents.map((item) => (
              <Card
                key={item.id}
                className="overflow-hidden hover:shadow-lg transition-all duration-200 group cursor-pointer"
                onClick={() => {
                  handleClick(item.id, 'click');
                  if (item.content) {
                    window.location.href = `/posts/${item.content.id}`;
                  }
                }}
              >
                <CardContent className="p-0">
                  {/* 封面图片 */}
                  <div className="relative h-48 overflow-hidden">
                    {item.coverImage ? (
                      <Image
                        src={item.coverImage}
                        alt={item.title || "精选内容"}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        onLoad={() => handleClick(item.id, 'view')}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
                        <Star className="h-12 w-12 text-white opacity-80" />
                      </div>
                    )}
                    
                    {/* 渐变遮罩 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    
                    {/* 内容类型标签 */}
                    <div className="absolute top-3 left-3">
                      <Badge
                        variant="secondary"
                        className="bg-white/20 backdrop-blur-sm text-white border-white/30"
                      >
                        {item.contentType === 'POST' ? '✨ 精选作品' :
                         item.contentType === 'ANNOUNCEMENT' ? '📢 重要公告' : '📚 教程指南'}
                      </Badge>
                    </div>
                    
                    {/* 统计信息 */}
                    <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                      <div className="flex items-center space-x-1 text-white/90 bg-black/20 backdrop-blur-sm rounded-full px-2 py-1 text-xs">
                        <Eye className="h-3 w-3" />
                        <span>{item.viewCount}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 内容信息 */}
                  <div className="p-4 space-y-3">
                    <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    
                    {item.description && (
                      <p className="text-muted-foreground text-sm line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(item.createdAt).toLocaleDateString('zh-CN')}</span>
                      </div>
                      
                      {item.content?.author && (
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>{item.content.author.displayName || item.content.author.username}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Star className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">暂无精选内容</h2>
            <p className="text-muted-foreground">管理员还没有添加精选推荐内容</p>
          </div>
        )}
      </div>
    </div>
  );
}
