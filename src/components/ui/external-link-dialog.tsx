/**
 * @component ExternalLinkDialog
 * @description 外部链接确认对话框组件，用于在跳转到外部链接前进行安全确认
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - isOpen: boolean - 对话框是否打开
 * - onOpenChange: (open: boolean) => void - 对话框状态变化回调
 * - url: string - 要跳转的外部链接
 * - platform?: string - 社交平台名称
 * - username?: string - 用户名
 * - customTitle?: string - 自定义标题
 *
 * @example
 * <ExternalLinkDialog
 *   isOpen={isOpen}
 *   onOpenChange={setIsOpen}
 *   url="https://github.com/username"
 *   platform="GitHub"
 *   username="username"
 * />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - shadcn/ui components
 * - lucide-react icons
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { useState } from "react";
import { ExternalLink, AlertTriangle, Shield, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { SOCIAL_PLATFORMS } from "@/types/profile";
import { cn } from "@/lib/utils";

interface ExternalLinkDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  platform?: string;
  username?: string;
  customTitle?: string;
  className?: string;
}

export function ExternalLinkDialog({
  isOpen,
  onOpenChange,
  url,
  platform,
  username,
  customTitle,
  className,
}: ExternalLinkDialogProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // 获取平台配置
  const platformConfig = platform ? SOCIAL_PLATFORMS[platform as keyof typeof SOCIAL_PLATFORMS] : null;
  
  // 获取域名
  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  // 处理确认跳转
  const handleConfirm = () => {
    // 如果用户选择不再显示，可以在这里保存到localStorage
    if (dontShowAgain) {
      localStorage.setItem('skipExternalLinkConfirm', 'true');
    }
    
    // 在新窗口打开链接
    window.open(url, '_blank', 'noopener,noreferrer');
    onOpenChange(false);
  };

  // 处理取消
  const handleCancel = () => {
    onOpenChange(false);
  };

  // 检查是否为可信域名
  const isTrustedDomain = (url: string) => {
    const trustedDomains = [
      'github.com',
      'twitter.com',
      'x.com',
      'instagram.com',
      'tiktok.com',
      'youtube.com',
      'bilibili.com',
      'weibo.com',
      't.me',
      'zhihu.com'
    ];
    
    try {
      const domain = new URL(url).hostname;
      return trustedDomains.some(trusted => domain.includes(trusted));
    } catch {
      return false;
    }
  };

  const trusted = isTrustedDomain(url);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-md", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            跳转到外部链接
          </DialogTitle>
          <DialogDescription>
            您即将离开Tu平台，跳转到外部网站
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 链接信息 */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-start gap-3">
              {platformConfig && (
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: platformConfig.color }}
                >
                  {platformConfig.name.charAt(0)}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">
                  {customTitle || (platformConfig ? platformConfig.name : "外部链接")}
                </div>
                {username && (
                  <div className="text-xs text-gray-500 mb-1">
                    @{username}
                  </div>
                )}
                <div className="text-xs text-gray-600 dark:text-gray-400 break-all">
                  {getDomain(url)}
                </div>
              </div>

              {trusted && (
                <Badge variant="secondary" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  已验证
                </Badge>
              )}
            </div>
          </div>

          {/* 安全提示 */}
          {!trusted && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                此链接指向未验证的外部网站，请确认您信任此链接后再继续。
              </AlertDescription>
            </Alert>
          )}

          {/* 不再显示选项 */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <label
              htmlFor="dont-show-again"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              不再显示此确认对话框
            </label>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button onClick={handleConfirm}>
            <ExternalLink className="h-4 w-4 mr-2" />
            继续访问
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 检查是否应该跳过确认对话框
export function shouldSkipExternalLinkConfirm(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('skipExternalLinkConfirm') === 'true';
}

// 重置外部链接确认设置
export function resetExternalLinkConfirm(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('skipExternalLinkConfirm');
}
