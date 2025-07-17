/**
 * @component QuickActions
 * @description 快捷操作组件，包含分享、互动管理、账号设置、帮助支持等功能入口
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * 
 * @changelog
 * - 2024-01-XX: 从dashboard-client.tsx提取快捷操作逻辑
 */

"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QuickActionsProps } from "../types/dashboard-types";

export function QuickActions({}: QuickActionsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 分享 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            ✨ 分享
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link href="/create?type=moment">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="text-lg">💭</span>
                <span className="text-sm font-medium">发布动态</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
          </Link>
          <Link href="/create?type=post">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="text-lg">📸</span>
                <span className="text-sm font-medium">发布作品</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
          </Link>
        </CardContent>
      </Card>

      {/* 互动管理 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            💬 互动管理
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link href="/interact">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="text-lg">📝</span>
                <span className="text-sm font-medium">互动记录</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
          </Link>
          <Link href="/notifications">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="text-lg">🔔</span>
                <span className="text-sm font-medium">消息通知</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
          </Link>
        </CardContent>
      </Card>

      {/* 账号设置 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            ⚙️ 账号设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link href="/settings">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="text-lg">⚙️</span>
                <span className="text-sm font-medium">账号设置</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
          </Link>
          <Link href="/settings/privacy">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="text-lg">🔒</span>
                <span className="text-sm font-medium">隐私设置</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
          </Link>
        </CardContent>
      </Card>

      {/* 帮助支持 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            🆘 帮助支持
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link href="/help">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="text-lg">❓</span>
                <span className="text-sm font-medium">帮助反馈</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
          </Link>
          <Link href="/contact">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="text-lg">📞</span>
                <span className="text-sm font-medium">联系运营</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
