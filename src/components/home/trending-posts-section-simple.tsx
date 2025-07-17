/**
 * @fileoverview 简化版热门推荐组件 - 用于测试
 * @description 简化版本，确保标题能正确显示
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

"use client";

import Link from "next/link";
import { TrendingUp, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TrendingPostsSectionSimpleProps {
  className?: string;
}

export function TrendingPostsSectionSimple({ className }: TrendingPostsSectionSimpleProps) {
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

  return (
    <div id="trending-posts-section" className={cn("space-y-4", className)}>
      {renderTitle()}
      
      <Card className="h-64">
        <CardContent className="p-6 h-full flex items-center justify-center">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">简化版测试</h3>
            <p className="text-sm text-muted-foreground">
              这是简化版的热门推荐组件，用于测试标题显示
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
