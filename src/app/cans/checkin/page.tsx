/**
 * @fileoverview 每日签到页面
 * @description 用户每日签到功能，获取罐头奖励
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

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Calendar, Gift, Coins, Flame, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { api } from "@/trpc/react";
import { toast } from "sonner";

export default function CheckinPage() {
  const { data: session } = useSession();
  const [isChecking, setIsChecking] = useState(false);

  // 获取签到状态
  const { data: checkinStatus, refetch: refetchCheckinStatus, isPending: checkinStatusLoading } = api.cans.getCheckinStatus.useQuery(
    undefined,
    {
      enabled: !!session,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      staleTime: 0, // 不使用缓存，每次都重新获取
    }
  );

  // 获取罐头账户信息
  const { data: cansAccount, refetch: refetchCansAccount } = api.cans.getAccount.useQuery(
    undefined,
    { enabled: !!session }
  );

  // 执行签到
  const checkinMutation = api.cans.dailyCheckin.useMutation({
    onSuccess: (result) => {
      toast.success(`签到成功！获得 ${result.totalCans} 个罐头`, {
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
        duration: 6000,
        action: {
          label: "重试",
          onClick: () => {
            setIsChecking(false);
            setTimeout(() => handleCheckin(), 1000);
          },
        },
      });
      setIsChecking(false);
    },
  });

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

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">请先登录</h1>
          <p className="text-muted-foreground">登录后即可参与每日签到获取罐头奖励</p>
        </div>
      </div>
    );
  }

  // 只有在数据加载完成且未签到时才允许签到
  const canCheckin = !checkinStatusLoading && checkinStatus && !checkinStatus.hasCheckedInToday;
  const consecutiveDays = checkinStatus?.consecutiveCheckins || 0;
  const nextReward = Math.min(10 + Math.floor(consecutiveDays / 7) * 5, 50);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 页面标题 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">每日签到</h1>
        <p className="text-muted-foreground">
          每天签到获取罐头奖励，连续签到还有额外奖励哦！
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 签到卡片 */}
        <Card className="md:col-span-2">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Calendar className="h-6 w-6" />
              今日签到
            </CardTitle>
            <CardDescription>
              {checkinStatusLoading ? "加载签到状态中..." :
               canCheckin ? "点击下方按钮完成今日签到" : "今日已完成签到"}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {/* 签到状态 */}
            <div className="flex items-center justify-center">
              {checkinStatusLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-6 w-6 animate-spin" />
                  <span className="text-lg">加载中...</span>
                </div>
              ) : canCheckin ? (
                <Button
                  size="lg"
                  onClick={handleCheckin}
                  disabled={isChecking}
                  className="px-8 py-4 text-lg"
                >
                  {isChecking ? (
                    <>
                      <Clock className="h-5 w-5 mr-2 animate-spin" />
                      签到中...
                    </>
                  ) : (
                    <>
                      <Gift className="h-5 w-5 mr-2" />
                      立即签到
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-6 w-6" />
                  <span className="text-lg font-medium">今日已签到</span>
                </div>
              )}
            </div>

            {/* 奖励预览 */}
            {canCheckin && (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-2">签到可获得</p>
                <div className="flex items-center justify-center gap-4">
                  <div className="flex items-center gap-1">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">{nextReward} 罐头</span>
                  </div>
                  {consecutiveDays >= 6 && (
                    <Badge variant="secondary">
                      <Flame className="h-3 w-3 mr-1" />
                      连续奖励
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 连续签到统计 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              连续签到
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500">{consecutiveDays}</div>
              <p className="text-sm text-muted-foreground">连续天数</p>
            </div>
            
            {/* 连续签到进度 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>下个奖励里程碑</span>
                <span>{Math.ceil((consecutiveDays + 1) / 7) * 7} 天</span>
              </div>
              <Progress 
                value={(consecutiveDays % 7) * (100 / 7)} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground text-center">
                连续签到 7 天可获得额外奖励
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 罐头账户信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              我的罐头
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {cansAccount?.availableCans || 0}
              </div>
              <p className="text-sm text-muted-foreground">可用罐头</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <div className="font-medium">{cansAccount?.totalCans || 0}</div>
                <p className="text-muted-foreground">总罐头</p>
              </div>
              <div className="text-center">
                <div className="font-medium">{cansAccount?.totalCheckins || 0}</div>
                <p className="text-muted-foreground">总签到</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 签到说明 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>签到说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• 每日签到可获得基础罐头奖励</p>
          <p>• 连续签到 7 天及以上可获得额外奖励</p>
          <p>• 断签后连续天数将重新计算</p>
          <p>• 罐头可用于兑换平台特权和商品</p>
        </CardContent>
      </Card>
    </div>
  );
}
