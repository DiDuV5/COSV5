/**
 * @fileoverview 首页组件
 * @description Cosplay Platform 的首页 - 内容信息流
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - next: ^14.0.0
 * - react: ^18.0.0
 * - next-auth: ^4.24.0
 * - @trpc/react-query: ^10.45.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2024-01-XX: 改造为内容信息流首页
 */

"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeaturedSection } from "@/components/home/featured-section";
import { StickyNavigation } from "@/components/home/sticky-featured-header";
import { RecentPostsSection } from "@/components/home/recent-posts-section";
import { TrendingPostsSection } from "@/components/home/trending-posts-section";
import { api } from "@/trpc/react";

export default function HomePage() {
  const { data: session, status } = useSession();

  // 调试信息
  console.log('HomePage - Session status:', status);
  console.log('HomePage - Session data:', session);

  // 获取精选内容数量用于置顶导航
  const { data: featuredContents } = api.recommendation.getFeatured.useQuery({
    limit: 20,
    includeInactive: false,
  });

  // 获取近期发布数量用于置顶导航
  const { data: recentPosts } = api.recommendation.getRecent.useQuery({
    limit: 8,
    contentType: "POST",
  });

  // 获取热门推荐数量用于置顶导航
  const { data: trendingPosts } = api.recommendation.getTrending.useQuery({
    limit: 8,
    period: "week",
    contentType: "POST",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* 置顶的导航 */}
      {session && (
        <StickyNavigation
          featuredCount={featuredContents?.length || 0}
          recentCount={recentPosts?.posts?.length || 0}
          trendingCount={trendingPosts?.length || 0}
        />
      )}

      <div className="container mx-auto px-4 py-8">
        {/* 游客重定向到欢迎页面 */}
        {!session && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-4">欢迎来到兔图社区</h1>
                <p className="text-gray-600 mb-8">
                  请登录以查看社区内容，或者访问我们的欢迎页面了解更多
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/signin">
                  <Button size="lg" className="w-full sm:w-auto">
                    登录查看内容
                  </Button>
                </Link>
                <Link href="/welcome">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    <Compass className="h-4 w-4 mr-2" />
                    了解平台
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}



        {/* 登录用户内容 */}
        {session && (
          <div className="max-w-6xl mx-auto space-y-12">
            {/* 精选推荐区域 */}
            <FeaturedSection />

            {/* 热门推荐区域 */}
            <TrendingPostsSection />

            {/* 近期发布区域 */}
            <RecentPostsSection />
          </div>
        )}



      </div>
    </div>
  );
}
