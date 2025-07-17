/**
 * @fileoverview 用户搜索Hook
 * @description 专门处理用户搜索、防抖查询和结果缓存
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
// import { api } from '../../../../lib/api'; // 暂时注释掉，避免类型错误

/**
 * 用户建议接口
 */
export interface UserSuggestion {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  userLevel: string;
  isOnline?: boolean;
  lastActiveAt?: Date;
  followerCount?: number;
  isFollowing?: boolean;
}

/**
 * 搜索配置接口
 */
export interface SearchConfig {
  debounceDelay?: number;
  maxResults?: number;
  minQueryLength?: number;
  currentUserId?: string;
  enableCache?: boolean;
  cacheExpiry?: number;
}

/**
 * 搜索结果接口
 */
export interface SearchResult {
  users: UserSuggestion[];
  isPending: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
}

/**
 * 防抖Hook
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 用户搜索Hook
 */
export function useUserSearch(config: SearchConfig = {}) {
  const {
    debounceDelay = 300,
    maxResults = 10,
    minQueryLength = 1,
    currentUserId,
    enableCache = true,
    cacheExpiry = 5 * 60 * 1000, // 5分钟
  } = config;

  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult>({
    users: [],
    isPending: false,
    error: null,
    hasMore: false,
    totalCount: 0,
  });

  const debouncedQuery = useDebounce(query, debounceDelay);
  const cacheRef = useRef<Map<string, { data: UserSuggestion[]; timestamp: number }>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 检查缓存
   */
  const checkCache = useCallback((searchQuery: string): UserSuggestion[] | null => {
    if (!enableCache) return null;

    const cached = cacheRef.current.get(searchQuery.toLowerCase());
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > cacheExpiry;
    if (isExpired) {
      cacheRef.current.delete(searchQuery.toLowerCase());
      return null;
    }

    return cached.data;
  }, [enableCache, cacheExpiry]);

  /**
   * 设置缓存
   */
  const setCache = useCallback((searchQuery: string, users: UserSuggestion[]) => {
    if (!enableCache) return;

    cacheRef.current.set(searchQuery.toLowerCase(), {
      data: users,
      timestamp: Date.now(),
    });

    // 限制缓存大小
    if (cacheRef.current.size > 50) {
      const firstKey = cacheRef.current.keys().next().value;
      if (firstKey !== undefined) {
        cacheRef.current.delete(firstKey);
      }
    }
  }, [enableCache]);

  /**
   * 搜索用户
   */
  const searchUsers = useCallback(async (searchQuery: string) => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 检查查询长度
    if (searchQuery.length < minQueryLength) {
      setResult({
        users: [],
        isPending: false,
        error: null,
        hasMore: false,
        totalCount: 0,
      });
      return;
    }

    // 检查缓存
    const cachedUsers = checkCache(searchQuery);
    if (cachedUsers) {
      setResult({
        users: cachedUsers,
        isPending: false,
        error: null,
        hasMore: cachedUsers.length >= maxResults,
        totalCount: cachedUsers.length,
      });
      return;
    }

    // 开始搜索
    setResult(prev => ({ ...prev, isPending: true, error: null }));

    try {
      abortControllerRef.current = new AbortController();

      // 暂时模拟API响应，避免类型错误
      // const response = await api.user.searchForMention.query({
      //   query: searchQuery,
      //   limit: maxResults,
      //   currentUserId: currentUserId,
      // });

      // 模拟搜索结果
      const response = [
        {
          id: 'user1',
          username: 'testuser',
          displayName: 'Test User',
          avatar: null,
          userLevel: 'USER',
          isOnline: false,
          lastActiveAt: new Date().toISOString(),
          followerCount: 0,
          isFollowing: false
        }
      ];

      // 处理搜索结果
      const users: UserSuggestion[] = response.map(user => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar || undefined,
        userLevel: user.userLevel,
        isOnline: user.isOnline || false,
        lastActiveAt: user.lastActiveAt ? new Date(user.lastActiveAt) : undefined,
        followerCount: user.followerCount || 0,
        isFollowing: user.isFollowing || false,
      }));

      // 优化排序：优先显示关注的用户、在线用户等
      const sortedUsers = sortUsersByRelevance(users, currentUserId);

      // 设置缓存
      setCache(searchQuery, sortedUsers);

      setResult({
        users: sortedUsers,
        isPending: false,
        error: null,
        hasMore: sortedUsers.length >= maxResults,
        totalCount: sortedUsers.length,
      });

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return; // 请求被取消，不更新状态
      }

      console.error('用户搜索失败:', error);
      setResult(prev => ({
        ...prev,
        isPending: false,
        error: error.message || '搜索失败',
      }));
    }
  }, [minQueryLength, maxResults, currentUserId, checkCache, setCache]);

  /**
   * 按相关性排序用户
   */
  const sortUsersByRelevance = useCallback((users: UserSuggestion[], currentUserId?: string) => {
    return users.sort((a, b) => {
      // 1. 优先显示关注的用户
      if (a.isFollowing && !b.isFollowing) return -1;
      if (!a.isFollowing && b.isFollowing) return 1;

      // 2. 优先显示在线用户
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;

      // 3. 按粉丝数排序
      const aFollowers = a.followerCount || 0;
      const bFollowers = b.followerCount || 0;
      if (aFollowers !== bFollowers) return bFollowers - aFollowers;

      // 4. 按用户名字母顺序排序
      return a.username.localeCompare(b.username);
    });
  }, []);

  /**
   * 获取用户详情
   */
  const getUserDetails = useCallback(async (userId: string): Promise<UserSuggestion | null> => {
    try {
      // 暂时返回null，需要实现具体的用户详情API
      console.warn('getUserDetails 需要实现具体的API调用');
      return null;
    } catch (error) {
      console.error('获取用户详情失败:', error);
      return null;
    }
  }, []);

  /**
   * 获取推荐用户
   */
  const getRecommendedUsers = useCallback(async (): Promise<UserSuggestion[]> => {
    try {
      // 暂时返回空数组，需要实现具体的推荐用户API
      console.warn('getRecommendedUsers 需要实现具体的API调用');
      return [];
    } catch (error) {
      console.error('获取推荐用户失败:', error);
      return [];
    }
  }, [maxResults, currentUserId]);

  /**
   * 清除缓存
   */
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  // 监听防抖查询变化
  useEffect(() => {
    if (debouncedQuery !== query) return;

    if (debouncedQuery.trim()) {
      searchUsers(debouncedQuery.trim());
    } else {
      setResult({
        users: [],
        isPending: false,
        error: null,
        hasMore: false,
        totalCount: 0,
      });
    }
  }, [debouncedQuery, query, searchUsers]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    query,
    setQuery,
    result,
    searchUsers,
    getUserDetails,
    getRecommendedUsers,
    clearCache,
    isSearching: result.isPending,
  };
}
