/**
 * @fileoverview 下载链接管理类型定义
 * @description 定义下载链接相关的类型和验证模式
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { z } from 'zod';

/**
 * 创建下载链接的输入验证
 */
export const createDownloadLinkSchema = z.object({
  postId: z.string().min(1, '内容ID不能为空'),
  platform: z.string().min(1, '请选择平台'),
  url: z.string().url('请输入有效的URL'),
  extractCode: z.string().optional(),
  cansPrice: z.number().min(0, '罐头价格不能为负数').max(10000, '罐头价格不能超过10000'),
  title: z.string().min(1, '请输入标题').max(255, '标题不能超过255个字符'),
  description: z.string().max(1000, '描述不能超过1000个字符').optional(),
  sortOrder: z.number().default(0)
});

/**
 * 更新下载链接的输入验证
 */
export const updateDownloadLinkSchema = z.object({
  id: z.string().min(1, '链接ID不能为空'),
  platform: z.string().min(1, '请选择平台').optional(),
  url: z.string().url('请输入有效的URL').optional(),
  extractCode: z.string().optional(),
  cansPrice: z.number().min(0, '罐头价格不能为负数').max(10000, '罐头价格不能超过10000').optional(),
  title: z.string().min(1, '请输入标题').max(255, '标题不能超过255个字符').optional(),
  description: z.string().max(1000, '描述不能超过1000个字符').optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional()
});

/**
 * 兑换下载链接的输入验证
 */
export const purchaseDownloadLinkSchema = z.object({
  linkId: z.string().min(1, '链接ID不能为空')
});

/**
 * 获取内容下载链接的输入验证
 */
export const getByPostIdSchema = z.object({
  postId: z.string().min(1, '内容ID不能为空')
});

/**
 * 删除下载链接的输入验证
 */
export const deleteDownloadLinkSchema = z.object({
  id: z.string().min(1, '链接ID不能为空')
});

/**
 * 获取兑换状态的输入验证
 */
export const getPurchaseStatusSchema = z.object({
  linkId: z.string().min(1, '链接ID不能为空')
});

/**
 * 批量获取兑换状态的输入验证
 */
export const getBatchPurchaseStatusSchema = z.object({
  linkIds: z.array(z.string()).max(50, '一次最多查询50个链接')
});

/**
 * 下载链接基本信息类型
 */
export interface DownloadLinkInfo {
  id: string;
  platform: string;
  cansPrice: number;
  title: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
  downloadCount: number;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * 下载链接详细信息类型（包含敏感信息）
 */
export interface DownloadLinkDetail extends DownloadLinkInfo {
  url: string;
  extractCode?: string | null;
  userId: string;
  postId: string;
}

/**
 * 兑换记录类型
 */
export interface PurchaseRecord {
  id: string;
  userId: string;
  downloadLinkId: string;
  cansSpent: number;
  accessCount: number;
  lastAccessAt?: Date | null;
  createdAt: Date;
}

/**
 * 兑换状态响应类型
 */
export interface PurchaseStatusResponse {
  purchased: boolean;
  cansPrice: number;
  platform: string;
  title: string;
  url?: string;
  extractCode?: string | null;
  purchaseDate?: Date;
  accessCount?: number;
}

/**
 * 批量兑换状态响应类型
 */
export interface BatchPurchaseStatusResponse {
  linkId: string;
  purchased: boolean;
  cansPrice: number;
  platform: string;
  title: string;
  url?: string;
  extractCode?: string | null;
  purchaseDate?: Date;
  accessCount?: number;
}

/**
 * 兑换结果类型
 */
export interface PurchaseResult {
  purchaseId: string;
  url: string;
  extractCode?: string | null;
  platform: string;
  title: string;
  cansPrice: number;
  purchaseDate: Date;
  alreadyPurchased?: boolean;
  isOwnerAccess?: boolean; // 新增：标识是否为创建者/管理员直接访问
}

/**
 * 用户权限信息类型
 */
export interface UserPermission {
  userId: string;
  userLevel: string;
  isAdmin: boolean;
}

/**
 * 内容信息类型
 */
export interface PostInfo {
  id: string;
  authorId: string;
  title?: string;
}

/**
 * 罐头账户信息类型
 */
export interface CansAccountInfo {
  id: string;
  userId: string;
  availableCans: number;
  totalCans: number;
}

/**
 * 交易记录类型
 */
export interface TransactionRecord {
  userId: string;
  accountId: string;
  transactionType: 'SPEND' | 'EARN';
  amount: number;
  sourceType: 'DOWNLOAD_PURCHASE' | 'DOWNLOAD_SALE';
  sourceId: string;
  description: string;
}

/**
 * API响应基础类型
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

/**
 * 创建下载链接响应类型
 */
export type CreateDownloadLinkResponse = ApiResponse<DownloadLinkInfo>;

/**
 * 获取下载链接列表响应类型
 */
export type GetDownloadLinksResponse = ApiResponse<DownloadLinkInfo[]>;

/**
 * 更新下载链接响应类型
 */
export type UpdateDownloadLinkResponse = ApiResponse<DownloadLinkInfo>;

/**
 * 删除下载链接响应类型
 */
export type DeleteDownloadLinkResponse = ApiResponse<void>;

/**
 * 兑换下载链接响应类型
 */
export type PurchaseDownloadLinkResponse = ApiResponse<PurchaseResult>;

/**
 * 获取兑换状态响应类型
 */
export type GetPurchaseStatusResponse = ApiResponse<PurchaseStatusResponse>;

/**
 * 批量获取兑换状态响应类型
 */
export type GetBatchPurchaseStatusResponse = ApiResponse<BatchPurchaseStatusResponse[]>;

/**
 * 下载链接选择字段
 */
export const downloadLinkSelectFields = {
  id: true,
  platform: true,
  cansPrice: true,
  title: true,
  description: true,
  isActive: true,
  sortOrder: true,
  downloadCount: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * 兑换记录选择字段
 */
export const purchaseSelectFields = {
  downloadLinkId: true,
  createdAt: true,
  accessCount: true,
} as const;

/**
 * 错误消息常量
 */
export const ERROR_MESSAGES = {
  POST_NOT_FOUND: '内容不存在',
  LINK_NOT_FOUND: '下载链接不存在',
  LINK_NOT_FOUND_OR_DISABLED: '下载链接不存在或已禁用',
  PERMISSION_DENIED: '无权限管理此内容的下载链接',
  LINK_PERMISSION_DENIED: '无权限管理此下载链接',
  PLATFORM_NOT_SUPPORTED: '不支持的平台类型',
  INVALID_URL_FORMAT: '无效的下载链接格式',
  INSUFFICIENT_CANS: '罐头余额不足',
  ALREADY_PURCHASED: '您已兑换过此下载链接',
} as const;

/**
 * 成功消息常量
 */
export const SUCCESS_MESSAGES = {
  LINK_CREATED: '下载链接创建成功',
  LINK_UPDATED: '下载链接更新成功',
  LINK_DELETED: '下载链接删除成功',
  PURCHASE_SUCCESS: '兑换成功',
  FREE_DOWNLOAD: '获取成功',
} as const;
