/**
 * @component StatsOverview
 * @description 统计概览组件，展示动态数量和作品数量
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * 
 * @changelog
 * - 2024-01-XX: 从dashboard-client.tsx提取统计概览逻辑
 */

"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MessageCircle, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { StatsOverviewProps } from "../types/dashboard-types";

export function StatsOverview({ userStats }: StatsOverviewProps) {
  const router = useRouter();
  const { data: session } = useSession();

  // 处理统计卡片点击
  const handleStatsClick = (type: 'moments' | 'posts') => {
    if (!session?.user?.username) return;

    if (type === 'moments') {
      router.push(`/users/${session.user.username}/moments`);
    } else if (type === 'posts') {
      router.push(`/users/${session.user.username}/posts`);
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
      {/* 动态数量 */}
      <Card
        className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:-translate-y-1"
        onClick={() => handleStatsClick('moments')}
        title="查看我的动态"
      >
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center gap-3 md:flex-col md:text-center">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageCircle className="h-5 w-5 md:h-6 md:w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 md:flex-none">
              <div className="text-xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">
                {userStats?.momentsCount || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                动态数量
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 作品数量 */}
      <Card
        className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:-translate-y-1"
        onClick={() => handleStatsClick('posts')}
        title="查看我的作品"
      >
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center gap-3 md:flex-col md:text-center">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="h-5 w-5 md:h-6 md:w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 md:flex-none">
              <div className="text-xl md:text-3xl font-bold text-green-600 dark:text-green-400">
                {userStats?.postsCount || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                作品数量
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
