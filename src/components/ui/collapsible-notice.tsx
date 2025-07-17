/**
 * @component CollapsibleNotice
 * @description 可折叠的运营说明组件，用于在认证页面显示重要说明
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - title?: string - 折叠标题
 * - content: string - 说明内容
 * - defaultOpen?: boolean - 默认是否展开
 * - className?: string - 自定义样式类名
 * - icon?: React.ReactNode - 自定义图标
 *
 * @example
 * <CollapsibleNotice
 *   title="重要说明"
 *   content="当前仅作为体验测试，所有测试数据会定期清空"
 *   defaultOpen={false}
 * />
 *
 * @dependencies
 * - React 18+
 * - @radix-ui/react-collapsible
 * - lucide-react
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

interface CollapsibleNoticeProps {
  title?: string;
  content: string;
  defaultOpen?: boolean;
  className?: string;
  icon?: React.ReactNode;
  variant?: "info" | "warning" | "default";
}

export function CollapsibleNotice({
  title = "重要说明",
  content,
  defaultOpen = false,
  className,
  icon,
  variant = "info",
}: CollapsibleNoticeProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // 根据变体选择默认图标和样式
  const getVariantStyles = () => {
    switch (variant) {
      case "warning":
        return {
          containerClass: "border-amber-200 bg-amber-50",
          triggerClass: "text-amber-700 hover:bg-amber-100",
          contentClass: "text-amber-700",
          defaultIcon: <AlertTriangle className="w-4 h-4" />,
        };
      case "info":
        return {
          containerClass: "border-blue-200 bg-blue-50",
          triggerClass: "text-blue-700 hover:bg-blue-100",
          contentClass: "text-blue-700",
          defaultIcon: <Info className="w-4 h-4" />,
        };
      default:
        return {
          containerClass: "border-gray-200 bg-gray-50",
          triggerClass: "text-gray-700 hover:bg-gray-100",
          contentClass: "text-gray-700",
          defaultIcon: <Info className="w-4 h-4" />,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const displayIcon = icon || variantStyles.defaultIcon;

  // 如果没有内容，不渲染组件
  if (!content || content.trim() === "") {
    return null;
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("w-full", className)}
    >
      <div
        className={cn(
          "border rounded-lg overflow-hidden transition-all duration-200",
          variantStyles.containerClass
        )}
      >
        {/* 触发按钮 */}
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-between p-4 h-auto font-medium text-sm rounded-none",
              variantStyles.triggerClass
            )}
          >
            <div className="flex items-center gap-2">
              {displayIcon}
              <span>{title}</span>
            </div>
            {isOpen ? (
              <ChevronUp className="w-4 h-4 transition-transform duration-200" />
            ) : (
              <ChevronDown className="w-4 h-4 transition-transform duration-200" />
            )}
          </Button>
        </CollapsibleTrigger>

        {/* 可折叠内容 */}
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <div className={cn("px-4 pb-4 text-sm leading-relaxed", variantStyles.contentClass)}>
            {/* 支持多行文本和HTML内容 */}
            <div
              className="space-y-2"
              dangerouslySetInnerHTML={{
                __html: content.includes('<')
                  ? content // 如果包含HTML标签，直接使用
                  : content
                      .split('\n')
                      .map(line => line.trim())
                      .filter(line => line.length > 0)
                      .map(line => `<p>${line}</p>`)
                      .join('')
              }}
            />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// 预设的认证页面说明组件
export function AuthPageNotice({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <CollapsibleNotice
      title="使用须知"
      content={content}
      defaultOpen={false}
      variant="info"
      className={className}
    />
  );
}

// 默认的测试环境说明
export const DEFAULT_AUTH_NOTICE = `当前仅作为体验测试，所有测试数据会定期清空
请勿上传重要个人信息或敏感内容
如有问题请联系管理员`;
