/**
 * @fileoverview 用户等级选择组件
 * @description 显示用户等级选择卡片和权限配置概览
 */

"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  RefreshCw,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { USER_LEVEL_CONFIGS } from "@/lib/constants/user-levels";
import type { UserLevelSelectorProps } from "../types";
import { getPermissionStatus, getPermissionSummary } from "../utils";

export function UserLevelSelector({
  configs,
  selectedLevel,
  onLevelChange,
  onInitializeDefaults,
  isInitializing,
}: UserLevelSelectorProps) {
  return (
    <div className="space-y-6">
      {/* 页面标题和操作按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">权限管理</h2>
          <p className="text-gray-600 mt-1">配置不同用户等级的权限设置</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onInitializeDefaults}
            disabled={isInitializing}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            初始化默认配置
          </Button>
        </div>
      </div>

      {/* 权限配置概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            权限配置概览
          </CardTitle>
          <CardDescription>
            查看所有用户等级的权限配置状态
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {USER_LEVEL_CONFIGS.map((level) => {
              const config = configs?.find(c => c.userLevel === level.value);
              const status = getPermissionStatus(config);
              const summary = config ? getPermissionSummary(config) : null;

              return (
                <Card
                  key={level.value}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    selectedLevel === level.value ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => onLevelChange(level.value)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={level.color}>
                        {level.label}
                      </Badge>
                      {status.hasConfig ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{level.description}</p>
                    
                    {summary && (
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>发布动态:</span>
                          <span className={config?.canPublishMoments ? 'text-green-600' : 'text-red-600'}>
                            {summary.canPublishMoments}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>发布作品:</span>
                          <span className={config?.canPublishPosts ? 'text-green-600' : 'text-red-600'}>
                            {summary.canPublishPosts}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>每日动态限制:</span>
                          <span>{summary.dailyMomentsLimit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>图片上传:</span>
                          <span className={config?.canUploadImages ? 'text-green-600' : 'text-red-600'}>
                            {summary.canUploadImages}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>视频上传:</span>
                          <span className={config?.canUploadVideos ? 'text-green-600' : 'text-red-600'}>
                            {summary.canUploadVideos}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {!status.hasConfig && (
                      <div className="text-xs text-gray-500 mt-2">
                        点击配置此等级的权限
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
