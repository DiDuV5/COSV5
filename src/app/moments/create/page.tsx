/**
 * @fileoverview 动态发布页面
 * @description 用户发布动态的页面，支持文字、图片、视频和标签
 * @author Augment AI
 * @date 2024-01-XX
 * @version 2.0.0 - 重构为模块化结构
 * @since 1.0.0
 *
 * @example
 * // 访问动态发布页面
 * /moments/create
 *
 * @dependencies
 * - next: ^14.0.0
 * - react: ^18.0.0
 * - @trpc/react-query: ^10.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2025-06-20: 重构为模块化结构，拆分为多个子组件
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

// 导入子组件
import { PermissionCheck } from './components/PermissionCheck';
import { PermissionOverview } from './components/PermissionOverview';
import { MomentForm } from './components/MomentForm';

// 导入Hook和工具
import { usePermissionCheck } from './hooks/use-moment-creation';
import { getPermissionInfo, hasBasicPublishPermission, hasReachedDailyLimit } from './utils';

import type { CreateMomentForm, DailyLimit, PermissionCheckResult } from './types';

export default function CreateMomentPage() {
  const router = useRouter();

  // 使用权限检查Hook
  const {
    session,
    permissionCheck,
    dailyLimit,
    isPending,
    isAuthenticated,
    hasPermission,
    canPublish,
  } = usePermissionCheck();

  // 获取权限信息
  const permissionInfo = permissionCheck ? getPermissionInfo(permissionCheck as any) : null;

  // 类型转换：确保dailyLimit符合DailyLimit接口
  const normalizedDailyLimit: DailyLimit | undefined = dailyLimit ? {
    canPublish: dailyLimit.canPublish,
    limit: dailyLimit.dailyLimit || 0,
    todayCount: dailyLimit.currentCount || 0,
    remaining: dailyLimit.remaining || 0,
    resetTime: dailyLimit.resetTime,
  } : undefined;

  // 类型转换：确保permissionCheck符合PermissionCheckResult接口
  const normalizedPermissionCheck: PermissionCheckResult | undefined = permissionCheck ? {
    hasPermission: permissionCheck.hasPermission,
    userLevel: permissionCheck.userLevel as any,
    config: permissionCheck.config,
    error: (permissionCheck as any).message || (permissionCheck as any).error,
  } : undefined;

  // 处理返回
  const handleBack = () => {
    router.back();
  };

  // 处理表单提交
  const handleSubmit = async (data: CreateMomentForm) => {
    // 这里的逻辑将在MomentForm组件中处理
    console.log('表单提交:', data);
  };

  // 如果用户未登录，返回null（权限检查Hook会处理重定向）
  if (!isAuthenticated) {
    return null;
  }

  // 权限检查组件处理权限被拒绝和每日限制的情况
  const shouldShowPermissionCheck =
    !normalizedPermissionCheck ||
    !hasBasicPublishPermission(normalizedPermissionCheck) ||
    !normalizedDailyLimit ||
    hasReachedDailyLimit(normalizedDailyLimit);

  if (shouldShowPermissionCheck) {
    return (
      <PermissionCheck
        permissionCheck={normalizedPermissionCheck}
        dailyLimit={normalizedDailyLimit}
        isPending={isPending}
        onBack={handleBack}
      />
    );
  }

  // 正常渲染页面
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* 返回按钮 */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
      </div>

      {/* 权限概览卡片 */}
      {permissionInfo && normalizedDailyLimit && (
        <PermissionOverview
          permissionInfo={permissionInfo}
          dailyLimit={normalizedDailyLimit}
        />
      )}

      {/* 动态发布表单 */}
      {permissionInfo && normalizedDailyLimit && session && (
        <MomentForm
          permissionInfo={permissionInfo}
          dailyLimit={normalizedDailyLimit}
          onSubmit={handleSubmit}
          isPublishing={false}
          session={session}
        />
      )}
    </div>
  );
}
