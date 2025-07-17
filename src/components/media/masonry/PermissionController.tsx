/**
 * @fileoverview 权限控制组件
 * @description 处理媒体访问权限控制逻辑，从原 HighPerformanceMasonryGrid.tsx 重构而来
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 */

'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Crown, Star, Shield, Unlock, Filter } from 'lucide-react';
import type { MediaItem } from './layout-calculator';

// 媒体访问限制配置
export const MEDIA_ACCESS_LIMITS = {
  GUEST: { percentage: 20, canViewRestrictedPreview: false },
  USER: { percentage: 40, canViewRestrictedPreview: true },
  VIP: { percentage: 70, canViewRestrictedPreview: true },
  CREATOR: { percentage: 85, canViewRestrictedPreview: true },
  ADMIN: { percentage: 100, canViewRestrictedPreview: true },
  SUPER_ADMIN: { percentage: 100, canViewRestrictedPreview: true },
} as const;

export interface PermissionConfig {
  percentage: number;
  canViewRestrictedPreview: boolean;
}

export interface PermissionStats {
  accessible: number;
  restricted: number;
  accessPercentage: number;
  userLevel: string;
  canUpgrade: boolean;
}

export interface PermissionControllerProps {
  media: MediaItem[];
  userLevel: string;
  userPermissions?: any;
  showRestrictedContent: boolean;
  showPermissionDetails: boolean;
  enablePermissionUpgrade?: boolean;
  onToggleRestrictedContent: (show: boolean) => void;
  onTogglePermissionDetails: (show: boolean) => void;
  onPermissionUpgrade?: () => void;
}

/**
 * 权限控制组件
 * 负责处理媒体访问权限的显示和控制
 */
export function PermissionController({
  media,
  userLevel,
  userPermissions,
  showRestrictedContent,
  showPermissionDetails,
  enablePermissionUpgrade = false,
  onToggleRestrictedContent,
  onTogglePermissionDetails,
  onPermissionUpgrade,
}: PermissionControllerProps) {
  // 权限控制配置
  const accessLimit = useMemo((): PermissionConfig => {
    const defaultLimit = MEDIA_ACCESS_LIMITS[userLevel as keyof typeof MEDIA_ACCESS_LIMITS] || MEDIA_ACCESS_LIMITS.GUEST;

    // 如果有API数据，使用API中的权限配置
    if (userPermissions?.mediaAccess) {
      return {
        percentage: userPermissions.mediaAccess.percentage || defaultLimit.percentage,
        canViewRestrictedPreview: userPermissions.mediaAccess.canViewRestrictedPreview ?? defaultLimit.canViewRestrictedPreview,
      };
    }

    return defaultLimit;
  }, [userLevel, userPermissions]);

  const maxAccessibleCount = useMemo(() => {
    return Math.ceil(media.length * (accessLimit.percentage / 100));
  }, [media.length, accessLimit.percentage]);

  // 权限统计信息
  const permissionStats = useMemo((): PermissionStats => {
    const accessible = maxAccessibleCount;
    const restricted = media.length - accessible;
    const accessPercentage = media.length > 0 ? Math.round((accessible / media.length) * 100) : 0;

    return {
      accessible,
      restricted,
      accessPercentage,
      userLevel,
      canUpgrade: enablePermissionUpgrade && userLevel !== 'ADMIN' && userLevel !== 'SUPER_ADMIN',
    };
  }, [maxAccessibleCount, media.length, userLevel, enablePermissionUpgrade]);

  /**
   * 获取用户等级图标
   */
  const getUserLevelIcon = (level: string) => {
    switch (level) {
      case 'VIP':
        return <Star className="w-4 h-4 text-yellow-500" />;
      case 'CREATOR':
        return <Crown className="w-4 h-4 text-purple-500" />;
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <Unlock className="w-4 h-4 text-gray-500" />;
    }
  };

  /**
   * 获取用户等级显示名称
   */
  const getUserLevelDisplayName = (level: string): string => {
    const levelNames = {
      GUEST: '游客',
      USER: '用户',
      VIP: 'VIP会员',
      CREATOR: '创作者',
      ADMIN: '管理员',
      SUPER_ADMIN: '超级管理员',
    };
    return levelNames[level as keyof typeof levelNames] || level;
  };

  /**
   * 获取权限升级建议
   */
  const getUpgradeRecommendation = (level: string): string => {
    switch (level) {
      case 'GUEST':
        return '注册成为用户，解锁更多内容访问权限';
      case 'USER':
        return '升级为VIP会员，享受70%内容访问权限';
      case 'VIP':
        return '成为创作者，获得85%内容访问权限';
      case 'CREATOR':
        return '您已拥有创作者权限，享受85%内容访问';
      default:
        return '您已拥有最高权限';
    }
  };

  if (media.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* 权限状态栏 */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {getUserLevelIcon(userLevel)}
            <span className="font-medium">
              {getUserLevelDisplayName(userLevel)}
            </span>
            <Badge variant="outline" className="text-xs">
              {permissionStats.accessPercentage}% 访问权限
            </Badge>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTogglePermissionDetails(!showPermissionDetails)}
          >
            {showPermissionDetails ? '隐藏详情' : '查看详情'}
          </Button>
        </div>

        {/* 权限进度条 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>可访问内容</span>
            <span>{permissionStats.accessible}/{media.length}</span>
          </div>
          <Progress 
            value={permissionStats.accessPercentage} 
            className="h-2"
          />
        </div>

        {/* 权限详情 */}
        {showPermissionDetails && (
          <div className="mt-4 pt-4 border-t space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">可访问：</span>
                <span className="font-medium text-green-600">
                  {permissionStats.accessible} 项
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">受限制：</span>
                <span className="font-medium text-orange-600">
                  {permissionStats.restricted} 项
                </span>
              </div>
            </div>

            {permissionStats.restricted > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    显示受限内容预览
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onToggleRestrictedContent(!showRestrictedContent)}
                  >
                    <Filter className="w-3 h-3 mr-1" />
                    {showRestrictedContent ? '隐藏' : '显示'}
                  </Button>
                </div>
                
                {accessLimit.canViewRestrictedPreview && (
                  <p className="text-xs text-muted-foreground">
                    您可以查看受限内容的模糊预览
                  </p>
                )}
              </div>
            )}

            {/* 权限升级建议 */}
            {permissionStats.canUpgrade && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800 mb-2">
                  {getUpgradeRecommendation(userLevel)}
                </p>
                {enablePermissionUpgrade && onPermissionUpgrade && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onPermissionUpgrade}
                    className="text-amber-800 border-amber-300 hover:bg-amber-100"
                  >
                    <Crown className="w-3 h-3 mr-1" />
                    升级权限
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 权限控制 Hook
 * 提供权限相关的计算和状态管理
 */
export function usePermissionControl(
  media: MediaItem[],
  userLevel: string,
  userPermissions?: any
) {
  // 权限配置
  const accessLimit = useMemo((): PermissionConfig => {
    const defaultLimit = MEDIA_ACCESS_LIMITS[userLevel as keyof typeof MEDIA_ACCESS_LIMITS] || MEDIA_ACCESS_LIMITS.GUEST;

    if (userPermissions?.mediaAccess) {
      return {
        percentage: userPermissions.mediaAccess.percentage || defaultLimit.percentage,
        canViewRestrictedPreview: userPermissions.mediaAccess.canViewRestrictedPreview ?? defaultLimit.canViewRestrictedPreview,
      };
    }

    return defaultLimit;
  }, [userLevel, userPermissions]);

  const maxAccessibleCount = useMemo(() => {
    return Math.ceil(media.length * (accessLimit.percentage / 100));
  }, [media.length, accessLimit.percentage]);

  // 分离可访问和受限制的媒体
  const { accessibleMedia, restrictedMedia } = useMemo(() => {
    const accessible = media.slice(0, maxAccessibleCount);
    const restricted = media.slice(maxAccessibleCount);
    return { accessibleMedia: accessible, restrictedMedia: restricted };
  }, [media, maxAccessibleCount]);

  return {
    accessLimit,
    maxAccessibleCount,
    accessibleMedia,
    restrictedMedia,
  };
}

/**
 * 导出权限控制组件
 */
export default PermissionController;
