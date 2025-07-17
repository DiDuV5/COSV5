/**
 * @fileoverview 头部控制组件
 * @description 渲染下载链接管理的头部控制按钮
 */

'use client';

import { Button } from '@/components/ui/button';
import { CardDescription, CardTitle } from '@/components/ui/card';
import { Download, Save } from 'lucide-react';
import type { EditModeController } from '../types';

interface HeaderControlsProps {
  links: any[];
  saving: boolean;
  editController: EditModeController;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * 头部控制组件
 */
export function HeaderControls({
  links,
  saving,
  editController,
  onSave,
  onCancel,
}: HeaderControlsProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
          <Download className="w-4 h-4 text-white" />
        </div>
        <div>
          <CardTitle className="text-lg">资源下载管理</CardTitle>
          <CardDescription className="text-sm">
            为您的作品添加下载链接，支持多种网盘平台
          </CardDescription>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {!editController.isEditing && links.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={editController.startEditing}
            disabled={!editController.canEdit}
          >
            编辑链接
          </Button>
        )}
        {editController.isEditing && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={saving}
            >
              取消
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                console.log('🖱️ 保存按钮被点击');
                console.log('🔒 按钮状态:', {
                  saving,
                  disabled: saving || !editController.canEdit
                });
                onSave();
              }}
              disabled={saving || !editController.canEdit}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? '保存中...' : '保存'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
