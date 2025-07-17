/**
 * @component SocialLinks
 * @description 用户社交账号链接展示组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - userId: string - 用户ID
 * - isOwnProfile: boolean - 是否为用户自己的主页
 * - className?: string - 自定义样式类名
 *
 * @example
 * <SocialLinks
 *   userId="user123"
 *   isOwnProfile={false}
 *   className="mt-4"
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
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Link as LinkIcon
} from "lucide-react";

import { ExternalLinkDialog, shouldSkipExternalLinkConfirm } from "@/components/ui/external-link-dialog";
import { SocialIcon } from "@/components/ui/social-icon";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { api } from "@/trpc/react";
import { SOCIAL_PLATFORMS, type SocialLink } from "@/types/profile";
import { cn } from "@/lib/utils";

interface SocialLinksProps {
  userId: string;
  isOwnProfile: boolean;
  className?: string;
}

export function SocialLinks({ userId, isOwnProfile, className }: SocialLinksProps) {
  const router = useRouter();
  const [externalLinkDialog, setExternalLinkDialog] = useState<{
    isOpen: boolean;
    url: string;
    platform?: string;
    username?: string;
    customTitle?: string;
  }>({
    isOpen: false,
    url: "",
  });

  const {
    data: socialLinks,
    isPending,
    error
  } = api.user.getSocialLinks.useQuery({ userId });

  if (isPending) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skeleton className="h-5 w-20" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">加载社交链接时出错</p>
        </CardContent>
      </Card>
    );
  }

  if (!socialLinks || socialLinks.length === 0) {
    return isOwnProfile ? (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            社交账号
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/settings/social')}
            >
              <Plus className="h-4 w-4 mr-1" />
              添加账号
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-gray-400 mb-3">
              <LinkIcon className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-gray-500 mb-2">还没有添加社交账号链接</p>
            <p className="text-sm text-gray-400">
              添加您的社交媒体账号，让更多人找到您
            </p>
          </div>
        </CardContent>
      </Card>
    ) : null;
  }

  // 处理社交链接点击
  const handleSocialLinkClick = (link: any, e: React.MouseEvent) => {
    e.preventDefault();

    // 检查是否跳过确认对话框
    if (shouldSkipExternalLinkConfirm()) {
      window.open(link.url, '_blank', 'noopener,noreferrer');
      return;
    }

    // 显示确认对话框
    setExternalLinkDialog({
      isOpen: true,
      url: link.url,
      platform: link.platform,
      username: link.username,
      customTitle: link.customTitle,
    });
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          社交账号
          {isOwnProfile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/settings/social')}
            >
              <Edit className="h-4 w-4 mr-1" />
              管理
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {socialLinks.map((link) => {
            const platformConfig = SOCIAL_PLATFORMS[link.platform as keyof typeof SOCIAL_PLATFORMS];

            if (!platformConfig) return null;

            return (
              <TooltipProvider key={link.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => handleSocialLinkClick(link, e)}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group w-full text-left"
                    >
                      <SocialIcon
                        platform={link.platform}
                        size="md"
                        variant="filled"
                        customIcon={link.customIcon || undefined}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {link.customTitle || platformConfig?.name || "自定义链接"}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          @{link.username}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!link.isPublic && isOwnProfile && (
                          <Badge variant="secondary" className="text-xs">
                            <EyeOff className="h-3 w-3 mr-1" />
                            私密
                          </Badge>
                        )}

                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>访问 {link.customTitle || platformConfig?.name || '外部链接'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </CardContent>

      {/* 外部链接确认对话框 */}
      <ExternalLinkDialog
        isOpen={externalLinkDialog.isOpen}
        onOpenChange={(open) => setExternalLinkDialog(prev => ({ ...prev, isOpen: open }))}
        url={externalLinkDialog.url}
        platform={externalLinkDialog.platform}
        username={externalLinkDialog.username}
        customTitle={externalLinkDialog.customTitle}
      />
    </Card>
  );
}

// 社交链接编辑对话框组件（为后续实现预留）
export function SocialLinksEditDialog() {
  // TODO: 实现社交链接编辑对话框
  return null;
}

// 社交链接管理页面组件（为后续实现预留）
export function SocialLinksManager() {
  // TODO: 实现完整的社交链接管理界面
  return null;
}
