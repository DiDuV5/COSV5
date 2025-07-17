/**
 * @fileoverview 下载链接标签页组件统一导出
 * @description 提供向后兼容的统一导出接口
 */

// 主组件
export { DownloadLinksTabContent } from './DownloadLinksTabContent';

// 类型定义
export type {
  DownloadLinksTabContentProps,
  DownloadLinksState,
  LinkHandlers,
  EditModeController,
  LinkStats,
  DuplicateCheckResult,
  MutationConfig,
  SaveContext,
} from './types';

// Hooks
export { useDownloadLinksState } from './hooks/useDownloadLinksState';
export { useDownloadLinksAPI } from './hooks/useDownloadLinksAPI';
export { useDownloadLinksHandlers } from './hooks/useDownloadLinksHandlers';
export { useDownloadLinksSave } from './hooks/useDownloadLinksSave';

// 子组件
export { HeaderControls } from './components/HeaderControls';
export { StatusIndicators } from './components/StatusIndicators';
export { EditModeContent } from './components/EditModeContent';
export { PreviewModeContent } from './components/PreviewModeContent';

// 默认导出主组件以保持向后兼容性
export { DownloadLinksTabContent as default } from './DownloadLinksTabContent';
