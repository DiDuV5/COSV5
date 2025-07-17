/**
 * @fileoverview 下载链接数据服务
 * @description 专门处理下载链接的数据管理、验证和格式化
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import { getPlatformById } from '@/lib/download-platforms';

/**
 * 下载链接接口
 */
export interface DownloadLink {
  id?: string;
  platform: string;
  platformSubType?: string; // 新增：平台子类型，如 telegram-public, telegram-private
  url: string | undefined; // 允许 undefined 以处理编辑状态
  extractCode?: string;
  cansPrice: number;
  title: string | undefined; // 允许 undefined 以处理编辑状态
  description?: string;
  sortOrder: number;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<number, string>;
}

/**
 * 链接统计接口
 */
export interface LinkStats {
  totalLinks: number;
  totalPrice: number;
  platformCount: Record<string, number>;
  platformSubTypeCount: Record<string, number>; // 新增：子类型统计
  averagePrice: number;
}

/**
 * 下载链接数据服务类
 */
export class DownloadLinkService {
  /**
   * 创建空链接
   */
  static createEmptyLink(sortOrder: number = 0): DownloadLink {
    return {
      platform: '',
      platformSubType: '',
      url: '',
      extractCode: '',
      cansPrice: 0,
      title: '',
      description: '',
      sortOrder,
    };
  }

  /**
   * 格式化现有链接数据
   */
  static formatExistingLinks(existingLinks: any[]): DownloadLink[] {
    return existingLinks.map((link, index) => ({
      id: link.id,
      platform: link.platform,
      platformSubType: link.platformSubType || '',
      url: '***已保存的下载链接***', // 显示占位符，表示数据存在但被隐藏
      extractCode: link.extractCode ? '***已保存的提取码***' : '',
      cansPrice: link.cansPrice,
      title: link.title,
      description: link.description || '',
      sortOrder: link.sortOrder || index,
    }));
  }

  /**
   * 验证链接数据
   */
  static validateLinks(links: DownloadLink[]): ValidationResult {
    const errors: Record<number, string> = {};

    links.forEach((link, index) => {
      // 验证标题
      if (!link.title || !link.title.trim()) {
        errors[index] = '请输入链接标题';
        return;
      }

      // 验证URL
      if (!link.url || !link.url.trim()) {
        errors[index] = '请输入下载链接';
        return;
      }

      // 如果是占位符，跳过URL格式验证（表示保持现有链接）
      if (link.url.includes('***已保存的下载链接***')) {
        // 占位符表示现有链接，跳过URL验证
      } else {
        // 验证URL格式
        try {
          new URL(link.url);
        } catch {
          errors[index] = '请输入有效的URL格式';
          return;
        }
      }

      // 验证平台特定要求
      const platform = getPlatformById(link.platform);
      if (platform?.needsExtractCode) {
        // 如果是占位符或者为空，都需要提示
        if (!link.extractCode?.trim() || link.extractCode.includes('***已保存的提取码***')) {
          // 占位符表示已有提取码，跳过验证
          if (!link.extractCode?.includes('***已保存的提取码***')) {
            errors[index] = '该平台需要提取码';
            return;
          }
        }
      }

      // 验证价格
      if (link.cansPrice < 0) {
        errors[index] = '价格不能为负数';
        return;
      }

      // 验证平台选择
      if (!link.platform) {
        errors[index] = '请选择下载平台';
        return;
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * 自动生成链接标题
   */
  static generateLinkTitle(platform: string, customTitle?: string): string {
    if (customTitle?.trim()) {
      return customTitle.trim();
    }

    const platformInfo = getPlatformById(platform);
    if (platformInfo) {
      return `${platformInfo.name}下载`;
    }

    return '下载链接';
  }

  /**
   * 更新链接字段
   */
  static updateLinkField(
    links: DownloadLink[],
    index: number,
    field: keyof DownloadLink,
    value: any
  ): DownloadLink[] {
    const updatedLinks = [...links];
    updatedLinks[index] = { ...updatedLinks[index], [field]: value };

    // 当平台改变时，清除子类型
    if (field === 'platform') {
      updatedLinks[index].platformSubType = '';

      // 自动生成标题
      if (!updatedLinks[index].title) {
        updatedLinks[index].title = this.generateLinkTitle(value);
      }
    }

    return updatedLinks;
  }

  /**
   * 添加新链接
   */
  static addNewLink(links: DownloadLink[]): DownloadLink[] {
    const newSortOrder = links.length > 0 ? Math.max(...links.map(l => l.sortOrder)) + 1 : 0;
    return [...links, this.createEmptyLink(newSortOrder)];
  }

  /**
   * 删除链接
   */
  static removeLink(links: DownloadLink[], index: number): DownloadLink[] {
    return links.filter((_, i) => i !== index);
  }

  /**
   * 重新排序链接
   */
  static reorderLinks(links: DownloadLink[]): DownloadLink[] {
    return links.map((link, index) => ({
      ...link,
      sortOrder: index,
    }));
  }

  /**
   * 计算链接统计
   */
  static calculateStats(links: DownloadLink[]): LinkStats {
    const totalLinks = links.length;
    const totalPrice = links.reduce((sum, link) => sum + link.cansPrice, 0);
    const platformCount: Record<string, number> = {};
    const platformSubTypeCount: Record<string, number> = {};

    links.forEach(link => {
      if (link.platform) {
        platformCount[link.platform] = (platformCount[link.platform] || 0) + 1;
      }

      // 统计子类型
      if (link.platformSubType) {
        platformSubTypeCount[link.platformSubType] = (platformSubTypeCount[link.platformSubType] || 0) + 1;
      }
    });

    const averagePrice = totalLinks > 0 ? totalPrice / totalLinks : 0;

    return {
      totalLinks,
      totalPrice,
      platformCount,
      platformSubTypeCount,
      averagePrice: Math.round(averagePrice * 100) / 100,
    };
  }

  /**
   * 检查链接重复
   */
  static checkDuplicateUrls(links: DownloadLink[]): {
    hasDuplicates: boolean;
    duplicateIndices: number[];
  } {
    const urlMap = new Map<string, number[]>();
    const duplicateIndices: number[] = [];

    links.forEach((link, index) => {
      if (link.url && link.url.trim()) {
        // 跳过占位符，不参与重复检查
        if (link.url.includes('***已保存的下载链接***')) {
          return;
        }

        const normalizedUrl = link.url.trim().toLowerCase();
        if (!urlMap.has(normalizedUrl)) {
          urlMap.set(normalizedUrl, []);
        }
        urlMap.get(normalizedUrl)!.push(index);
      }
    });

    urlMap.forEach(indices => {
      if (indices.length > 1) {
        duplicateIndices.push(...indices);
      }
    });

    return {
      hasDuplicates: duplicateIndices.length > 0,
      duplicateIndices,
    };
  }

  /**
   * 验证单个链接
   */
  static validateSingleLink(link: DownloadLink): {
    isValid: boolean;
    error?: string;
  } {
    if (!link.title || !link.title.trim()) {
      return { isValid: false, error: '请输入链接标题' };
    }

    if (!link.url || !link.url.trim()) {
      return { isValid: false, error: '请输入下载链接' };
    }

    // 如果是占位符，跳过URL格式验证（表示保持现有链接）
    if (!link.url.includes('***已保存的下载链接***')) {
      try {
        new URL(link.url);
      } catch {
        return { isValid: false, error: '请输入有效的URL格式' };
      }
    }

    const platform = getPlatformById(link.platform);
    if (platform?.needsExtractCode) {
      // 如果是占位符，跳过提取码验证
      if (!link.extractCode?.trim() || link.extractCode.includes('***已保存的提取码***')) {
        if (!link.extractCode?.includes('***已保存的提取码***')) {
          return { isValid: false, error: '该平台需要提取码' };
        }
      }
    }

    if (link.cansPrice < 0) {
      return { isValid: false, error: '价格不能为负数' };
    }

    if (!link.platform) {
      return { isValid: false, error: '请选择下载平台' };
    }

    return { isValid: true };
  }

  /**
   * 准备保存数据
   */
  static prepareSaveData(links: DownloadLink[]): Omit<DownloadLink, 'id'>[] {
    return links.map(link => ({
      platform: link.platform,
      url: link.url && !link.url.includes('***已保存的下载链接***') ? link.url.trim() : '',
      extractCode: link.extractCode && !link.extractCode.includes('***已保存的提取码***') ? link.extractCode.trim() : '',
      cansPrice: link.cansPrice,
      title: link.title ? link.title.trim() : '',
      description: link.description?.trim() || '',
      sortOrder: link.sortOrder,
    }));
  }

  /**
   * 获取平台建议
   */
  static getPlatformSuggestions(links: DownloadLink[]): string[] {
    const usedPlatforms = new Set(links.map(link => link.platform).filter(Boolean));
    const allPlatforms = ['baidu', 'aliyun', 'lanzou', 'quark', '123pan'];

    return allPlatforms.filter(platform => !usedPlatforms.has(platform));
  }

  /**
   * 生成链接摘要
   */
  static generateSummary(links: DownloadLink[]): string {
    const stats = this.calculateStats(links);
    const platforms = Object.keys(stats.platformCount);

    if (stats.totalLinks === 0) {
      return '暂无下载链接';
    }

    const platformText = platforms.length > 0
      ? `包含${platforms.join('、')}等平台`
      : '';

    const priceText = stats.totalPrice > 0
      ? `，总价${stats.totalPrice}罐头`
      : '，免费下载';

    return `${stats.totalLinks}个下载链接${platformText}${priceText}`;
  }
}

/**
 * 导出服务创建函数
 */
export const createDownloadLinkService = () => DownloadLinkService;
