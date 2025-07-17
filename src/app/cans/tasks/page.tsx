/**
 * @fileoverview 任务中心页面
 * @description 用户任务列表和完成任务获取罐头奖励
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
import { 
  Target, 
  Coins, 
  CheckCircle, 
  Clock, 
  Heart, 
  MessageCircle, 
  Share2, 
  FileText, 
  Users,
  Trophy,
  Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/trpc/react";
import { toast } from "sonner";

// 任务类型图标映射
const taskIcons = {
  LIKE: Heart,
  COMMENT: MessageCircle,
  SHARE: Share2,
  PUBLISH_MOMENT: FileText,
  PUBLISH_POST: FileText,
  FOLLOW_USER: Users,
  DAILY_CHECKIN: Gift,
};

export default function TasksPage() {
  const { data: session } = useSession();
  const [completingTask, setCompletingTask] = useState<string | null>(null);

  // 获取可用任务
  const { data: availableTasks, refetch: refetchTasks } = api.cans.getAvailableTasks.useQuery(
    undefined,
    { enabled: !!session }
  );

  // 获取罐头账户信息
  const { data: cansAccount } = api.cans.getAccount.useQuery(
    undefined,
    { enabled: !!session }
  );

  // 完成任务
  const completeTaskMutation = api.cans.completeTask.useMutation({
    onSuccess: (result) => {
      toast.success(`任务完成！获得 ${result.cansEarned} 个罐头`, {
        description: `${result.taskType} 任务已完成`,
      });
      refetchTasks();
      setCompletingTask(null);
    },
    onError: (error) => {
      toast.error("任务完成失败", {
        description: error.message,
      });
      setCompletingTask(null);
    },
  });

  const handleCompleteTask = async (taskType: string, targetId?: string) => {
    if (!session || completingTask) return;
    
    setCompletingTask(taskType);
    completeTaskMutation.mutate({ taskType: taskType as any, resourceId: targetId });
  };

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">请先登录</h1>
          <p className="text-muted-foreground">登录后即可查看和完成任务获取罐头奖励</p>
        </div>
      </div>
    );
  }

  const dailyTasks = availableTasks?.filter(task =>
    ['LIKE', 'COMMENT', 'SHARE', 'PUBLISH_MOMENT'].includes(task.type)
  ) || [];

  const socialTasks = availableTasks?.filter(task =>
    ['FOLLOW_USER', 'PUBLISH_POST'].includes(task.type)
  ) || [];

  const specialTasks = availableTasks?.filter(task =>
    ['DAILY_CHECKIN'].includes(task.type)
  ) || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* 页面标题 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">任务中心</h1>
        <p className="text-muted-foreground">
          完成各种任务获取罐头奖励，提升你的平台等级
        </p>
      </div>

      {/* 罐头账户概览 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {cansAccount?.availableCans || 0}
              </div>
              <p className="text-sm text-muted-foreground">可用罐头</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {cansAccount?.totalExperience || 0}
              </div>
              <p className="text-sm text-muted-foreground">总经验</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {cansAccount?.dailyExperienceEarned || 0}
              </div>
              <p className="text-sm text-muted-foreground">今日经验</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {availableTasks?.length || 0}
              </div>
              <p className="text-sm text-muted-foreground">可完成任务</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 任务列表 */}
      <Tabs defaultValue="daily" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="daily">日常任务</TabsTrigger>
          <TabsTrigger value="social">社交任务</TabsTrigger>
          <TabsTrigger value="special">特殊任务</TabsTrigger>
        </TabsList>

        {/* 日常任务 */}
        <TabsContent value="daily" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {dailyTasks.map((task) => {
              const Icon = taskIcons[task.type as keyof typeof taskIcons] || Target;
              const isCompleting = completingTask === task.type;
              const target = task.dailyLimit || 1;

              return (
                <Card key={task.type}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Icon className="h-5 w-5" />
                        {task.name}
                      </CardTitle>
                      <Badge variant="secondary">
                        <Coins className="h-3 w-3 mr-1" />
                        {task.cansReward}
                      </Badge>
                    </div>
                    <CardDescription>{task.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* 进度条 */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>进度</span>
                        <span>{task.completed}/{target}</span>
                      </div>
                      <Progress
                        value={(task.completed / target) * 100}
                        className="h-2"
                      />
                    </div>

                    {/* 操作按钮 */}
                    {task.completed >= target ? (
                      <Button
                        onClick={() => handleCompleteTask(task.type)}
                        disabled={isCompleting}
                        className="w-full"
                      >
                        {isCompleting ? (
                          <>
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                            完成中...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            领取奖励
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" disabled>
                        <Target className="h-4 w-4 mr-2" />
                        继续完成
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* 社交任务 */}
        <TabsContent value="social" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {socialTasks.map((task) => {
              const Icon = taskIcons[task.type as keyof typeof taskIcons] || Target;
              const isCompleting = completingTask === task.type;
              const target = task.dailyLimit || 1;
              
              return (
                <Card key={task.type}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Icon className="h-5 w-5" />
                        {task.name}
                      </CardTitle>
                      <Badge variant="secondary">
                        <Coins className="h-3 w-3 mr-1" />
                        {task.cansReward}
                      </Badge>
                    </div>
                    <CardDescription>{task.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* 进度条 */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>进度</span>
                        <span>{task.completed}/{target}</span>
                      </div>
                      <Progress
                        value={(task.completed / target) * 100}
                        className="h-2"
                      />
                    </div>

                    {/* 操作按钮 */}
                    {task.completed >= target ? (
                      <Button
                        onClick={() => handleCompleteTask(task.type)}
                        disabled={isCompleting}
                        className="w-full"
                      >
                        {isCompleting ? (
                          <>
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                            完成中...
                          </>
                        ) : (
                          <>
                            <Trophy className="h-4 w-4 mr-2" />
                            领取奖励
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" disabled>
                        <Target className="h-4 w-4 mr-2" />
                        继续完成
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* 特殊任务 */}
        <TabsContent value="special" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {specialTasks.map((task) => {
              const Icon = taskIcons[task.type as keyof typeof taskIcons] || Target;
              const isCompleting = completingTask === task.type;
              const target = task.dailyLimit || 1;

              return (
                <Card key={task.type}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Icon className="h-5 w-5" />
                        {task.name}
                      </CardTitle>
                      <Badge variant="secondary">
                        <Coins className="h-3 w-3 mr-1" />
                        {task.cansReward}
                      </Badge>
                    </div>
                    <CardDescription>{task.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* 进度条 */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>进度</span>
                        <span>{task.completed}/{target}</span>
                      </div>
                      <Progress
                        value={(task.completed / target) * 100}
                        className="h-2"
                      />
                    </div>

                    {/* 操作按钮 */}
                    {task.completed >= target ? (
                      <Button
                        onClick={() => handleCompleteTask(task.type)}
                        disabled={isCompleting}
                        className="w-full"
                      >
                        {isCompleting ? (
                          <>
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                            完成中...
                          </>
                        ) : (
                          <>
                            <Gift className="h-4 w-4 mr-2" />
                            领取奖励
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" disabled>
                        <Target className="h-4 w-4 mr-2" />
                        继续完成
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* 任务说明 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>任务说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• 每日任务每天重置，完成后可获得罐头和经验奖励</p>
          <p>• 社交任务需要与其他用户互动才能完成</p>
          <p>• 特殊任务通常有更高的奖励，但完成条件更严格</p>
          <p>• 每日经验获取有上限，合理安排任务完成顺序</p>
        </CardContent>
      </Card>
    </div>
  );
}
