/**
 * @fileoverview 热门页面
 * @description 展示热门内容、趋势分析等
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
import { TrendingUp, Clock, Calendar, Award, Eye, Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MainNav } from "@/components/layout/main-nav";
import { api } from "@/trpc/react";

type TrendingPeriod = "today" | "week" | "month" | "all";

export default function TrendingPage() {
  const [period, setPeriod] = useState<TrendingPeriod>("today");

  // 获取热门内容
  const { data: trendingPosts, isPending } = api.post.getTrending.useQuery({
    period,
    limit: 20,
  });

  // 获取热门统计
  const { data: trendingStats } = api.post.getTrendingStats.useQuery({
    period,
  });

  const periodLabels = {
    today: "今日",
    week: "本周",
    month: "本月",
    all: "全部",
  };

  const periodIcons = {
    today: Clock,
    week: Calendar,
    month: Calendar,
    all: Award,
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      
      <div className="container mx-auto px-4 py-8">
        {/* 页面头部 */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">热门内容</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            发现最受欢迎的内容和创作者
          </p>
        </div>

        {/* 时间段选择 */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(periodLabels) as TrendingPeriod[]).map((p) => {
              const Icon = periodIcons[p];
              return (
                <Button
                  key={p}
                  variant={period === p ? "default" : "outline"}
                  onClick={() => setPeriod(p)}
                  className="flex items-center space-x-2"
                >
                  <Icon className="h-4 w-4" />
                  <span>{periodLabels[p]}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* 统计信息 */}
        {trendingStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Eye className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">总浏览量</p>
                    <p className="text-2xl font-bold">{trendingStats.totalViews?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">总点赞数</p>
                    <p className="text-2xl font-bold">{trendingStats.totalLikes?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">总评论数</p>
                    <p className="text-2xl font-bold">{trendingStats.totalComments?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">热门内容</p>
                    <p className="text-2xl font-bold">{trendingStats.totalPosts?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 热门内容列表 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {periodLabels[period]}热门内容
            </h2>
            <Badge variant="secondary">
              {trendingPosts?.length || 0} 个内容
            </Badge>
          </div>

          {isPending ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex space-x-4">
                      <div className="w-24 h-16 bg-muted rounded"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                        <div className="h-3 bg-muted rounded w-1/4"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : trendingPosts && trendingPosts.length > 0 ? (
            <div className="space-y-4">
              {trendingPosts.map((post, index) => (
                <Card key={post.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex space-x-4">
                      {/* 排名 */}
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index < 3 
                            ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white" 
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {index + 1}
                        </div>
                      </div>

                      {/* 缩略图 */}
                      {post.media && post.media.length > 0 && (
                        <div className="relative flex-shrink-0 w-24 h-16">
                          <Image
                            src={post.media[0].url}
                            alt={post.title}
                            fill
                            className="object-cover rounded-md"
                          />
                        </div>
                      )}

                      {/* 内容信息 */}
                      <div className="flex-1 min-w-0">
                        <Link href={`/posts/${post.id}`}>
                          <h3 className="font-semibold text-lg line-clamp-1 hover:text-primary transition-colors">
                            {post.title}
                          </h3>
                        </Link>
                        
                        <div className="flex items-center space-x-2 mt-1 text-sm text-muted-foreground">
                          <Link 
                            href={`/users/${post.author.username}`}
                            className="hover:text-primary transition-colors"
                          >
                            @{post.author.username}
                          </Link>
                          <span>•</span>
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <Badge variant="outline" className="text-xs">
                            {post.contentType === "POST" ? "作品" : "动态"}
                          </Badge>
                        </div>

                        <p className="text-muted-foreground mt-2 line-clamp-2">
                          {post.content}
                        </p>

                        {/* 互动数据 */}
                        <div className="flex items-center space-x-6 mt-3 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Eye className="h-4 w-4" />
                            <span>{post.viewCount?.toLocaleString() || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Heart className="h-4 w-4" />
                            <span>{post._count.likes}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageCircle className="h-4 w-4" />
                            <span>{post._count.comments}</span>
                          </div>
                        </div>
                      </div>

                      {/* 热度分数 */}
                      <div className="flex-shrink-0 text-right">
                        <div className="text-sm text-muted-foreground">热度</div>
                        <div className="text-lg font-bold text-primary">
                          {post.trendingScore || 0}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">暂无热门内容</h3>
              <p className="text-muted-foreground">
                {periodLabels[period]}还没有热门内容，快去创作吧！
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
