/**
 * @component CansSystemCard
 * @description 罐头系统卡片组件，包含罐头数量、签到状态、每日任务等功能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * 
 * @changelog
 * - 2024-01-XX: 从dashboard-client.tsx提取罐头系统逻辑
 */

"use client";

import Link from "next/link";
import { Coins, Trophy, Calendar, Gift } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CansSystemCardProps } from "../types/dashboard-types";

export function CansSystemCard({ 
  cansAccount, 
  checkinStatus, 
  availableTasksCount, 
  canCheckin, 
  onCheckin, 
  isChecking 
}: CansSystemCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-yellow-600" />
          罐头系统
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 移动端紧凑布局 */}
        <div className="block md:hidden">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* 罐头数量 */}
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Coins className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                  {cansAccount?.availableCans || 0}
                </div>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                罐头数量
              </div>
            </div>

            {/* 每日任务 */}
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {availableTasksCount}
                </div>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                每日任务
              </div>
            </div>
          </div>

          {/* 签到状态 */}
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg mb-4">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {checkinStatus?.hasCheckedInToday ? '已签到' : '未签到'}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              连续{checkinStatus?.consecutiveCheckins || 0}天
            </div>
          </div>
        </div>

        {/* 桌面端布局 */}
        <div className="hidden md:block">
          {/* 罐头数量显示 */}
          <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Coins className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {cansAccount?.availableCans || 0}
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              罐头数量
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 签到状态 */}
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {checkinStatus?.hasCheckedInToday ? '已签到' : '未签到'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                连续{checkinStatus?.consecutiveCheckins || 0}天
              </div>
            </div>

            {/* 每日任务 */}
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {availableTasksCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                每日任务
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {canCheckin ? (
            <Button
              onClick={onCheckin}
              disabled={isChecking}
              className="flex-1"
              variant="default"
            >
              <Gift className="h-4 w-4 mr-2" />
              {isChecking ? "签到中..." : "立即签到"}
            </Button>
          ) : (
            <Link href="/cans/checkin" className="flex-1">
              <Button variant="outline" className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                查看签到
              </Button>
            </Link>
          )}
          <Link href="/cans" className="flex-1">
            <Button variant="outline" className="w-full">
              <Trophy className="h-4 w-4 mr-2" />
              罐头中心
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
