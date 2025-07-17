/**
 * @fileoverview 精选内容统计卡片组件
 * @description 显示精选内容的统计信息
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FeaturedItem {
  id: string;
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
  viewCount: number;
  clickCount: number;
}

interface FeaturedStatsCardsProps {
  featuredContents: FeaturedItem[] | undefined;
}

export function FeaturedStatsCards({ featuredContents }: FeaturedStatsCardsProps) {
  const totalCount = featuredContents?.length || 0;
  
  const activeCount = featuredContents?.filter(item => {
    const now = new Date();
    return item.isActive && 
           (!item.startDate || new Date(item.startDate) <= now) &&
           (!item.endDate || new Date(item.endDate) >= now);
  }).length || 0;
  
  const totalViews = featuredContents?.reduce((sum, item) => sum + item.viewCount, 0) || 0;
  const totalClicks = featuredContents?.reduce((sum, item) => sum + item.clickCount, 0) || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">总数</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCount}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">进行中</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{activeCount}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">总浏览量</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalViews}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">总点击量</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalClicks}</div>
        </CardContent>
      </Card>
    </div>
  );
}
