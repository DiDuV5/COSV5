/**
 * @fileoverview 标签处理工具函数
 * @description 统一处理不同格式的标签数据
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

/**
 * 标签数据的可能格式
 */
export type TagInput =
  | string                              // JSON字符串
  | string[]                           // 字符串数组
  | Array<{ name: string }>            // 对象数组（简单）
  | Array<{ id: string; name: string }> // 对象数组（完整）
  | null
  | undefined;

/**
 * 标准化的标签格式
 */
export interface NormalizedTag {
  name: string;
  id?: string;
}

/**
 * 安全地解析标签数据
 * @param tags 任意格式的标签数据
 * @returns 标准化的标签数组
 */
export function parseTags(tags: TagInput): NormalizedTag[] {
  // 处理 null 或 undefined
  if (!tags) {
    return [];
  }

  // 处理字符串（JSON格式）
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      return parseTags(parsed); // 递归处理解析后的数据
    } catch {
      // 如果不是JSON，可能是单个标签名
      return tags.trim() ? [{ name: tags.trim() }] : [];
    }
  }

  // 处理数组
  if (Array.isArray(tags)) {
    return tags.map((tag, index) => {
      if (typeof tag === 'string') {
        return { name: tag };
      }
      if (typeof tag === 'object' && tag !== null) {
        const tagObj = tag as any; // 临时类型断言
        return {
          name: tagObj.name || String(tag),
          id: tagObj.id || undefined,
        };
      }
      return { name: String(tag) };
    }).filter(tag => tag.name.trim().length > 0);
  }

  // 其他情况返回空数组
  return [];
}

/**
 * 检查标签数据是否为有效数组
 * @param tags 标签数据
 * @returns 是否为有效的标签数组
 */
export function isValidTagArray(tags: TagInput): boolean {
  const parsed = parseTags(tags);
  return parsed.length > 0;
}

/**
 * 获取标签名称数组
 * @param tags 标签数据
 * @returns 标签名称数组
 */
export function getTagNames(tags: TagInput): string[] {
  return parseTags(tags).map(tag => tag.name);
}

/**
 * 将标签转换为EnhancedTagList组件需要的格式
 * @param tags 标签数据
 * @returns EnhancedTagList组件格式的标签数组
 */
export function toEnhancedTagListFormat(tags: TagInput): Array<{ name: string }> {
  return parseTags(tags).map(tag => ({ name: tag.name }));
}

/**
 * 安全地获取标签数量
 * @param tags 标签数据
 * @returns 标签数量
 */
export function getTagCount(tags: TagInput): number {
  return parseTags(tags).length;
}

/**
 * 将标签数组转换为JSON字符串（用于存储到数据库）
 * @param tags 标签数组
 * @returns JSON字符串
 */
export function tagsToJson(tags: string[]): string {
  return JSON.stringify(tags);
}

/**
 * 从JSON字符串解析标签数组
 * @param tagsJson JSON字符串
 * @returns 标签名称数组
 */
export function tagsFromJson(tagsJson: string | null | undefined): string[] {
  if (!tagsJson) return [];

  try {
    const parsed = JSON.parse(tagsJson);
    if (Array.isArray(parsed)) {
      return parsed.map(tag => typeof tag === 'string' ? tag : tag.name || String(tag));
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * 标签显示工具
 */
export const TagDisplayUtils = {
  /**
   * 获取显示用的标签列表（限制数量）
   */
  getDisplayTags(tags: TagInput, maxCount: number = 3): NormalizedTag[] {
    const parsed = parseTags(tags);
    return parsed.slice(0, maxCount);
  },

  /**
   * 获取剩余标签数量
   */
  getRemainingCount(tags: TagInput, maxCount: number = 3): number {
    const total = getTagCount(tags);
    return Math.max(0, total - maxCount);
  },

  /**
   * 检查是否有更多标签
   */
  hasMoreTags(tags: TagInput, maxCount: number = 3): boolean {
    return getTagCount(tags) > maxCount;
  },
};

/**
 * 标签验证工具
 */
export const TagValidationUtils = {
  /**
   * 验证标签名称是否有效
   */
  isValidTagName(name: string): boolean {
    return typeof name === 'string' && name.trim().length > 0 && name.length <= 50;
  },

  /**
   * 清理标签名称
   */
  cleanTagName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
  },

  /**
   * 过滤有效的标签
   */
  filterValidTags(tags: string[]): string[] {
    return tags
      .map(tag => this.cleanTagName(tag))
      .filter(tag => this.isValidTagName(tag));
  },
};
