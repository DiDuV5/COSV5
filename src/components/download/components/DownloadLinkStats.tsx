/**
 * @fileoverview 下载链接统计组件
 * @description 专门显示下载链接的统计信息和摘要
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import React from 'react';
import { Link, Coins, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getPlatformById, getPlatformSubTypeById } from '@/lib/download-platforms';
import type { DownloadLink, LinkStats } from '../services/download-link-service';

/**
 * 下载链接统计属性接口
 */
export interface DownloadLinkStatsProps {
  links: DownloadLink[];
  stats: LinkStats;
  showDetails?: boolean;
  className?: string;
}

/**
 * 下载链接统计组件
 */
export function DownloadLinkStats({
  links,
  stats,
  showDetails = true,
  className,
}: DownloadLinkStatsProps) {
  /**
   * 获取平台颜色
   */
  const getPlatformColor = (platformId: string) => {
    const colorMap: Record<string, string> = {
      baidu: 'bg-blue-500',
      aliyun: 'bg-orange-500',
      lanzou: 'bg-green-500',
      quark: 'bg-purple-500',
      '123pan': 'bg-red-500',
    };
    return colorMap[platformId] || 'bg-gray-500';
  };

  /**
   * 获取价格分布
   */
  const getPriceDistribution = () => {
    const free = links.filter(link => link.cansPrice === 0).length;
    const paid = links.filter(link => link.cansPrice > 0).length;

    return { free, paid };
  };

  const priceDistribution = getPriceDistribution();

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-sm">
          <BarChart3 className="h-4 w-4" />
          <span>链接统计</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 基础统计 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-blue-600">
              <Link className="h-4 w-4" />
              <span className="text-lg font-semibold">{stats.totalLinks}</span>
            </div>
            <p className="text-xs text-muted-foreground">总链接数</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-orange-600">
              <Coins className="h-4 w-4" />
              <span className="text-lg font-semibold">{stats.totalPrice}</span>
            </div>
            <p className="text-xs text-muted-foreground">总价格</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span className="text-lg font-semibold">{stats.averagePrice}</span>
            </div>
            <p className="text-xs text-muted-foreground">平均价格</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-purple-600">
              <BarChart3 className="h-4 w-4" />
              <span className="text-lg font-semibold">{Object.keys(stats.platformCount).length}</span>
            </div>
            <p className="text-xs text-muted-foreground">平台数量</p>
          </div>
        </div>

        {showDetails && (
          <>
            {/* 平台分布 */}
            {Object.keys(stats.platformCount).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">平台分布</h4>
                <div className="space-y-2">
                  {Object.entries(stats.platformCount).map(([platformId, count]) => {
                    const platform = getPlatformById(platformId);
                    const percentage = (count / stats.totalLinks) * 100;

                    return (
                      <div key={platformId} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <div className={cn('w-3 h-3 rounded', getPlatformColor(platformId))} />
                            <span>{platform?.name || platformId}</span>
                          </div>
                          <span className="text-muted-foreground">{count} 个</span>
                        </div>
                        <Progress value={percentage} className="h-1" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 子类型分布 */}
            {Object.keys(stats.platformSubTypeCount).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">类型分布</h4>
                <div className="space-y-2">
                  {Object.entries(stats.platformSubTypeCount).map(([subTypeId, count]) => {
                    // 解析平台和子类型
                    const [platformId] = subTypeId.split('-');
                    const subType = getPlatformSubTypeById(platformId, subTypeId);
                    const percentage = (count / stats.totalLinks) * 100;

                    return (
                      <div key={subTypeId} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <div className={cn('w-3 h-3 rounded', subType?.color || 'bg-gray-300')} />
                            <span>{subType?.name || subTypeId}</span>
                            {subType?.badge && (
                              <Badge variant="outline" className="text-xs">{subType.badge}</Badge>
                            )}
                          </div>
                          <span className="text-muted-foreground">{count} 个</span>
                        </div>
                        <Progress value={percentage} className="h-1" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 价格分布 */}
            {stats.totalLinks > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">价格分布</h4>
                <div className="flex space-x-2">
                  <Badge variant="outline" className="text-xs">
                    免费: {priceDistribution.free} 个
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    付费: {priceDistribution.paid} 个
                  </Badge>
                </div>

                {priceDistribution.paid > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">
                      付费链接占比: {Math.round((priceDistribution.paid / stats.totalLinks) * 100)}%
                    </div>
                    <Progress
                      value={(priceDistribution.paid / stats.totalLinks) * 100}
                      className="h-1"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 链接质量检查 */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">质量检查</h4>
              <div className="space-y-1">
                {links.some(link => !link.title || !link.title.trim()) && (
                  <div className="flex items-center space-x-2 text-amber-600 text-xs">
                    <AlertTriangle className="h-3 w-3" />
                    <span>部分链接缺少标题</span>
                  </div>
                )}

                {links.some(link => !link.url || !link.url.trim()) && (
                  <div className="flex items-center space-x-2 text-red-600 text-xs">
                    <AlertTriangle className="h-3 w-3" />
                    <span>部分链接缺少URL</span>
                  </div>
                )}

                {links.some(link => {
                  const platform = getPlatformById(link.platform);
                  return platform?.needsExtractCode && !link.extractCode?.trim();
                }) && (
                  <div className="flex items-center space-x-2 text-orange-600 text-xs">
                    <AlertTriangle className="h-3 w-3" />
                    <span>部分链接缺少提取码</span>
                  </div>
                )}

                {links.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    暂无下载链接
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 简化版下载链接统计
 */
export function SimpleDownloadLinkStats({
  stats,
  className,
}: Pick<DownloadLinkStatsProps, 'stats' | 'className'>) {
  return (
    <div className={cn('flex items-center space-x-4 text-sm', className)}>
      <div className="flex items-center space-x-1 text-blue-600">
        <Link className="h-4 w-4" />
        <span>{stats.totalLinks} 个链接</span>
      </div>

      {stats.totalPrice > 0 && (
        <div className="flex items-center space-x-1 text-orange-600">
          <Coins className="h-4 w-4" />
          <span>{stats.totalPrice} 罐头</span>
        </div>
      )}

      <div className="flex items-center space-x-1 text-purple-600">
        <BarChart3 className="h-4 w-4" />
        <span>{Object.keys(stats.platformCount).length} 个平台</span>
      </div>
    </div>
  );
}

/**
 * 下载链接摘要组件
 */
export function DownloadLinkSummary({
  links,
  stats,
  className,
}: Pick<DownloadLinkStatsProps, 'links' | 'stats' | 'className'>) {
  const platforms = Object.keys(stats.platformCount);

  if (stats.totalLinks === 0) {
    return (
      <div className={cn('text-center py-4 text-muted-foreground', className)}>
        暂无下载链接
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {stats.totalLinks} 个下载链接
        </span>
        {stats.totalPrice > 0 && (
          <Badge variant="outline" className="text-xs">
            总价 {stats.totalPrice} 罐头
          </Badge>
        )}
      </div>

      {platforms.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {platforms.map(platformId => {
            const platform = getPlatformById(platformId);
            const count = stats.platformCount[platformId];

            return (
              <Badge key={platformId} variant="secondary" className="text-xs">
                {platform?.name || platformId} ({count})
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * 下载链接统计骨架组件
 */
export function DownloadLinkStatsSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-5 bg-gray-200 rounded w-24" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <div className="h-6 bg-gray-200 rounded w-8 mx-auto" />
              <div className="h-3 bg-gray-200 rounded w-12 mx-auto" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-20" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between">
                  <div className="h-3 bg-gray-200 rounded w-16" />
                  <div className="h-3 bg-gray-200 rounded w-8" />
                </div>
                <div className="h-1 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
