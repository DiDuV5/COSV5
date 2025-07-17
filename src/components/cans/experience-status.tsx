/**
 * @component ExperienceStatus
 * @description 用户经验值状态显示组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - showDetails: boolean - 是否显示详细信息
 * - compact: boolean - 是否使用紧凑模式
 *
 * @example
 * <ExperienceStatus showDetails={true} compact={false} />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - tRPC
 * - shadcn/ui
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Brain,
  Zap,
  Clock,
  TrendingUp,
  Info,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { formatDateTime, getHoursUntilReset } from "@/lib/utils";

interface ExperienceStatusProps {
  showDetails?: boolean;
  compact?: boolean;
}

export default function ExperienceStatus({ 
  showDetails = true, 
  compact = false 
}: ExperienceStatusProps) {
  // 获取用户经验值状态
  const { data: experienceStatus, isPending } = {
    data: {
      dailyExperienceEarned: 0,
      dailyExperienceLimit: 100,
      remainingExperience: 100,
      canEarnMore: true,
      lastExperienceReset: new Date()
    },
    isPending: false
  };

  if (isPending) {
    return (
      <Card className={compact ? "p-3" : ""}>
        <CardContent className={compact ? "p-0" : ""}>
          <div className="flex items-center space-x-2">
            <Brain className="h-4 w-4 animate-pulse text-muted-foreground" />
            <span className="text-sm text-muted-foreground">加载经验值状态...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!experienceStatus) {
    return null;
  }

  const progressPercentage = experienceStatus.dailyExperienceLimit > 0 
    ? (experienceStatus.dailyExperienceEarned / experienceStatus.dailyExperienceLimit) * 100 
    : 0;

  const hoursUntilReset = getHoursUntilReset();

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center space-x-2 p-2 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border">
              <Brain className="h-4 w-4 text-purple-500" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">
                    {experienceStatus.dailyExperienceEarned}/{experienceStatus.dailyExperienceLimit}
                  </span>
                  <Badge 
                    variant={experienceStatus.canEarnMore ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {experienceStatus.canEarnMore ? "可获得" : "已达上限"}
                  </Badge>
                </div>
                <Progress 
                  value={progressPercentage} 
                  className="h-1 mt-1"
                />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1 text-xs">
              <div>今日经验值: {experienceStatus.dailyExperienceEarned}/{experienceStatus.dailyExperienceLimit}</div>
              <div>剩余可获得: {experienceStatus.remainingExperience}</div>
              <div>距离重置: {hoursUntilReset}小时</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Brain className="h-5 w-5 text-purple-500" />
          <span>经验值状态</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1 text-xs max-w-xs">
                  <div>经验值通过完成任务、签到等活动获得</div>
                  <div>每日0点自动重置，重新开始计算</div>
                  <div>不同用户等级有不同的每日上限</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        {showDetails && (
          <CardDescription>
            今日经验值获得进度和状态信息
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 进度条 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">今日进度</span>
            <span className="font-medium">
              {experienceStatus.dailyExperienceEarned} / {experienceStatus.dailyExperienceLimit}
            </span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-2"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>{progressPercentage.toFixed(1)}%</span>
            <span>{experienceStatus.dailyExperienceLimit}</span>
          </div>
        </div>

        {showDetails && (
          <>
            <Separator />

            {/* 详细信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-1">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">剩余可获得</span>
                </div>
                <div className="text-lg font-semibold text-green-600">
                  {experienceStatus.remainingExperience}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3 text-blue-500" />
                  <span className="text-xs text-muted-foreground">距离重置</span>
                </div>
                <div className="text-lg font-semibold text-blue-600">
                  {hoursUntilReset}小时
                </div>
              </div>
            </div>

            <Separator />

            {/* 状态标识 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {experienceStatus.canEarnMore ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                )}
                <span className="text-sm">
                  {experienceStatus.canEarnMore 
                    ? "可继续获得经验值" 
                    : "今日已达获得上限"
                  }
                </span>
              </div>
              
              <Badge 
                variant={experienceStatus.canEarnMore ? "default" : "secondary"}
              >
                {experienceStatus.canEarnMore ? "活跃中" : "已达上限"}
              </Badge>
            </div>

            {/* 上次重置时间 */}
            <div className="text-xs text-muted-foreground">
              上次重置: {formatDateTime(experienceStatus.lastExperienceReset)}
            </div>
          </>
        )}

        {/* 提示信息 */}
        {!experienceStatus.canEarnMore && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
              <div className="text-sm text-orange-700">
                <div className="font-medium">今日经验值已达上限</div>
                <div className="text-xs mt-1">
                  明天0点重置后可继续获得经验值，或者完成其他活动获得罐头奖励
                </div>
              </div>
            </div>
          </div>
        )}

        {experienceStatus.canEarnMore && experienceStatus.remainingExperience <= 10 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <TrendingUp className="h-4 w-4 text-yellow-500 mt-0.5" />
              <div className="text-sm text-yellow-700">
                <div className="font-medium">即将达到每日上限</div>
                <div className="text-xs mt-1">
                  还可获得 {experienceStatus.remainingExperience} 点经验值，抓紧时间完成任务吧！
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
