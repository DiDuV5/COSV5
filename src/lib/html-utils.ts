/**
 * @fileoverview HTML内容处理工具函数
 * @description 提供HTML内容的安全处理和格式化功能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * import { sanitizeHtml, formatTextToHtml } from './html-utils'
 *
 * @dependencies
 * - 无外部依赖，使用原生JavaScript
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

/**
 * 允许的HTML标签列表
 */
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'a', 'img',
  'blockquote', 'code', 'pre'
];

/**
 * 允许的HTML属性列表
 */
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  'a': ['href', 'title', 'target'],
  'img': ['src', 'alt', 'title', 'width', 'height'],
  'span': ['class', 'style'],
  'div': ['class', 'style'],
  'p': ['class', 'style'],
  'strong': ['class'],
  'em': ['class'],
  'code': ['class'],
  'pre': ['class'],
  'blockquote': ['class'],
};

/**
 * 基础HTML安全处理函数
 * 移除潜在的危险标签和属性，防止XSS攻击
 * 
 * @param html - 需要处理的HTML字符串
 * @returns 安全的HTML字符串
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // 移除script标签和其内容
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // 移除style标签和其内容（保留内联style属性）
  html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // 移除事件处理属性
  html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  html = html.replace(/\s*on\w+\s*=\s*[^\s>]+/gi, '');
  
  // 移除javascript:协议
  html = html.replace(/javascript:/gi, '');
  
  // 移除data:协议（除了图片）
  html = html.replace(/data:(?!image\/)/gi, '');

  return html;
}

/**
 * 将纯文本转换为HTML格式
 * 处理换行符并转换为适当的HTML标签
 * 
 * @param text - 纯文本内容
 * @param preserveLineBreaks - 是否保留换行符为<br>标签
 * @returns HTML格式的字符串
 */
export function formatTextToHtml(text: string, preserveLineBreaks: boolean = true): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // 转义HTML特殊字符
  const escapeHtml = (str: string) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  if (preserveLineBreaks) {
    // 将换行符转换为<br>标签
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => escapeHtml(line))
      .join('<br>');
  } else {
    // 将换行符分割的文本转换为段落
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `<p>${escapeHtml(line)}</p>`)
      .join('');
  }
}

/**
 * 智能HTML内容处理函数
 * 自动检测内容是否包含HTML标签，如果没有则转换为HTML格式
 * 
 * @param content - 内容字符串（可能是纯文本或HTML）
 * @param preserveLineBreaks - 对于纯文本，是否保留换行符为<br>标签
 * @returns 处理后的安全HTML字符串
 */
export function processHtmlContent(content: string, preserveLineBreaks: boolean = true): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // 检测是否包含HTML标签
  const hasHtmlTags = /<[^>]+>/.test(content);

  if (hasHtmlTags) {
    // 如果包含HTML标签，进行安全处理
    return sanitizeHtml(content);
  } else {
    // 如果是纯文本，转换为HTML格式
    return formatTextToHtml(content, preserveLineBreaks);
  }
}

/**
 * 为邮件内容处理HTML格式
 * 确保邮件客户端兼容性
 * 
 * @param content - 邮件内容
 * @returns 适合邮件发送的HTML内容
 */
export function processEmailHtml(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // 处理基础HTML内容
  let html = processHtmlContent(content, true);

  // 为邮件客户端添加基础样式
  html = html.replace(/<p>/g, '<p style="margin: 0 0 16px 0; line-height: 1.5;">');
  html = html.replace(/<br>/g, '<br style="line-height: 1.5;">');
  html = html.replace(/<strong>/g, '<strong style="font-weight: bold;">');
  html = html.replace(/<em>/g, '<em style="font-style: italic;">');

  return html;
}

/**
 * 从HTML内容中提取纯文本
 * 用于生成邮件的纯文本版本
 * 
 * @param html - HTML内容
 * @returns 纯文本内容
 */
export function extractTextFromHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // 移除HTML标签
  let text = html.replace(/<[^>]+>/g, '');
  
  // 解码HTML实体
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  text = textarea.value;

  // 清理多余的空白字符
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * 验证HTML内容的安全性
 * 
 * @param html - HTML内容
 * @returns 是否安全
 */
export function isHtmlSafe(html: string): boolean {
  if (!html || typeof html !== 'string') {
    return true;
  }

  // 检查是否包含危险标签
  const dangerousTags = /<(script|style|iframe|object|embed|form|input|button)/i;
  if (dangerousTags.test(html)) {
    return false;
  }

  // 检查是否包含事件处理属性
  const eventHandlers = /\s*on\w+\s*=/i;
  if (eventHandlers.test(html)) {
    return false;
  }

  // 检查是否包含javascript:协议
  if (/javascript:/i.test(html)) {
    return false;
  }

  return true;
}
