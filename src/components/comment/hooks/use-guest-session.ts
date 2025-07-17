/**
 * @fileoverview 游客会话管理Hook
 * @description 管理游客评论的会话ID，用于跟踪游客身份
 */

import { useState, useEffect } from 'react';

/**
 * 游客会话管理Hook
 * @returns 游客会话ID
 */
export function useGuestSession(): string | null {
  const [guestSessionId, setGuestSessionId] = useState<string | null>(null);

  useEffect(() => {
    // 从 localStorage 获取或创建游客会话ID
    let sessionId = localStorage.getItem('guest-session-id');
    if (!sessionId) {
      sessionId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('guest-session-id', sessionId);
    }
    setGuestSessionId(sessionId);
  }, []);

  return guestSessionId;
}
