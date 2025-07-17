/**
 * @fileoverview 下载链接管理工具函数
 * @description 提供下载链接相关的工具函数和验证逻辑
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { encrypt, decrypt } from '@/lib/encryption';
import { validateDownloadUrl, getPlatformById } from '@/lib/download-platforms';
import type {
  UserPermission,
  DownloadLinkInfo,
  PurchaseStatusResponse,
  BatchPurchaseStatusResponse,
  ERROR_MESSAGES
} from './types';

/**
 * 检查用户是否为管理员
 */
export function checkAdminPermission(userLevel: string): boolean {
  return userLevel === 'ADMIN' || userLevel === 'SUPER_ADMIN';
}

/**
 * 创建用户权限对象
 */
export function createUserPermission(userId: string, userLevel: string): UserPermission {
  return {
    userId,
    userLevel,
    isAdmin: checkAdminPermission(userLevel),
  };
}

/**
 * 验证平台是否支持
 */
export function validatePlatform(platform: string): boolean {
  const platformInfo = getPlatformById(platform);
  return !!platformInfo;
}

/**
 * 验证下载URL格式
 */
export function validateUrl(url: string): boolean {
  return validateDownloadUrl(url);
}

/**
 * 加密敏感信息
 */
export function encryptSensitiveData(data: {
  url: string;
  extractCode?: string;
}): {
  encryptedUrl: string;
  encryptedExtractCode: string | null;
} {
  return {
    encryptedUrl: encrypt(data.url),
    encryptedExtractCode: data.extractCode ? encrypt(data.extractCode) : null,
  };
}

/**
 * 解密敏感信息
 */
export function decryptSensitiveData(data: {
  url: string;
  extractCode?: string | null;
}): {
  url: string;
  extractCode: string | null;
} {
  return {
    url: decrypt(data.url),
    extractCode: data.extractCode ? decrypt(data.extractCode) : null,
  };
}

/**
 * 检查用户是否有权限管理内容
 */
export function checkContentPermission(
  post: { authorId: string },
  userPermission: UserPermission
): boolean {
  return post.authorId === userPermission.userId || userPermission.isAdmin;
}

/**
 * 检查用户是否有权限管理下载链接
 */
export function checkLinkPermission(
  link: { userId: string },
  userPermission: UserPermission
): boolean {
  return link.userId === userPermission.userId || userPermission.isAdmin;
}

/**
 * 构建更新数据对象
 */
export function buildUpdatePayload(updateData: {
  platform?: string;
  url?: string;
  extractCode?: string;
  cansPrice?: number;
  title?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}): Record<string, any> {
  const updatePayload: Record<string, any> = {};

  if (updateData.platform !== undefined) {
    updatePayload.platform = updateData.platform;
  }

  if (updateData.url !== undefined) {
    updatePayload.url = encrypt(updateData.url);
  }

  if (updateData.extractCode !== undefined) {
    updatePayload.extractCode = updateData.extractCode ? encrypt(updateData.extractCode) : null;
  }

  if (updateData.cansPrice !== undefined) {
    updatePayload.cansPrice = updateData.cansPrice;
  }

  if (updateData.title !== undefined) {
    updatePayload.title = updateData.title;
  }

  if (updateData.description !== undefined) {
    updatePayload.description = updateData.description;
  }

  if (updateData.sortOrder !== undefined) {
    updatePayload.sortOrder = updateData.sortOrder;
  }

  if (updateData.isActive !== undefined) {
    updatePayload.isActive = updateData.isActive;
  }

  return updatePayload;
}

/**
 * 检查罐头余额是否充足
 */
export function checkCansBalance(
  userCansAccount: { availableCans: number } | null,
  requiredCans: number
): { sufficient: boolean; currentBalance: number } {
  const currentBalance = userCansAccount?.availableCans || 0;
  return {
    sufficient: currentBalance >= requiredCans,
    currentBalance,
  };
}

/**
 * 生成罐头不足的错误消息
 */
export function generateInsufficientCansMessage(
  requiredCans: number,
  currentBalance: number
): string {
  return `此资源需要 ${requiredCans} 个罐头，您当前余额为 ${currentBalance} 个罐头`;
}

/**
 * 构建兑换状态响应
 */
export function buildPurchaseStatusResponse(
  downloadLink: {
    id: string;
    platform: string;
    cansPrice: number;
    title: string;
    url: string;
    extractCode?: string | null;
  },
  purchase?: {
    createdAt: Date;
    accessCount: number;
  }
): PurchaseStatusResponse {
  if (!purchase) {
    return {
      purchased: false,
      cansPrice: downloadLink.cansPrice,
      platform: downloadLink.platform,
      title: downloadLink.title,
    };
  }

  const decryptedData = decryptSensitiveData({
    url: downloadLink.url,
    extractCode: downloadLink.extractCode,
  });

  return {
    purchased: true,
    url: decryptedData.url,
    extractCode: decryptedData.extractCode,
    platform: downloadLink.platform,
    title: downloadLink.title,
    cansPrice: downloadLink.cansPrice,
    purchaseDate: purchase.createdAt,
    accessCount: purchase.accessCount,
  };
}

/**
 * 构建批量兑换状态响应
 */
export function buildBatchPurchaseStatusResponse(
  downloadLinks: Array<{
    id: string;
    platform: string;
    cansPrice: number;
    title: string;
    url: string;
    extractCode?: string | null;
  }>,
  purchaseMap: Map<string, { createdAt: Date; accessCount: number }>
): BatchPurchaseStatusResponse[] {
  return downloadLinks.map(link => {
    const purchase = purchaseMap.get(link.id);

    if (!purchase) {
      return {
        linkId: link.id,
        purchased: false,
        cansPrice: link.cansPrice,
        platform: link.platform,
        title: link.title,
      };
    }

    const decryptedData = decryptSensitiveData({
      url: link.url,
      extractCode: link.extractCode,
    });

    return {
      linkId: link.id,
      purchased: true,
      url: decryptedData.url,
      extractCode: decryptedData.extractCode,
      platform: link.platform,
      title: link.title,
      cansPrice: link.cansPrice,
      purchaseDate: purchase.createdAt,
      accessCount: purchase.accessCount,
    };
  });
}

/**
 * 创建兑换记录映射
 */
export function createPurchaseMap(
  purchases: Array<{
    downloadLinkId: string;
    createdAt: Date;
    accessCount: number;
  }>
): Map<string, { createdAt: Date; accessCount: number }> {
  return new Map(
    purchases.map(p => [
      p.downloadLinkId,
      {
        createdAt: p.createdAt,
        accessCount: p.accessCount,
      }
    ])
  );
}

/**
 * 验证输入数据
 */
export function validateUpdateData(updateData: {
  platform?: string;
  url?: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (updateData.platform && !validatePlatform(updateData.platform)) {
    errors.push('不支持的平台类型');
  }

  if (updateData.url && !validateUrl(updateData.url)) {
    errors.push('无效的下载链接格式');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 格式化下载链接信息（移除敏感数据）
 */
export function formatDownloadLinkInfo(link: any): DownloadLinkInfo {
  return {
    id: link.id,
    platform: link.platform,
    cansPrice: link.cansPrice,
    title: link.title,
    description: link.description,
    isActive: link.isActive,
    sortOrder: link.sortOrder,
    downloadCount: link.downloadCount,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  };
}

/**
 * 检查是否为免费下载链接
 */
export function isFreeDownload(cansPrice: number): boolean {
  return cansPrice === 0;
}

/**
 * 生成交易描述
 */
export function generateTransactionDescription(
  type: 'purchase' | 'sale',
  title: string
): string {
  return type === 'purchase'
    ? `兑换下载链接：${title}`
    : `下载链接销售收入：${title}`;
}
