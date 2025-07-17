/**
 * @fileoverview 可折叠信息卡片组件
 * @description 用于显示帮助信息的可折叠卡片组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - Lucide React
 * - Tailwind CSS
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import * as React from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface CollapsibleInfoCardProps {
  title?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  icon?: React.ReactNode;
}

export function CollapsibleInfoCard({
  title = "使用说明",
  children,
  defaultOpen = false,
  className,
  triggerClassName,
  contentClassName,
  icon = <HelpCircle className="w-4 h-4" />,
}: CollapsibleInfoCardProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className={cn("border border-blue-200 rounded-lg bg-blue-50", className)}>
      {/* 触发按钮 */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full justify-between p-3 h-auto text-blue-700 hover:bg-blue-100 rounded-lg",
          triggerClassName
        )}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </Button>

      {/* 可折叠内容 */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-[500px] opacity-100 pb-3" : "max-h-0 opacity-0 pb-0"
        )}
      >
        <div className={cn("px-3 text-sm text-blue-700", contentClassName)}>
          {children}
        </div>
      </div>
    </div>
  );
}

// 预设的内容编辑说明组件
export function ContentEditingInfoCard() {
  return (
    <CollapsibleInfoCard
      title="内容编辑说明"
      icon={<HelpCircle className="w-4 h-4" />}
      className="mt-4"
    >
      <div className="space-y-3">
        <div>
          <h4 className="font-medium text-blue-800 mb-1">💡 智能标签提取</h4>
          <p className="text-blue-700">
            系统会自动从标题、简介和详细内容中识别 <code className="bg-blue-100 px-1 rounded">#标签</code> 格式，无需手动添加标签
          </p>
        </div>
        
        <div>
          <h4 className="font-medium text-blue-800 mb-1">📝 内容建议</h4>
          <ul className="text-blue-700 space-y-1 list-disc list-inside">
            <li>标题要简洁明了，突出作品特色</li>
            <li>简介可以包含创作背景和灵感来源</li>
            <li>详细内容可以分享制作过程和心得体会</li>
            <li>合理使用标签有助于内容被发现</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium text-blue-800 mb-1">⚡ 自动化功能</h4>
          <ul className="text-blue-700 space-y-1 list-disc list-inside">
            <li>媒体优化：自动压缩和优化上传的图片视频</li>
            <li>内容安全：自动检测和过滤不当内容</li>
            <li>SEO优化：自动生成搜索引擎友好的内容</li>
          </ul>
        </div>
      </div>
    </CollapsibleInfoCard>
  );
}
