/**
 * @component DashboardClient
 * @description 个人中心客户端组件 - 重构版本
 * @author Augment AI
 * @date 2024-01-XX
 * @version 2.0.0
 *
 * @example
 * <DashboardClient />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - tRPC
 * - shadcn/ui components
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2024-01-XX: 重构为模块化组件架构 (v2.0.0)
 */

"use client";

import { useSession } from "next-auth/react";
import { PersonalProfileCard } from "./components/PersonalProfileCard";
import { CansSystemCard } from "./components/CansSystemCard";
import { StatsOverview } from "./components/StatsOverview";
import { QuickActions } from "./components/QuickActions";
import { useDashboardData } from "./hooks/use-dashboard-data";

export function DashboardClient() {
  const { data: session } = useSession();

  // 使用自定义Hook获取所有数据和操作方法
  const {
    userStats,
    socialLinks,
    cansAccount,
    checkinStatus,
    availableTasksCount,
    canCheckin,
    handleCheckin,
    isChecking,
    isPending
  } = useDashboardData();

  if (!session) {
    return null;
  }

  if (isPending) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const user = session.user;

  return (
    <div className="space-y-6">
      {/* 个人资料卡片 */}
      <PersonalProfileCard
        user={user}
        userStats={userStats}
        socialLinks={socialLinks}
      />

      {/* 罐头系统卡片 */}
      <CansSystemCard
        cansAccount={cansAccount}
        checkinStatus={checkinStatus}
        availableTasksCount={availableTasksCount}
        canCheckin={canCheckin}
        onCheckin={handleCheckin}
        isChecking={isChecking}
      />

      {/* 统计概览 */}
      <StatsOverview userStats={userStats} />

      {/* 快捷操作 */}
      <QuickActions />
    </div>
  );
}
