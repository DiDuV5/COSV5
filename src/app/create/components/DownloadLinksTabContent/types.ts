/**
 * @fileoverview 下载链接标签页组件类型定义
 * @description 定义DownloadLinksTabContent组件相关的TypeScript类型
 */

import type { DownloadLink, ValidationResult } from '@/components/download';

// 重新导出以便其他模块使用
export type { DownloadLink, ValidationResult };

/**
 * 下载链接标签页内容组件属性
 */
export interface DownloadLinksTabContentProps {
  /** 下载链接数组 */
  downloadLinks: DownloadLink[];
  /** 保存回调函数 */
  onSave: (links: DownloadLink[]) => void;
  /** 是否正在发布 */
  isPublishing: boolean;
  /** 是否为草稿 */
  isDraft: boolean;
  /** 帖子ID（编辑模式） */
  postId?: string;
  /** 现有链接数据（编辑模式） */
  existingLinks?: any;
}

/**
 * 组件内部状态
 */
export interface DownloadLinksState {
  /** 链接列表 */
  links: DownloadLink[];
  /** 错误信息映射 */
  errors: Record<number, string>;
  /** 是否正在保存 */
  saving: boolean;
  /** 是否处于编辑模式 */
  isEditing: boolean;
}

/**
 * 链接操作处理器
 */
export interface LinkHandlers {
  /** 添加新链接 */
  handleAddLink: () => void;
  /** 删除链接 */
  handleRemoveLink: (index: number) => Promise<void>;
  /** 更新链接字段 */
  handleUpdateLinkField: (index: number, field: keyof DownloadLink, value: any) => void;
  /** 保存链接 */
  handleSaveLinks: () => Promise<void>;
}

/**
 * 编辑模式控制器
 */
export interface EditModeController {
  /** 是否处于编辑模式 */
  isEditing: boolean;
  /** 开始编辑 */
  startEditing: () => void;
  /** 取消编辑 */
  cancelEditing: () => void;
  /** 是否可以编辑 */
  canEdit: boolean;
}

/**
 * 链接统计信息 - 使用与DownloadLinkService一致的接口
 */
export interface LinkStats {
  /** 总链接数 */
  totalLinks: number;
  /** 总价格 */
  totalPrice: number;
  /** 平台计数 */
  platformCount: Record<string, number>;
  /** 平台子类型计数 */
  platformSubTypeCount: Record<string, number>;
  /** 平均价格 */
  averagePrice: number;
}

/**
 * 重复检查结果
 */
export interface DuplicateCheckResult {
  /** 是否有重复 */
  hasDuplicates: boolean;
  /** 重复的索引 */
  duplicateIndices: number[];
}

/**
 * API Mutation 配置
 */
export interface MutationConfig {
  /** 成功回调 */
  onSuccess?: (data: any) => void;
  /** 错误回调 */
  onError?: (error: any) => void;
}

/**
 * 保存操作上下文
 */
export interface SaveContext {
  /** 帖子ID */
  postId?: string;
  /** 是否为编辑模式 */
  isEditMode: boolean;
  /** 链接数据 */
  links: DownloadLink[];
  /** 验证结果 */
  validation: ValidationResult;
}
