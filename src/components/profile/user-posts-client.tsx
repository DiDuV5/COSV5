/**
 * @component UserPostsClient
 * @description 用户作品列表客户端组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - user: object - 用户信息对象
 *
 * @example
 * <UserPostsClient user={user} />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - tRPC
 * - shadcn/ui components
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";
import { Search, Grid, List, ArrowLeft, Heart, MessageCircle, Eye, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface User {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  postsCount?: number; // 使用 postsCount 字段而不是 _count
  _count?: {
    posts: number;
  };
}

interface UserPostsClientProps {
  user: User;
}

export function UserPostsClient({ user }: UserPostsClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // 获取用户作品列表
  const { data: posts, isPending } = api.post.getUserPosts.useQuery({
    userId: user.id,
    sort: sortBy as "latest" | "popular" | "oldest",
  });

  // 过滤搜索结果
  const filteredPosts = posts?.posts?.filter((post: any) =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.tags?.some((tag: any) => tag.name.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  if (isPending) {
    return (
      <div className="space-y-6">
        {/* 加载骨架屏 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <div className="aspect-square bg-gray-200 animate-pulse" />
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 返回按钮和控制栏 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>

        <div className="flex items-center gap-2">
          {/* 视图模式切换 */}
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 搜索和排序 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="搜索作品标题、内容或标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">最新发布</SelectItem>
            <SelectItem value="popular">最受欢迎</SelectItem>
            <SelectItem value="oldest">最早发布</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 统计信息 */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>
          共 {posts?.posts?.length || 0} 个作品
          {searchQuery && ` (筛选出 ${filteredPosts.length} 个)`}
        </span>
      </div>

      {/* 作品列表 */}
      {filteredPosts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">🎭</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? "没有找到匹配的作品" : "还没有发布作品"}
            </h3>
            <p className="text-gray-600">
              {searchQuery 
                ? "尝试使用不同的关键词搜索" 
                : `${user.displayName || user.username} 还没有发布任何作品`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={
          viewMode === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
        }>
          {filteredPosts.map((post) => (
            <Card key={post.id} className="group hover:shadow-lg transition-all duration-200">
              {viewMode === "grid" ? (
                // 网格视图
                <>
                  <div className="relative aspect-square overflow-hidden">
                    {post.images && post.images.length > 0 ? (
                      <Link href={`/posts/${post.id}`}>
                        <Image
                          src={Array.isArray(post.images) && post.images.length > 0 ?
                            (typeof post.images[0] === 'string' ? post.images[0] : (post.images[0] as any)?.url || "/placeholder.jpg") :
                            "/placeholder.jpg"}
                          alt={post.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        {post.images && post.images.length > 1 && (
                          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            +{post.images.length - 1}
                          </div>
                        )}
                      </Link>
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400 text-4xl">🎭</span>
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-4">
                    <Link href={`/posts/${post.id}`} className="block hover:underline">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-2 mb-2">
                        {post.title}
                      </h3>
                    </Link>
                    
                    {post.tags && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(() => {
                          try {
                            const tags = typeof post.tags === 'string' ? JSON.parse(post.tags) : post.tags;
                            if (Array.isArray(tags)) {
                              return tags.slice(0, 3).map((tag: any, index: number) => (
                                <Badge key={typeof tag === 'string' ? tag : tag.id || index} variant="secondary" className="text-xs">
                                  #{typeof tag === 'string' ? tag : tag.name}
                                </Badge>
                              ));
                            }
                          } catch {
                            // 忽略解析错误
                          }
                          return [];
                        })()}
                        {(() => {
                          try {
                            const tags = typeof post.tags === 'string' ? JSON.parse(post.tags) : post.tags;
                            if (Array.isArray(tags) && tags.length > 3) {
                              return (
                                <Badge variant="outline" className="text-xs">
                                  +{tags.length - 3}
                                </Badge>
                              );
                            }
                          } catch {
                            // 忽略解析错误
                          }
                          return null;
                        })()}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {post.likeCount || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {post.commentCount || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {post.viewCount}
                        </span>
                      </div>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(post.createdAt), { 
                          addSuffix: true, 
                          locale: zhCN 
                        })}
                      </span>
                    </div>
                  </CardContent>
                </>
              ) : (
                // 列表视图
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {post.images && post.images.length > 0 && (
                      <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden rounded">
                        <Link href={`/posts/${post.id}`}>
                          <Image
                            src={Array.isArray(post.images) && post.images.length > 0 ?
                              (typeof post.images[0] === 'string' ? post.images[0] : (post.images[0] as any)?.url || "/placeholder.jpg") :
                              "/placeholder.jpg"}
                            alt={post.title}
                            fill
                            className="object-cover"
                          />
                        </Link>
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <Link href={`/posts/${post.id}`} className="block hover:underline">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1 mb-1">
                          {post.title}
                        </h3>
                      </Link>
                      
                      {post.content && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {post.content}
                        </p>
                      )}
                      
                      {post.tags && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {(() => {
                            try {
                              const tags = typeof post.tags === 'string' ? JSON.parse(post.tags) : post.tags;
                              if (Array.isArray(tags)) {
                                return tags.slice(0, 5).map((tag: any, index: number) => (
                                  <Badge key={typeof tag === 'string' ? tag : tag.id || index} variant="secondary" className="text-xs">
                                    #{typeof tag === 'string' ? tag : tag.name}
                                  </Badge>
                                ));
                              }
                            } catch {
                              // 忽略解析错误
                            }
                            return [];
                          })()}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {post.likeCount || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {post.commentCount || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {post.viewCount}
                          </span>
                        </div>
                        <span>
                          {formatDistanceToNow(new Date(post.createdAt), { 
                            addSuffix: true, 
                            locale: zhCN 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
