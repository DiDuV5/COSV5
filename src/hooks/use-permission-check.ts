/**
 * @fileoverview 统一权限验证Hook
 * @description 提供统一的权限检查逻辑，消除权限验证代码分散问题
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/trpc/react';
import type { UserLevelValue } from '@/lib/constants/user-levels';

type UserLevel = UserLevelValue;

/**
 * 权限检查选项
 */
export interface PermissionCheckOptions {
  /** 需要的最低用户等级 */
  requiredLevel?: UserLevel;
  /** 需要的具体权限 */
  requiredPermissions?: string[];
  /** 是否需要验证用户 */
  requireVerified?: boolean;
  /** 是否需要激活用户 */
  requireActive?: boolean;
  /** 是否需要发布权限 */
  requirePublishPermission?: boolean;
  /** 操作描述（用于错误消息） */
  operation?: string;
  /** 重定向URL（权限不足时） */
  redirectUrl?: string;
  /** 是否自动重定向 */
  autoRedirect?: boolean;
}

/**
 * 权限检查结果
 */
export interface PermissionCheckResult {
  /** 是否有权限 */
  hasPermission: boolean;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error?: string;
  /** 用户信息 */
  user?: any;
  /** 权限配置 */
  permissionConfig?: any;
  /** 详细信息 */
  details?: string;
}

/**
 * 统一权限验证Hook
 */
export function usePermissionCheck(options: PermissionCheckOptions = {}): PermissionCheckResult {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [result, setResult] = useState<PermissionCheckResult>({
    hasPermission: false,
    isLoading: true,
  });

  // 获取用户权限配置
  const { data: permissionCheck, isLoading: permissionLoading, error: permissionError } =
    api.permission.checkPermission.useQuery(
      { action: 'PUBLISH_POST' }, // 默认检查发布权限
      { enabled: !!session?.user }
    );

  // 获取当前用户信息
  const { data: currentUser, isLoading: userLoading } =
    api.auth.getCurrentUser.useQuery(undefined, { enabled: !!session?.user });

  useEffect(() => {
    if (status === 'loading' || permissionLoading || userLoading) {
      setResult(prev => ({ ...prev, isLoading: true }));
      return;
    }

    // 检查是否已登录
    if (!session?.user) {
      const error = '请先登录';
      setResult({
        hasPermission: false,
        isLoading: false,
        error,
      });

      if (options.autoRedirect) {
        router.push(options.redirectUrl || '/auth/signin');
      }
      return;
    }

    // 检查用户是否存在
    if (!currentUser) {
      const error = '用户不存在';
      setResult({
        hasPermission: false,
        isLoading: false,
        error,
      });
      return;
    }

    // 检查用户状态
    if (options.requireActive && !currentUser.isActive) {
      const error = '账户已被禁用';
      setResult({
        hasPermission: false,
        isLoading: false,
        error,
        user: currentUser,
      });
      return;
    }

    // 检查用户验证状态
    if (options.requireVerified && !currentUser.isVerified) {
      const error = '请先验证邮箱';
      setResult({
        hasPermission: false,
        isLoading: false,
        error,
        user: currentUser,
      });
      return;
    }

    // 检查用户等级
    if (options.requiredLevel) {
      const userLevelOrder = ['GUEST', 'USER', 'VIP', 'CREATOR', 'ADMIN', 'SUPER_ADMIN'];
      const userLevelIndex = userLevelOrder.indexOf(currentUser.userLevel);
      const requiredLevelIndex = userLevelOrder.indexOf(options.requiredLevel);

      if (userLevelIndex < requiredLevelIndex) {
        const error = `需要${options.requiredLevel}级别权限`;
        setResult({
          hasPermission: false,
          isLoading: false,
          error,
          user: currentUser,
          details: `当前等级: ${currentUser.userLevel}, 需要等级: ${options.requiredLevel}`,
        });
        return;
      }
    }

    // 检查发布权限
    if (options.requirePublishPermission && permissionCheck && !permissionCheck.allowed) {
      const error = permissionCheck.message || '没有发布权限';
      setResult({
        hasPermission: false,
        isLoading: false,
        error,
        user: currentUser,
        permissionConfig: permissionCheck.config,
        details: permissionCheck.details,
      });
      return;
    }

    // 所有检查通过
    setResult({
      hasPermission: true,
      isLoading: false,
      user: currentUser,
      permissionConfig: permissionCheck?.config,
    });

  }, [
    session,
    status,
    currentUser,
    permissionCheck,
    permissionLoading,
    userLoading,
    options.requiredLevel,
    options.requireVerified,
    options.requireActive,
    options.requirePublishPermission,
    options.autoRedirect,
    options.redirectUrl,
    router
  ]);

  return result;
}

/**
 * 权限检查工具函数
 */
export const PermissionUtils = {
  /**
   * 检查用户等级是否满足要求
   */
  checkUserLevel(userLevel: string, requiredLevel: string): boolean {
    const userLevelOrder = ['GUEST', 'USER', 'VIP', 'CREATOR', 'ADMIN', 'SUPER_ADMIN'];
    const userLevelIndex = userLevelOrder.indexOf(userLevel);
    const requiredLevelIndex = userLevelOrder.indexOf(requiredLevel);
    return userLevelIndex >= requiredLevelIndex;
  },

  /**
   * 获取用户等级显示名称
   */
  getUserLevelDisplayName(userLevel: string): string {
    const levelNames = {
      GUEST: '访客',
      USER: '入馆',
      VIP: 'VIP',
      CREATOR: '荣誉',
      ADMIN: '守馆',
      SUPER_ADMIN: '超级管理员',
    };
    return levelNames[userLevel as keyof typeof levelNames] || userLevel;
  },

  /**
   * 检查是否为管理员
   */
  isAdmin(userLevel: string): boolean {
    return ['ADMIN', 'SUPER_ADMIN'].includes(userLevel);
  },

  /**
   * 检查是否为创作者或以上
   */
  isCreatorOrAbove(userLevel: string): boolean {
    return this.checkUserLevel(userLevel, 'CREATOR');
  },
};
