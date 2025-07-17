/**
 * @fileoverview 置顶的导航组件
 * @description 在用户滚动时显示的置顶导航，包含精选推荐和近期发布
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - react: ^18.0.0
 * - next: ^14.0.0
 * - lucide-react: ^0.263.1
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { useState, useEffect } from "react";
import { Star, Clock, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StickyNavigationProps {
  featuredCount?: number;
  recentCount?: number;
  trendingCount?: number;
  className?: string;
}

export function StickyNavigation({ featuredCount = 0, recentCount = 0, trendingCount = 0, className }: StickyNavigationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // 当滚动超过 200px 时显示置顶导航（降低阈值）
      const scrollY = window.scrollY;
      setIsVisible(scrollY > 200);
    };

    // 临时：强制显示导航进行测试
    // setIsVisible(true);

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 滚动到指定区域
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offsetTop = element.offsetTop - 80; // 减去导航栏高度
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm transition-all duration-300 rounded-b-xl",
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0",
        className
      )}
    >
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          {/* 移动端：紧凑布局，只显示图标和简短文字 */}
          <div className="flex items-center space-x-1 sm:space-x-4 w-full sm:w-auto">
            {/* 精选推荐按钮 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => scrollToSection('featured-section')}
              className="flex items-center space-x-1 hover:bg-yellow-50 hover:text-yellow-700 transition-colors flex-1 sm:flex-none justify-center sm:justify-start px-2 sm:px-3 py-1 h-8"
            >
              <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
              <span className="font-medium text-xs">精选</span>
              {featuredCount > 0 && (
                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700 hidden sm:inline-flex ml-1">
                  {featuredCount}
                </Badge>
              )}
            </Button>

            {/* 热门推荐按钮 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => scrollToSection('trending-posts-section')}
              className="flex items-center space-x-1 hover:bg-red-50 hover:text-red-700 transition-colors flex-1 sm:flex-none justify-center sm:justify-start px-2 sm:px-3 py-1 h-8"
            >
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
              <span className="font-medium text-xs">热门</span>
              {trendingCount > 0 && (
                <Badge variant="secondary" className="text-xs bg-red-100 text-red-700 hidden sm:inline-flex ml-1">
                  {trendingCount}
                </Badge>
              )}
            </Button>

            {/* 近期发布按钮 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => scrollToSection('recent-posts-section')}
              className="flex items-center space-x-1 hover:bg-blue-50 hover:text-blue-700 transition-colors flex-1 sm:flex-none justify-center sm:justify-start px-2 sm:px-3 py-1 h-8"
            >
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
              <span className="font-medium text-xs">近期</span>
              {recentCount > 0 && (
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 hidden sm:inline-flex ml-1">
                  {recentCount}
                </Badge>
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground hidden sm:block">
            快速跳转
          </div>
        </div>
      </div>
    </div>
  );
}
