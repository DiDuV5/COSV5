/**
 * @fileoverview 资源下载标签页内容组件 - 重构版本
 * @description 管理和展示下载链接的专用标签页，采用模块化架构
 */

'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useDownloadLinksState } from './hooks/useDownloadLinksState';
import { useDownloadLinksAPI } from './hooks/useDownloadLinksAPI';
import { useDownloadLinksHandlers } from './hooks/useDownloadLinksHandlers';
import { useDownloadLinksSave } from './hooks/useDownloadLinksSave';
import { HeaderControls } from './components/HeaderControls';
import { StatusIndicators } from './components/StatusIndicators';
import { EditModeContent } from './components/EditModeContent';
import { PreviewModeContent } from './components/PreviewModeContent';
import type { DownloadLinksTabContentProps, EditModeController } from './types';

/**
 * 下载链接标签页内容组件
 */
export function DownloadLinksTabContent({
  downloadLinks,
  onSave,
  isPublishing,
  isDraft,
  postId,
  existingLinks,
}: DownloadLinksTabContentProps) {
  // 状态管理
  const {
    links,
    errors,
    saving,
    isEditing,
    stats,
    duplicateCheck,
    updateLinks,
    updateErrors,
    setSavingState,
    setEditingState,
    clearError,
    clearAllErrors,
  } = useDownloadLinksState(downloadLinks, existingLinks, postId);

  // API调用管理
  const {
    saveLinks,
    updateLinks: updateLinksAPI,
    deleteLink,
    refreshCache,
  } = useDownloadLinksAPI(onSave);

  // 链接操作处理
  const handlers = useDownloadLinksHandlers({
    links,
    updateLinks,
    clearError,
    updateErrors,
    deleteLink,
  });

  // 保存逻辑
  const { handleSaveLinks } = useDownloadLinksSave({
    links,
    setSavingState,
    setEditingState,
    updateErrors,
    saveLinks,
    updateLinks: updateLinksAPI,
    refreshCache,
    onSave,
    postId,
  });

  // 编辑模式控制器
  const editController: EditModeController = {
    isEditing,
    startEditing: () => setEditingState(true),
    cancelEditing: () => {
      setEditingState(false);
      clearAllErrors();
    },
    canEdit: !isPublishing && !isDraft,
  };

  // 重写handlers中的保存函数
  const enhancedHandlers = {
    ...handlers,
    handleSaveLinks,
  };

  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <HeaderControls
          links={links}
          saving={saving}
          editController={editController}
          onSave={handleSaveLinks}
          onCancel={editController.cancelEditing}
        />
      </CardHeader>
      <CardContent className="space-y-6">
        <StatusIndicators
          links={links}
          stats={stats}
          saving={saving}
          isPublishing={isPublishing}
          isDraft={isDraft}
          isEditing={isEditing}
        />

        {/* 编辑模式内容 */}
        {isEditing && (
          <EditModeContent
            links={links}
            errors={errors}
            saving={saving}
            handlers={enhancedHandlers}
          />
        )}

        {/* 预览模式内容 */}
        {!isEditing && (
          <PreviewModeContent
            links={links}
            editController={editController}
          />
        )}
      </CardContent>
    </Card>
  );
}
