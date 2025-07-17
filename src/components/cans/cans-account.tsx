/**
 * @fileoverview 罐头账户组件
 * @description 显示用户罐头余额、每日签到、交易记录等信息
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - react: ^18.0.0
 * - @trpc/react-query: ^10.45.0
 * - lucide-react: ^0.263.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Coins,
  Calendar,
  TrendingUp,
  Gift,
  History,
  Award,
  CheckCircle,
  Clock,
  Flame,
  Target,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { TaskCenter } from "./task-center";
import ExperienceStatus from "./experience-status";

// 类型定义
interface Transaction {
  id: string;
  transactionType: 'EARN' | 'SPEND' | 'TRANSFER';
  amount: number;
  description: string;
  createdAt: Date;
}

interface Pagination {
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

interface TransactionsData {
  transactions: Transaction[];
  pagination: Pagination;
}

interface TransactionError {
  message?: string;
}

export function CansAccount() {
  const [isCheckinLoading, setIsCheckinLoading] = useState(false);

  // 获取账户信息
  const { data: account, isPending: accountLoading, refetch: refetchAccount } = api.cans.getAccount.useQuery();
  
  // 获取签到状态
  const { data: checkinStatus, refetch: refetchCheckinStatus } = api.cans.getCheckinStatus.useQuery();
  
  // 获取交易记录 (支持分页)
  const [currentPage, setCurrentPage] = useState(1);
  const [transactionType, setTransactionType] = useState<'ALL' | 'EARN' | 'SPEND' | 'TRANSFER'>('ALL');

  // 暂时禁用交易记录API调用，使用空数据
  const transactionsData = null as TransactionsData | null;
  const transactionsLoading = false;
  const transactionsError = null as TransactionError | null;

  // 每日签到
  const checkinMutation = api.cans.dailyCheckin.useMutation({
    onSuccess: (data) => {
      toast.success('签到成功！');
      refetchAccount();
      refetchCheckinStatus();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCheckin = async () => {
    // 检查是否已经签到
    if (checkinStatus?.hasCheckedInToday) {
      toast.info("今日已签到", {
        description: "您今天已经完成签到了，明天再来吧！",
      });
      return;
    }

    setIsCheckinLoading(true);
    try {
      await checkinMutation.mutateAsync();
    } finally {
      setIsCheckinLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'EARN':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'SPEND':
        return <Coins className="h-4 w-4 text-red-500" />;
      case 'TRANSFER':
        return <Gift className="h-4 w-4 text-blue-500" />;
      default:
        return <History className="h-4 w-4 text-gray-500" />;
    }
  };

  if (accountLoading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-24 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 账户概览 */}
      <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Coins className="h-5 w-5 text-orange-500" />
            <span>我的罐头</span>
          </CardTitle>
          <CardDescription>
            罐头是平台的虚拟积分，可用于兑换特权和商品
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 余额显示 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {account?.availableCans || 0}
              </div>
              <div className="text-sm text-muted-foreground">可用罐头</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {account?.frozenCans || 0}
              </div>
              <div className="text-sm text-muted-foreground">冻结罐头</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {account?.totalExperience || 0}
              </div>
              <div className="text-sm text-muted-foreground">总经验值</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {account?.consecutiveCheckins || 0}
              </div>
              <div className="text-sm text-muted-foreground">连续签到</div>
            </div>
          </div>

          {/* 每日经验值进度 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>今日经验值</span>
              <span>
                {account?.dailyExperienceEarned || 0} / {account?.dailyExperienceLimit || 100}
              </span>
            </div>
            <Progress 
              value={((account?.dailyExperienceEarned || 0) / (account?.dailyExperienceLimit || 100)) * 100}
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* 每日签到 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <span>每日签到</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                {checkinStatus?.hasCheckedInToday ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-medium text-green-600">今日已签到</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-5 w-5 text-orange-500" />
                    <span className="font-medium">今日未签到</span>
                  </>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                连续签到 {checkinStatus?.consecutiveCheckins || 0} 天
              </div>
            </div>
            <Button
              onClick={handleCheckin}
              disabled={checkinStatus?.hasCheckedInToday || isCheckinLoading}
              className="min-w-[100px]"
            >
              {isCheckinLoading ? "签到中..." : 
               checkinStatus?.hasCheckedInToday ? "已签到" : "立即签到"}
            </Button>
          </div>

          {/* 连续签到奖励提示 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="text-center p-2 bg-muted rounded">
              <div className="font-medium">3天</div>
              <div className="text-muted-foreground">+5罐头</div>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <div className="font-medium">7天</div>
              <div className="text-muted-foreground">+15罐头</div>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <div className="font-medium">15天</div>
              <div className="text-muted-foreground">+30罐头</div>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <div className="font-medium">30天</div>
              <div className="text-muted-foreground">+50罐头</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 详细信息标签页 */}
      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tasks">每日任务</TabsTrigger>
          <TabsTrigger value="experience">经验值</TabsTrigger>
          <TabsTrigger value="transactions">交易记录</TabsTrigger>
          <TabsTrigger value="stats">统计信息</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <TaskCenter />
        </TabsContent>

        <TabsContent value="experience" className="space-y-4">
          <ExperienceStatus showDetails={true} compact={false} />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">交易记录</CardTitle>
                <div className="flex items-center space-x-2">
                  <Select value={transactionType} onValueChange={(value: string) => {
                    setTransactionType(value as 'ALL' | 'EARN' | 'SPEND' | 'TRANSFER');
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">全部</SelectItem>
                      <SelectItem value="EARN">收入</SelectItem>
                      <SelectItem value="SPEND">支出</SelectItem>
                      <SelectItem value="TRANSFER">转账</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                    disabled={transactionsLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${transactionsLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

            </CardHeader>
            <CardContent>
              {transactionsError ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">加载失败</h3>
                  <p className="text-muted-foreground mb-4">
                    {(transactionsError as TransactionError)?.message || '网络连接异常，请检查网络后重试'}
                  </p>
                  <Button onClick={() => window.location.reload()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    重新加载
                  </Button>
                </div>
              ) : transactionsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg animate-pulse">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full" />
                        <div>
                          <div className="w-32 h-4 bg-gray-200 rounded mb-2" />
                          <div className="w-24 h-3 bg-gray-200 rounded" />
                        </div>
                      </div>
                      <div className="w-16 h-4 bg-gray-200 rounded" />
                    </div>
                  ))}
                </div>
              ) : transactionsData?.transactions && transactionsData.transactions.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {transactionsData.transactions.map((transaction: Transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          {getTransactionIcon(transaction.transactionType)}
                          <div>
                            <div className="font-medium">{transaction.description}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(transaction.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div className={`font-bold ${
                          transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                        </div>
                      </div>
                    ))}
                  </div>


                </>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">暂无交易记录</h3>
                  <p className="text-muted-foreground">
                    完成签到或任务后，您的交易记录将显示在这里
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  <span>签到统计</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>总签到次数</span>
                  <span className="font-bold">{account?.totalCheckins || 0} 次</span>
                </div>
                <div className="flex justify-between">
                  <span>连续签到</span>
                  <span className="font-bold">{account?.consecutiveCheckins || 0} 天</span>
                </div>
                <div className="flex justify-between">
                  <span>最后签到</span>
                  <span className="text-sm text-muted-foreground">
                    {account?.lastCheckinDate ? 
                      formatDate(account.lastCheckinDate) : '从未签到'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Flame className="h-5 w-5 text-red-500" />
                  <span>活跃度</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>总交易次数</span>
                  <span className="font-bold">{0} 次</span>
                </div>
                <div className="flex justify-between">
                  <span>总罐头获得</span>
                  <span className="font-bold">{account?.totalCans || 0} 个</span>
                </div>
                <div className="flex justify-between">
                  <span>账户等级</span>
                  <Badge variant="outline">新手</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
