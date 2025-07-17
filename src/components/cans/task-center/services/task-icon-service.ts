/**
 * @fileoverview 任务图标服务
 * @description 专门处理任务图标映射、样式和显示逻辑
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import React from 'react';
import {
  CheckCircle2,
  Clock,
  Heart,
  MessageCircle,
  Share2,
  PenTool,
  Camera,
  Target,
  TrendingUp,
  Coins,
  LucideIcon,
} from 'lucide-react';

/**
 * 任务图标映射
 */
const TASK_ICON_MAP: Record<string, LucideIcon> = {
  'check-circle-2': CheckCircle2,
  'clock': Clock,
  'heart': Heart,
  'message-circle': MessageCircle,
  'share-2': Share2,
  'pen-tool': PenTool,
  'camera': Camera,
  'target': Target,
  'trending-up': TrendingUp,
  'coins': Coins,
};

/**
 * 图标颜色映射
 */
const ICON_COLOR_MAP: Record<string, string> = {
  'check-circle-2': 'text-green-500',
  'clock': 'text-blue-500',
  'heart': 'text-red-500',
  'message-circle': 'text-blue-500',
  'share-2': 'text-green-500',
  'pen-tool': 'text-purple-500',
  'camera': 'text-orange-500',
  'target': 'text-gray-500',
  'trending-up': 'text-blue-500',
  'coins': 'text-orange-500',
};

/**
 * 任务图标服务类
 */
export class TaskIconService {
  /**
   * 获取任务图标组件
   */
  static getTaskIcon(iconName: string, size: 'sm' | 'md' | 'lg' = 'md'): React.ReactElement {
    const IconComponent = TASK_ICON_MAP[iconName] || Target;
    const colorClass = ICON_COLOR_MAP[iconName] || 'text-gray-500';
    
    const sizeClass = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
    }[size];

    return React.createElement(IconComponent, {
      className: `${sizeClass} ${colorClass}`,
    });
  }

  /**
   * 获取分类图标
   */
  static getCategoryIcon(category: string): string {
    const categoryIconMap: Record<string, string> = {
      interaction: '🤝',
      creation: '🎨',
      daily: '📅',
      weekly: '📊',
      achievement: '🏆',
      social: '👥',
      content: '📝',
      upload: '📤',
      default: '📋',
    };

    return categoryIconMap[category] || categoryIconMap.default;
  }

  /**
   * 获取难度颜色样式
   */
  static getDifficultyStyle(difficulty: string): string {
    const difficultyStyleMap: Record<string, string> = {
      easy: 'text-green-600 bg-green-50 border-green-200',
      medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      hard: 'text-red-600 bg-red-50 border-red-200',
      expert: 'text-purple-600 bg-purple-50 border-purple-200',
      default: 'text-gray-600 bg-gray-50 border-gray-200',
    };

    return difficultyStyleMap[difficulty] || difficultyStyleMap.default;
  }

  /**
   * 获取难度显示文本
   */
  static getDifficultyText(difficulty: string): string {
    const difficultyTextMap: Record<string, string> = {
      easy: '简单',
      medium: '中等',
      hard: '困难',
      expert: '专家',
      default: '未知',
    };

    return difficultyTextMap[difficulty] || difficultyTextMap.default;
  }

  /**
   * 获取分类显示文本
   */
  static getCategoryText(category: string): string {
    const categoryTextMap: Record<string, string> = {
      interaction: '互动任务',
      creation: '创作任务',
      daily: '每日任务',
      weekly: '每周任务',
      achievement: '成就任务',
      social: '社交任务',
      content: '内容任务',
      upload: '上传任务',
      default: '其他任务',
    };

    return categoryTextMap[category] || categoryTextMap.default;
  }

  /**
   * 获取任务状态图标
   */
  static getStatusIcon(status: 'pending' | 'in_progress' | 'completed' | 'expired'): React.ReactElement {
    const statusIconMap: Record<string, { icon: LucideIcon; color: string }> = {
      pending: { icon: Clock, color: 'text-gray-500' },
      in_progress: { icon: TrendingUp, color: 'text-blue-500' },
      completed: { icon: CheckCircle2, color: 'text-green-500' },
      expired: { icon: Clock, color: 'text-red-500' },
    };

    const config = statusIconMap[status] || statusIconMap.pending;
    
    return React.createElement(config.icon, {
      className: `h-4 w-4 ${config.color}`,
    });
  }

  /**
   * 获取奖励图标
   */
  static getRewardIcon(type: 'cans' | 'experience' | 'badge'): React.ReactElement {
    const rewardIconMap: Record<string, { icon: LucideIcon; color: string }> = {
      cans: { icon: Coins, color: 'text-orange-500' },
      experience: { icon: TrendingUp, color: 'text-blue-500' },
      badge: { icon: Target, color: 'text-purple-500' },
    };

    const config = rewardIconMap[type] || rewardIconMap.cans;
    
    return React.createElement(config.icon, {
      className: `h-3 w-3 ${config.color}`,
    });
  }

  /**
   * 检查图标是否存在
   */
  static hasIcon(iconName: string): boolean {
    return iconName in TASK_ICON_MAP;
  }

  /**
   * 获取所有可用图标名称
   */
  static getAvailableIcons(): string[] {
    return Object.keys(TASK_ICON_MAP);
  }

  /**
   * 获取图标预览
   */
  static getIconPreview(iconName: string): {
    name: string;
    component: React.ReactElement;
    color: string;
    available: boolean;
  } {
    return {
      name: iconName,
      component: this.getTaskIcon(iconName),
      color: ICON_COLOR_MAP[iconName] || 'text-gray-500',
      available: this.hasIcon(iconName),
    };
  }
}

/**
 * 导出服务创建函数
 */
export const createTaskIconService = () => TaskIconService;
