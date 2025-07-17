/**
 * @fileoverview 下载链接项组件
 * @description 单个下载链接的显示和操作组件
 */

"use client";

import { useState, useCallback } from 'react';
import { Download, ExternalLink, Lock, Coins, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getPlatformIcon, getPlatformName, getPlatformDownloadHint } from '../utils/platform-utils';
import { copyToClipboard, openLinkSafely } from '../utils/clipboard-utils';
import type { DownloadLink } from '../hooks/use-download-links';

export interface DownloadLinkItemProps {
  link: DownloadLink;
  isPurchased: boolean;
  isProcessing: boolean;
  onDownloadClick: (linkId: string, cansPrice: number) => void;
}

/**
 * 下载链接项组件
 */
export function DownloadLinkItem({
  link,
  isPurchased,
  isProcessing,
  onDownloadClick,
}: DownloadLinkItemProps) {
  const [copyingStates, setCopyingStates] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // 复制到剪贴板
  const handleCopy = useCallback(async (text: string, type: string, key: string) => {
    try {
      setCopyingStates(prev => ({ ...prev, [key]: true }));

      await copyToClipboard(text);

      toast({
        title: "复制成功",
        description: `${type}已复制到剪贴板`,
      });

      // 2秒后重置复制状态
      setTimeout(() => {
        setCopyingStates(prev => ({ ...prev, [key]: false }));
      }, 2000);

    } catch (error) {
      console.error('复制失败:', error);

      toast({
        variant: "destructive",
        title: "复制失败",
        description: "请手动选择并复制内容",
      });

      setCopyingStates(prev => ({ ...prev, [key]: false }));
    }
  }, [toast]);

  // 打开链接
  const handleOpenLink = useCallback((url: string) => {
    try {
      openLinkSafely(url);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "打开失败",
        description: error instanceof Error ? error.message : "链接格式无效",
      });
    }
  }, [toast]);

  // 处理下载点击
  const handleDownload = useCallback(() => {
    console.log('🖱️ DownloadLinkItem 按钮被点击:', { linkId: link.id, cansPrice: link.cansPrice });
    onDownloadClick(link.id, link.cansPrice);
  }, [link.id, link.cansPrice, onDownloadClick]);

  return (
    <div className="border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
      {/* 移动端优化：使用响应式布局 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="text-2xl flex-shrink-0">
            {getPlatformIcon(link.platform)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h4 className="font-medium text-gray-900 truncate">
                {link.title || getPlatformName(link.platform)}
              </h4>
              {link.cansPrice > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                  <Coins className="w-3 h-3" />
                  {link.cansPrice} 罐头
                </Badge>
              )}
            </div>
            {link.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {link.description}
              </p>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-xs text-gray-500">
              <span>下载次数: {link.downloadCount}</span>
              <span>创建时间: {new Date(link.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* 移动端优化：按钮区域 */}
        <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0">
          {/* 移动端隐藏重复的价格信息 */}
          {link.cansPrice > 0 && (
            <div className="text-right mr-3 hidden sm:block">
              <div className="text-sm text-gray-600">需要罐头</div>
              <div className="font-medium text-orange-600">{link.cansPrice}</div>
            </div>
          )}

          {isPurchased ? (
            <Badge variant="default" className="bg-green-600 flex-shrink-0">
              <Check className="w-3 h-3 mr-1" />
              已兑换
            </Badge>
          ) : link.cansPrice > 0 ? (
            <Badge variant="outline" className="text-orange-600 border-orange-600 flex-shrink-0">
              <Lock className="w-3 h-3 mr-1" />
              需兑换
            </Badge>
          ) : (
            <Badge variant="outline" className="text-green-600 border-green-600 flex-shrink-0">
              免费
            </Badge>
          )}

          <Button
            onClick={(e) => {
              console.log('🖱️ 按钮原生点击事件触发:', { linkId: link.id, disabled: isProcessing });
              e.preventDefault();
              e.stopPropagation();
              handleDownload();
            }}
            disabled={isProcessing}
            size="sm"
            variant={isPurchased || link.cansPrice === 0 ? "default" : "outline"}
            className="flex items-center gap-2 min-w-[100px] sm:min-w-[120px] min-h-[44px] touch-manipulation"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isPurchased || link.cansPrice === 0 ? (
              <Download className="w-4 h-4" />
            ) : (
              <Coins className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {isProcessing
                ? "处理中..."
                : isPurchased || link.cansPrice === 0
                  ? "下载"
                  : `兑换 (${link.cansPrice}罐头)`
              }
            </span>
            <span className="sm:hidden">
              {isProcessing
                ? "处理中..."
                : isPurchased || link.cansPrice === 0
                  ? "下载"
                  : "兑换"
              }
            </span>
          </Button>
        </div>
      </div>

      {/* 已兑换时显示下载信息 */}
      {isPurchased && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <div className="space-y-2">
            {link.url && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">下载链接:</span>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleOpenLink(link.url!)}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1 min-h-[36px] touch-manipulation"
                  >
                    <ExternalLink className="w-3 h-3" />
                    打开
                  </Button>
                  <Button
                    onClick={() => handleCopy(link.url!, "下载链接", `url-${link.id}`)}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1 min-h-[36px] touch-manipulation"
                  >
                    {copyingStates[`url-${link.id}`] ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    复制
                  </Button>
                </div>
              </div>
            )}

            {link.extractCode && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">提取码:</span>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                    {link.extractCode}
                  </code>
                  <Button
                    onClick={() => handleCopy(link.extractCode!, "提取码", `code-${link.id}`)}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1 min-h-[36px] touch-manipulation"
                  >
                    {copyingStates[`code-${link.id}`] ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    复制
                  </Button>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 mt-2">
              {getPlatformDownloadHint(link.platform)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
