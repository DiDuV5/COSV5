/**
 * @fileoverview 上传路由类型定义
 * @description 定义上传相关的类型和验证模式
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import type {
  UploadResult
} from '@/types/upload';
import { z } from 'zod';

/**
 * 获取上传配置响应类型
 */
export interface UploadConfigResponse {
  maxFileSize: number;
  allowedTypes: string[];
  enableDeduplication: boolean;
  imageQuality: number;
  enableThumbnails: boolean;
  maxFilesPerPost: number;
  chunkSize: number;
  maxConcurrentUploads: number;
}

// 废弃的schema已移除，请使用 unifiedUploadSchema

/**
 * 上传进度查询输入验证模式
 */
export const getUploadProgressSchema = z.object({
  sessionId: z.string(),
});

/**
 * 取消上传输入验证模式
 */
export const cancelUploadSchema = z.object({
  sessionId: z.string(),
});

/**
 * 更新媒体顺序输入验证模式
 */
export const updateMediaOrderSchema = z.object({
  mediaUpdates: z.array(z.object({
    id: z.string(),
    order: z.number(),
  })),
});

/**
 * 删除媒体输入验证模式
 */
export const deleteMediaSchema = z.object({
  mediaId: z.string(),
});

/**
 * 统一上传输入验证模式 - 整合所有功能
 */
export const unifiedUploadSchema = z.object({
  // 基础文件信息
  fileData: z.string(),                    // base64文件数据
  filename: z.string().min(1).max(255),   // 文件名
  mimeType: z.string().optional(),         // MIME类型

  // 会话和关联
  sessionId: z.string().optional(),        // 上传会话ID
  postId: z.string().optional(),           // 关联帖子ID

  // 处理选项
  enableDeduplication: z.boolean().default(true),     // 启用去重
  generateThumbnails: z.boolean().default(true),      // 生成缩略图
  autoTranscode: z.boolean().default(true),           // 自动转码（默认启用）

  // 图片处理
  imageQuality: z.number().min(1).max(100).default(85),
  maxWidth: z.number().positive().optional(),
  maxHeight: z.number().positive().optional(),
  generateMultipleSizes: z.boolean().default(false),  // 多尺寸图片

  // 高级选项
  replaceExisting: z.boolean().default(false),        // 替换现有文件
  enableStreaming: z.boolean().default(true),         // 启用流式处理
  priority: z.enum(['low', 'normal', 'high']).default('normal'),

  // 元数据
  metadata: z.record(z.string()).optional(),          // 自定义元数据
});

/**
 * 统一上传输入类型
 */
export type UnifiedUploadInput = z.infer<typeof unifiedUploadSchema>;

/**
 * 流式上传初始化输入验证模式
 */
export const streamUploadInitSchema = z.object({
  filename: z.string().min(1).max(255),
  fileSize: z.number().positive(),
  mimeType: z.string().optional(),
  postId: z.string().optional(),
});

/**
 * 流式上传分片输入验证模式
 */
export const streamUploadChunkSchema = z.object({
  sessionId: z.string(),
  chunkIndex: z.number().min(0),
  chunkData: z.string(), // base64编码的分片数据
  isLastChunk: z.boolean().default(false),
});

/**
 * 流式上传进度查询输入验证模式
 */
export const streamUploadProgressSchema = z.object({
  sessionId: z.string(),
});

/**
 * 流式上传输入类型
 */
export type StreamUploadInitInput = z.infer<typeof streamUploadInitSchema>;
export type StreamUploadChunkInput = z.infer<typeof streamUploadChunkSchema>;
export type StreamUploadProgressInput = z.infer<typeof streamUploadProgressSchema>;

/**
 * 媒体处理响应类型 - 兼容UploadResult
 */
export type MediaProcessResponse = UploadResult;

/**
 * 上传进度响应类型
 */
export interface UploadProgressResponse {
  sessionId: string;
  progress: number;
  status: string;
  uploadedBytes: number;
  totalBytes: number;
  estimatedTimeRemaining?: number;
}

/**
 * 用户上传统计响应类型
 */
export interface UserUploadStatsResponse {
  totalFiles: number;
  totalSize: number;
  imageCount: number;
  videoCount: number;
  lastUploadAt?: Date;
}

/**
 * 通用成功响应类型
 */
export interface SuccessResponse {
  success: boolean;
  message?: string;
}

/**
 * 清理会话响应类型
 */
export interface CleanupSessionsResponse {
  cleanedCount: number;
}

/**
 * 媒体文件更新项类型
 */
export interface MediaUpdateItem {
  id: string;
  order: number;
}

/**
 * 输入类型推断
 */
export type GetUploadProgressInput = z.infer<typeof getUploadProgressSchema>;
export type CancelUploadInput = z.infer<typeof cancelUploadSchema>;
export type UpdateMediaOrderInput = z.infer<typeof updateMediaOrderSchema>;
export type DeleteMediaInput = z.infer<typeof deleteMediaSchema>;
