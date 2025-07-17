/**
 * @fileoverview Turnstile验证会话管理器
 * @description 管理用户验证会话，防止重复验证和无限循环
 * @author Augment AI
 * @date 2025-07-14
 * @version 1.0.0
 */

import type { TurnstileFeatureId } from '@/types/turnstile';

/**
 * 验证会话接口
 */
export interface VerificationSession {
  /** 用户ID（可选，支持游客） */
  userId?: string;
  /** 会话ID */
  sessionId: string;
  /** 功能ID */
  featureId: TurnstileFeatureId;
  /** 验证时间 */
  verifiedAt: Date;
  /** 过期时间 */
  expiresAt: Date;
  /** 已验证的token */
  token: string;
  /** 客户端IP */
  clientIp?: string;
}

/**
 * 验证会话管理器
 */
export class VerificationSessionManager {
  private static instance: VerificationSessionManager;
  private sessions: Map<string, VerificationSession> = new Map();
  private readonly defaultExpiry = 30 * 60 * 1000; // 30分钟

  private constructor() {
    // 定期清理过期会话
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000); // 5分钟清理一次
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): VerificationSessionManager {
    if (!VerificationSessionManager.instance) {
      VerificationSessionManager.instance = new VerificationSessionManager();
    }
    return VerificationSessionManager.instance;
  }

  /**
   * 创建验证会话
   */
  public createSession(
    featureId: TurnstileFeatureId,
    token: string,
    userId?: string,
    clientIp?: string,
    expiryMs?: number
  ): string {
    const sessionId = this.generateSessionId(featureId, userId, clientIp);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (expiryMs || this.defaultExpiry));

    const session: VerificationSession = {
      userId,
      sessionId,
      featureId,
      verifiedAt: now,
      expiresAt,
      token,
      clientIp
    };

    this.sessions.set(sessionId, session);
    console.log(`✅ 创建验证会话: ${sessionId} for ${featureId}`);

    return sessionId;
  }

  /**
   * 检查验证会话是否有效
   */
  public isSessionValid(
    featureId: TurnstileFeatureId,
    userId?: string,
    clientIp?: string
  ): boolean {
    const sessionId = this.generateSessionId(featureId, userId, clientIp);
    const session = this.sessions.get(sessionId);

    if (!session) {
      return false;
    }

    // 检查是否过期
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      console.log(`⏰ 验证会话已过期: ${sessionId}`);
      return false;
    }

    return true;
  }

  /**
   * 获取验证会话
   */
  public getSession(
    featureId: TurnstileFeatureId,
    userId?: string,
    clientIp?: string
  ): VerificationSession | null {
    const sessionId = this.generateSessionId(featureId, userId, clientIp);
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // 检查是否过期
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  /**
   * 删除验证会话
   */
  public removeSession(
    featureId: TurnstileFeatureId,
    userId?: string,
    clientIp?: string
  ): boolean {
    const sessionId = this.generateSessionId(featureId, userId, clientIp);
    const deleted = this.sessions.delete(sessionId);

    if (deleted) {
      console.log(`🗑️ 删除验证会话: ${sessionId}`);
    }

    return deleted;
  }

  /**
   * 检查token是否已被验证过
   * 注意：Cloudflare token是一次性的，此方法仅用于防止重复提交
   * 不应用于实际的token验证逻辑
   */
  public isTokenVerified(token: string): boolean {
    // 移除token重复检查逻辑，避免与Cloudflare一次性token机制冲突
    // 每次验证都应该直接调用Cloudflare API
    console.log('⚠️ isTokenVerified已弃用，请直接验证token');
    return false;
  }

  /**
   * 延长会话有效期
   */
  public extendSession(
    featureId: TurnstileFeatureId,
    userId?: string,
    clientIp?: string,
    additionalMs: number = this.defaultExpiry
  ): boolean {
    const sessionId = this.generateSessionId(featureId, userId, clientIp);
    const session = this.sessions.get(sessionId);

    if (!session) {
      return false;
    }

    session.expiresAt = new Date(session.expiresAt.getTime() + additionalMs);
    console.log(`⏰ 延长验证会话: ${sessionId}`);
    return true;
  }

  /**
   * 清理过期会话
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 清理了 ${cleanedCount} 个过期的验证会话`);
    }
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(
    featureId: TurnstileFeatureId,
    userId?: string,
    clientIp?: string
  ): string {
    const parts = [
      'turnstile',
      featureId,
      userId || 'guest',
      clientIp || 'unknown'
    ];
    return parts.join(':');
  }

  /**
   * 获取会话统计信息
   */
  public getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
    sessionsByFeature: Record<string, number>;
  } {
    const now = new Date();
    let activeSessions = 0;
    let expiredSessions = 0;
    const sessionsByFeature: Record<string, number> = {};

    for (const session of this.sessions.values()) {
      if (now <= session.expiresAt) {
        activeSessions++;
        sessionsByFeature[session.featureId] = (sessionsByFeature[session.featureId] || 0) + 1;
      } else {
        expiredSessions++;
      }
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      expiredSessions,
      sessionsByFeature
    };
  }

  /**
   * 清理所有会话（用于测试或重置）
   */
  public clearAllSessions(): void {
    const count = this.sessions.size;
    this.sessions.clear();
    console.log(`🧹 清理了所有 ${count} 个验证会话`);
  }
}

// 导出单例实例
export const verificationSessionManager = VerificationSessionManager.getInstance();
