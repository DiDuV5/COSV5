/**
 * @fileoverview 权限管理组件类型定义
 * @description 包含权限管理相关的所有TypeScript类型定义
 */

import { z } from "zod";

// 权限配置表单验证模式
export const permissionConfigSchema = z.object({
  canPublishMoments: z.boolean(),
  canPublishPosts: z.boolean(),
  dailyMomentsLimit: z.number().min(-1),
  dailyPostsLimit: z.number().min(-1),
  canUploadImages: z.boolean(),
  canUploadVideos: z.boolean(),
  maxImagesPerUpload: z.number().min(-1),
  maxVideosPerUpload: z.number().min(-1),
  momentMinLength: z.number().min(1),
  momentMaxLength: z.number().min(1),
  // 新增的访问权限
  canViewPosts: z.boolean().optional(),
  canViewProfiles: z.boolean().optional(),
  canViewComments: z.boolean().optional(),
  canPlayVideos: z.boolean().optional(),
  canDownloadImages: z.boolean().optional(),
  canSearchContent: z.boolean().optional(),
  canViewTags: z.boolean().optional(),
  canLikePosts: z.boolean().optional(),
  canComment: z.boolean().optional(),
  canFollow: z.boolean().optional(),
  canShare: z.boolean().optional(),
  requireLoginForPosts: z.boolean().optional(),
  requireLoginForProfiles: z.boolean().optional(),
  requireLoginForVideos: z.boolean().optional(),
  // 评论权限配置
  requiresCommentApproval: z.boolean().optional(),
  canCommentWithImages: z.boolean().optional(),
  dailyCommentLimit: z.number().min(-1).optional(),
  // 社交账号权限配置
  canUseSocialLinks: z.boolean().optional(),
  maxSocialLinks: z.number().min(0).optional(),
  canUseCustomLinks: z.boolean().optional(),
});

export type PermissionConfigForm = z.infer<typeof permissionConfigSchema>;

// 权限配置数据类型
export interface PermissionConfig {
  id: string;
  userLevel: string;
  canPublishMoments: boolean;
  canPublishPosts: boolean;
  dailyMomentsLimit: number;
  dailyPostsLimit: number;
  canUploadImages: boolean;
  canUploadVideos: boolean;
  maxImagesPerUpload: number;
  maxVideosPerUpload: number;
  momentMinLength: number;
  momentMaxLength: number;
  canViewPosts?: boolean;
  canViewProfiles?: boolean;
  canViewComments?: boolean;
  canPlayVideos?: boolean;
  canDownloadImages?: boolean;
  canSearchContent?: boolean;
  canViewTags?: boolean;
  canLikePosts?: boolean;
  canComment?: boolean;
  canFollow?: boolean;
  canShare?: boolean;
  requireLoginForPosts?: boolean;
  requireLoginForProfiles?: boolean;
  requireLoginForVideos?: boolean;
  requiresCommentApproval?: boolean;
  canCommentWithImages?: boolean;
  dailyCommentLimit?: number;
  canUseSocialLinks?: boolean;
  maxSocialLinks?: number;
  canUseCustomLinks?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 用户等级配置类型
export interface UserLevelConfig {
  value: string;
  label: string;
  description: string;
  color: string;
}

// 权限管理组件Props
export interface PermissionManagementProps {
  onUpdate?: () => void;
}

// 子组件通用Props
export interface PermissionSectionProps {
  form: any; // react-hook-form的UseFormReturn类型
  selectedLevel: string;
}

// 用户等级选择器Props
export interface UserLevelSelectorProps {
  configs?: PermissionConfig[];
  selectedLevel: string;
  onLevelChange: (level: string) => void;
  onInitializeDefaults: () => void;
  isInitializing: boolean;
}

// Hook返回类型
export interface UsePermissionManagementReturn {
  // 状态
  selectedLevel: string;
  setSelectedLevel: (level: string) => void;
  isSaving: boolean;
  
  // 数据
  configs?: PermissionConfig[];
  currentConfig?: PermissionConfig;
  isPending: boolean;
  
  // 表单
  form: any;
  
  // 操作函数
  handleSave: (data: PermissionConfigForm) => Promise<void>;
  handleInitializeDefaults: () => Promise<void>;
  refetch: () => void;
}

// 权限类别枚举
export enum PermissionCategory {
  PUBLISHING = 'publishing',
  UPLOAD = 'upload',
  ACCESS = 'access',
  COMMENT = 'comment',
  SOCIAL = 'social',
  CONTENT = 'content',
}

// 权限项配置
export interface PermissionItem {
  key: keyof PermissionConfigForm;
  label: string;
  description: string;
  icon: any; // Lucide图标组件
  category: PermissionCategory;
  type: 'boolean' | 'number';
  min?: number;
  max?: number;
  placeholder?: string;
  defaultValue?: any;
}

// 表单字段配置
export interface FormFieldConfig {
  name: keyof PermissionConfigForm;
  label: string;
  description: string;
  type: 'switch' | 'number';
  icon?: any;
  min?: number;
  max?: number;
  placeholder?: string;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
  };
}

// 权限配置默认值
export const DEFAULT_PERMISSION_VALUES: Partial<PermissionConfigForm> = {
  canPublishMoments: false,
  canPublishPosts: false,
  dailyMomentsLimit: 0,
  dailyPostsLimit: 0,
  canUploadImages: false,
  canUploadVideos: false,
  maxImagesPerUpload: 0,
  maxVideosPerUpload: 0,
  momentMinLength: 1,
  momentMaxLength: 500,
  canViewPosts: true,
  canViewProfiles: true,
  canViewComments: true,
  canPlayVideos: true,
  canDownloadImages: true,
  canSearchContent: true,
  canViewTags: true,
  canLikePosts: false,
  canComment: false,
  canFollow: false,
  canShare: true,
  requireLoginForPosts: false,
  requireLoginForProfiles: false,
  requireLoginForVideos: false,
  requiresCommentApproval: true,
  canCommentWithImages: false,
  dailyCommentLimit: 10,
  canUseSocialLinks: true,
  maxSocialLinks: 10,
  canUseCustomLinks: true,
};
