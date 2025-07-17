/**
 * @fileoverview 动态发布页面类型定义
 * @description 包含动态发布相关的所有TypeScript类型定义
 */

import type { UploadedFile } from '@/components/upload/FileUploader';

/**
 * 动态可见性类型
 */
export type MomentVisibility = 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY';

/**
 * 用户等级类型 - CoserEden 6级权限体系
 */
export type UserLevel = 'GUEST' | 'USER' | 'VIP' | 'CREATOR' | 'ADMIN' | 'SUPER_ADMIN';

/**
 * 动态创建表单数据接口
 */
export interface CreateMomentForm {
  /** 动态内容 */
  content: string;
  /** 可见性设置 */
  visibility: MomentVisibility;
}

/**
 * 权限配置接口
 */
export interface PermissionConfig {
  /** 是否可以发布动态 */
  canPublishMoments: boolean;
  /** 是否可以上传图片 */
  canUploadImages: boolean;
  /** 是否可以上传视频 */
  canUploadVideos: boolean;
  /** 单次最大图片上传数量 */
  maxImagesPerUpload: number;
  /** 单次最大视频上传数量 */
  maxVideosPerUpload: number;
  /** 动态最小长度 */
  momentMinLength: number;
  /** 动态最大长度 */
  momentMaxLength: number;
}

/**
 * 权限检查结果接口
 */
export interface PermissionCheckResult {
  /** 是否有权限 */
  hasPermission: boolean;
  /** 用户等级 */
  userLevel: UserLevel;
  /** 权限配置 */
  config?: PermissionConfig;
  /** 错误信息 */
  error?: string;
}

/**
 * 每日发布限制接口
 */
export interface DailyLimit {
  /** 是否可以发布 */
  canPublish: boolean;
  /** 每日限制数量 */
  limit: number;
  /** 今日已发布数量 */
  todayCount: number;
  /** 剩余发布次数 */
  remaining: number;
  /** 重置时间 */
  resetTime?: Date;
}

/**
 * 权限信息接口
 */
export interface PermissionInfo {
  /** 是否可以发布动态 */
  canPublishMoments: boolean;
  /** 是否可以上传图片 */
  canUploadImages: boolean;
  /** 是否可以上传视频 */
  canUploadVideos: boolean;
  /** 单次最大图片上传数量 */
  maxImagesPerUpload: number;
  /** 单次最大视频上传数量 */
  maxVideosPerUpload: number;
  /** 动态最小长度 */
  momentMinLength: number;
  /** 动态最大长度 */
  momentMaxLength: number;
  /** 用户等级 */
  userLevel: UserLevel;
}

/**
 * 动态创建状态接口
 */
export interface MomentCreationState {
  /** 是否正在发布 */
  isPublishing: boolean;
  /** 已上传的文件 */
  uploadedFiles: UploadedFile[];
  /** 提取的标签 */
  extractedTags: string[];
  /** 表单错误 */
  formError?: string;
}

/**
 * 发布条件检查结果接口
 */
export interface PublishConditionCheck {
  /** 内容长度是否符合要求 */
  contentLengthValid: boolean;
  /** 是否有剩余发布次数 */
  hasRemainingPublishes: boolean;
  /** 内容是否已填写 */
  hasContent: boolean;
  /** 是否可以发布 */
  canPublish: boolean;
  /** 错误信息列表 */
  errors: string[];
}

/**
 * 媒体上传权限状态接口
 */
export interface MediaUploadPermission {
  /** 是否可以上传图片 */
  canUploadImages: boolean;
  /** 是否可以上传视频 */
  canUploadVideos: boolean;
  /** 图片上传限制 */
  imageLimit: number;
  /** 视频上传限制 */
  videoLimit: number;
  /** 是否有任何上传权限 */
  hasAnyUploadPermission: boolean;
}

/**
 * 可见性选项接口
 */
export interface VisibilityOption {
  /** 选项值 */
  value: MomentVisibility;
  /** 显示标签 */
  label: string;
  /** 图标组件 */
  icon: React.ComponentType<any>;
  /** 描述 */
  description: string;
}

/**
 * 动态发布参数接口
 */
export interface CreateMomentParams {
  /** 动态内容 */
  content: string;
  /** 可见性设置 */
  visibility: MomentVisibility;
  /** 标签列表 */
  tags: string[];
  /** 媒体文件ID列表 */
  mediaIds: string[];
}

/**
 * 动态发布结果接口
 */
export interface CreateMomentResult {
  /** 是否成功 */
  success: boolean;
  /** 创建的动态信息 */
  post?: {
    id: string;
    content: string;
    visibility: MomentVisibility;
    createdAt: Date;
  };
  /** 错误信息 */
  error?: string;
}

/**
 * 权限检查组件属性接口
 */
export interface PermissionCheckProps {
  /** 权限检查结果 */
  permissionCheck: PermissionCheckResult | undefined;
  /** 每日限制信息 */
  dailyLimit: DailyLimit | undefined;
  /** 是否正在加载 */
  isPending: boolean;
  /** 返回回调 */
  onBack: () => void;
}

/**
 * 权限概览组件属性接口
 */
export interface PermissionOverviewProps {
  /** 权限信息 */
  permissionInfo: PermissionInfo;
  /** 每日限制信息 */
  dailyLimit: DailyLimit;
}

/**
 * 动态表单组件属性接口
 */
export interface MomentFormProps {
  /** 权限信息 */
  permissionInfo: PermissionInfo;
  /** 每日限制信息 */
  dailyLimit: DailyLimit;
  /** 表单提交处理 */
  onSubmit: (data: CreateMomentForm) => Promise<void>;
  /** 是否正在发布 */
  isPublishing: boolean;
  /** 用户会话信息 */
  session: any;
}

/**
 * 发布条件检查组件属性接口
 */
export interface PublishConditionCheckProps {
  /** 权限信息 */
  permissionInfo: PermissionInfo;
  /** 每日限制信息 */
  dailyLimit: DailyLimit;
  /** 当前内容 */
  content: string;
  /** 检查结果回调 */
  onCheckResult: (result: PublishConditionCheck) => void;
}

/**
 * 媒体上传组件属性接口
 */
export interface MediaUploadSectionProps {
  /** 权限信息 */
  permissionInfo: PermissionInfo;
  /** 已上传文件列表 */
  uploadedFiles: UploadedFile[];
  /** 文件上传完成回调 */
  onUploadComplete: (files: UploadedFile[]) => void;
  /** 文件删除回调 */
  onFileRemove: (fileId: string) => void;
  /** 文件重排序回调 */
  onFileReorder: (files: UploadedFile[]) => void;
}

/**
 * 标签显示组件属性接口
 */
export interface TagDisplayProps {
  /** 标签列表 */
  tags: string[];
  /** 最大显示数量 */
  maxDisplay?: number;
  /** 是否可编辑 */
  editable?: boolean;
  /** 标签删除回调 */
  onTagRemove?: (tag: string) => void;
}

/**
 * 用户等级显示配置接口
 */
export interface UserLevelDisplayConfig {
  /** 显示标签 */
  label: string;
  /** 徽章变体 */
  badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive';
  /** 颜色类名 */
  colorClass: string;
}

/**
 * 动态创建Hook返回值接口
 */
export interface UseMomentCreationReturn {
  /** 创建状态 */
  state: MomentCreationState;
  /** 权限信息 */
  permissionInfo: PermissionInfo | null;
  /** 每日限制信息 */
  dailyLimit: DailyLimit | null;
  /** 是否正在加载 */
  isPending: boolean;
  /** 发布条件检查结果 */
  publishCondition: PublishConditionCheck;
  /** 操作方法 */
  actions: {
    /** 设置内容 */
    setContent: (content: string) => void;
    /** 设置可见性 */
    setVisibility: (visibility: MomentVisibility) => void;
    /** 添加上传文件 */
    addUploadedFiles: (files: UploadedFile[]) => void;
    /** 删除文件 */
    removeFile: (fileId: string) => void;
    /** 重排序文件 */
    reorderFiles: (files: UploadedFile[]) => void;
    /** 发布动态 */
    publishMoment: (data: CreateMomentForm) => Promise<CreateMomentResult>;
  };
}

/**
 * 错误类型枚举
 */
export enum MomentCreationError {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DAILY_LIMIT_EXCEEDED = 'DAILY_LIMIT_EXCEEDED',
  CONTENT_TOO_SHORT = 'CONTENT_TOO_SHORT',
  CONTENT_TOO_LONG = 'CONTENT_TOO_LONG',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 错误信息映射接口
 */
export interface ErrorMessageMap {
  [MomentCreationError.PERMISSION_DENIED]: string;
  [MomentCreationError.DAILY_LIMIT_EXCEEDED]: string;
  [MomentCreationError.CONTENT_TOO_SHORT]: string;
  [MomentCreationError.CONTENT_TOO_LONG]: string;
  [MomentCreationError.UPLOAD_FAILED]: string;
  [MomentCreationError.NETWORK_ERROR]: string;
  [MomentCreationError.UNKNOWN_ERROR]: string;
}
