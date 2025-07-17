/**
 * @fileoverview 预览模式内容组件
 * @description 渲染下载链接预览模式的UI内容
 */

'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, ExternalLink, Plus, HelpCircle } from 'lucide-react';
import type { DownloadLink, EditModeController } from '../types';

interface PreviewModeContentProps {
  links: DownloadLink[];
  editController: EditModeController;
}

/**
 * 预览模式内容组件
 */
export function PreviewModeContent({
  links,
  editController,
}: PreviewModeContentProps) {
  // 如果有链接，显示链接列表
  if (links.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <h4 className="text-sm font-medium text-gray-700">下载链接预览</h4>
          <Badge variant="secondary" className="text-xs">
            {links.length}
          </Badge>
        </div>

        <div className="space-y-3">
          {links.map((link, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <ExternalLink className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-medium text-gray-900 truncate">
                    {link.title || '未命名链接'}
                  </h5>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{link.platform || '未知平台'}</span>
                    {link.cansPrice !== undefined && (
                      <>
                        <span>•</span>
                        <span className={link.cansPrice === 0 ? 'text-green-600' : 'text-orange-600'}>
                          {link.cansPrice === 0 ? '免费' : `${link.cansPrice} 罐头`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <Badge
                variant={link.cansPrice === 0 ? 'secondary' : 'default'}
                className="text-xs"
              >
                {link.cansPrice === 0 ? '免费' : '付费'}
              </Badge>
            </div>
          ))}
        </div>

        {/* 使用说明 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-4 h-4 text-white" />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">资源下载说明</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• 支持百度网盘、阿里云盘、夸克网盘等主流平台</li>
                <li>• 可设置免费或付费下载（消耗用户罐头）</li>
                <li>• 用户兑换后罐头会自动转入您的账户</li>
                <li>• 建议为重要资源设置合理的罐头价格</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 空状态
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Download className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-sm font-medium text-gray-900 mb-2">还没有下载链接</h3>
      <p className="text-xs text-gray-500 mb-4">
        添加下载链接让用户可以获取您的作品资源
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={editController.startEditing}
        disabled={!editController.canEdit}
      >
        <Plus className="w-4 h-4 mr-2" />
        添加第一个下载链接
      </Button>
    </div>
  );
}
