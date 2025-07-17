/**
 * @fileoverview 邮箱清理部分组件
 * @author Augment AI
 * @date 2025-07-03
 */
"use client";


import React from "react";
import { Trash2, CheckCircle, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CleanupType } from "../types/email-management";

interface EmailCleanupSectionProps {
  cleanupStats: any;
  emailStatusDetails: any;
  cleanupStatsLoading: boolean;
  emailStatusLoading: boolean;
  isLoading: boolean;
  onCleanupConfirm: (_type: CleanupType) => void;
  onRefreshStats: () => void;
}

export function EmailCleanupSection({
  cleanupStats,
  emailStatusDetails,
  cleanupStatsLoading,
  emailStatusLoading,
  isLoading,
  onCleanupConfirm,
  onRefreshStats,
}: EmailCleanupSectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            邮箱清理
          </CardTitle>
          <CardDescription>
            清理未验证邮箱和过期验证令牌
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cleanupStatsLoading ? (
            <div>加载统计数据中...</div>
          ) : cleanupStats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">未验证用户</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {cleanupStats.unverifiedUsers || 0}
                </div>
                <div className="text-sm text-gray-500">
                  超过7天未验证
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">过期令牌</span>
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  {cleanupStats.expiredTokens || 0}
                </div>
                <div className="text-sm text-gray-500">
                  已过期的验证令牌
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="font-medium">已验证用户</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {cleanupStats.verifiedUsers || 0}
                </div>
                <div className="text-sm text-gray-500">
                  邮箱已验证的用户
                </div>
              </div>
            </div>
          ) : (
            <div>无法加载统计数据</div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h4 className="font-medium">清理未验证邮箱</h4>
                <p className="text-sm text-gray-500">
                  删除注册超过7天但未验证邮箱的用户账户
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => onCleanupConfirm('unverified')}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                清理未验证
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h4 className="font-medium">清理过期令牌</h4>
                <p className="text-sm text-gray-500">
                  删除所有已过期的邮箱验证令牌
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => onCleanupConfirm('expired')}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                清理过期令牌
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg border-red-200 bg-red-50">
              <div>
                <h4 className="font-medium text-red-700">完整清理</h4>
                <p className="text-sm text-red-600">
                  执行完整的邮箱清理，包括未验证用户和过期令牌
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => onCleanupConfirm('all')}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                完整清理
              </Button>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={onRefreshStats}
            disabled={cleanupStatsLoading}
            className="w-full"
          >
            刷新统计数据
          </Button>
        </CardContent>
      </Card>

      {emailStatusDetails && (
        <Card>
          <CardHeader>
            <CardTitle>邮箱状态详情</CardTitle>
            <CardDescription>
              详细的邮箱验证状态统计
            </CardDescription>
          </CardHeader>
          <CardContent>
            {emailStatusLoading ? (
              <div>加载详情中...</div>
            ) : (
              <div className="space-y-3">
                {emailStatusDetails.statusBreakdown?.map((status: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={status.verified ? "default" : "secondary"}>
                        {status.verified ? "已验证" : "未验证"}
                      </Badge>
                      <span className="font-medium">{status.domain || '其他域名'}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{status.count}</div>
                      <div className="text-sm text-gray-500">用户</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
