/**
 * @fileoverview 兑换状态管理Hook
 * @description 管理下载链接的兑换状态和兑换操作
 */

import React, { useState, useCallback, useMemo } from 'react';
import { api } from '@/trpc/react';
import { useToast } from '@/hooks/use-toast';

export interface PurchaseInfo {
  [linkId: string]: {
    purchased: boolean;
    purchaseDate?: string;
    url?: string;
    extractCode?: string;
    platform?: string;
    title?: string;
    cansPrice?: number;
    accessCount?: number;
  };
}

export interface UsePurchaseStatusProps {
  downloadLinkIds: string[];
  currentUser?: any;
}

export interface UsePurchaseStatusReturn {
  purchaseInfo: PurchaseInfo;
  processingLinkId: string | null;
  isPurchasing: boolean;
  handleDownloadClick: (linkId: string, cansPrice: number) => Promise<void>;
}

/**
 * 兑换状态管理Hook
 */
export function usePurchaseStatus({
  downloadLinkIds,
  currentUser
}: UsePurchaseStatusProps): UsePurchaseStatusReturn {
  const [processingLinkId, setProcessingLinkId] = useState<string | null>(null);
  const { toast } = useToast();
  const utils = api.useUtils();

  // 获取兑换状态 - 使用单个查询获取所有兑换状态
  const {
    data: purchaseStatusResponse,
    isPending: isPurchaseStatusPending,
    error: purchaseStatusError
  } = api.downloadLink.getBatchPurchaseStatus.useQuery(
    { linkIds: downloadLinkIds },
    {
      enabled: downloadLinkIds.length > 0 && !!currentUser,
      staleTime: 30000, // 30秒缓存
    }
  );

  // 调试兑换状态查询
  React.useEffect(() => {
    console.log('🔍 兑换状态查询:', {
      downloadLinkIds,
      currentUser: !!currentUser,
      enabled: downloadLinkIds.length > 0 && !!currentUser,
      isPending: isPurchaseStatusPending,
      error: purchaseStatusError?.message,
      response: purchaseStatusResponse
    });
  }, [downloadLinkIds, currentUser, isPurchaseStatusPending, purchaseStatusError, purchaseStatusResponse]);

  // 兑换下载链接 mutation
  const purchaseMutation = api.downloadLink.purchase.useMutation({
    onSuccess: (data) => {
      console.log('✅ 兑换成功:', data);

      // 根据是否为免费资源显示不同的成功信息
      const isFree = data.data?.cansPrice === 0;
      const title = isFree ? "🆓 免费获取成功！" : "🎉 兑换成功！";

      let description = data.message || "下载链接已解锁";
      if (!isFree && data.data?.cansPrice) {
        description = `消耗 ${data.data.cansPrice} 罐头，${description}`;
      }

      toast({
        title,
        description: `${description}\n💡 请查看下方的下载链接和提取码${!isFree ? '\n感谢您的支持！' : ''}`,
        duration: 6000, // 延长显示时间让用户看清楚
      });
      setProcessingLinkId(null);

      // 兑换成功后立即刷新兑换状态
      void utils.downloadLink.getBatchPurchaseStatus.invalidate();
    },
    onError: (error) => {
      console.error('兑换失败:', error);

      // 特殊处理自己兑换自己链接的情况
      if (error.message?.includes("不能兑换自己创建的下载链接")) {
        toast({
          variant: "destructive",
          title: "🚫 无法兑换自己的资源",
          description: "作为创建者，您不能兑换自己发布的资源\n💡 您可以直接访问和管理自己的所有内容",
          duration: 5000,
        });
      } else if (error.message?.includes("罐头不足") || error.message?.includes("余额不足")) {
        // 服务端返回的余额不足错误
        toast({
          variant: "destructive",
          title: "💰 罐头余额不足",
          description: "您的罐头余额不足以兑换此资源\n💡 获取更多罐头：每日签到、完成任务",
          duration: 8000,
        });
      } else if (error.message?.includes("网络") || error.message?.includes("连接")) {
        // 网络错误
        toast({
          variant: "destructive",
          title: "🌐 网络连接异常",
          description: "网络连接不稳定，请检查网络后重试",
          duration: 6000,
        });
      } else {
        // 通用错误处理
        toast({
          variant: "destructive",
          title: "❌ 兑换失败",
          description: `${error.message || "兑换过程中出现未知错误"}\n💡 建议操作：刷新重试或联系客服`,
          duration: 8000,
        });
      }
      setProcessingLinkId(null);
    },
  });

  // 处理兑换状态数据
  const purchaseInfo = useMemo(() => {
    if (!purchaseStatusResponse?.success || !purchaseStatusResponse?.data) {
      return {};
    }

    const info: PurchaseInfo = {};

    if (Array.isArray(purchaseStatusResponse.data)) {
      purchaseStatusResponse.data.forEach((item: any) => {
        if (item && typeof item === 'object' && item.linkId) {
          info[item.linkId] = {
            purchased: Boolean(item.purchased),
            purchaseDate: item.purchaseDate,
            url: item.url,
            extractCode: item.extractCode,
            platform: item.platform,
            title: item.title,
            cansPrice: item.cansPrice,
            accessCount: item.accessCount,
          };
        }
      });
    }

    return info;
  }, [purchaseStatusResponse]);

  // 处理下载链接点击 - 添加防重复提交和完善验证
  const handleDownloadClick = useCallback(async (linkId: string, cansPrice: number) => {
    console.log('🔍 兑换按钮被点击:', {
      linkId,
      cansPrice,
      processingLinkId,
      currentUser: !!currentUser,
      toastAvailable: typeof toast,
      userBalance: currentUser?.points ?? currentUser?.cansAccount?.availableCans ?? 0
    });

    // 防止重复提交
    if (processingLinkId) {
      console.log('⚠️ 正在处理其他链接，跳过');
      toast({
        title: "⏳ 请稍候",
        description: "正在处理兑换请求，请不要重复点击",
        duration: 3000,
      });
      return;
    }

    // 验证参数
    if (!linkId || typeof linkId !== 'string') {
      console.log('❌ 无效的链接ID:', linkId);
      toast({
        variant: "destructive",
        title: "⚠️ 系统错误",
        description: "下载链接数据异常，请刷新页面后重试",
        duration: 6000,
      });
      return;
    }

    // 检查用户登录状态
    if (!currentUser) {
      console.log('❌ 用户未登录');
      toast({
        variant: "destructive",
        title: "🔐 请先登录",
        description: "您需要登录后才能兑换和下载资源",
        duration: 6000,
      });
      return;
    }

    console.log('✅ 用户已登录，继续兑换流程');

    // 检查是否已兑换 - 如果已兑换，直接显示下载信息
    const purchase = purchaseInfo[linkId];
    console.log('🔍 检查兑换状态:', { linkId, purchase, purchaseInfo });

    if (purchase?.purchased) {
      console.log('✅ 已兑换，显示提示');
      toast({
        title: "✅ 已兑换此资源",
        description: "您已经兑换过此资源，可以直接下载\n💡 请查看下方的下载信息和链接",
        duration: 4000,
      });
      return;
    }

    // 免费资源也需要通过兑换API获取下载链接
    if (cansPrice === 0) {
      console.log('💰 免费资源，直接获取');
      try {
        setProcessingLinkId(linkId);
        console.log('🚀 调用兑换API (免费)');
        await purchaseMutation.mutateAsync({ linkId });
      } catch (error) {
        // 免费资源获取失败的特殊处理
        console.error('免费下载操作失败:', error);
        toast({
          variant: "destructive",
          title: "🆓 免费资源获取失败",
          description: "获取免费资源时出现错误，请重试",
          duration: 5000,
        });
      }
      return;
    }

    // 检查罐头余额 - 简化逻辑，优先使用 points 字段
    const userBalance = currentUser.points ?? currentUser.cansAccount?.availableCans ?? 0;

    console.log('💰 检查罐头余额:', {
      userBalance,
      cansPrice,
      points: currentUser.points,
      cansAccount: currentUser.cansAccount?.availableCans,
      sufficient: userBalance >= cansPrice
    });

    if (userBalance < cansPrice) {
      console.log('❌ 罐头不足 - 显示错误提示');

      // 计算还需要多少罐头
      const shortfall = cansPrice - userBalance;

      console.log('🚨 调用toast显示余额不足错误:', {
        userBalance,
        cansPrice,
        shortfall,
        toastFunction: typeof toast
      });

      toast({
        variant: "destructive",
        title: "💰 罐头余额不足",
        description: `兑换此资源需要 ${cansPrice} 罐头\n您当前余额：${userBalance} 罐头\n还需要：${shortfall} 罐头\n💡 获取更多罐头：每日签到、完成任务`,
        duration: 8000, // 延长显示时间让用户看清楚
      });

      console.log('✅ Toast调用完成');
      return;
    }

    try {
      console.log('🚀 开始付费兑换流程');
      setProcessingLinkId(linkId);
      console.log('🚀 调用兑换API (付费)');
      await purchaseMutation.mutateAsync({ linkId });
    } catch (error) {
      // 付费兑换失败的额外处理
      console.error('兑换操作失败:', error);

      // 如果 mutation 的 onError 没有处理，这里提供备用错误提示
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (!errorMessage || errorMessage === 'Unknown error') {
        toast({
          variant: "destructive",
          title: "💳 兑换操作失败",
          description: "兑换过程中出现未知错误，请重试\n💡 如果问题持续存在，请联系客服",
          duration: 8000,
        });
      }
    }
  }, [processingLinkId, currentUser, purchaseInfo, toast, purchaseMutation]);

  return {
    purchaseInfo,
    processingLinkId,
    isPurchasing: purchaseMutation.isPending || isPurchaseStatusPending,
    handleDownloadClick,
  };
}
