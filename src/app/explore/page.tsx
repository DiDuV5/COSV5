/**
 * @fileoverview 发现页面
 * @description 内容发现页面，展示推荐内容、热门标签等
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

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Compass, TrendingUp, Hash, Users, Star, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MainNav } from "@/components/layout/main-nav";
import { api } from "@/trpc/react";

type ExploreTab = "recommended" | "trending" | "tags" | "users";

// 简单的Tag类型定义
interface Tag {
  name: string;
  count?: number;
  [key: string]: any;
}

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState<ExploreTab>("recommended");

  // 获取推荐内容
  const { data: recommendedPosts, isPending: isLoadingRecommended } = api.post.getRecommended.useQuery(
    { limit: 12 },
    { enabled: activeTab === "recommended" }
  );

  // 获取热门内容
  const { data: trendingPosts, isPending: isLoadingTrending } = api.post.getTrending.useQuery(
    { limit: 12 },
    { enabled: activeTab === "trending" }
  );

  // 获取热门标签
  const { data: popularTags, isPending: isLoadingTags } = api.tag.getPopular.useQuery(
    { limit: 20 },
    { enabled: activeTab === "tags" }
  );

  // 获取推荐用户
  const { data: recommendedUsers, isPending: isLoadingUsers } = api.user.getRecommended.useQuery(
    { limit: 12 },
    { enabled: activeTab === "users" }
  );

  return (
    <div className="min-h-screen bg-background">
      <MainNav />

      <div className="container mx-auto px-4 py-8">
        {/* 页面头部 */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Compass className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">发现</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            探索精彩内容，发现有趣的创作者和热门话题
          </p>
        </div>

        {/* 发现标签页 */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ExploreTab)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="recommended" className="flex items-center space-x-2">
              <Star className="h-4 w-4" />
              <span>推荐</span>
            </TabsTrigger>
            <TabsTrigger value="trending" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>热门</span>
            </TabsTrigger>
            <TabsTrigger value="tags" className="flex items-center space-x-2">
              <Hash className="h-4 w-4" />
              <span>标签</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>用户</span>
            </TabsTrigger>
          </TabsList>

          {/* 推荐内容 */}
          <TabsContent value="recommended" className="mt-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">为你推荐</h2>
              <p className="text-muted-foreground">基于你的兴趣和互动历史推荐的内容</p>
            </div>

            {isLoadingRecommended ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-48 bg-muted rounded-t-lg"></div>
                    <CardHeader>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : recommendedPosts && recommendedPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendedPosts.map((post) => (
                  <Card key={post.id} className="group hover:shadow-lg transition-all duration-200">
                    <Link href={`/posts/${post.id}`}>
                      {post.media && post.media.length > 0 && (
                        <div className="relative overflow-hidden rounded-t-lg h-48">
                          <Image
                            src={post.media[0].url}
                            alt={post.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute top-2 right-2">
                            <Badge variant="secondary" className="bg-black/50 text-white">
                              作品
                            </Badge>
                          </div>
                        </div>
                      )}
                      <CardHeader>
                        <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                          {post.title}
                        </CardTitle>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span>@{post.author.username}</span>
                          <span>•</span>
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center space-x-1">
                              <Eye className="h-4 w-4" />
                              <span>{post.viewCount || 0}</span>
                            </span>
                            <span>{post._count.likes} 点赞</span>
                            <span>{post._count.comments} 评论</span>
                          </div>
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">暂无推荐内容</h3>
                <p className="text-muted-foreground">
                  多与内容互动，我们会为你推荐更精彩的内容
                </p>
              </div>
            )}
          </TabsContent>

          {/* 热门内容 */}
          <TabsContent value="trending" className="mt-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">热门内容</h2>
              <p className="text-muted-foreground">最近最受欢迎的内容</p>
            </div>

            {/* 内容与推荐页面类似，这里简化处理 */}
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">热门内容</h3>
              <p className="text-muted-foreground">
                功能开发中，敬请期待
              </p>
            </div>
          </TabsContent>

          {/* 热门标签 */}
          <TabsContent value="tags" className="mt-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">热门标签</h2>
              <p className="text-muted-foreground">发现热门话题和标签</p>
            </div>

            {isLoadingTags ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(12)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : popularTags && popularTags.popularTags && popularTags.popularTags.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {popularTags.popularTags.map((tag: Tag) => (
                  <Card key={tag.name} className="hover:shadow-md transition-shadow">
                    <Link href={`/tags/${encodeURIComponent(tag.name)}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Hash className="h-4 w-4 text-primary" />
                          <span className="font-medium">{tag.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {tag.usageCount} 次使用
                        </p>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Hash className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">暂无热门标签</h3>
                <p className="text-muted-foreground">
                  开始创作内容，使用标签让更多人发现你的作品
                </p>
              </div>
            )}
          </TabsContent>

          {/* 推荐用户 */}
          <TabsContent value="users" className="mt-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">推荐用户</h2>
              <p className="text-muted-foreground">发现优秀的创作者</p>
            </div>

            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">推荐用户</h3>
              <p className="text-muted-foreground">
                功能开发中，敬请期待
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
