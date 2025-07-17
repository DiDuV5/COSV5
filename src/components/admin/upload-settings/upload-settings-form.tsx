/**
 * @fileoverview 上传设置表单组件
 * @description 处理上传设置的表单逻辑和验证
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// 表单验证模式 - 移除硬编码限制，支持专业cosplay平台需求
export const uploadSettingsSchema = z.object({
  maxFileSize: z.number().min(1).max(50000), // MB - 提高到50GB，支持专业4K视频和RAW图片
  allowedTypes: z.array(z.string()).min(1),
  enableDeduplication: z.boolean(),
  imageQuality: z.number().min(1).max(100),
  enableThumbnails: z.boolean(),
  maxFilesPerPost: z.number().min(1).max(10000), // 提高到10000个文件，支持大型作品集
  storageProvider: z.enum(['local', 'cloudflare-r2', 's3']),
  cdnUrl: z.string().optional(),
});

export type UploadSettingsForm = z.infer<typeof uploadSettingsSchema>;

/**
 * 默认表单值 - 专业cosplay平台配置
 */
export const defaultFormValues: UploadSettingsForm = {
  maxFileSize: 5000, // 5GB - 支持4K视频和RAW图片
  allowedTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    'image/svg+xml',
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/flv',
    'video/webm',
    'video/mkv',
    'video/m4v',
    'video/3gp',
    'video/quicktime',
    'application/pdf',
    'application/zip',
    'application/rar',
    'application/x-rar-compressed',
    'application/x-zip-compressed',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  enableDeduplication: true,
  imageQuality: 85,
  enableThumbnails: true,
  maxFilesPerPost: 500, // 支持大型cosplay作品集
  storageProvider: 'cloudflare-r2',
  cdnUrl: '',
};

/**
 * 文件类型预设
 */
export const fileTypePresets = {
  images: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    'image/svg+xml',
  ],
  videos: [
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/flv',
    'video/webm',
    'video/mkv',
    'video/m4v',
    'video/3gp',
    'video/quicktime',
  ],
  documents: [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  archives: [
    'application/zip',
    'application/rar',
    'application/x-rar-compressed',
    'application/x-zip-compressed',
  ],
};

/**
 * 文件大小预设
 */
export const fileSizePresets = {
  standard: 1000, // 1GB
  professional: 5000, // 5GB
  premium: 10000, // 10GB
  extreme: 20000, // 20GB
};

/**
 * 每帖文件数预设
 */
export const filesPerPostPresets = {
  basic: 10,
  standard: 50,
  professional: 100,
  portfolio: 500,
  exhibition: 1000,
};

/**
 * 图片质量预设
 */
export const imageQualityPresets = {
  low: 60,
  medium: 75,
  high: 85,
  maximum: 95,
};

/**
 * 上传设置表单Hook
 */
export function useUploadSettingsForm(initialValues?: Partial<UploadSettingsForm>) {
  const form = useForm<UploadSettingsForm>({
    resolver: zodResolver(uploadSettingsSchema),
    defaultValues: {
      ...defaultFormValues,
      ...initialValues,
    },
  });

  /**
   * 设置文件大小预设
   */
  const setFileSizePreset = (preset: keyof typeof fileSizePresets) => {
    form.setValue('maxFileSize', fileSizePresets[preset], { shouldDirty: true });
  };

  /**
   * 设置文件数量预设
   */
  const setFilesPerPostPreset = (preset: keyof typeof filesPerPostPresets) => {
    form.setValue('maxFilesPerPost', filesPerPostPresets[preset], { shouldDirty: true });
  };

  /**
   * 设置图片质量预设
   */
  const setImageQualityPreset = (preset: keyof typeof imageQualityPresets) => {
    form.setValue('imageQuality', imageQualityPresets[preset], { shouldDirty: true });
  };

  /**
   * 设置文件类型预设
   */
  const setFileTypePreset = (preset: keyof typeof fileTypePresets) => {
    const currentTypes = form.getValues('allowedTypes');
    const presetTypes = fileTypePresets[preset];
    
    // 合并当前类型和预设类型，去重
    const mergedTypes = Array.from(new Set([...currentTypes, ...presetTypes]));
    form.setValue('allowedTypes', mergedTypes, { shouldDirty: true });
  };

  /**
   * 移除文件类型
   */
  const removeFileType = (typeToRemove: string) => {
    const currentTypes = form.getValues('allowedTypes');
    const filteredTypes = currentTypes.filter(type => type !== typeToRemove);
    form.setValue('allowedTypes', filteredTypes, { shouldDirty: true });
  };

  /**
   * 添加自定义文件类型
   */
  const addCustomFileType = (customType: string) => {
    if (!customType.trim()) return;
    
    const currentTypes = form.getValues('allowedTypes');
    if (!currentTypes.includes(customType)) {
      form.setValue('allowedTypes', [...currentTypes, customType], { shouldDirty: true });
    }
  };

  /**
   * 重置表单到默认值
   */
  const resetToDefaults = () => {
    form.reset(defaultFormValues);
  };

  /**
   * 验证表单
   */
  const validateForm = () => {
    return form.trigger();
  };

  /**
   * 获取表单数据
   */
  const getFormData = () => {
    return form.getValues();
  };

  /**
   * 检查表单是否有变更
   */
  const hasChanges = () => {
    return form.formState.isDirty;
  };

  /**
   * 格式化文件大小显示
   */
  const formatFileSize = (sizeInMB: number): string => {
    if (sizeInMB >= 1000) {
      return `${(sizeInMB / 1000).toFixed(1)}GB`;
    }
    return `${sizeInMB}MB`;
  };

  /**
   * 获取存储提供商显示名称
   */
  const getStorageProviderName = (provider: string): string => {
    const names = {
      'local': '本地存储',
      'cloudflare-r2': 'Cloudflare R2',
      's3': 'Amazon S3',
    };
    return names[provider as keyof typeof names] || provider;
  };

  /**
   * 验证CDN URL格式
   */
  const validateCdnUrl = (url: string): boolean => {
    if (!url) return true; // 可选字段
    try {
      new URL(url);
      return url.startsWith('https://');
    } catch {
      return false;
    }
  };

  /**
   * 获取推荐配置
   */
  const getRecommendedConfig = (userType: 'basic' | 'professional' | 'enterprise') => {
    const configs = {
      basic: {
        maxFileSize: 1000,
        maxFilesPerPost: 50,
        imageQuality: 75,
        enableDeduplication: true,
        enableThumbnails: true,
      },
      professional: {
        maxFileSize: 5000,
        maxFilesPerPost: 500,
        imageQuality: 85,
        enableDeduplication: true,
        enableThumbnails: true,
      },
      enterprise: {
        maxFileSize: 20000,
        maxFilesPerPost: 1000,
        imageQuality: 95,
        enableDeduplication: true,
        enableThumbnails: true,
      },
    };
    
    return configs[userType];
  };

  /**
   * 应用推荐配置
   */
  const applyRecommendedConfig = (userType: 'basic' | 'professional' | 'enterprise') => {
    const config = getRecommendedConfig(userType);
    Object.entries(config).forEach(([key, value]) => {
      form.setValue(key as keyof UploadSettingsForm, value, { shouldDirty: true });
    });
  };

  return {
    form,
    // 预设操作
    setFileSizePreset,
    setFilesPerPostPreset,
    setImageQualityPreset,
    setFileTypePreset,
    removeFileType,
    addCustomFileType,
    // 表单操作
    resetToDefaults,
    validateForm,
    getFormData,
    hasChanges,
    // 工具函数
    formatFileSize,
    getStorageProviderName,
    validateCdnUrl,
    getRecommendedConfig,
    applyRecommendedConfig,
    // 常量
    fileTypePresets,
    fileSizePresets,
    filesPerPostPresets,
    imageQualityPresets,
  };
}
