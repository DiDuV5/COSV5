/**
 * @fileoverview 清理统计组件
 * @description 专门显示清理统计信息和建议
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import React from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, HardDrive, Files } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CleanupService,
  type CleanupStatus,
  type DeduplicationStats,
} from '../services/cleanup-service';

/**
 * 清理统计属性接口
 */
export interface CleanupStatsProps {
  status?: CleanupStatus;
  deduplicationStats?: DeduplicationStats;
  isPending?: boolean;
  className?: string;
}

/**
 * 清理统计组件
 */
export function CleanupStats({
  status,
  deduplicationStats,
  isPending = false,
  className,
}: CleanupStatsProps) {
  if (isPending) {
    return <CleanupStatsSkeleton />;
  }

  if (!status) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          无法加载清理统计信息
        </AlertDescription>
      </Alert>
    );
  }

  const suggestions = CleanupService.generateCleanupSuggestions(status);
  const priorities = CleanupService.calculateCleanupPriority(status);

  return (
    <div className={cn('space-y-6', className)}>
      {/* 总体统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <HardDrive className="h-4 w-4 mr-2" />
              总占用空间
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {CleanupService.formatBytes(status.totalSize)}
            </div>
            <div className="text-xs text-muted-foreground">
              可清理空间
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Files className="h-4 w-4 mr-2" />
              临时文件
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.tempFiles.count}</div>
            <div className="text-xs text-muted-foreground">
              {CleanupService.formatBytes(status.tempFiles.size)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              孤儿文件
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.orphanFiles.count}</div>
            <div className="text-xs text-muted-foreground">
              {CleanupService.formatBytes(status.orphanFiles.size)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              重复文件
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.duplicateFiles.count}</div>
            <div className="text-xs text-muted-foreground">
              {CleanupService.formatBytes(status.duplicateFiles.size)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 详细统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 文件类型分布 */}
        <Card>
          <CardHeader>
            <CardTitle>文件类型分布</CardTitle>
            <CardDescription>
              各类型文件的数量和占用空间
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="text-sm">临时文件</span>
                </div>
                <div className="text-sm font-medium">
                  {CleanupService.formatBytes(status.tempFiles.size)}
                </div>
              </div>
              <Progress
                value={(status.tempFiles.size / status.totalSize) * 100}
                className="h-2"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <span className="text-sm">孤儿文件</span>
                </div>
                <div className="text-sm font-medium">
                  {CleanupService.formatBytes(status.orphanFiles.size)}
                </div>
              </div>
              <Progress
                value={(status.orphanFiles.size / status.totalSize) * 100}
                className="h-2"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <span className="text-sm">重复文件</span>
                </div>
                <div className="text-sm font-medium">
                  {CleanupService.formatBytes(status.duplicateFiles.size)}
                </div>
              </div>
              <Progress
                value={(status.duplicateFiles.size / status.totalSize) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* 去重统计 */}
        {deduplicationStats && (
          <Card>
            <CardHeader>
              <CardTitle>去重统计</CardTitle>
              <CardDescription>
                重复文件分析结果
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">总文件数</div>
                  <div className="text-lg font-semibold">
                    {deduplicationStats.totalFiles.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">重复组数</div>
                  <div className="text-lg font-semibold">
                    {deduplicationStats.duplicateGroups.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">重复文件</div>
                  <div className="text-lg font-semibold">
                    {deduplicationStats.duplicateFiles.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">可节省空间</div>
                  <div className="text-lg font-semibold text-green-600">
                    {CleanupService.formatBytes(deduplicationStats.potentialSavings)}
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                上次扫描: {CleanupService.formatDate(deduplicationStats.lastScan)}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 清理建议 */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              清理建议
            </CardTitle>
            <CardDescription>
              基于当前状态的清理建议
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm">{suggestion}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 清理优先级 */}
      {priorities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              清理优先级
            </CardTitle>
            <CardDescription>
              推荐的清理执行顺序
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {priorities.map((priority, index) => (
                <div key={priority.type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <div>
                      <div className="font-medium">
                        {CleanupService.getTaskConfig(priority.type)?.name || priority.type}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {priority.reason}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={priority.priority >= 8 ? 'destructive' :
                            priority.priority >= 6 ? 'default' : 'secondary'}
                  >
                    优先级 {priority.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 最后清理时间 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">清理历史</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">临时文件清理</div>
              <div className="font-medium">
                {CleanupService.formatDate(status.tempFiles.lastCleanup)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">孤儿文件清理</div>
              <div className="font-medium">
                {CleanupService.formatDate(status.orphanFiles.lastCleanup)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">全面清理</div>
              <div className="font-medium">
                {CleanupService.formatDate(status.lastFullCleanup)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 清理统计骨架组件
 */
export function CleanupStatsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 总体统计骨架 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 详细统计骨架 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-5 bg-gray-200 rounded w-32" />
              <div className="h-4 bg-gray-200 rounded w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-24" />
                    <div className="h-4 bg-gray-200 rounded w-16" />
                  </div>
                  <div className="h-2 bg-gray-200 rounded" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 建议骨架 */}
      <Card>
        <CardHeader>
          <div className="h-5 bg-gray-200 rounded w-24" />
          <div className="h-4 bg-gray-200 rounded w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
