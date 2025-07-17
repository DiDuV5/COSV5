/**
 * @fileoverview 权限检查组件
 * @description 显示权限验证和限制信息
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Lock, 
  Users, 
  MessageSquare, 
  Hash, 
  Shield, 
  XCircle, 
  CheckCircle 
} from 'lucide-react';

import type { PermissionCheckProps } from '../types';
import { 
  getUserLevelDisplayConfig, 
  calculateResetTime, 
  formatTimeDisplay 
} from '../utils';

/**
 * @component PermissionCheck
 * @description 权限检查和限制显示组件
 */
export function PermissionCheck({ 
  permissionCheck, 
  dailyLimit, 
  isPending, 
  onBack 
}: PermissionCheckProps) {
  // 加载状态
  if (isPending) {
    return <PermissionCheckSkeleton />;
  }

  // 权限被拒绝
  if (permissionCheck && !permissionCheck.hasPermission) {
    return (
      <PermissionDeniedCard 
        permissionCheck={permissionCheck} 
        onBack={onBack} 
      />
    );
  }

  // 达到每日发布限制
  if (dailyLimit && !dailyLimit.canPublish) {
    return (
      <DailyLimitExceededCard 
        dailyLimit={dailyLimit} 
        onBack={onBack} 
      />
    );
  }

  return null;
}

/**
 * @component PermissionCheckSkeleton
 * @description 权限检查骨架屏
 */
function PermissionCheckSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="h-32 bg-gray-200 rounded mb-4"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}

/**
 * @component PermissionDeniedCard
 * @description 权限被拒绝卡片
 */
function PermissionDeniedCard({ 
  permissionCheck, 
  onBack 
}: { 
  permissionCheck: NonNullable<PermissionCheckProps['permissionCheck']>; 
  onBack: () => void; 
}) {
  const userLevelConfig = getUserLevelDisplayConfig(permissionCheck.userLevel);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* 返回按钮 */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
      </div>

      <Card className="border-l-4 border-l-red-500">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full">
              <Lock className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-xl text-red-800">发布权限受限</CardTitle>
              <p className="text-sm text-red-600 mt-1">
                您当前的用户等级不支持发布动态功能
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 当前状态 */}
            <div className="p-4 bg-red-50 rounded-lg">
              <h3 className="text-sm font-medium text-red-800 mb-2">当前状态</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-red-700">用户等级:</span>
                  <Badge variant={userLevelConfig.badgeVariant}>
                    {userLevelConfig.label}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-red-700">发布权限:</span>
                  <div className="flex items-center gap-1 text-red-600">
                    <XCircle className="w-3 h-3" />
                    <span className="text-xs">未开通</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 权限说明 */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 mb-2">权限说明</h3>
              <div className="space-y-2 text-sm text-blue-700">
                <p>• 游客用户：仅可浏览内容，无法发布动态</p>
                <p>• 注册用户：可发布基础动态，有一定限制</p>
                <p>• 付费用户：享有更多发布权限和功能</p>
                <p>• 创建者：拥有完整的内容创作权限</p>
              </div>
            </div>

            {/* 解决方案 */}
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="text-sm font-medium text-green-800 mb-2">如何获取权限</h3>
              <div className="space-y-2 text-sm text-green-700">
                <p>1. 如果您是游客，请先注册账号</p>
                <p>2. 联系管理员申请权限升级</p>
                <p>3. 考虑升级到付费用户获得更多功能</p>
                <p>4. 参与社区活动获得创建者认证</p>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={() => window.location.href = '/auth/signin'}
                className="flex-1"
              >
                <Users className="w-4 h-4 mr-2" />
                登录/注册
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/contact'}
                className="flex-1"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                联系管理员
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * @component DailyLimitExceededCard
 * @description 每日发布限制卡片
 */
function DailyLimitExceededCard({ 
  dailyLimit, 
  onBack 
}: { 
  dailyLimit: NonNullable<PermissionCheckProps['dailyLimit']>; 
  onBack: () => void; 
}) {
  const { tomorrow, hoursUntilReset } = calculateResetTime();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* 返回按钮 */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
      </div>

      <Card className="border-l-4 border-l-orange-500">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-full">
              <Lock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-xl text-orange-800">今日发布次数已达上限</CardTitle>
              <p className="text-sm text-orange-600 mt-1">
                您已达到每日发布限制，请明日再试
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 发布统计 */}
            <div className="p-4 bg-orange-50 rounded-lg">
              <h3 className="text-sm font-medium text-orange-800 mb-3">今日发布统计</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{dailyLimit.todayCount}</div>
                  <div className="text-xs text-orange-700">已发布</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{dailyLimit.limit}</div>
                  <div className="text-xs text-orange-700">每日限制</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{hoursUntilReset}</div>
                  <div className="text-xs text-orange-700">小时后重置</div>
                </div>
              </div>
            </div>

            {/* 重置时间 */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 mb-2">重置时间</h3>
              <div className="text-sm text-blue-700">
                <p>• 发布次数将在明日 00:00 自动重置</p>
                <p>• 重置后您可以继续发布 {dailyLimit.limit} 条动态</p>
                <p>• 预计重置时间: {formatTimeDisplay(tomorrow)}</p>
              </div>
            </div>

            {/* 建议操作 */}
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="text-sm font-medium text-green-800 mb-2">您可以</h3>
              <div className="space-y-2 text-sm text-green-700">
                <p>• 浏览其他用户的精彩动态</p>
                <p>• 为喜欢的内容点赞和评论</p>
                <p>• 准备明日要发布的内容</p>
                <p>• 联系管理员了解权限升级</p>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={() => window.location.href = '/'}
                className="flex-1"
              >
                <Hash className="w-4 h-4 mr-2" />
                浏览动态
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/admin/permissions'}
                className="flex-1"
              >
                <Shield className="w-4 h-4 mr-2" />
                查看权限
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
