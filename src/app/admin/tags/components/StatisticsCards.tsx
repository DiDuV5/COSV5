/**
 * @fileoverview 标签统计卡片组件
 * @description 显示标签相关的统计信息
 */

"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TagIcon,
  Calendar,
  TrendingUp,
  Hash,
} from "lucide-react";
import type { StatisticsCardsProps } from "../types";
import { formatNumber } from "../utils";

export function StatisticsCards({ statsData, isPending }: StatisticsCardsProps) {
  if (isPending) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-8 w-12" />
                </div>
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!statsData) {
    return null;
  }

  const cards = [
    {
      title: "总标签数",
      value: statsData.totalTags,
      icon: TagIcon,
      color: "text-blue-500",
    },
    {
      title: "本月帖子",
      value: statsData.totalPosts,
      icon: Calendar,
      color: "text-green-500",
    },
    {
      title: "热门标签",
      value: statsData.topTags[0]?.name || '-',
      icon: TrendingUp,
      color: "text-orange-500",
      isText: true,
    },
    {
      title: "最高使用",
      value: formatNumber(statsData.topTags[0]?.count || 0),
      icon: Hash,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold">
                  {card.isText ? card.value : formatNumber(Number(card.value))}
                </p>
              </div>
              <card.icon className={`w-8 h-8 ${card.color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
