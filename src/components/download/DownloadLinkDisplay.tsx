/**
 * @fileoverview 下载链接显示组件 (重构版)
 * @description 在内容详情页面显示下载链接，采用模块化架构
 * @author Augment AI
 * @date 2024-01-XX
 * @version 2.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - tRPC
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2025-06-29: v2.0.0 重构为模块化架构
 */

'use client';

import React from 'react';
import { Download, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/trpc/react';
import { useSession } from 'next-auth/react';

// 导入拆分的模块
import { useDownloadLinks } from './hooks/use-download-links';
import { usePurchaseStatus } from './hooks/use-purchase-status';
import { DownloadLinkItem } from './components/DownloadLinkItem';

export interface DownloadLinkDisplayProps {
  postId: string;
}

/**
 * 重构后的下载链接显示组件
 */
export function DownloadLinkDisplay({ postId }: DownloadLinkDisplayProps) {
  // 确保只在客户端渲染
  const [isMounted, setIsMounted] = React.useState(false);

  // 获取当前用户信息 - 使用session状态（必须在组件顶层调用）
  const { data: session, status: sessionStatus } = useSession();

  // 获取完整的用户信息（包含罐头余额）
  const {
    data: currentUser,
    isPending: isUserDataPending,
    error: userDataError
  } = api.auth.getCurrentUser.useQuery(
    undefined,
    {
      enabled: !!session?.user,
      staleTime: 30000, // 30秒缓存
    }
  );

  // 获取用户罐头账户信息（备用方案）
  const {
    data: cansAccount,
    isPending: isCansAccountPending
  } = api.cans.getAccountSummary.useQuery(
    undefined,
    {
      enabled: !!session?.user,
      staleTime: 30000, // 30秒缓存
    }
  );

  const isUserPending = sessionStatus === 'loading' || isUserDataPending || isCansAccountPending;
  const userError = sessionStatus === 'unauthenticated' ? new Error('用户未登录') : userDataError;

  // 合并用户信息和罐头账户信息，确保有最新的余额
  const enhancedUser = React.useMemo(() => {
    if (!currentUser) return null;

    return {
      ...currentUser,
      // 如果 getCurrentUser 没有返回正确的罐头余额，使用 cansAccount 的数据
      points: currentUser.points || cansAccount?.availableCans || 0,
      cansAccount: currentUser.cansAccount || cansAccount ? {
        availableCans: currentUser.cansAccount?.availableCans || cansAccount?.availableCans || 0,
        totalCans: currentUser.cansAccount?.totalCans || cansAccount?.totalCans || 0,
      } : null,
    };
  }, [currentUser, cansAccount]);

  // 获取下载链接数据 - 只有登录用户才能获取
  const {
    downloadLinks,
    isPending,
    error: downloadLinksError,
    retryCount,
    handleRetry
  } = useDownloadLinks({
    postId,
    enabled: !!enhancedUser && !userError // 只有登录用户且无错误时才启用查询
  });

  // 获取兑换状态
  const {
    purchaseInfo,
    processingLinkId,
    isPurchasing,
    handleDownloadClick
  } = usePurchaseStatus({
    downloadLinkIds: downloadLinks.map(link => link.id),
    currentUser: enhancedUser // 使用增强的用户对象
  });

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // 调试日志
  React.useEffect(() => {
    console.log('DownloadLinkDisplay 状态:', {
      isMounted,
      isUserPending,
      currentUser: !!currentUser,
      userError: !!userError,
      userErrorMessage: userError?.message,
      shouldShowLogin: !isUserPending && (!currentUser || userError),
      downloadLinksCount: downloadLinks.length,
      purchaseInfoKeys: Object.keys(purchaseInfo),
      handleDownloadClickType: typeof handleDownloadClick,
      // 详细的用户罐头信息
      userCansInfo: enhancedUser ? {
        points: enhancedUser.points,
        cansAccount: enhancedUser.cansAccount,
        availableCans: enhancedUser.availableCans,
        userKeys: Object.keys(enhancedUser)
      } : null,
      // 原始数据对比
      originalUserCans: currentUser ? {
        points: currentUser.points,
        cansAccount: currentUser.cansAccount,
      } : null,
      cansAccountData: cansAccount
    });
  }, [isMounted, isUserPending, enhancedUser, userError, downloadLinks, purchaseInfo, handleDownloadClick, currentUser, cansAccount]);

  if (!isMounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600" />
            资源下载
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">加载中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 用户加载状态
  if (isUserPending) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">验证用户身份...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 未登录用户显示登录提示 - 检查错误状态和用户数据
  if (!isUserPending && (!enhancedUser || userError)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600" />
            资源下载
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="flex items-center text-amber-600">
              <AlertTriangle className="w-6 h-6 mr-2" />
              <span className="font-medium">需要登录才能查看下载资源</span>
            </div>
            <p className="text-sm text-gray-600 max-w-md">
              为了保护创作者的权益和确保资源安全，您需要登录后才能查看和下载资源。
            </p>
            <Button
              onClick={() => window.location.href = '/auth/signin'}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              立即登录
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 下载链接加载状态
  if (isPending) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">加载下载链接...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 错误状态
  if (downloadLinksError) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="flex items-center text-red-600">
              <AlertTriangle className="w-6 h-6 mr-2" />
              <span>加载下载链接失败</span>
            </div>
            <p className="text-sm text-gray-600 text-center">
              {downloadLinksError.message || '网络连接失败，请检查网络后重试'}
            </p>
            <Button
              onClick={handleRetry}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              重试 {retryCount > 0 && `(${retryCount})`}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 用户错误状态
  if (userError) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center text-yellow-600">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <span className="text-sm">无法获取用户信息，部分功能可能受限</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 无数据状态 - 显示友好的空状态提示
  if (!downloadLinks || downloadLinks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600" />
            资源下载
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <Download className="w-8 h-8 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-900">暂无资源下载</h3>
              <p className="text-xs text-gray-500 max-w-md">
                作者暂未提供下载资源，您可以关注作者获取最新资源更新通知
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5 text-blue-600" />
          资源下载
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {downloadLinks.map((link) => {
          if (!link || !link.id) return null;

          const purchaseData = purchaseInfo[link.id];
          const isPurchased = purchaseData?.purchased || false;
          const isProcessing = processingLinkId === link.id;

          // 如果已兑换，将兑换状态中的URL和extractCode合并到link对象中
          const enhancedLink = isPurchased && purchaseData ? {
            ...link,
            url: purchaseData.url || link.url,
            extractCode: purchaseData.extractCode || link.extractCode,
          } : link;

          return (
            <DownloadLinkItem
              key={link.id}
              link={enhancedLink}
              isPurchased={isPurchased}
              isProcessing={isProcessing}
              onDownloadClick={handleDownloadClick}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}
