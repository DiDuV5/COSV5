/**
 * @fileoverview 剪贴板工具函数
 * @description 提供安全的剪贴板操作功能
 */

/**
 * 复制文本到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text || typeof text !== 'string') {
    throw new Error('无效的复制内容');
  }

  try {
    // 检查浏览器是否支持 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // 降级到传统的复制方法
      return await fallbackCopyToClipboard(text);
    }
  } catch (error) {
    console.error('复制失败:', error);
    throw new Error('复制操作失败');
  }
}

/**
 * 传统的复制方法（降级方案）
 */
async function fallbackCopyToClipboard(text: string): Promise<boolean> {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (!successful) {
      throw new Error('传统复制方法失败');
    }
    
    return true;
  } catch (error) {
    document.body.removeChild(textArea);
    throw error;
  }
}

/**
 * 检查是否支持剪贴板操作
 */
export function isClipboardSupported(): boolean {
  return !!(navigator.clipboard && window.isSecureContext) || 
         document.queryCommandSupported?.('copy');
}

/**
 * 安全地打开链接
 */
export function openLinkSafely(url: string): void {
  if (!url || typeof url !== 'string') {
    throw new Error('无效的链接地址');
  }

  try {
    // 验证 URL 格式
    new URL(url);
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch (error) {
    console.error('打开链接失败:', error);
    throw new Error('链接格式无效');
  }
}
