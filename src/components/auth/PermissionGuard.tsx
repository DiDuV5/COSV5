/**
 * @fileoverview 统一权限验证组件
 * @description 提供统一的权限验证UI组件，简化权限检查的使用
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

'use client';

import React from 'react';
import { Lock, Shield, AlertCircle, Crown, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePermissionCheck, type PermissionCheckOptions, PermissionUtils } from '@/hooks/use-permission-check';

/**
 * 权限守卫组件属性
 */
export interface PermissionGuardProps extends PermissionCheckOptions {
  /** 子组件 */
  children: React.ReactNode;
  /** 自定义加载组件 */
  loadingComponent?: React.ReactNode;
  /** 自定义权限不足组件 */
  fallbackComponent?: React.ReactNode;
  /** 是否显示详细错误信息 */
  showDetails?: boolean;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 默认加载组件
 */
function DefaultLoadingComponent() {
  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="text-center py-8">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">正在验证权限...</p>
      </CardContent>
    </Card>
  );
}

/**
 * 默认权限不足组件
 */
function DefaultFallbackComponent({
  error,
  user,
  details,
  showDetails = false,
  requiredLevel,
}: {
  error?: string;
  user?: any;
  details?: string;
  showDetails?: boolean;
  requiredLevel?: string;
}) {
  const getIcon = () => {
    if (!user) return <Lock className="w-12 h-12 text-gray-400" />;
    if (requiredLevel === 'ADMIN') return <Shield className="w-12 h-12 text-red-400" />;
    if (requiredLevel === 'CREATOR') return <Star className="w-12 h-12 text-purple-400" />;
    return <AlertCircle className="w-12 h-12 text-orange-400" />;
  };

  const getTitle = () => {
    if (!user) return '请先登录';
    if (error?.includes('权限')) return '权限不足';
    if (error?.includes('验证')) return '需要验证';
    return '访问受限';
  };

  const getDescription = () => {
    if (!user) return '您需要登录后才能访问此功能。';
    return error || '您当前没有访问此功能的权限。';
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="text-center py-8">
        <div className="mb-4">
          {getIcon()}
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {getTitle()}
        </h2>
        <p className="text-gray-600 mb-4">
          {getDescription()}
        </p>

        {user && (
          <div className="mb-4">
            <Badge variant="outline" className="mb-2">
              当前等级: {PermissionUtils.getUserLevelDisplayName(user.userLevel)}
            </Badge>
            {requiredLevel && (
              <Badge variant="secondary">
                需要等级: {PermissionUtils.getUserLevelDisplayName(requiredLevel)}
              </Badge>
            )}
          </div>
        )}

        {showDetails && details && (
          <div className="text-sm text-gray-500 mb-4 p-3 bg-gray-50 rounded-lg">
            <p>{details}</p>
          </div>
        )}

        <div className="space-y-2">
          {!user ? (
            <Button
              onClick={() => window.location.href = '/auth/signin'}
              className="w-full"
            >
              立即登录
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="w-full"
            >
              返回上页
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 权限守卫组件
 *
 * @example
 * ```tsx
 * // 基本使用
 * <PermissionGuard requiredLevel="CREATOR">
 *   <CreatePostForm />
 * </PermissionGuard>
 *
 * // 高级使用
 * <PermissionGuard
 *   requiredLevel="ADMIN"
 *   requireVerified={true}
 *   showDetails={true}
 *   autoRedirect={false}
 * >
 *   <AdminPanel />
 * </PermissionGuard>
 * ```
 */
export function PermissionGuard({
  children,
  loadingComponent,
  fallbackComponent,
  showDetails = false,
  className,
  ...permissionOptions
}: PermissionGuardProps) {
  const { hasPermission, isLoading, error, user, details } = usePermissionCheck(permissionOptions);

  // 显示加载状态
  if (isLoading) {
    return (
      <div className={className}>
        {loadingComponent || <DefaultLoadingComponent />}
      </div>
    );
  }

  // 权限检查失败
  if (!hasPermission) {
    return (
      <div className={className}>
        {fallbackComponent || (
          <DefaultFallbackComponent
            error={error}
            user={user}
            details={details}
            showDetails={showDetails}
            requiredLevel={permissionOptions.requiredLevel}
          />
        )}
      </div>
    );
  }

  // 权限检查通过，渲染子组件
  return <>{children}</>;
}

/**
 * 权限检查高阶组件
 */
export function withPermissionGuard<P extends object>(
  Component: React.ComponentType<P>,
  permissionOptions: PermissionCheckOptions
) {
  return function PermissionGuardedComponent(props: P) {
    return (
      <PermissionGuard {...permissionOptions}>
        <Component {...props} />
      </PermissionGuard>
    );
  };
}

/**
 * 条件权限组件 - 根据权限显示不同内容
 */
export function ConditionalPermission({
  children,
  fallback,
  ...permissionOptions
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
} & PermissionCheckOptions) {
  const { hasPermission, isLoading } = usePermissionCheck(permissionOptions);

  if (isLoading) {
    return null; // 或者返回加载指示器
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}
