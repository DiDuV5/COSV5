/**
 * @component ReactionStats
 * @description 表情反应统计组件 - 显示帖子或评论的表情反应统计信息
 * @author Augment AI
 * @date 2025-06-14
 * @version 2.0.0 - 重构为模块化结构
 *
 * @features
 * - 显示表情反应统计数据
 * - 支持快速反应功能（需要登录和权限）
 * - 显示用户列表对话框
 * - 响应式设计，支持多种尺寸
 * - 完整的错误处理和网络状态检测
 * - 无障碍支持
 *
 * @props
 * - reactionStats: 表情统计数据数组
 * - totalCount: 总反应数量
 * - size: 组件尺寸 ("sm" | "md" | "lg")
 * - showUserList: 是否显示用户列表功能
 * - maxDisplay: 最大显示表情数量
 * - enableQuickReaction: 是否启用快速反应功能
 * - targetId: 目标对象ID（快速反应必需）
 * - targetType: 目标对象类型 ("post" | "comment")
 * - currentUserReaction: 当前用户的反应类型
 * - userLevel: 用户等级（权限控制）
 * - onReactionChange: 反应变化回调函数
 *
 * @changelog
 * - 2025-06-14: 初始版本创建，支持基础表情反应显示和快速反应功能
 * - 2025-06-20: 重构为模块化结构，拆分为多个子组件
 */

"use client";

import React, { useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { type ReactionType } from "@/lib/reaction-types";

// 导入子组件
import { ReactionBubble, MoreReactionsButton } from "./reaction-stats/components/ReactionBubble";
import { UserListDialog } from "./reaction-stats/components/UserListDialog";

// 导入Hook和工具
import { useReactionHandler } from "./reaction-stats/hooks/use-reaction-handler";
import type { ReactionStatsProps } from "./reaction-stats/types";
import {
  SIZE_CONFIGS,
  CSS_CLASSES,
  TEST_IDS,
  ARIA_LABELS,
  DEFAULT_PROPS
} from "./reaction-stats/constants";
import {
  validateProps,
  getDisplayStats,
  logError,
  logInfo
} from "./reaction-stats/utils";

/**
 * @component ReactionStats
 * @description 主要的表情反应统计组件
 */
export function ReactionStats({
  reactionStats,
  totalCount,
  size = DEFAULT_PROPS.size,
  showUserList = DEFAULT_PROPS.showUserList,
  maxDisplay = DEFAULT_PROPS.maxDisplay,
  className,
  enableQuickReaction = DEFAULT_PROPS.enableQuickReaction,
  targetId,
  targetType = DEFAULT_PROPS.targetType,
  currentUserReaction,
  userLevel = DEFAULT_PROPS.userLevel,
  onReactionChange,
}: ReactionStatsProps) {
  // 状态管理
  const [selectedReaction, setSelectedReaction] = useState<ReactionType | null>(null);
  const [showAllReactions, setShowAllReactions] = useState(false);

  // 属性验证
  const validation = useMemo(() => {
    return validateProps({
      reactionStats,
      totalCount,
      size,
      showUserList,
      maxDisplay,
      className,
      enableQuickReaction,
      targetId,
      targetType,
      currentUserReaction,
      userLevel,
      onReactionChange,
    });
  }, [
    reactionStats,
    totalCount,
    size,
    showUserList,
    maxDisplay,
    className,
    enableQuickReaction,
    targetId,
    targetType,
    currentUserReaction,
    userLevel,
    onReactionChange,
  ]);

  // 处理显示的统计数据
  const { displayStats, hasMore } = useMemo(() => {
    return getDisplayStats(reactionStats, maxDisplay, showAllReactions);
  }, [reactionStats, maxDisplay, showAllReactions]);

  // 计算隐藏的反应数量
  const hiddenCount = useMemo(() => {
    return Math.max(0, reactionStats.length - maxDisplay);
  }, [reactionStats.length, maxDisplay]);

  // 使用反应处理Hook
  const {
    clickingReaction,
    error,
    isOnline,
    handleReactionClick,
    setError: _setError,
  } = useReactionHandler({
    enableQuickReaction,
    targetId,
    targetType,
    currentUserReaction,
    userLevel,
    onReactionChange,
  });

  /**
   * 处理显示用户列表
   */
  const handleShowUserList = useCallback((reactionType: ReactionType) => {
    logInfo("用户列表", "显示用户列表", { reactionType });
    setSelectedReaction(reactionType);
  }, []);

  /**
   * 处理关闭用户列表
   */
  const handleCloseUserList = useCallback(() => {
    setSelectedReaction(null);
  }, []);

  /**
   * 处理显示更多反应
   */
  const handleShowMore = useCallback(() => {
    setShowAllReactions(true);
    logInfo("显示更多", "展开所有反应", { totalCount: reactionStats.length });
  }, [reactionStats.length]);

  // 如果验证失败，记录错误并返回null
  if (!validation.isValid) {
    logError("属性验证", new Error("组件属性验证失败"), {
      errors: validation.errors,
      props: { reactionStats, totalCount, size, enableQuickReaction, targetId }
    });

    if (process.env.NODE_ENV === "development") {
      console.error("ReactionStats: 属性验证失败", validation.errors);
    }
    return null;
  }

  // 获取尺寸配置
  const sizeConfig = SIZE_CONFIGS[size];

  // 如果没有有效的统计数据，不渲染
  if (displayStats.length === 0) {
    return null;
  }

  return (
    <>
      <div
        className={cn(CSS_CLASSES.container, sizeConfig.spacing, className)}
        data-testid={TEST_IDS.reactionStats}
        role="group"
        aria-label={ARIA_LABELS.totalCount(totalCount)}
      >
        {/* 渲染表情气泡 */}
        {displayStats.map((stat, index) => (
          <ReactionBubble
            key={stat.type}
            stat={stat}
            index={index}
            sizeConfig={sizeConfig}
            isCurrentUserReaction={currentUserReaction === stat.type}
            isClickable={enableQuickReaction && !!targetId}
            isPending={clickingReaction === stat.type}
            isOnline={isOnline}
            enableQuickReaction={enableQuickReaction}
            targetId={targetId}
            showUserList={showUserList}
            onReactionClick={handleReactionClick}
            onShowUserList={handleShowUserList}
          />
        ))}

        {/* 显示更多按钮 */}
        {hasMore && !showAllReactions && (
          <MoreReactionsButton
            hiddenCount={hiddenCount}
            sizeConfig={sizeConfig}
            onClick={handleShowMore}
          />
        )}
      </div>

      {/* 用户列表对话框 */}
      {showUserList && (
        <UserListDialog
          open={selectedReaction !== null}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseUserList();
            }
          }}
          selectedReaction={selectedReaction}
          reactionStats={reactionStats}
        />
      )}

      {/* 错误提示 */}
      {error && (
        <div className={CSS_CLASSES.error} data-testid={TEST_IDS.errorMessage}>
          {error}
        </div>
      )}
    </>
  );
}

// 导出子组件供外部使用
export { SimpleReactionStats, CompactReactionStats, InlineReactionStats } from "./reaction-stats/components/SimpleReactionStats";
export { ReactionBubble } from "./reaction-stats/components/ReactionBubble";
export { UserListDialog } from "./reaction-stats/components/UserListDialog";

// 导出类型
export type { ReactionStatsProps } from "./reaction-stats/types";
