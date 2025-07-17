/**
 * @fileoverview 评论统计概览组件
 * @description 显示全局统计数据和筛选器
 */

"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageCircle,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  Filter,
} from "lucide-react";
import { USER_LEVEL_OPTIONS } from "@/lib/constants/user-levels";
import type { GlobalStats } from "../types";

interface StatisticsOverviewProps {
  globalStats?: GlobalStats;
  isLoadingStats: boolean;
  selectedUserLevel: string;
  onUserLevelChange: (level: string) => void;
  includeGuests: boolean;
  onIncludeGuestsChange: (include: boolean) => void;
}

export function StatisticsOverview({
  globalStats,
  isLoadingStats,
  selectedUserLevel,
  onUserLevelChange,
  includeGuests,
  onIncludeGuestsChange,
}: StatisticsOverviewProps) {
  const statsCards = [
    {
      title: "总评论",
      value: globalStats?.totalComments || 0,
      icon: MessageCircle,
      color: "text-blue-500",
      textColor: "text-blue-600",
    },
    {
      title: "待审核",
      value: globalStats?.pendingComments || 0,
      icon: Clock,
      color: "text-yellow-500",
      textColor: "text-yellow-600",
    },
    {
      title: "已通过",
      value: globalStats?.approvedComments || 0,
      icon: CheckCircle,
      color: "text-green-500",
      textColor: "text-green-600",
    },
    {
      title: "已拒绝",
      value: globalStats?.rejectedComments || 0,
      icon: XCircle,
      color: "text-red-500",
      textColor: "text-red-600",
    },
    {
      title: "游客评论",
      value: globalStats?.guestComments || 0,
      icon: Eye,
      color: "text-gray-500",
      textColor: "text-gray-600",
    },
    {
      title: "今日评论",
      value: globalStats?.todayComments || 0,
      icon: Calendar,
      color: "text-purple-500",
      textColor: "text-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 全局统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statsCards.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <IconComponent className={`h-4 w-4 ${stat.color}`} />
                  <div>
                    <p className="text-sm text-gray-600">{stat.title}</p>
                    <p className={`text-2xl font-bold ${stat.textColor}`}>
                      {isLoadingStats ? "..." : stat.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 用户组筛选器 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            筛选设置
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">用户组:</label>
              <Select value={selectedUserLevel} onValueChange={onUserLevelChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全部</SelectItem>
                  <SelectItem value="GUEST">游客</SelectItem>
                  {USER_LEVEL_OPTIONS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="includeGuests"
                checked={includeGuests}
                onCheckedChange={(checked) => onIncludeGuestsChange(checked as boolean)}
              />
              <label htmlFor="includeGuests" className="text-sm">
                包含游客评论
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
