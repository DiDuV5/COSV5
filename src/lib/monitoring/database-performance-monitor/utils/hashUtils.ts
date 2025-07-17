/**
 * @fileoverview 哈希和ID生成工具函数
 * @description 查询ID和哈希生成相关的工具函数
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { normalizeParams } from './sanitizeUtils';

/**
 * 生成查询ID
 * @returns 唯一的查询ID
 */
export const generateQueryId = (): string => {
  return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 生成查询哈希
 * @param model 模型名称
 * @param action 操作类型
 * @param params 查询参数
 * @returns 查询哈希
 */
export const generateQueryHash = (
  model: string,
  action: string,
  params: any
): string => {
  const key = `${model}:${action}:${JSON.stringify(normalizeParams(params))}`;
  return Buffer.from(key).toString('base64').substr(0, 16);
};

/**
 * 生成简单哈希（用于快速比较）
 * @param input 输入字符串
 * @returns 简单哈希值
 */
export const generateSimpleHash = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  return Math.abs(hash).toString(36);
};
