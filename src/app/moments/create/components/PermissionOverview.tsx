/**
 * @fileoverview 权限概览组件
 * @description 显示用户权限状态和限制信息
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Hash, Image, Video, CheckCircle, XCircle } from 'lucide-react';

import type { PermissionOverviewProps } from '../types';
import { getUserLevelDisplayConfig, formatRemainingPublishes } from '../utils';

/**
 * @component PermissionOverview
 * @description 权限概览组件
 */
export function PermissionOverview({ permissionInfo, dailyLimit }: PermissionOverviewProps) {
  const userLevelConfig = getUserLevelDisplayConfig(permissionInfo.userLevel);

  return (
    <Card className="mb-6 border-l-4 border-l-blue-500">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            权限概览
          </CardTitle>
          <Badge
            variant={userLevelConfig.badgeVariant}
            className="text-sm"
          >
            {userLevelConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 发布权限 */}
          <PublishPermissionSection 
            dailyLimit={dailyLimit}
            permissionInfo={permissionInfo}
          />

          {/* 图片上传权限 */}
          <ImageUploadPermissionSection 
            permissionInfo={permissionInfo}
          />

          {/* 视频上传权限 */}
          <VideoUploadPermissionSection 
            permissionInfo={permissionInfo}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * @component PublishPermissionSection
 * @description 发布权限部分
 */
function PublishPermissionSection({ 
  dailyLimit, 
  permissionInfo 
}: { 
  dailyLimit: PermissionOverviewProps['dailyLimit'];
  permissionInfo: PermissionOverviewProps['permissionInfo'];
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Hash className="w-4 h-4 text-green-500" />
        发布权限
      </div>
      <div className="text-sm text-gray-600">
        <p>今日已发布: {dailyLimit.todayCount} 条</p>
        <p>剩余次数: {formatRemainingPublishes(dailyLimit.remaining)}</p>
        <p>内容长度: {permissionInfo.momentMinLength}-{permissionInfo.momentMaxLength} 字符</p>
      </div>
    </div>
  );
}

/**
 * @component ImageUploadPermissionSection
 * @description 图片上传权限部分
 */
function ImageUploadPermissionSection({ 
  permissionInfo 
}: { 
  permissionInfo: PermissionOverviewProps['permissionInfo'];
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Image className="w-4 h-4 text-purple-500" />
        图片上传
      </div>
      <div className="text-sm text-gray-600">
        {permissionInfo.canUploadImages ? (
          <>
            <p className="text-green-600 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              允许上传
            </p>
            <p>
              单次限制: {permissionInfo.maxImagesPerUpload === -1 
                ? '无限制' 
                : `${permissionInfo.maxImagesPerUpload} 张`}
            </p>
          </>
        ) : (
          <p className="text-red-600 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            不允许上传
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * @component VideoUploadPermissionSection
 * @description 视频上传权限部分
 */
function VideoUploadPermissionSection({ 
  permissionInfo 
}: { 
  permissionInfo: PermissionOverviewProps['permissionInfo'];
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Video className="w-4 h-4 text-red-500" />
        视频上传
      </div>
      <div className="text-sm text-gray-600">
        {permissionInfo.canUploadVideos ? (
          <>
            <p className="text-green-600 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              允许上传
            </p>
            <p>
              单次限制: {permissionInfo.maxVideosPerUpload === -1 
                ? '无限制' 
                : `${permissionInfo.maxVideosPerUpload} 个`}
            </p>
          </>
        ) : (
          <p className="text-red-600 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            不允许上传
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * @component CompactPermissionOverview
 * @description 紧凑版权限概览组件
 */
export function CompactPermissionOverview({ 
  permissionInfo, 
  dailyLimit 
}: PermissionOverviewProps) {
  const userLevelConfig = getUserLevelDisplayConfig(permissionInfo.userLevel);

  return (
    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-blue-800">权限状态</span>
        </div>
        <Badge variant={userLevelConfig.badgeVariant} className="text-xs">
          {userLevelConfig.label}
        </Badge>
      </div>
      
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="text-center">
          <div className="text-blue-600 font-medium">{dailyLimit.remaining === -1 ? '∞' : dailyLimit.remaining}</div>
          <div className="text-blue-500">剩余发布</div>
        </div>
        
        <div className="text-center">
          <div className={`font-medium ${permissionInfo.canUploadImages ? 'text-green-600' : 'text-red-600'}`}>
            {permissionInfo.canUploadImages ? '✓' : '✗'}
          </div>
          <div className="text-blue-500">图片上传</div>
        </div>
        
        <div className="text-center">
          <div className={`font-medium ${permissionInfo.canUploadVideos ? 'text-green-600' : 'text-red-600'}`}>
            {permissionInfo.canUploadVideos ? '✓' : '✗'}
          </div>
          <div className="text-blue-500">视频上传</div>
        </div>
      </div>
    </div>
  );
}

/**
 * @component PermissionOverviewSkeleton
 * @description 权限概览骨架屏组件
 */
export function PermissionOverviewSkeleton() {
  return (
    <Card className="mb-6 border-l-4 border-l-gray-200 animate-pulse">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-200 rounded" />
            <div className="h-5 bg-gray-200 rounded w-20" />
          </div>
          <div className="h-6 bg-gray-200 rounded w-16" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded w-16" />
              </div>
              <div className="space-y-1">
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
