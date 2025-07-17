/**
 * @fileoverview 兑换处理器模块统一导出
 * @description 提供向后兼容的统一导出接口
 */

// 主处理器
export { PurchaseHandler } from './purchase-handler';

// 子模块
export { PurchaseProcessor } from './purchase-processor';
export { StatusQuery } from './status-query';
export { DatabaseOperations } from './database-operations';

// 类型定义
export type {
  RequestContext,
  PurchaseParams,
  StatusQueryParams,
  BatchStatusQueryParams,
  UserHistoryParams,
  DownloadProcessParams,
  DatabaseQueryOptions,
  PurchaseValidationResult,
  AccessRecordParams,
} from './types';

// 重新导出主要类型以保持向后兼容性
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
} from './types';

// 默认导出主处理器以保持向后兼容性
export { PurchaseHandler as default } from './purchase-handler';
