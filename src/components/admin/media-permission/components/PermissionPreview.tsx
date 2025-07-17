/**
 * @fileoverview 权限预览组件
 * @description 预览权限配置的效果和影响
 */

"use client";

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Eye,
  EyeOff,
  Play,
  Download,
  Image as ImageIcon,
  Video,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import {
  MediaPermissionForm,
  type PermissionOverview,
  getUserLevelConfig,
} from '../constants/user-level-configs';

export interface PermissionPreviewProps {
  form: UseFormReturn<MediaPermissionForm>;
  permissionOverview?: {
    configs: any[];
    userStats: Record<string, number>;
  };
}

/**
 * 权限预览组件
 */
export function PermissionPreview({
  form,
  permissionOverview,
}: PermissionPreviewProps) {
  const configs = form.watch('configs');

  // 计算总体统计
  const totalUsers = permissionOverview?.userStats ? Object.values(permissionOverview.userStats).reduce((sum, count) => sum + count, 0) : 0;
  const averageAccess = configs.reduce((sum, config) => sum + config.mediaAccessPercentage, 0) / configs.length;

  return (
    <div className="space-y-6">
      {/* 总体概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">权限配置概览</CardTitle>
          <CardDescription>
            当前配置将影响 {totalUsers.toLocaleString()} 名用户
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {averageAccess.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">平均媒体访问比例</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {configs.filter(c => c.canPlayVideos).length}
              </div>
              <div className="text-sm text-gray-600">可播放视频的等级</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {configs.filter(c => c.canDownloadImages).length}
              </div>
              <div className="text-sm text-gray-600">可下载图片的等级</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 详细权限预览 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {configs.map((config) => {
          const levelInfo = getUserLevelConfig(config.userLevel);
          const userCount = permissionOverview?.userStats?.[config.userLevel] || 0;
          
          return (
            <Card key={config.userLevel} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: levelInfo?.color }}
                    />
                    <CardTitle className="text-base">
                      {levelInfo?.label}
                    </CardTitle>
                  </div>
                  <Badge variant="secondary">
                    {userCount.toLocaleString()} 用户
                  </Badge>
                </div>
                <CardDescription>
                  {levelInfo?.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 媒体访问比例 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">媒体访问比例</span>
                    <span className="text-sm text-gray-600">
                      {config.mediaAccessPercentage}%
                    </span>
                  </div>
                  <Progress value={config.mediaAccessPercentage} className="h-2" />
                </div>

                {/* 权限列表 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {config.canPlayVideos ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <Video className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      视频播放
                    </span>
                    {config.canPlayVideos ? (
                      <Badge variant="default" className="ml-auto">
                        允许
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="ml-auto">
                        禁止
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {config.canViewRestrictedPreview ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    {config.canViewRestrictedPreview ? (
                      <Eye className="w-4 h-4 text-gray-400" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm">
                      受限内容预览
                    </span>
                    {config.canViewRestrictedPreview ? (
                      <Badge variant="default" className="ml-auto">
                        允许
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="ml-auto">
                        禁止
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {config.canDownloadImages ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <Download className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      图片下载
                    </span>
                    {config.canDownloadImages ? (
                      <Badge variant="default" className="ml-auto">
                        允许
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="ml-auto">
                        禁止
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 影响提示 */}
                {userCount > 0 && (
                  <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                    <div className="text-xs text-blue-700">
                      此配置将影响 <strong>{userCount.toLocaleString()}</strong> 名{levelInfo?.label}用户
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
