/**
 * @fileoverview 帖子媒体组件
 * @description 显示帖子的媒体内容
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */
"use client";


import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import HighPerformanceMasonryGridRefactored from '@/components/media/masonry/HighPerformanceMasonryGrid-refactored';
import type { PostMediaProps } from '../types';

export function PostMedia({
  post,
  userLevel,
  onMediaClick,
  onPermissionUpgrade
}: PostMediaProps) {
  const [showPermissionDetails, setShowPermissionDetails] = useState(false);

  // 调试日志
  console.log('🎭 PostMedia 组件渲染:', {
    postId: post.id,
    mediaExists: !!post.media,
    mediaLength: post.media?.length || 0,
    mediaData: post.media
  });

  // 专门调试视频缩略图
  const videoMedia = post.media?.filter((m: any) => m.mediaType === 'VIDEO');
  if (videoMedia && videoMedia.length > 0) {
    console.log('🎬 PostMedia 视频媒体调试:', {
      videoCount: videoMedia.length,
      videoData: videoMedia.map((v: any) => ({
        id: v.id,
        filename: v.filename,
        mediaType: v.mediaType,
        url: v.url,
        thumbnailUrl: v.thumbnailUrl,
        isProcessed: v.isProcessed,
        processingStatus: v.processingStatus
      }))
    });
  }

  // 如果没有媒体内容，不渲染
  if (!post.media || post.media.length === 0) {
    console.log('🎭 PostMedia 组件：没有媒体内容，不渲染');
    return null;
  }

  console.log('🎭 PostMedia 组件：有媒体内容，继续渲染');

  // 临时演示：模拟不同权限级别（仅用于演示）
  // const demoUserLevel = 'USER'; // 可以改为 'GUEST', 'USER', 'VIP', 'CREATOR', 'ADMIN'
  // userLevel = demoUserLevel;

  // 计算用户权限信息
  const getUserPermissionInfo = () => {
    const totalMedia = post.media.length;

    // 根据用户等级确定访问权限
    const permissionMap = {
      'GUEST': { accessPercent: 20, label: '游客', color: 'text-gray-600', bgColor: 'bg-gray-100' },
      'USER': { accessPercent: 40, label: '注册用户', color: 'text-blue-600', bgColor: 'bg-blue-100' },
      'VIP': { accessPercent: 60, label: 'VIP用户', color: 'text-purple-600', bgColor: 'bg-purple-100' },
      'CREATOR': { accessPercent: 80, label: '创作者', color: 'text-green-600', bgColor: 'bg-green-100' },
      'ADMIN': { accessPercent: 100, label: '管理员', color: 'text-red-600', bgColor: 'bg-red-100' },
      'SUPER_ADMIN': { accessPercent: 100, label: '超级管理员', color: 'text-red-700', bgColor: 'bg-red-100' }
    };

    const permission = permissionMap[userLevel as keyof typeof permissionMap] || permissionMap['GUEST'];
    const accessibleCount = Math.ceil(totalMedia * permission.accessPercent / 100);

    return {
      ...permission,
      accessibleCount,
      totalMedia,
      restrictedCount: totalMedia - accessibleCount
    };
  };

  const permissionInfo = getUserPermissionInfo();

  // 获取详细权限信息
  const getDetailedPermissions = () => {
    const basePermissions = {
      'GUEST': {
        mediaAccess: 20,
        restrictedPreview: false,
        videoPlayback: false,
        imageDownload: false,
        commentPost: false,
        contentCreate: false
      },
      'USER': {
        mediaAccess: 40,
        restrictedPreview: true,
        videoPlayback: true,
        imageDownload: false,
        commentPost: true,
        contentCreate: false
      },
      'VIP': {
        mediaAccess: 60,
        restrictedPreview: true,
        videoPlayback: true,
        imageDownload: true,
        commentPost: true,
        contentCreate: true
      },
      'CREATOR': {
        mediaAccess: 80,
        restrictedPreview: true,
        videoPlayback: true,
        imageDownload: true,
        commentPost: true,
        contentCreate: true
      },
      'ADMIN': {
        mediaAccess: 100,
        restrictedPreview: true,
        videoPlayback: true,
        imageDownload: true,
        commentPost: true,
        contentCreate: true
      },
      'SUPER_ADMIN': {
        mediaAccess: 100,
        restrictedPreview: true,
        videoPlayback: true,
        imageDownload: true,
        commentPost: true,
        contentCreate: true
      }
    };

    return basePermissions[userLevel as keyof typeof basePermissions] || basePermissions['GUEST'];
  };

  const detailedPermissions = getDetailedPermissions();

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">
            媒体内容 ({post.media.length})
          </h3>

          {/* 权限信息显示 */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${permissionInfo.color} ${permissionInfo.bgColor}`}>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <span>{permissionInfo.label}</span>
              <span className="text-xs opacity-75">
                {permissionInfo.accessPercent}%
              </span>
            </div>
            <button
              onClick={() => setShowPermissionDetails(!showPermissionDetails)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            >
              <span>详情</span>
              <svg
                className={`w-3 h-3 transition-transform ${showPermissionDetails ? 'rotate-180' : ''}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* 可访问内容进度条 */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between text-sm text-gray-700 mb-2">
            <span className="font-medium">可访问内容</span>
            <span className="text-lg font-bold text-gray-900">
              {permissionInfo.accessibleCount}/{permissionInfo.totalMedia}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                permissionInfo.accessPercent === 100
                  ? 'bg-green-500'
                  : permissionInfo.accessPercent >= 80
                    ? 'bg-blue-500'
                    : permissionInfo.accessPercent >= 60
                      ? 'bg-yellow-500'
                      : 'bg-orange-500'
              }`}
              style={{ width: `${permissionInfo.accessPercent}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
            <span>访问权限: {permissionInfo.accessPercent}%</span>
            {permissionInfo.restrictedCount > 0 && (
              <span className="text-amber-600">
                {permissionInfo.restrictedCount} 项受限
              </span>
            )}
          </div>
        </div>

        {/* 详细权限信息展开区域 */}
        {showPermissionDetails && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-3">当前权限详情</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">媒体访问:</span>
                <span className={`font-medium ${detailedPermissions.mediaAccess === 100 ? 'text-green-600' : 'text-blue-600'}`}>
                  {detailedPermissions.mediaAccess}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">受限预览:</span>
                <span className={`font-medium ${detailedPermissions.restrictedPreview ? 'text-green-600' : 'text-red-600'}`}>
                  {detailedPermissions.restrictedPreview ? '允许' : '禁止'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">视频播放:</span>
                <span className={`font-medium ${detailedPermissions.videoPlayback ? 'text-green-600' : 'text-red-600'}`}>
                  {detailedPermissions.videoPlayback ? '允许' : '禁止'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">图片下载:</span>
                <span className={`font-medium ${detailedPermissions.imageDownload ? 'text-green-600' : 'text-red-600'}`}>
                  {detailedPermissions.imageDownload ? '允许' : '禁止'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">评论发布:</span>
                <span className={`font-medium ${detailedPermissions.commentPost ? 'text-green-600' : 'text-red-600'}`}>
                  {detailedPermissions.commentPost ? '允许' : '禁止'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">内容创建:</span>
                <span className={`font-medium ${detailedPermissions.contentCreate ? 'text-green-600' : 'text-red-600'}`}>
                  {detailedPermissions.contentCreate ? '允许' : '禁止'}
                </span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <button
                onClick={() => alert('正在开发，敬请期待')}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                升级
              </button>
            </div>
          </div>
        )}

        {/* 高性能瀑布流媒体展示 */}
        <HighPerformanceMasonryGridRefactored
          media={post.media as any[]}
          userLevel={userLevel}
          onItemClick={(item) => {
            // 找到点击项在媒体数组中的正确索引
            const index = post.media.findIndex((media: any) => media.id === item.id);
            onMediaClick(item, index >= 0 ? index : 0);
          }}
          enablePermissionUpgrade={false}
          onPermissionUpgrade={onPermissionUpgrade}
          showPermissionController={false}
          className="w-full"
        />

        {/* 权限升级提示 */}
        {permissionInfo.restrictedCount > 0 && userLevel !== 'ADMIN' && userLevel !== 'SUPER_ADMIN' && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">
                还有 {permissionInfo.restrictedCount} 项内容需要更高权限
              </span>
            </div>
            <p className="text-xs text-amber-600 mt-1">
              升级到更高级别即可查看全部内容
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
