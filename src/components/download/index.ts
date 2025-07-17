/**
 * @fileoverview 下载链接模块索引
 * @description 统一导出下载链接相关的组件、服务和类型
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

// 导出服务
export { DownloadLinkService, createDownloadLinkService } from './services/download-link-service';

// 导出组件
export { 
  DownloadLinkForm, 
  CompactDownloadLinkForm, 
  DownloadLinkFormSkeleton 
} from './components/DownloadLinkForm';

export { 
  DownloadLinkStats, 
  SimpleDownloadLinkStats, 
  DownloadLinkSummary,
  DownloadLinkStatsSkeleton 
} from './components/DownloadLinkStats';

// 导出类型
export type {
  DownloadLink,
  ValidationResult,
  LinkStats,
} from './services/download-link-service';

export type {
  DownloadLinkFormProps,
} from './components/DownloadLinkForm';

export type {
  DownloadLinkStatsProps,
} from './components/DownloadLinkStats';
