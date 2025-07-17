/**
 * @fileoverview 实时交易流水组件
 * @description 显示实时交易记录和状态监控
 */

"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Minus,
  RefreshCw,
  Clock,
  Eye,
} from "lucide-react";

import { TRANSACTION_TYPES, REFRESH_INTERVAL_OPTIONS } from "../data/constants";
import { mockTransactions } from "../data/mock-data";
import type { Transaction, RealTimeConfig } from "../types";

interface RealTimeTransactionsProps {
  config?: Partial<RealTimeConfig>;
  onTransactionClick?: (_transaction: Transaction) => void;
}

/**
 * 实时交易流水组件
 */
export function RealTimeTransactions({
  config = {},
  onTransactionClick
}: RealTimeTransactionsProps) {
  const [refreshInterval, setRefreshInterval] = useState(config.refreshInterval || 5000);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isAutoRefresh, setIsAutoRefresh] = useState(config.autoRefresh ?? true);

  // 获取实时交易数据
  const { data: transactionData, refetch, isPending } = api.cans.transactions.getRecentTransactions.useQuery({
    limit: config.maxDisplayItems || 10,
  });

  // 使用真实数据或模拟数据
  const transactions = transactionData?.transactions || mockTransactions;

  /**
   * 自动刷新逻辑
   */
  useEffect(() => {
    if (!isAutoRefresh) return;

    const interval = setInterval(() => {
      refetch();
      setLastUpdate(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, isAutoRefresh, refetch]);

  /**
   * 手动刷新
   */
  const handleManualRefresh = () => {
    refetch();
    setLastUpdate(new Date());
  };

  /**
   * 获取状态徽章
   */
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">已完成</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">处理中</Badge>;
      case "flagged":
        return <Badge className="bg-red-100 text-red-800">异常</Badge>;
      default:
        return <Badge variant="secondary">未知</Badge>;
    }
  };

  /**
   * 获取交易类型图标
   */
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "EARN":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "SPEND":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "TRANSFER":
        return <Activity className="h-4 w-4 text-blue-500" />;
      case "GIFT":
        return <Target className="h-4 w-4 text-purple-500" />;
      case "ADMIN":
        return <Users className="h-4 w-4 text-orange-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  /**
   * 格式化金额显示
   */
  const formatAmount = (amount: number) => {
    const isPositive = amount > 0;
    const formattedAmount = Math.abs(amount).toLocaleString();

    return (
      <span className={isPositive ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
        {isPositive ? "+" : "-"}{formattedAmount}
      </span>
    );
  };

  /**
   * 格式化时间显示
   */
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <span>实时交易流水</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              最新的罐头交易记录，实时更新
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* 最后更新时间 */}
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>更新: {formatTime(lastUpdate)}</span>
            </div>

            {/* 刷新间隔选择 */}
            <Select
              value={refreshInterval.toString()}
              onValueChange={(value) => setRefreshInterval(Number(value))}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REFRESH_INTERVAL_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 手动刷新按钮 */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isPending}
            >
              <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* 自动刷新状态指示器 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isAutoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm text-muted-foreground">
              {isAutoRefresh ? '自动刷新已启用' : '自动刷新已暂停'}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
          >
            {isAutoRefresh ? '暂停' : '启用'}自动刷新
          </Button>
        </div>

        {/* 交易记录表格 */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>用户</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>金额</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    暂无交易记录
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction: any) => (
                  <TableRow key={transaction.id} className="hover:bg-muted/50">
                    <TableCell className="text-sm">
                      {formatTime(transaction.createdAt)}
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {(transaction as any).user?.username || (transaction as any).username || 'Unknown'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {transaction.userId}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getTransactionIcon(transaction.transactionType)}
                        <span className={TRANSACTION_TYPES[transaction.transactionType]?.color}>
                          {TRANSACTION_TYPES[transaction.transactionType]?.label}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      {formatAmount(transaction.amount)}
                    </TableCell>

                    <TableCell className="max-w-48">
                      <div className="truncate" title={transaction.description}>
                        {transaction.description}
                      </div>
                    </TableCell>

                    <TableCell>
                      {getStatusBadge((transaction as any).status || 'completed')}
                    </TableCell>

                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onTransactionClick?.(transaction as Transaction)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 底部统计信息 */}
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <div>
            显示最近 {transactions.length} 条交易记录
          </div>
          <div>
            刷新间隔: {refreshInterval / 1000}秒
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
