/**
 * @fileoverview Dashboard数据获取Hook
 * @description 管理个人中心所有数据获取和状态管理逻辑 - 重构版本
 * @author Augment AI
 * @date 2024-01-XX
 * @version 2.0.0
 *
 * @changelog
 * - 2024-01-XX: 从dashboard-client.tsx提取数据获取逻辑
 * - 2024-01-XX: 重构为使用统一的useUserData Hook (v2.0.0)
 */

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { useDashboardUserData } from "@/hooks/use-user-data";
import type { DashboardData, DashboardActions } from "../types/dashboard-types";

/**
 * Dashboard数据获取和操作Hook - 重构版本
 * @returns {DashboardData & DashboardActions} Dashboard数据和操作方法
 */
export function useDashboardData(): DashboardData & DashboardActions {
  const { data: session } = useSession();
  const [isChecking, setIsChecking] = useState(false);

  // 使用统一的用户数据Hook
  const {
    userStats,
    socialLinks,
    cansAccount,
    checkinStatus,
    availableTasks,
    isPending,
    refetchCansAccount,
    refetchCheckinStatus,
  } = useDashboardUserData();

  // 执行签到
  const checkinMutation = api.cans.dailyCheckin.useMutation({
    onSuccess: (result) => {
      toast.success(`签到成功！获得 ${result.cansEarned} 个罐头`, {
        description: result.bonusCans > 0 ? `连续签到奖励 +${result.bonusCans}` : `连续签到 ${result.consecutiveDays} 天`,
        duration: 4000,
      });
      refetchCheckinStatus();
      refetchCansAccount();
      setIsChecking(false);
    },
    onError: (error) => {
      toast.error("签到遇到问题", {
        description: error.message,
        duration: 5000,
        action: {
          label: "查看详情",
          onClick: () => {
            window.location.href = '/cans/checkin';
          },
        },
      });
      setIsChecking(false);
    },
  });

  // 处理签到操作
  const handleCheckin = async () => {
    if (!session || isChecking) return;

    // 检查是否已经签到
    if (checkinStatus?.hasCheckedInToday) {
      toast.info("今日已签到", {
        description: "您今天已经完成签到了，明天再来吧！",
      });
      return;
    }

    setIsChecking(true);
    checkinMutation.mutate();
  };

  // 计算派生数据
  const availableTasksCount = availableTasks?.filter((task: any) => task.remaining > 0).length || 0;
  const canCheckin = checkinStatus && !checkinStatus.hasCheckedInToday;

  return {
    // 数据
    userStats,
    socialLinks,
    cansAccount,
    checkinStatus,
    availableTasks,
    availableTasksCount,
    canCheckin: !!canCheckin,
    isPending,
    
    // 操作方法
    handleCheckin,
    refetchCansAccount,
    refetchCheckinStatus,
    isChecking,
  };
}
