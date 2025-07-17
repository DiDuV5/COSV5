/**
 * @fileoverview 用户友好错误消息测试
 * @description 测试错误消息转换功能
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

import { TRPCError } from '@trpc/server';
import {
  convertTRPCErrorToUserMessage,
  getErrorSeverityColor,
  getErrorIcon,
  COMMON_ERROR_MESSAGES,
  BUSINESS_ERROR_MESSAGES,
} from '@/lib/errors/user-friendly-messages';

describe('用户友好错误消息', () => {
  describe('convertTRPCErrorToUserMessage', () => {
    it('应该正确转换UNAUTHORIZED错误', () => {
      const error = new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Unauthorized access',
      });

      const result = convertTRPCErrorToUserMessage(error);

      expect(result).toEqual(COMMON_ERROR_MESSAGES.UNAUTHORIZED);
      expect(result.title).toBe('请先登录');
      expect(result.severity).toBe('warning');
    });

    it('应该正确转换FORBIDDEN错误', () => {
      const error = new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied',
      });

      const result = convertTRPCErrorToUserMessage(error);

      expect(result).toEqual(COMMON_ERROR_MESSAGES.FORBIDDEN);
      expect(result.title).toBe('权限不足');
      expect(result.severity).toBe('error');
    });

    it('应该正确转换NOT_FOUND错误', () => {
      const error = new TRPCError({
        code: 'NOT_FOUND',
        message: 'Resource not found',
      });

      const result = convertTRPCErrorToUserMessage(error);

      expect(result).toEqual(COMMON_ERROR_MESSAGES.NOT_FOUND);
      expect(result.title).toBe('内容不存在');
    });

    it('应该正确转换业务特定错误', () => {
      const error = new TRPCError({
        code: 'BAD_REQUEST',
        message: 'USERNAME_TAKEN',
      });

      const result = convertTRPCErrorToUserMessage(error);

      expect(result).toEqual(BUSINESS_ERROR_MESSAGES.USERNAME_TAKEN);
      expect(result.title).toBe('用户名已被使用');
      expect(result.severity).toBe('warning');
    });

    it('应该正确转换EMAIL_TAKEN错误', () => {
      const error = new TRPCError({
        code: 'BAD_REQUEST',
        message: 'EMAIL_TAKEN',
      });

      const result = convertTRPCErrorToUserMessage(error);

      expect(result).toEqual(BUSINESS_ERROR_MESSAGES.EMAIL_TAKEN);
      expect(result.title).toBe('邮箱已被注册');
    });

    it('应该正确转换网络错误', () => {
      const error = new Error('Network request failed');

      const result = convertTRPCErrorToUserMessage(error);

      expect(result).toEqual(COMMON_ERROR_MESSAGES.NETWORK_ERROR);
      expect(result.title).toBe('网络连接失败');
    });

    it('应该正确转换超时错误', () => {
      const error = new Error('Request timeout');

      const result = convertTRPCErrorToUserMessage(error);

      expect(result).toEqual(COMMON_ERROR_MESSAGES.TIMEOUT);
      expect(result.title).toBe('请求超时');
    });

    it('应该为未知错误返回默认消息', () => {
      const error = new Error('Some unknown error');

      const result = convertTRPCErrorToUserMessage(error);

      expect(result).toEqual(COMMON_ERROR_MESSAGES.UNKNOWN_ERROR);
      expect(result.title).toBe('未知错误');
    });

    it('应该正确处理INTERNAL_SERVER_ERROR', () => {
      const error = new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      });

      const result = convertTRPCErrorToUserMessage(error);

      expect(result).toEqual(COMMON_ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
      expect(result.title).toBe('服务器错误');
      expect(result.severity).toBe('error');
    });

    it('应该正确处理TOO_MANY_REQUESTS', () => {
      const error = new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded',
      });

      const result = convertTRPCErrorToUserMessage(error);

      expect(result).toEqual(COMMON_ERROR_MESSAGES.RATE_LIMIT_EXCEEDED);
      expect(result.title).toBe('操作过于频繁');
      expect(result.severity).toBe('warning');
    });
  });

  describe('getErrorSeverityColor', () => {
    it('应该返回正确的错误颜色', () => {
      expect(getErrorSeverityColor('error')).toBe('text-red-600 bg-red-50 border-red-200');
      expect(getErrorSeverityColor('warning')).toBe('text-yellow-600 bg-yellow-50 border-yellow-200');
      expect(getErrorSeverityColor('info')).toBe('text-blue-600 bg-blue-50 border-blue-200');
    });

    it('应该为未知严重程度返回默认颜色', () => {
      expect(getErrorSeverityColor('unknown' as any)).toBe('text-gray-600 bg-gray-50 border-gray-200');
    });
  });

  describe('getErrorIcon', () => {
    it('应该返回正确的错误图标', () => {
      expect(getErrorIcon('error')).toBe('❌');
      expect(getErrorIcon('warning')).toBe('⚠️');
      expect(getErrorIcon('info')).toBe('ℹ️');
    });

    it('应该为未知严重程度返回默认图标', () => {
      expect(getErrorIcon('unknown' as any)).toBe('❓');
    });
  });

  describe('错误消息完整性', () => {
    it('所有通用错误消息应该有必需的字段', () => {
      Object.values(COMMON_ERROR_MESSAGES).forEach((message) => {
        expect(message).toHaveProperty('title');
        expect(message).toHaveProperty('description');
        expect(message).toHaveProperty('severity');
        expect(typeof message.title).toBe('string');
        expect(typeof message.description).toBe('string');
        expect(['error', 'warning', 'info']).toContain(message.severity);
      });
    });

    it('所有业务错误消息应该有必需的字段', () => {
      Object.values(BUSINESS_ERROR_MESSAGES).forEach((message) => {
        expect(message).toHaveProperty('title');
        expect(message).toHaveProperty('description');
        expect(message).toHaveProperty('severity');
        expect(typeof message.title).toBe('string');
        expect(typeof message.description).toBe('string');
        expect(['error', 'warning', 'info']).toContain(message.severity);
      });
    });

    it('错误消息应该是中文', () => {
      const allMessages = {
        ...COMMON_ERROR_MESSAGES,
        ...BUSINESS_ERROR_MESSAGES,
      };

      Object.values(allMessages).forEach((message) => {
        // 检查是否包含中文字符
        const chineseRegex = /[\u4e00-\u9fff]/;
        expect(chineseRegex.test(message.title)).toBe(true);
        expect(chineseRegex.test(message.description)).toBe(true);
      });
    });
  });

  describe('边界情况', () => {
    it('应该处理空错误消息', () => {
      const error = new TRPCError({
        code: 'BAD_REQUEST',
        message: '',
      });

      const result = convertTRPCErrorToUserMessage(error);

      expect(result).toEqual(COMMON_ERROR_MESSAGES.VALIDATION_ERROR);
    });

    it('应该处理null错误', () => {
      const error = new Error();
      error.message = '';

      const result = convertTRPCErrorToUserMessage(error);

      expect(result).toEqual(COMMON_ERROR_MESSAGES.UNKNOWN_ERROR);
    });

    it('应该处理非标准错误代码', () => {
      const error = new TRPCError({
        code: 'CUSTOM_ERROR' as any,
        message: 'Custom error message',
      });

      const result = convertTRPCErrorToUserMessage(error);

      expect(result).toEqual(COMMON_ERROR_MESSAGES.UNKNOWN_ERROR);
    });
  });

  describe('用户体验验证', () => {
    it('错误标题应该简洁明了', () => {
      const allMessages = {
        ...COMMON_ERROR_MESSAGES,
        ...BUSINESS_ERROR_MESSAGES,
      };

      Object.values(allMessages).forEach((message) => {
        expect(message.title.length).toBeLessThanOrEqual(20);
        expect(message.title).not.toContain('Error');
        expect(message.title).not.toContain('Exception');
      });
    });

    it('错误描述应该提供有用信息', () => {
      const allMessages = {
        ...COMMON_ERROR_MESSAGES,
        ...BUSINESS_ERROR_MESSAGES,
      };

      Object.values(allMessages).forEach((message) => {
        expect(message.description.length).toBeGreaterThan(5);
        expect(message.description.length).toBeLessThanOrEqual(100);
      });
    });

    it('操作建议应该具体可行', () => {
      const allMessages = {
        ...COMMON_ERROR_MESSAGES,
        ...BUSINESS_ERROR_MESSAGES,
      };

      Object.values(allMessages).forEach((message) => {
        if (message.action) {
          expect(message.action.length).toBeLessThanOrEqual(10);
          expect(message.action).not.toContain('请');
        }
      });
    });
  });
});
