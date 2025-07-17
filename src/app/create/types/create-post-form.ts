/**
 * @fileoverview 创作页面类型定义
 * @description 包含创作页面所有TypeScript类型定义
 */

import { z } from 'zod';

/**
 * 作品可见性类型
 */
export type PostVisibility = 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY' | 'PREMIUM_ONLY';

/**
 * 创作表单验证模式
 */
export const createPostSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过200字符'),
  description: z.string().max(1000, '描述不能超过1000字符').optional(),
  content: z.string().max(5000, '内容不能超过5000字符').optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'FOLLOWERS_ONLY', 'PREMIUM_ONLY']).default('PUBLIC'),
  allowComments: z.boolean().default(true),
  allowDownload: z.boolean().default(false),
});

/**
 * 创作表单数据类型
 */
export type CreatePostForm = z.infer<typeof createPostSchema>;

/**
 * 标签页类型
 */
export type CreatePostTab = 'content' | 'media' | 'preview' | 'settings';

/**
 * 发布状态类型
 */
export interface PublishStatus {
  hasBasicInfo: boolean;
  hasMedia: boolean;
  hasTags: boolean;
  canPublish: boolean;
}

/**
 * 智能建议配置
 */
export interface SmartSuggestionConfig {
  activeTab: CreatePostTab;
  title: string;
  uploadedFilesCount: number;
  extractedTagsCount: number;
  onTabChange: (tab: CreatePostTab) => void;
}
