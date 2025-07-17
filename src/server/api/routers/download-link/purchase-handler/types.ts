/**
 * @fileoverview 兑换处理器类型定义
 * @description 定义兑换处理器相关的TypeScript类型
 */

// 导入并重新导出主要类型
import type {
  DownloadLinkDetail,
  PurchaseRecord,
  PurchaseResult,
  PurchaseStatusResponse,
  BatchPurchaseStatusResponse,
  UserPermission,
  CansAccountInfo,
  PurchaseDownloadLinkResponse,
  GetPurchaseStatusResponse,
  GetBatchPurchaseStatusResponse
} from '../types';

// 重新导出以便其他模块使用
export type {
  DownloadLinkDetail,
  PurchaseRecord,
  PurchaseResult,
  PurchaseStatusResponse,
  BatchPurchaseStatusResponse,
  UserPermission,
  CansAccountInfo,
  PurchaseDownloadLinkResponse,
  GetPurchaseStatusResponse,
  GetBatchPurchaseStatusResponse
};

/**
 * 请求上下文
 */
export interface RequestContext {
  ipAddress: string;
  userAgent: string;
}

/**
 * 兑换处理参数
 */
export interface PurchaseParams {
  db: any;
  linkId: string;
  userPermission: UserPermission;
  requestContext?: RequestContext;
}

/**
 * 状态查询参数
 */
export interface StatusQueryParams {
  db: any;
  linkId: string;
  userPermission: UserPermission;
}

/**
 * 批量状态查询参数
 */
export interface BatchStatusQueryParams {
  db: any;
  linkIds: string[];
  userPermission: UserPermission;
}

/**
 * 用户历史查询参数
 */
export interface UserHistoryParams {
  db: any;
  userId: string;
  userPermission: UserPermission;
  options?: {
    limit?: number;
    offset?: number;
  };
}

/**
 * 下载处理参数
 */
export interface DownloadProcessParams {
  db: any;
  downloadLink: DownloadLinkDetail;
  userId: string;
  ipAddress: string;
  userAgent: string;
}

/**
 * 数据库查询选项
 */
export interface DatabaseQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'asc' | 'desc';
}

/**
 * 兑换验证结果
 */
export interface PurchaseValidationResult {
  isValid: boolean;
  error?: string;
  canProceed: boolean;
}

/**
 * 访问记录更新参数
 */
export interface AccessRecordParams {
  db: any;
  purchaseId: string;
}
