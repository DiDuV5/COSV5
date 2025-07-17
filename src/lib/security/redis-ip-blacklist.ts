/**
 * @fileoverview 基于Redis的IP黑名单服务
 * @description 支持分布式部署的IP黑名单实现
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import { NextRequest } from 'next/server';
import { getRedis, REDIS_KEYS, RedisUtils } from '@/lib/redis';

/**
 * 黑名单原因枚举
 */
export enum BlacklistReason {
  MALICIOUS_CONTENT = 'MALICIOUS_CONTENT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  MANUAL_BAN = 'MANUAL_BAN',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
}

/**
 * 黑名单记录接口
 */
export interface BlacklistRecord {
  ip: string;
  reason: BlacklistReason;
  addedAt: number;
  expiresAt: number;
  description?: string;
  adminId?: string;
}

/**
 * 获取客户端IP
 */
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  return forwarded?.split(',')[0] || realIp || req.ip || 'unknown';
}

/**
 * Redis IP黑名单服务类
 */
export class RedisIPBlacklist {
  private redis = getRedis();

  /**
   * 添加IP到黑名单
   */
  async addToBlacklist(
    ip: string,
    reason: BlacklistReason,
    durationMs: number = 24 * 60 * 60 * 1000, // 默认24小时
    description?: string,
    adminId?: string
  ): Promise<void> {
    const key = `${REDIS_KEYS.IP_BLACKLIST}${ip}`;
    const now = Date.now();
    
    const record: BlacklistRecord = {
      ip,
      reason,
      addedAt: now,
      expiresAt: now + durationMs,
      description,
      adminId,
    };

    try {
      // 设置黑名单记录，带过期时间
      await this.redis.setex(
        key,
        Math.ceil(durationMs / 1000),
        JSON.stringify(record)
      );

      console.log(`IP ${ip} 已添加到黑名单，原因: ${reason}, 持续时间: ${durationMs}ms`);
    } catch (error) {
      console.error('添加IP到黑名单失败:', error);
      throw error;
    }
  }

  /**
   * 检查IP是否在黑名单中
   */
  async isBlacklisted(ip: string): Promise<boolean> {
    const key = `${REDIS_KEYS.IP_BLACKLIST}${ip}`;
    
    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('检查IP黑名单失败:', error);
      // Redis失败时的降级策略 - 不阻止访问
      return false;
    }
  }

  /**
   * 获取黑名单记录详情
   */
  async getBlacklistRecord(ip: string): Promise<BlacklistRecord | null> {
    const key = `${REDIS_KEYS.IP_BLACKLIST}${ip}`;
    
    try {
      const recordStr = await this.redis.get(key);
      if (!recordStr) {
        return null;
      }

      return JSON.parse(recordStr) as BlacklistRecord;
    } catch (error) {
      console.error('获取黑名单记录失败:', error);
      return null;
    }
  }

  /**
   * 从黑名单中移除IP
   */
  async removeFromBlacklist(ip: string): Promise<boolean> {
    const key = `${REDIS_KEYS.IP_BLACKLIST}${ip}`;
    
    try {
      const result = await this.redis.del(key);
      const removed = result > 0;
      
      if (removed) {
        console.log(`IP ${ip} 已从黑名单中移除`);
      }
      
      return removed;
    } catch (error) {
      console.error('从黑名单移除IP失败:', error);
      return false;
    }
  }

  /**
   * 获取所有黑名单IP（分页）
   */
  async getAllBlacklistedIPs(
    cursor: string = '0',
    count: number = 100
  ): Promise<{
    ips: BlacklistRecord[];
    nextCursor: string;
  }> {
    try {
      const pattern = `${REDIS_KEYS.IP_BLACKLIST}*`;
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        count
      );

      const records: BlacklistRecord[] = [];
      
      if (keys.length > 0) {
        const values = await this.redis.mget(...keys);
        
        for (const value of values) {
          if (value) {
            try {
              records.push(JSON.parse(value) as BlacklistRecord);
            } catch (error) {
              console.error('解析黑名单记录失败:', error);
            }
          }
        }
      }

      return {
        ips: records,
        nextCursor,
      };
    } catch (error) {
      console.error('获取黑名单列表失败:', error);
      return {
        ips: [],
        nextCursor: '0',
      };
    }
  }

  /**
   * 获取黑名单统计信息
   */
  async getBlacklistStats(): Promise<{
    totalCount: number;
    reasonStats: Record<BlacklistReason, number>;
  }> {
    try {
      const pattern = `${REDIS_KEYS.IP_BLACKLIST}*`;
      let cursor = '0';
      let totalCount = 0;
      const reasonStats: Record<BlacklistReason, number> = {
        [BlacklistReason.MALICIOUS_CONTENT]: 0,
        [BlacklistReason.RATE_LIMIT_EXCEEDED]: 0,
        [BlacklistReason.SUSPICIOUS_ACTIVITY]: 0,
        [BlacklistReason.MANUAL_BAN]: 0,
        [BlacklistReason.SECURITY_VIOLATION]: 0,
      };

      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          1000
        );
        
        cursor = nextCursor;
        totalCount += keys.length;

        if (keys.length > 0) {
          const values = await this.redis.mget(...keys);
          
          for (const value of values) {
            if (value) {
              try {
                const record = JSON.parse(value) as BlacklistRecord;
                reasonStats[record.reason]++;
              } catch (error) {
                console.error('解析黑名单记录失败:', error);
              }
            }
          }
        }
      } while (cursor !== '0');

      return {
        totalCount,
        reasonStats,
      };
    } catch (error) {
      console.error('获取黑名单统计失败:', error);
      return {
        totalCount: 0,
        reasonStats: {
          [BlacklistReason.MALICIOUS_CONTENT]: 0,
          [BlacklistReason.RATE_LIMIT_EXCEEDED]: 0,
          [BlacklistReason.SUSPICIOUS_ACTIVITY]: 0,
          [BlacklistReason.MANUAL_BAN]: 0,
          [BlacklistReason.SECURITY_VIOLATION]: 0,
        },
      };
    }
  }

  /**
   * 清理过期的黑名单记录（手动清理，Redis会自动过期）
   */
  async cleanupExpiredRecords(): Promise<number> {
    try {
      const pattern = `${REDIS_KEYS.IP_BLACKLIST}*`;
      let cursor = '0';
      let cleanedCount = 0;

      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          1000
        );
        
        cursor = nextCursor;

        for (const key of keys) {
          const ttl = await this.redis.ttl(key);
          if (ttl === -1) { // 没有过期时间的键
            await this.redis.del(key);
            cleanedCount++;
          }
        }
      } while (cursor !== '0');

      return cleanedCount;
    } catch (error) {
      console.error('清理过期黑名单记录失败:', error);
      return 0;
    }
  }
}

/**
 * 全局IP黑名单服务实例
 */
export const ipBlacklist = new RedisIPBlacklist();

/**
 * 便捷函数：添加IP到黑名单
 */
export async function addToBlacklist(
  ip: string,
  reason: BlacklistReason,
  durationMs?: number,
  description?: string,
  adminId?: string
): Promise<void> {
  return ipBlacklist.addToBlacklist(ip, reason, durationMs, description, adminId);
}

/**
 * 便捷函数：检查IP是否被封禁
 */
export async function isBlacklisted(ip: string): Promise<boolean> {
  return ipBlacklist.isBlacklisted(ip);
}

/**
 * 便捷函数：检查请求IP是否被封禁
 */
export async function checkRequestBlacklist(req: NextRequest): Promise<boolean> {
  const ip = getClientIP(req);
  return ipBlacklist.isBlacklisted(ip);
}
