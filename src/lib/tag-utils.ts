/**
 * @fileoverview 标签处理工具函数
 * @description 统一的标签解析、提取、处理工具函数集合
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * // 基础标签提取
 * import { extractHashtags } from './tag-utils'
 * const tags = extractHashtags('这是一个 #cosplay #写真 的帖子')
 * // 返回: ['cosplay', '写真']
 *
 * @dependencies
 * - 无外部依赖，纯JavaScript实现
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，统一标签解析函数
 */

/**
 * 统一的hashtag提取函数
 * @description 从文本中提取所有#标签，支持中英文、数字、下划线
 * @param text 原始文本内容
 * @param options 提取选项
 * @returns 标签名称数组（不包含#符号）
 * 
 * @example
 * extractHashtags('Hello #world #测试 #test_123')
 * // 返回: ['world', '测试', 'test_123']
 */
export const extractHashtags = (
  text: string,
  options: {
    maxTags?: number;
    maxLength?: number;
    minLength?: number;
  } = {}
): string[] => {
  const {
    maxTags = 10,
    maxLength = 20,
    minLength = 1,
  } = options;

  if (!text || typeof text !== 'string') {
    return [];
  }

  // 统一的正则表达式：支持中英文、数字、下划线，排除@符号避免冲突
  const hashtagRegex = /#([^\s#@]+)/g;
  const matches = text.match(hashtagRegex);

  if (!matches) {
    return [];
  }

  return matches
    .map(match => match.slice(1)) // 移除 # 符号
    .filter(tag => tag.length >= minLength && tag.length <= maxLength)
    .filter((tag, index, array) => array.indexOf(tag) === index) // 去重
    .slice(0, maxTags); // 限制数量
};

/**
 * 从标题中提取关键词作为标签
 * @description 将标题按分隔符拆分为关键词，过滤无效内容
 * @param title 标题文本
 * @param options 提取选项
 * @returns 关键词标签数组
 */
export const extractTagsFromTitle = (
  title: string,
  options: {
    maxTags?: number;
    maxLength?: number;
  } = {}
): string[] => {
  const { maxTags = 8, maxLength = 20 } = options;

  if (!title || typeof title !== 'string') {
    return [];
  }

  // 按常见分隔符拆分标题
  const keywords = title
    .split(/[\s\-\[\]()（）【】]+/)
    .map(word => word.trim())
    .filter(word => word.length > 0 && word.length <= maxLength)
    .filter(word => !/^\d+[PVpvMBGKmb]+$/.test(word)) // 过滤文件大小信息
    .filter(word => !/^https?:\/\//.test(word)) // 过滤URL
    .filter((word, index, array) => array.indexOf(word) === index) // 去重
    .slice(0, maxTags);

  return keywords;
};

/**
 * 从多个文本字段中提取所有标签
 * @description 综合提取标题、描述、内容中的所有hashtag标签
 * @param fields 包含文本字段的对象
 * @param options 提取选项
 * @returns 去重后的标签数组
 */
export const extractAllTags = (
  fields: {
    title?: string;
    description?: string;
    content?: string;
  },
  options: {
    maxTags?: number;
    includeKeywords?: boolean;
  } = {}
): string[] => {
  const { maxTags = 15, includeKeywords = false } = options;
  const { title, description, content } = fields;

  const allTags = new Set<string>();

  // 从标题提取hashtag标签
  if (title) {
    const titleTags = extractHashtags(title);
    titleTags.forEach(tag => allTags.add(tag));

    // 可选：从标题提取关键词
    if (includeKeywords) {
      const keywords = extractTagsFromTitle(title);
      keywords.forEach(keyword => allTags.add(keyword));
    }
  }

  // 从描述提取hashtag标签
  if (description) {
    const descTags = extractHashtags(description);
    descTags.forEach(tag => allTags.add(tag));
  }

  // 从内容提取hashtag标签
  if (content) {
    const contentTags = extractHashtags(content);
    contentTags.forEach(tag => allTags.add(tag));
  }

  return Array.from(allTags).slice(0, maxTags);
};

/**
 * 移除文本中的hashtag符号，保留纯文本
 * @description 将#标签转换为普通文本，用于显示或存储
 * @param text 包含hashtag的文本
 * @returns 移除#符号后的纯文本
 */
export const removeHashtagSymbols = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text.replace(/#([^\s#@]+)/g, '$1'); // 移除#符号，保留标签名
};

/**
 * 处理文本内容，分离纯文本和标签
 * @description 将包含hashtag的文本分离为纯文本和标签数组
 * @param text 原始文本
 * @returns 包含纯文本和标签的对象
 */
export const processTextContent = (text: string): {
  cleanText: string;
  tags: string[];
} => {
  const tags = extractHashtags(text);
  const cleanText = removeHashtagSymbols(text);

  return { cleanText, tags };
};

/**
 * 验证标签名称是否有效
 * @description 检查标签名称是否符合规范
 * @param tagName 标签名称
 * @returns 是否有效
 */
export const isValidTagName = (tagName: string): boolean => {
  if (!tagName || typeof tagName !== 'string') {
    return false;
  }

  // 长度检查
  if (tagName.length < 1 || tagName.length > 20) {
    return false;
  }

  // 字符检查：只允许中英文、数字、下划线
  const validPattern = /^[a-zA-Z0-9_\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]+$/;
  return validPattern.test(tagName);
};

/**
 * 格式化标签数组为JSON字符串（用于数据库存储）
 * @description 将标签数组转换为JSON字符串，用于数据库存储
 * @param tags 标签数组
 * @returns JSON字符串
 */
export const formatTagsForStorage = (tags: string[]): string => {
  if (!Array.isArray(tags)) {
    return '[]';
  }

  const validTags = tags.filter(isValidTagName);
  return JSON.stringify(validTags);
};

/**
 * 从JSON字符串解析标签数组（从数据库读取）
 * @description 从数据库JSON字符串解析标签数组
 * @param tagsJson JSON字符串
 * @returns 标签数组
 */
export const parseTagsFromStorage = (tagsJson: string | null): string[] => {
  if (!tagsJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(tagsJson);
    if (Array.isArray(parsed)) {
      return parsed.filter(isValidTagName);
    }
    return [];
  } catch (error) {
    console.error('解析标签数据失败:', error);
    return [];
  }
};

/**
 * 计算标签的热度分数
 * @description 基于使用次数、浏览量、点赞数等计算标签热度
 * @param stats 标签统计数据
 * @returns 热度分数
 */
export const calculateTagHeatScore = (stats: {
  usageCount: number;
  views: number;
  likes: number;
  comments: number;
}): number => {
  const { usageCount, views, likes, comments } = stats;

  return Math.round(
    usageCount * 10 +
    views * 0.1 +
    likes * 2 +
    comments * 3
  );
};
