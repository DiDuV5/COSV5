/**
 * @fileoverview 罐头系统主页
 * @description 罐头系统概览和快速导航
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/react-query: ^10.45.0
 * - next-auth: ^4.24.5
 * - lucide-react: ^0.294.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { 
  Coins, 
  Calendar, 
  Target, 
  TrendingUp, 
  Gift, 
  Trophy,
  ArrowRight,
  Flame,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { api } from "@/trpc/react";

export default function CansHomePage() {
  const { data: session } = useSession();

  // 获取罐头账户信息
  const { data: cansAccount } = api.cans.getAccount.useQuery(
    undefined,
    { enabled: !!session }
  );

  // 获取签到状态
  const { data: checkinStatus } = api.cans.getCheckinStatus.useQuery(
    undefined,
    { enabled: !!session }
  );

  // 获取可用任务数量
  const { data: availableTasks } = api.cans.getAvailableTasks.useQuery(
    undefined,
    { enabled: !!session }
  );

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Coins className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-4">罐头系统</h1>
          <p className="text-muted-foreground mb-8">
            请登录以查看您的罐头账户和完成任务
          </p>
          <Link href="/auth/signin">
            <Button size="lg">
              立即登录
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const completableTasks = availableTasks?.filter(task => task.completed >= ((task as any).target || task.remaining || 1)).length || 0;
  const totalTasks = availableTasks?.length || 0;
  const canCheckin = checkinStatus && !checkinStatus.hasCheckedInToday;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* 页面标题 */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Coins className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-2">罐头系统</h1>
        <p className="text-muted-foreground">
          通过签到和完成任务获取罐头，兑换平台特权和奖励
        </p>
      </div>

      {/* 账户概览 */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Coins className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{cansAccount?.availableCans || 0}</p>
                <p className="text-sm text-muted-foreground">可用罐头</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{cansAccount?.totalExperience || 0}</p>
                <p className="text-sm text-muted-foreground">总经验</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Flame className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{checkinStatus?.consecutiveCheckins || 0}</p>
                <p className="text-sm text-muted-foreground">连续签到</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{completableTasks}</p>
                <p className="text-sm text-muted-foreground">可完成任务</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 快速操作 */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* 每日签到 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              每日签到
              {canCheckin && <Badge variant="destructive">可签到</Badge>}
            </CardTitle>
            <CardDescription>
              每天签到获取罐头奖励，连续签到还有额外奖励
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">今日状态</span>
              {canCheckin ? (
                <Badge variant="outline">未签到</Badge>
              ) : (
                <Badge variant="secondary">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  已签到
                </Badge>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">连续天数</span>
              <span className="font-medium">{checkinStatus?.consecutiveCheckins || 0} 天</span>
            </div>

            <Link href="/cans/checkin">
              <Button className="w-full" variant={canCheckin ? "default" : "outline"}>
                <Gift className="h-4 w-4 mr-2" />
                {canCheckin ? "立即签到" : "查看签到"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* 任务中心 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              任务中心
              {completableTasks > 0 && (
                <Badge variant="destructive">{completableTasks} 个可完成</Badge>
              )}
            </CardTitle>
            <CardDescription>
              完成各种任务获取罐头和经验奖励
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">可完成任务</span>
              <span className="font-medium">{completableTasks}/{totalTasks}</span>
            </div>
            
            {totalTasks > 0 && (
              <div className="space-y-2">
                <Progress value={(completableTasks / totalTasks) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  任务完成进度
                </p>
              </div>
            )}

            <Link href="/cans/tasks">
              <Button className="w-full" variant={completableTasks > 0 ? "default" : "outline"}>
                <Trophy className="h-4 w-4 mr-2" />
                {completableTasks > 0 ? "完成任务" : "查看任务"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* 每日经验进度 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            今日经验进度
          </CardTitle>
          <CardDescription>
            每日经验获取有上限，合理安排任务完成顺序
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>今日经验</span>
            <span className="font-medium">
              {cansAccount?.dailyExperienceEarned || 0} / {cansAccount?.dailyExperienceLimit || 100}
            </span>
          </div>
          
          <Progress 
            value={((cansAccount?.dailyExperienceEarned || 0) / (cansAccount?.dailyExperienceLimit || 100)) * 100} 
            className="h-3"
          />
          
          <div className="grid grid-cols-3 gap-4 text-sm text-center">
            <div>
              <div className="font-medium text-green-600">
                {cansAccount?.dailyExperienceEarned || 0}
              </div>
              <p className="text-muted-foreground">已获得</p>
            </div>
            <div>
              <div className="font-medium text-blue-600">
                {(cansAccount?.dailyExperienceLimit || 100) - (cansAccount?.dailyExperienceEarned || 0)}
              </div>
              <p className="text-muted-foreground">剩余</p>
            </div>
            <div>
              <div className="font-medium text-purple-600">
                {cansAccount?.dailyExperienceLimit || 100}
              </div>
              <p className="text-muted-foreground">上限</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 系统说明 */}
      <Card>
        <CardHeader>
          <CardTitle>罐头系统说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• 罐头是平台的虚拟货币，可通过签到和完成任务获得</p>
          <p>• 连续签到可获得额外奖励，断签后连续天数重新计算</p>
          <p>• 每日经验获取有上限，超过上限后无法继续获得经验</p>
          <p>• 罐头可用于兑换平台特权、商品或参与特殊活动</p>
          <p>• 经验值用于提升用户等级，解锁更多功能和权限</p>
        </CardContent>
      </Card>
    </div>
  );
}
