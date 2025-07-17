/**
 * @fileoverview 提及解析Hook
 * @description 专门处理@用户和#标签的解析、检测和文本处理
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import { useState, useCallback, useMemo } from 'react';

/**
 * 提及信息接口
 */
export interface MentionInfo {
  type: 'user' | 'hashtag';
  text: string;
  start: number;
  end: number;
  userId?: string;
  username?: string;
  displayName?: string;
}

/**
 * 解析结果接口
 */
export interface ParseResult {
  mentions: MentionInfo[];
  hashtags: MentionInfo[];
  plainText: string;
  hasActiveMention: boolean;
  activeMentionQuery: string;
  activeMentionPosition: { start: number; end: number };
}

/**
 * 光标位置接口
 */
export interface CursorPosition {
  start: number;
  end: number;
}

/**
 * 提及解析Hook
 */
export function useMentionParser() {
  const [lastCursorPosition, setLastCursorPosition] = useState<CursorPosition>({ start: 0, end: 0 });

  /**
   * 提取@用户提及
   */
  const extractMentions = useCallback((text: string): MentionInfo[] => {
    const mentions: MentionInfo[] = [];
    const mentionRegex = /@([a-zA-Z0-9_\u4e00-\u9fa5]+)/g;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push({
        type: 'user',
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
        username: match[1],
        displayName: match[1],
      });
    }

    return mentions;
  }, []);

  /**
   * 提取#标签
   */
  const extractHashtags = useCallback((text: string): MentionInfo[] => {
    const hashtags: MentionInfo[] = [];
    const hashtagRegex = /#([a-zA-Z0-9_\u4e00-\u9fa5]+)/g;
    let match;

    while ((match = hashtagRegex.exec(text)) !== null) {
      hashtags.push({
        type: 'hashtag',
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
        username: match[1],
      });
    }

    return hashtags;
  }, []);

  /**
   * 检测当前光标位置是否在@提及中
   */
  const detectActiveMention = useCallback((text: string, cursorPosition: number): {
    isActive: boolean;
    query: string;
    position: { start: number; end: number };
  } => {
    // 向前查找最近的@符号
    let atIndex = -1;
    for (let i = cursorPosition - 1; i >= 0; i--) {
      const char = text[i];
      if (char === '@') {
        atIndex = i;
        break;
      }
      // 如果遇到空格、换行或其他@符号，停止查找
      if (char === ' ' || char === '\n' || char === '@') {
        break;
      }
    }

    if (atIndex === -1) {
      return { isActive: false, query: '', position: { start: 0, end: 0 } };
    }

    // 检查@符号前是否是空格或行首
    const prevChar = atIndex > 0 ? text[atIndex - 1] : ' ';
    if (prevChar !== ' ' && prevChar !== '\n' && atIndex !== 0) {
      return { isActive: false, query: '', position: { start: 0, end: 0 } };
    }

    // 向后查找到空格或行尾
    let endIndex = cursorPosition;
    for (let i = atIndex + 1; i < text.length; i++) {
      const char = text[i];
      if (char === ' ' || char === '\n' || char === '@' || char === '#') {
        endIndex = i;
        break;
      }
      if (i === text.length - 1) {
        endIndex = text.length;
        break;
      }
    }

    // 如果光标不在@提及范围内，返回false
    if (cursorPosition < atIndex || cursorPosition > endIndex) {
      return { isActive: false, query: '', position: { start: 0, end: 0 } };
    }

    const query = text.slice(atIndex + 1, endIndex);
    
    return {
      isActive: true,
      query,
      position: { start: atIndex, end: endIndex },
    };
  }, []);

  /**
   * 检测当前光标位置是否在#标签中
   */
  const detectActiveHashtag = useCallback((text: string, cursorPosition: number): {
    isActive: boolean;
    query: string;
    position: { start: number; end: number };
  } => {
    // 向前查找最近的#符号
    let hashIndex = -1;
    for (let i = cursorPosition - 1; i >= 0; i--) {
      const char = text[i];
      if (char === '#') {
        hashIndex = i;
        break;
      }
      // 如果遇到空格、换行或其他符号，停止查找
      if (char === ' ' || char === '\n' || char === '@' || char === '#') {
        break;
      }
    }

    if (hashIndex === -1) {
      return { isActive: false, query: '', position: { start: 0, end: 0 } };
    }

    // 检查#符号前是否是空格或行首
    const prevChar = hashIndex > 0 ? text[hashIndex - 1] : ' ';
    if (prevChar !== ' ' && prevChar !== '\n' && hashIndex !== 0) {
      return { isActive: false, query: '', position: { start: 0, end: 0 } };
    }

    // 向后查找到空格或行尾
    let endIndex = cursorPosition;
    for (let i = hashIndex + 1; i < text.length; i++) {
      const char = text[i];
      if (char === ' ' || char === '\n' || char === '@' || char === '#') {
        endIndex = i;
        break;
      }
      if (i === text.length - 1) {
        endIndex = text.length;
        break;
      }
    }

    // 如果光标不在#标签范围内，返回false
    if (cursorPosition < hashIndex || cursorPosition > endIndex) {
      return { isActive: false, query: '', position: { start: 0, end: 0 } };
    }

    const query = text.slice(hashIndex + 1, endIndex);
    
    return {
      isActive: true,
      query,
      position: { start: hashIndex, end: endIndex },
    };
  }, []);

  /**
   * 解析文本内容
   */
  const parseText = useCallback((text: string, cursorPosition?: number): ParseResult => {
    const mentions = extractMentions(text);
    const hashtags = extractHashtags(text);
    
    // 生成纯文本（移除@和#符号）
    let plainText = text;
    [...mentions, ...hashtags]
      .sort((a, b) => b.start - a.start) // 从后往前替换，避免位置偏移
      .forEach(item => {
        const replacement = item.text.slice(1); // 移除@或#符号
        plainText = plainText.slice(0, item.start) + replacement + plainText.slice(item.end);
      });

    // 检测活跃的@提及
    let hasActiveMention = false;
    let activeMentionQuery = '';
    let activeMentionPosition = { start: 0, end: 0 };

    if (cursorPosition !== undefined) {
      const activeMention = detectActiveMention(text, cursorPosition);
      if (activeMention.isActive) {
        hasActiveMention = true;
        activeMentionQuery = activeMention.query;
        activeMentionPosition = activeMention.position;
      }
    }

    return {
      mentions,
      hashtags,
      plainText,
      hasActiveMention,
      activeMentionQuery,
      activeMentionPosition,
    };
  }, [extractMentions, extractHashtags, detectActiveMention]);

  /**
   * 插入@提及
   */
  const insertMention = useCallback((
    text: string,
    username: string,
    displayName: string,
    position: { start: number; end: number }
  ): {
    newText: string;
    newCursorPosition: number;
  } => {
    const mentionText = `@${displayName || username}`;
    const newText = text.slice(0, position.start) + mentionText + ' ' + text.slice(position.end);
    const newCursorPosition = position.start + mentionText.length + 1;

    return { newText, newCursorPosition };
  }, []);

  /**
   * 插入#标签
   */
  const insertHashtag = useCallback((
    text: string,
    tagName: string,
    position: { start: number; end: number }
  ): {
    newText: string;
    newCursorPosition: number;
  } => {
    const hashtagText = `#${tagName}`;
    const newText = text.slice(0, position.start) + hashtagText + ' ' + text.slice(position.end);
    const newCursorPosition = position.start + hashtagText.length + 1;

    return { newText, newCursorPosition };
  }, []);

  /**
   * 验证@提及格式
   */
  const validateMention = useCallback((mention: string): boolean => {
    const mentionRegex = /^@[a-zA-Z0-9_\u4e00-\u9fa5]+$/;
    return mentionRegex.test(mention);
  }, []);

  /**
   * 验证#标签格式
   */
  const validateHashtag = useCallback((hashtag: string): boolean => {
    const hashtagRegex = /^#[a-zA-Z0-9_\u4e00-\u9fa5]+$/;
    return hashtagRegex.test(hashtag);
  }, []);

  /**
   * 获取提及的用户列表
   */
  const getMentionedUsers = useCallback((text: string): string[] => {
    const mentions = extractMentions(text);
    return mentions.map(mention => mention.username!).filter(Boolean);
  }, [extractMentions]);

  /**
   * 获取标签列表
   */
  const getHashtagList = useCallback((text: string): string[] => {
    const hashtags = extractHashtags(text);
    return hashtags.map(hashtag => hashtag.username!).filter(Boolean);
  }, [extractHashtags]);

  /**
   * 清理文本（移除无效的@和#）
   */
  const cleanText = useCallback((text: string): string => {
    // 移除孤立的@和#符号
    return text
      .replace(/@(?![a-zA-Z0-9_\u4e00-\u9fa5])/g, '')
      .replace(/#(?![a-zA-Z0-9_\u4e00-\u9fa5])/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  /**
   * 更新光标位置
   */
  const updateCursorPosition = useCallback((position: CursorPosition) => {
    setLastCursorPosition(position);
  }, []);

  return {
    parseText,
    extractMentions,
    extractHashtags,
    detectActiveMention,
    detectActiveHashtag,
    insertMention,
    insertHashtag,
    validateMention,
    validateHashtag,
    getMentionedUsers,
    getHashtagList,
    cleanText,
    updateCursorPosition,
    lastCursorPosition,
  };
}
