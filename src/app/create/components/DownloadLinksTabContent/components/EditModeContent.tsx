/**
 * @fileoverview 编辑模式内容组件
 * @description 渲染下载链接编辑模式的UI内容
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, HelpCircle } from 'lucide-react';
import { DownloadLinkForm, type DownloadLink } from '@/components/download';
import type { LinkHandlers } from '../types';

interface EditModeContentProps {
  links: DownloadLink[];
  errors: Record<number, string>;
  saving: boolean;
  handlers: LinkHandlers;
}

/**
 * 编辑模式内容组件
 */
export function EditModeContent({
  links,
  errors,
  saving,
  handlers,
}: EditModeContentProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {links.map((link, index) => (
          <DownloadLinkForm
            key={index}
            link={link}
            index={index}
            error={errors[index]}
            showRemoveButton={links.length > 1}
            onUpdate={(field, value) => handlers.handleUpdateLinkField(index, field, value)}
            onRemove={() => handlers.handleRemoveLink(index)}
          />
        ))}

        {/* 添加链接按钮 */}
        <Button
          type="button"
          variant="outline"
          onClick={handlers.handleAddLink}
          className="w-full py-6 border-dashed border-2 hover:border-blue-500 hover:text-blue-500"
          disabled={saving}
        >
          <Plus className="w-4 h-4 mr-2" />
          添加资源下载
        </Button>
      </div>

      {/* 使用说明 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-2">使用说明：</p>
              <ul className="space-y-1 text-xs">
                <li>• 支持多种主流网盘平台，选择对应平台会自动识别链接格式</li>
                <li>• 设置罐头价格为0表示免费获取，用户无需消费罐头</li>
                <li>• 已保存的链接无法修改URL和提取码，确保安全性</li>
                <li>• 用户兑换后，罐头会自动转入您的账户</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
