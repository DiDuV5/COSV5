/**
 * @fileoverview 用户统计组件
 * @description 展示用户统计信息和数据分析，从原 admin/users/page.tsx 重构而来
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 */

'use client';

import { Users, UserCheck, UserX, Crown, TrendingUp, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export interface UserStatsData {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  usersByLevel: {
    GUEST: number;
    USER: number;
    VIP: number;
    CREATOR: number;
    ADMIN: number;
    SUPER_ADMIN: number;
  };
  verificationStats: {
    verified: number;
    unverified: number;
  };
  loginStats: {
    todayLogins: number;
    weeklyLogins: number;
    monthlyLogins: number;
  };
}

export interface UserStatsProps {
  stats: UserStatsData | null;
  isPending?: boolean;
}

/**
 * 用户统计组件
 * 负责展示用户相关的统计信息和数据分析
 */
export function UserStats({ stats, isPending = false }: UserStatsProps) {
  if (isPending) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded animate-pulse mb-2" />
              <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-4" />
          <p>暂无统计数据</p>
        </div>
      </div>
    );
  }

  // 计算百分比
  const activePercentage = stats.totalUsers > 0 
    ? Math.round((stats.activeUsers / stats.totalUsers) * 100) 
    : 0;
  
  const verifiedPercentage = stats.totalUsers > 0 && stats.verificationStats?.verified
    ? Math.round((stats.verificationStats.verified / stats.totalUsers) * 100)
    : 0;

  // 用户等级统计
  const levelStats = [
    { level: 'GUEST', label: '游客', count: stats.usersByLevel?.GUEST || 0, color: 'bg-gray-500' },
    { level: 'USER', label: '用户', count: stats.usersByLevel?.USER || 0, color: 'bg-blue-500' },
    { level: 'VIP', label: 'VIP', count: stats.usersByLevel?.VIP || 0, color: 'bg-yellow-500' },
    { level: 'CREATOR', label: '创作者', count: stats.usersByLevel?.CREATOR || 0, color: 'bg-purple-500' },
    { level: 'ADMIN', label: '管理员', count: stats.usersByLevel?.ADMIN || 0, color: 'bg-red-500' },
    { level: 'SUPER_ADMIN', label: '超管', count: stats.usersByLevel?.SUPER_ADMIN || 0, color: 'bg-red-600' },
  ];

  return (
    <div className="space-y-6">
      {/* 基础统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总用户数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.totalUsers || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              平台注册用户总数
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃用户</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(stats.activeUsers || 0).toLocaleString()}
            </div>
            <div className="flex items-center space-x-2">
              <Progress value={activePercentage} className="flex-1 h-2" />
              <span className="text-xs text-muted-foreground">{activePercentage}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日新增</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {(stats.newUsersToday || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              本周: {stats.newUsersThisWeek || 0} | 本月: {stats.newUsersThisMonth || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">邮箱验证</CardTitle>
            <UserCheck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {(stats.verificationStats?.verified || 0).toLocaleString()}
            </div>
            <div className="flex items-center space-x-2">
              <Progress value={verifiedPercentage} className="flex-1 h-2" />
              <span className="text-xs text-muted-foreground">{verifiedPercentage}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 用户等级分布 */}
      <Card>
        <CardHeader>
          <CardTitle>用户等级分布</CardTitle>
          <CardDescription>
            不同等级用户的数量分布情况
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {levelStats.map((level) => {
              const percentage = stats.totalUsers > 0 
                ? Math.round((level.count / stats.totalUsers) * 100) 
                : 0;
              
              return (
                <div key={level.level} className="text-center space-y-2">
                  <div className={`w-12 h-12 rounded-full ${level.color} mx-auto flex items-center justify-center`}>
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-lg">{level.count.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">{level.label}</div>
                    <Badge variant="outline" className="text-xs">
                      {percentage}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 登录活跃度 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">今日登录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.loginStats?.todayLogins || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              今天有登录活动的用户数
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">本周登录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.loginStats?.weeklyLogins || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              本周有登录活动的用户数
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">本月登录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.loginStats?.monthlyLogins || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              本月有登录活动的用户数
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * 导出用户统计组件
 */
export default UserStats;
