/**
 * @fileoverview R2存储工具函数
 * @description 提供R2存储相关的工具函数
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

/**
 * 清理元数据，确保符合HTTP头部规范
 */
export function cleanMetadata(metadata: Record<string, string>): Record<string, string> {
  const cleanMetadata: Record<string, string> = {};

  Object.entries(metadata).forEach(([key, value]) => {
    // 清理键名：转换为小写，只保留字母、数字和连字符
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9-]/g, '');

    // 清理值：对于originalName使用URL编码，其他值移除非ASCII字符
    let cleanValue: string;
    if (key.toLowerCase() === 'originalname' || key.toLowerCase() === 'original-name') {
      // 对原始文件名进行URL编码，保留完整信息
      cleanValue = encodeURIComponent(String(value));
    } else {
      // 其他元数据移除非ASCII字符
      cleanValue = String(value).replace(/[^\x00-\x7F]/g, '');
    }

    // 只添加有效的键值对
    if (cleanKey && cleanValue) {
      cleanMetadata[cleanKey] = cleanValue;
    }
  });

  return cleanMetadata;
}

/**
 * 生成任务ID
 */
export function generateTaskId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 规范化文件键名
 */
export function normalizeKey(key: string): string {
  return key.startsWith('/') ? key.slice(1) : key;
}
