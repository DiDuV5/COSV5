/**
 * @fileoverview 创作页面头部组件
 * @description 专业级页面头部，包含标题、操作按钮和退出按钮
 */

'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sparkles, X, Save, Zap, Edit } from 'lucide-react';

interface CreatePageHeaderProps {
  isPublishing: boolean;
  isDraft: boolean;
  canPublish: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  // 新增草稿相关属性
  draftId?: string;
  lastSavedAt?: Date | null;
  isAutoSaving?: boolean;
  // 编辑模式相关属性
  isEditMode?: boolean;
  editingPostId?: string | null;
}

export function CreatePageHeader({
  isPublishing,
  isDraft,
  canPublish,
  onSaveDraft,
  onPublish,
  draftId,
  lastSavedAt,
  isAutoSaving,
  isEditMode,
  editingPostId,
}: CreatePageHeaderProps) {
  const router = useRouter();

  return (
    <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                {isEditMode ? (
                  <Edit className="w-5 h-5 text-white" />
                ) : (
                  <Sparkles className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {isEditMode ? '编辑作品' : '创作工作室'}
                </h1>
                <p className="text-sm text-gray-500">
                  {isEditMode ? '修改和完善您的作品' : '专业级内容创作平台'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* 草稿状态显示 */}
            <div className="hidden sm:flex items-center space-x-4 text-sm text-gray-600">
              {draftId && (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${isAutoSaving ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                    <span className="font-medium">草稿 ID: {draftId.split('_')[1]}</span>
                  </div>
                  {lastSavedAt && (
                    <span className="text-xs text-gray-500">
                      最后保存: {lastSavedAt.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              )}
              {isAutoSaving && (
                <span className="text-xs text-yellow-600 font-medium">自动保存中...</span>
              )}
            </div>

            {/* 操作按钮区域 */}
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onSaveDraft}
                disabled={isPublishing || isDraft}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Save className="w-4 h-4 mr-2" />
                {isDraft ? '已保存草稿' : '保存草稿'}
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={onPublish}
                disabled={!canPublish || isPublishing}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium"
              >
                {isPublishing ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>发布中...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4" />
                    <span>{isEditMode ? '保存更改' : '发布作品'}</span>
                  </div>
                )}
              </Button>
            </div>

            <div className="w-px h-6 bg-gray-300"></div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900"
            >
              <X className="w-4 h-4 mr-2" />
              退出
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
