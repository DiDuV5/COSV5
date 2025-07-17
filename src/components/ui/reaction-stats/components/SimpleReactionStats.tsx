/**
 * @fileoverview 简化版表情反应统计组件
 * @description 轻量级的表情反应显示组件，不包含交互功能
 */

'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { REACTION_CONFIGS } from '@/lib/reaction-types';

import type { SimpleReactionStatsProps } from '../types';
import { 
  SIMPLE_SIZE_CONFIGS, 
  CSS_CLASSES, 
  TEST_IDS, 
  DEFAULT_PROPS 
} from '../constants';
import { 
  filterValidStats, 
  sortStatsByCount, 
  formatReactionCount,
  createTestId 
} from '../utils';

/**
 * @component SimpleReactionStats
 * @description 简化版表情反应统计组件
 */
export function SimpleReactionStats({
  reactionStats,
  size = DEFAULT_PROPS.size,
  className,
}: SimpleReactionStatsProps) {
  // 获取尺寸配置
  const sizeConfig = SIMPLE_SIZE_CONFIGS[size];

  // 处理和排序统计数据
  const processedStats = useMemo(() => {
    const validStats = filterValidStats(reactionStats);
    return sortStatsByCount(validStats);
  }, [reactionStats]);

  // 计算总数
  const totalCount = useMemo(() => {
    return processedStats.reduce((sum, stat) => sum + stat.count, 0);
  }, [processedStats]);

  // 如果没有有效数据，不渲染
  if (processedStats.length === 0) {
    return null;
  }

  return (
    <div 
      className={cn(
        'flex items-center gap-1',
        className
      )}
      data-testid={TEST_IDS.reactionStats}
      role="group"
      aria-label={`表情反应统计，共${totalCount}个反应`}
    >
      {processedStats.map((stat, index) => {
        const config = REACTION_CONFIGS[stat.type];
        
        // 如果找不到配置，跳过
        if (!config) {
          console.warn('SimpleReactionStats: 未找到表情配置', { type: stat.type });
          return null;
        }

        return (
          <motion.div
            key={stat.type}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors"
            data-testid={createTestId(TEST_IDS.reactionBubble, stat.type)}
            title={`${config.label}: ${stat.count}个`}
          >
            <span 
              className={sizeConfig.emoji} 
              aria-hidden="true"
            >
              {config.emoji}
            </span>
            <span 
              className={cn('font-medium text-gray-700', sizeConfig.count)}
              aria-label={`${config.label} ${stat.count}个`}
            >
              {formatReactionCount(stat.count)}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

/**
 * @component SimpleReactionStatsSkeleton
 * @description 简化版表情反应统计骨架屏
 */
export function SimpleReactionStatsSkeleton({ 
  count = 3,
  size = 'md',
  className 
}: { 
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeConfig = SIMPLE_SIZE_CONFIGS[size];
  
  return (
    <div 
      className={cn('flex items-center gap-1', className)}
      data-testid={`${TEST_IDS.reactionStats}-skeleton`}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 animate-pulse"
        >
          <div 
            className={cn(
              'bg-gray-200 rounded',
              sizeConfig.emoji === 'text-xs' ? 'w-3 h-3' :
              sizeConfig.emoji === 'text-sm' ? 'w-4 h-4' : 'w-5 h-5'
            )} 
          />
          <div 
            className={cn(
              'bg-gray-200 rounded',
              sizeConfig.count === 'text-xs' ? 'w-4 h-3' : 'w-6 h-4'
            )} 
          />
        </div>
      ))}
    </div>
  );
}

/**
 * @component CompactReactionStats
 * @description 紧凑版表情反应统计组件
 */
export function CompactReactionStats({
  reactionStats,
  maxDisplay = 3,
  className,
}: {
  reactionStats: SimpleReactionStatsProps['reactionStats'];
  maxDisplay?: number;
  className?: string;
}) {
  // 处理和排序统计数据
  const processedStats = useMemo(() => {
    const validStats = filterValidStats(reactionStats);
    const sortedStats = sortStatsByCount(validStats);
    return sortedStats.slice(0, maxDisplay);
  }, [reactionStats, maxDisplay]);

  // 计算总数和隐藏数量
  const totalCount = useMemo(() => {
    return filterValidStats(reactionStats).reduce((sum, stat) => sum + stat.count, 0);
  }, [reactionStats]);

  const hiddenCount = useMemo(() => {
    const allValidStats = filterValidStats(reactionStats);
    return Math.max(0, allValidStats.length - maxDisplay);
  }, [reactionStats, maxDisplay]);

  // 如果没有有效数据，不渲染
  if (processedStats.length === 0) {
    return null;
  }

  return (
    <div 
      className={cn('flex items-center gap-1', className)}
      data-testid={`${TEST_IDS.reactionStats}-compact`}
      role="group"
      aria-label={`表情反应统计，共${totalCount}个反应`}
    >
      {/* 显示主要的表情反应 */}
      {processedStats.map((stat, index) => {
        const config = REACTION_CONFIGS[stat.type];
        
        if (!config) {
          return null;
        }

        return (
          <motion.div
            key={stat.type}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gray-50 text-xs"
            title={`${config.label}: ${stat.count}个`}
          >
            <span className="text-xs" aria-hidden="true">
              {config.emoji}
            </span>
            <span className="font-medium text-gray-600 text-xs">
              {formatReactionCount(stat.count)}
            </span>
          </motion.div>
        );
      })}

      {/* 如果有隐藏的反应，显示省略号 */}
      {hiddenCount > 0 && (
        <div 
          className="flex items-center px-1.5 py-0.5 rounded-full bg-gray-50 text-xs text-gray-500"
          title={`还有${hiddenCount}种其他反应`}
        >
          <span>+{hiddenCount}</span>
        </div>
      )}
    </div>
  );
}

/**
 * @component InlineReactionStats
 * @description 内联版表情反应统计组件
 */
export function InlineReactionStats({
  reactionStats,
  separator = '·',
  className,
}: {
  reactionStats: SimpleReactionStatsProps['reactionStats'];
  separator?: string;
  className?: string;
}) {
  // 处理和排序统计数据
  const processedStats = useMemo(() => {
    const validStats = filterValidStats(reactionStats);
    return sortStatsByCount(validStats);
  }, [reactionStats]);

  // 如果没有有效数据，不渲染
  if (processedStats.length === 0) {
    return null;
  }

  return (
    <div 
      className={cn('flex items-center gap-2 text-sm text-gray-600', className)}
      data-testid={`${TEST_IDS.reactionStats}-inline`}
    >
      {processedStats.map((stat, index) => {
        const config = REACTION_CONFIGS[stat.type];
        
        if (!config) {
          return null;
        }

        return (
          <React.Fragment key={stat.type}>
            {index > 0 && (
              <span className="text-gray-400" aria-hidden="true">
                {separator}
              </span>
            )}
            <span 
              className="flex items-center gap-1"
              title={`${config.label}: ${stat.count}个`}
            >
              <span className="text-sm" aria-hidden="true">
                {config.emoji}
              </span>
              <span className="font-medium">
                {formatReactionCount(stat.count)}
              </span>
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}
