/**
 * @fileoverview 专业级内容创作页面 - 重构版
 * @description 为4600位专业cosplay创作者设计的现代化内容发布页面
 * @author Augment AI
 * @date 2024-01-XX
 * @version 4.0.0 - 重构为模块化组件结构
 * @since 1.0.0
 *
 * @features
 * - 专业级媒体上传体验（支持200-500张图片批量上传）
 * - 现代化UI设计，符合专业创作者需求
 * - 响应式布局，适配所有设备
 * - 智能标签系统和@用户提及
 * - 实时预览和草稿保存
 * - 模块化组件架构，便于维护和扩展
 *
 * @dependencies
 * - Next.js 14+
 * - React Hook Form
 * - tRPC
 * - Tailwind CSS
 * - shadcn/ui
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2024-01-XX: 优化用户体验，简化界面设计
 * - 2024-01-XX: 专业级重新设计，提升创作体验
 * - 2025-06-20: 重构为模块化组件结构，拆分为多个子组件
 */

'use client';

import { NgrokWarning } from '@/components/dev/NgrokWarning';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { extractAllTags } from '@/components/ui/tag';
import { SimpleUploadModal } from '@/components/upload/SimpleUploadModal';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { api } from '@/trpc/react';
import { useEffect, useState, useRef } from 'react';

// 导入拆分后的组件
import { ContentEditingSection } from './components/ContentEditingSection';
import { CreatePageHeader } from './components/CreatePageHeader';
import { CreatePageWrapper } from './components/CreatePageWrapper';
import { DragOverlay } from './components/DragOverlay';
import { DraftTabContent } from './components/DraftTabContent';
import { DownloadLinksTabContent } from './components/DownloadLinksTabContent';
import { MediaWorkbench } from './components/MediaWorkbench';
import { PreviewSection } from './components/PreviewSection';
import { PublishSettingsSection } from './components/PublishSettingsSection';
import { SmartSuggestions } from './components/SmartSuggestions';
import { WorkflowIndicator } from './components/WorkflowIndicator';

// 导入自定义Hook
import { useCreatePost } from './hooks/use-create-post';
import { useDragUpload } from './hooks/use-drag-upload';
import { useMediaFiles } from './hooks/use-media-files';

/**
 * 创作页面内容组件 - 包含useSearchParams的逻辑
 */
function CreatePostPageContent() {
  const [extractedTags, setExtractedTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('content');

  // 获取当前用户
  const { data: currentUser } = api.auth.getCurrentUser.useQuery();

  // 使用自定义Hook
  const {
    form,
    isPublishing,
    isDraft,
    publishedPostId,
    downloadLinks,
    setDownloadLinks,
    saveDraft,
    publishPost,
    // 新增的草稿相关功能
    draftId,
    lastSavedAt,
    isAutoSaving,
    autoSaveDraft,
    // 编辑模式相关
    isEditMode,
    editingPostId,
    isDraftLoading,
    isEditLoading,
    editData, // 获取编辑数据用于加载媒体文件
  } = useCreatePost();

  const {
    isDragOver,
    showUploadModal,
    setShowUploadModal,
    draggedFiles,
    setDraggedFiles,
  } = useDragUpload();

  const {
    uploadedFiles,
    setUploadedFiles,
    showMediaPreview,
    setShowMediaPreview,
    handleUploadComplete,
    handleFileDelete,
    handleFileReorder,
    refreshMediaInfo,
    refreshAllMediaInfo,
  } = useMediaFiles();

  // 清空媒体文件的方法
  const clearFiles = () => {
    setUploadedFiles([]);
  };

  const { watch } = form;
  const title = watch('title');
  const description = watch('description');
  const content = watch('content');

  // 实时提取标签
  useEffect(() => {
    const allTags = extractAllTags({ title, description, content });
    setExtractedTags(allTags);
  }, [title, description, content]);

  // 加载编辑模式的媒体文件 - 使用ref避免无限循环
  const hasLoadedEditMedia = useRef(false);
  const lastEditPostId = useRef<string | null>(null);

  useEffect(() => {
    // 如果是新的编辑作品，重置加载状态
    if (editData?.originalPost?.id !== lastEditPostId.current) {
      hasLoadedEditMedia.current = false;
      lastEditPostId.current = editData?.originalPost?.id || null;

      // 清空当前的媒体文件，准备加载新的
      if (editData?.originalPost?.id) {
        clearFiles();
      }
    }

    if (editData?.originalPost?.media &&
        editData.originalPost.media.length > 0 &&
        !hasLoadedEditMedia.current) {

      const mediaFiles = editData.originalPost.media.map((media: any, index: number) => ({
        id: media.id,
        mediaId: media.id, // 确保有mediaId用于API调用
        url: media.url,
        type: media.type,
        filename: media.filename || `media-${index + 1}`,
        size: media.size || 0,
        order: index,
      }));

      console.log('加载编辑模式的媒体文件:', mediaFiles);
      handleUploadComplete(mediaFiles);
      hasLoadedEditMedia.current = true; // 标记已加载，避免重复
    }
  }, [editData?.originalPost?.id, clearFiles]); // 依赖postId和clearFiles

  // 处理表单提交
  const handleSaveDraft = () => {
    const data = form.getValues();
    saveDraft(data, uploadedFiles, extractedTags);
  };

  const handlePublish = () => {
    const data = form.getValues();
    publishPost(data, uploadedFiles, extractedTags);
  };

  // 检查发布条件（编辑模式下不需要重新上传媒体文件）
  const canPublish = Boolean(title && title.trim().length > 0 && (isEditMode || uploadedFiles.length > 0));

  // 加载状态
  if (isDraftLoading || isEditLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {isDraftLoading ? '加载草稿中...' : '加载作品数据中...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard
      requiredLevel="CREATOR"
      requirePublishPermission={true}
      showDetails={true}
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
        {/* 页面头部 */}
        <CreatePageHeader
          isPublishing={isPublishing}
          isDraft={isDraft}
          canPublish={canPublish}
          onSaveDraft={handleSaveDraft}
          onPublish={handlePublish}
          draftId={draftId}
          lastSavedAt={lastSavedAt}
          isAutoSaving={isAutoSaving}
          isEditMode={isEditMode}
          editingPostId={editingPostId}
        />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 主要内容区域 - 全宽布局 */}
        <div className="w-full">
          <form onSubmit={form.handleSubmit(handlePublish)}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* 第一排：主要功能标签 */}
              <div className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1">
                  <TabsTrigger value="content" className="text-xs sm:text-sm">作品信息</TabsTrigger>
                  <TabsTrigger value="media" className="text-xs sm:text-sm">媒体素材</TabsTrigger>
                  <TabsTrigger value="preview" className="text-xs sm:text-sm">实时预览</TabsTrigger>
                  <TabsTrigger value="settings" className="text-xs sm:text-sm">发布设置</TabsTrigger>
                </TabsList>

                {/* 第二排：管理功能标签 */}
                <TabsList className="grid grid-cols-2 sm:grid-cols-2 gap-1">
                  <TabsTrigger value="drafts" className="text-xs sm:text-sm">
                    草稿列表
                  </TabsTrigger>
                  <TabsTrigger value="downloads" className="text-xs sm:text-sm">
                    资源下载
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* 工作流程指示器 */}
              <div className="mt-6">
                <WorkflowIndicator
                activeTab={activeTab}
                title={title || ''}
                content={content || ''}
                uploadedFilesCount={uploadedFiles.length}
                />
              </div>

              {/* 作品信息标签页 */}
              <TabsContent value="content" className="space-y-6">
                <ContentEditingSection
                  form={form}
                  extractedTags={extractedTags}
                  downloadLinksCount={downloadLinks.length}
                  currentUserId={currentUser?.id}
                  isPublishing={isPublishing}
                  isDraft={isDraft}
                  onTabChange={setActiveTab}
                />

                {/* 智能切换建议 */}
                <SmartSuggestions
                  activeTab={activeTab}
                  title={title}
                  uploadedFilesCount={uploadedFiles.length}
                  extractedTagsCount={extractedTags.length}
                  onTabChange={setActiveTab}
                />
              </TabsContent>

              {/* 草稿列表标签页 */}
              <TabsContent value="drafts" className="space-y-6">
                <DraftTabContent
                  onSelectDraft={(draftId) => {
                    // 选择草稿后跳转到草稿编辑页面
                    window.location.href = `/create?draft=${draftId}`;
                  }}
                />

                {/* 智能切换建议 */}
                <SmartSuggestions
                  activeTab={activeTab}
                  title={title}
                  uploadedFilesCount={uploadedFiles.length}
                  extractedTagsCount={extractedTags.length}
                  onTabChange={setActiveTab}
                />
              </TabsContent>

              {/* 资源下载标签页 */}
              <TabsContent value="downloads" className="space-y-6">
                <DownloadLinksTabContent
                  downloadLinks={downloadLinks}
                  onSave={setDownloadLinks}
                  isPublishing={isPublishing}
                  isDraft={isDraft}
                  postId={editingPostId || undefined}
                  existingLinks={editData?.downloadLinks}
                />

                {/* 智能切换建议 */}
                <SmartSuggestions
                  activeTab={activeTab}
                  title={title}
                  uploadedFilesCount={uploadedFiles.length}
                  extractedTagsCount={extractedTags.length}
                  onTabChange={setActiveTab}
                />
              </TabsContent>

              {/* 媒体素材标签页 */}
              <TabsContent value="media" className="space-y-6">
                <MediaWorkbench
                  uploadedFiles={uploadedFiles}
                  showMediaPreview={showMediaPreview}
                  onShowUploadModal={() => setShowUploadModal(true)}
                  onToggleMediaPreview={() => setShowMediaPreview(!showMediaPreview)}
                  onFileDelete={handleFileDelete}
                  onFileReorder={handleFileReorder}
                  onRefreshMediaInfo={refreshMediaInfo}
                  onRefreshAllMediaInfo={refreshAllMediaInfo}
                />

                {/* 智能切换建议 */}
                <SmartSuggestions
                  activeTab={activeTab}
                  title={title}
                  uploadedFilesCount={uploadedFiles.length}
                  extractedTagsCount={extractedTags.length}
                  onTabChange={setActiveTab}
                />
              </TabsContent>

              {/* 实时预览标签页 */}
              <TabsContent value="preview" className="space-y-6">
                <PreviewSection
                  title={title}
                  description={description}
                  content={content}
                  uploadedFiles={uploadedFiles}
                  extractedTags={extractedTags}
                  visibility={form.watch('visibility')}
                  currentUser={currentUser}
                />

                {/* 智能切换建议 */}
                <SmartSuggestions
                  activeTab={activeTab}
                  title={title}
                  uploadedFilesCount={uploadedFiles.length}
                  extractedTagsCount={extractedTags.length}
                  onTabChange={setActiveTab}
                />
              </TabsContent>

              {/* 发布设置标签页 */}
              <TabsContent value="settings" className="space-y-6">
                <PublishSettingsSection
                  form={form}
                  uploadedFilesCount={uploadedFiles.length}
                  extractedTagsCount={extractedTags.length}
                  isPublishing={isPublishing}
                  isDraft={isDraft}
                  onSaveDraft={handleSaveDraft}
                  onPublish={handlePublish}
                />

                {/* 智能切换建议 */}
                <SmartSuggestions
                  activeTab={activeTab}
                  title={title}
                  uploadedFilesCount={uploadedFiles.length}
                  extractedTagsCount={extractedTags.length}
                  onTabChange={setActiveTab}
                />
              </TabsContent>
            </Tabs>
          </form>
        </div>
      </div>

      {/* 拖拽覆盖层 */}
      <DragOverlay isDragOver={isDragOver} />

      {/* 简单上传模态框 */}
      {showUploadModal && (
        <SimpleUploadModal
          isOpen={showUploadModal}
          onClose={() => {
            setShowUploadModal(false);
            setDraggedFiles([]);
          }}
          onUploadComplete={handleUploadComplete}
          draggedFiles={draggedFiles}
        />
      )}

        {/* 开发环境ngrok警告 */}
        <NgrokWarning />
      </div>
    </PermissionGuard>
  );
}

/**
 * 创作页面主组件 - 使用Suspense包装
 */
export default function CreatePostPage() {
  return (
    <CreatePageWrapper>
      <CreatePostPageContent />
    </CreatePageWrapper>
  );
}
