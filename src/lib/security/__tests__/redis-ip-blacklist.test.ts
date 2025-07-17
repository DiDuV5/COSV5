/**
 * @fileoverview Redis IP黑名单测试用例
 * @description 测试基于Redis的IP黑名单功能
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import { NextRequest } from 'next/server';
import { 
  RedisIPBlacklist, 
  BlacklistReason,
  addToBlacklist,
  isBlacklisted,
  checkRequestBlacklist
} from '../redis-ip-blacklist';
import { getRedis } from '@/lib/redis';

// Mock Redis
jest.mock('@/lib/redis', () => ({
  getRedis: jest.fn(),
  REDIS_KEYS: {
    IP_BLACKLIST: 'security:blacklist:ip:',
  },
}));

describe('RedisIPBlacklist', () => {
  let ipBlacklist: RedisIPBlacklist;
  let mockRedis: any;

  beforeEach(() => {
    // 创建Redis mock
    mockRedis = {
      setex: jest.fn(),
      exists: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      scan: jest.fn(),
      mget: jest.fn(),
      ttl: jest.fn(),
    };

    (getRedis as jest.Mock).mockReturnValue(mockRedis);
    ipBlacklist = new RedisIPBlacklist();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addToBlacklist', () => {
    it('应该成功添加IP到黑名单', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await ipBlacklist.addToBlacklist(
        '192.168.1.1',
        BlacklistReason.MALICIOUS_CONTENT,
        3600000, // 1小时
        '测试封禁',
        'admin-123'
      );

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'security:blacklist:ip:192.168.1.1',
        3600, // 秒
        expect.stringContaining('"ip":"192.168.1.1"')
      );

      // 验证记录内容
      const call = mockRedis.setex.mock.calls[0];
      const recordData = JSON.parse(call[2]);
      expect(recordData.ip).toBe('192.168.1.1');
      expect(recordData.reason).toBe(BlacklistReason.MALICIOUS_CONTENT);
      expect(recordData.description).toBe('测试封禁');
      expect(recordData.adminId).toBe('admin-123');
    });

    it('应该使用默认持续时间', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await ipBlacklist.addToBlacklist(
        '192.168.1.2',
        BlacklistReason.RATE_LIMIT_EXCEEDED
      );

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'security:blacklist:ip:192.168.1.2',
        86400, // 24小时的秒数
        expect.any(String)
      );
    });

    it('应该处理Redis错误', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis连接失败'));

      await expect(
        ipBlacklist.addToBlacklist('192.168.1.3', BlacklistReason.MANUAL_BAN)
      ).rejects.toThrow('Redis连接失败');
    });
  });

  describe('isBlacklisted', () => {
    it('应该正确检测被封禁的IP', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await ipBlacklist.isBlacklisted('192.168.1.1');

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith(
        'security:blacklist:ip:192.168.1.1'
      );
    });

    it('应该正确检测未被封禁的IP', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await ipBlacklist.isBlacklisted('192.168.1.2');

      expect(result).toBe(false);
    });

    it('应该在Redis失败时使用降级策略', async () => {
      mockRedis.exists.mockRejectedValue(new Error('Redis连接失败'));

      const result = await ipBlacklist.isBlacklisted('192.168.1.3');

      // 降级策略应该返回false（不阻止访问）
      expect(result).toBe(false);
    });
  });

  describe('getBlacklistRecord', () => {
    it('应该返回黑名单记录详情', async () => {
      const mockRecord = {
        ip: '192.168.1.1',
        reason: BlacklistReason.MALICIOUS_CONTENT,
        addedAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        description: '测试封禁',
        adminId: 'admin-123',
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockRecord));

      const result = await ipBlacklist.getBlacklistRecord('192.168.1.1');

      expect(result).toEqual(mockRecord);
      expect(mockRedis.get).toHaveBeenCalledWith(
        'security:blacklist:ip:192.168.1.1'
      );
    });

    it('应该在记录不存在时返回null', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await ipBlacklist.getBlacklistRecord('192.168.1.2');

      expect(result).toBeNull();
    });

    it('应该处理JSON解析错误', async () => {
      mockRedis.get.mockResolvedValue('invalid-json');

      const result = await ipBlacklist.getBlacklistRecord('192.168.1.3');

      expect(result).toBeNull();
    });
  });

  describe('removeFromBlacklist', () => {
    it('应该成功移除IP', async () => {
      mockRedis.del.mockResolvedValue(1);

      const result = await ipBlacklist.removeFromBlacklist('192.168.1.1');

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith(
        'security:blacklist:ip:192.168.1.1'
      );
    });

    it('应该在IP不存在时返回false', async () => {
      mockRedis.del.mockResolvedValue(0);

      const result = await ipBlacklist.removeFromBlacklist('192.168.1.2');

      expect(result).toBe(false);
    });
  });

  describe('getAllBlacklistedIPs', () => {
    it('应该返回分页的黑名单列表', async () => {
      const mockKeys = [
        'security:blacklist:ip:192.168.1.1',
        'security:blacklist:ip:192.168.1.2',
      ];
      const mockRecords = [
        JSON.stringify({
          ip: '192.168.1.1',
          reason: BlacklistReason.MALICIOUS_CONTENT,
          addedAt: Date.now(),
          expiresAt: Date.now() + 3600000,
        }),
        JSON.stringify({
          ip: '192.168.1.2',
          reason: BlacklistReason.RATE_LIMIT_EXCEEDED,
          addedAt: Date.now(),
          expiresAt: Date.now() + 3600000,
        }),
      ];

      mockRedis.scan.mockResolvedValue(['10', mockKeys]);
      mockRedis.mget.mockResolvedValue(mockRecords);

      const result = await ipBlacklist.getAllBlacklistedIPs('0', 100);

      expect(result.ips).toHaveLength(2);
      expect(result.nextCursor).toBe('10');
      expect(result.ips[0].ip).toBe('192.168.1.1');
      expect(result.ips[1].ip).toBe('192.168.1.2');
    });

    it('应该处理空结果', async () => {
      mockRedis.scan.mockResolvedValue(['0', []]);

      const result = await ipBlacklist.getAllBlacklistedIPs();

      expect(result.ips).toHaveLength(0);
      expect(result.nextCursor).toBe('0');
    });
  });

  describe('getBlacklistStats', () => {
    it('应该返回黑名单统计信息', async () => {
      const mockKeys = [
        'security:blacklist:ip:192.168.1.1',
        'security:blacklist:ip:192.168.1.2',
        'security:blacklist:ip:192.168.1.3',
      ];
      const mockRecords = [
        JSON.stringify({ reason: BlacklistReason.MALICIOUS_CONTENT }),
        JSON.stringify({ reason: BlacklistReason.RATE_LIMIT_EXCEEDED }),
        JSON.stringify({ reason: BlacklistReason.MALICIOUS_CONTENT }),
      ];

      mockRedis.scan
        .mockResolvedValueOnce(['0', mockKeys])
        .mockResolvedValueOnce(['0', []]);
      mockRedis.mget.mockResolvedValue(mockRecords);

      const result = await ipBlacklist.getBlacklistStats();

      expect(result.totalCount).toBe(3);
      expect(result.reasonStats[BlacklistReason.MALICIOUS_CONTENT]).toBe(2);
      expect(result.reasonStats[BlacklistReason.RATE_LIMIT_EXCEEDED]).toBe(1);
    });
  });

  describe('便捷函数', () => {
    it('addToBlacklist应该调用实例方法', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await addToBlacklist('192.168.1.1', BlacklistReason.MANUAL_BAN);

      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('isBlacklisted应该调用实例方法', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await isBlacklisted('192.168.1.1');

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalled();
    });

    it('checkRequestBlacklist应该检查请求IP', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      });

      const result = await checkRequestBlacklist(mockRequest);

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith(
        'security:blacklist:ip:192.168.1.1'
      );
    });
  });

  describe('BlacklistReason枚举', () => {
    it('应该包含所有预定义的原因', () => {
      expect(BlacklistReason.MALICIOUS_CONTENT).toBe('MALICIOUS_CONTENT');
      expect(BlacklistReason.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
      expect(BlacklistReason.SUSPICIOUS_ACTIVITY).toBe('SUSPICIOUS_ACTIVITY');
      expect(BlacklistReason.MANUAL_BAN).toBe('MANUAL_BAN');
      expect(BlacklistReason.SECURITY_VIOLATION).toBe('SECURITY_VIOLATION');
    });
  });
});
