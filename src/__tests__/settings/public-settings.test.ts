/**
 * @fileoverview 公开设置API测试
 * @description 测试getPublicSettings API的功能，特别是字段映射和登录/注册页面说明
 * @author Augment AI
 * @date 2025-07-09
 * @version 1.0.0
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { SettingsBaseService, SETTING_KEYS } from '@/server/api/routers/settings/services/settings-base-service';

// 使用内存数据库进行测试
const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./test.db'
    }
  }
});

describe('公开设置API测试', () => {
  let settingsService: SettingsBaseService;

  beforeAll(async () => {
    settingsService = new SettingsBaseService(testPrisma);
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  beforeEach(async () => {
    // 清理测试数据
    await testPrisma.systemSetting.deleteMany();
  });

  describe('getPublicSettings方法', () => {
    it('应该返回空对象当没有公开设置时', async () => {
      const result = await settingsService.getPublicSettings();
      expect(result).toEqual({});
    });

    it('应该只返回标记为公开的设置', async () => {
      // 创建公开和私有设置
      await testPrisma.systemSetting.createMany({
        data: [
          {
            key: 'public_setting',
            value: '"public_value"',
            isPublic: true,
            category: 'test',
            description: '公开设置'
          },
          {
            key: 'private_setting',
            value: '"private_value"',
            isPublic: false,
            category: 'test',
            description: '私有设置'
          }
        ]
      });

      const result = await settingsService.getPublicSettings();
      
      expect(result).toHaveProperty('public_setting', 'public_value');
      expect(result).not.toHaveProperty('private_setting');
    });

    it('应该正确解析JSON格式的设置值', async () => {
      await testPrisma.systemSetting.create({
        data: {
          key: 'json_setting',
          value: '{"test": "value", "number": 123}',
          isPublic: true,
          category: 'test',
          description: 'JSON设置'
        }
      });

      const result = await settingsService.getPublicSettings();
      
      expect(result.json_setting).toEqual({ test: 'value', number: 123 });
    });

    it('应该处理非JSON格式的设置值', async () => {
      await testPrisma.systemSetting.create({
        data: {
          key: 'string_setting',
          value: 'simple_string_value',
          isPublic: true,
          category: 'test',
          description: '字符串设置'
        }
      });

      const result = await settingsService.getPublicSettings();
      
      expect(result.string_setting).toBe('simple_string_value');
    });
  });

  describe('字段名映射功能', () => {
    beforeEach(async () => {
      // 创建认证相关的公开设置
      await testPrisma.systemSetting.createMany({
        data: [
          {
            key: SETTING_KEYS.LOGIN_PAGE_NOTICE,
            value: '"登录页面说明内容"',
            isPublic: true,
            category: 'auth',
            description: '登录页面说明'
          },
          {
            key: SETTING_KEYS.REGISTER_PAGE_NOTICE,
            value: '"注册页面说明内容"',
            isPublic: true,
            category: 'auth',
            description: '注册页面说明'
          },
          {
            key: SETTING_KEYS.USERNAME_MIN_LENGTH,
            value: '5',
            isPublic: true,
            category: 'auth',
            description: '用户名最小长度'
          }
        ]
      });
    });

    it('应该提供loginPageNotice字段映射', async () => {
      const result = await settingsService.getPublicSettings();
      
      // 检查原始键名
      expect(result).toHaveProperty(SETTING_KEYS.LOGIN_PAGE_NOTICE, '登录页面说明内容');
      
      // 检查映射后的字段名
      expect(result).toHaveProperty('loginPageNotice', '登录页面说明内容');
    });

    it('应该提供registerPageNotice字段映射', async () => {
      const result = await settingsService.getPublicSettings();
      
      // 检查原始键名
      expect(result).toHaveProperty(SETTING_KEYS.REGISTER_PAGE_NOTICE, '注册页面说明内容');
      
      // 检查映射后的字段名
      expect(result).toHaveProperty('registerPageNotice', '注册页面说明内容');
    });

    it('应该提供usernameMinLength字段映射', async () => {
      const result = await settingsService.getPublicSettings();
      
      // 检查原始键名
      expect(result).toHaveProperty(SETTING_KEYS.USERNAME_MIN_LENGTH, 5);
      
      // 检查映射后的字段名
      expect(result).toHaveProperty('usernameMinLength', 5);
    });

    it('应该保持向后兼容性', async () => {
      const result = await settingsService.getPublicSettings();
      
      // 确保原始键名和映射字段名都存在
      expect(result[SETTING_KEYS.LOGIN_PAGE_NOTICE]).toBe(result.loginPageNotice);
      expect(result[SETTING_KEYS.REGISTER_PAGE_NOTICE]).toBe(result.registerPageNotice);
      expect(result[SETTING_KEYS.USERNAME_MIN_LENGTH]).toBe(result.usernameMinLength);
    });

    it('应该处理HTML内容的页面说明', async () => {
      const htmlContent = '<div><h2>测试标题</h2><p>测试内容</p></div>';
      
      await testPrisma.systemSetting.update({
        where: { key: SETTING_KEYS.LOGIN_PAGE_NOTICE },
        data: { value: JSON.stringify(htmlContent) }
      });

      const result = await settingsService.getPublicSettings();
      
      expect(result.loginPageNotice).toBe(htmlContent);
      expect(result.loginPageNotice).toContain('<h2>测试标题</h2>');
    });
  });

  describe('错误处理', () => {
    it('应该处理数据库连接错误', async () => {
      // 创建一个会失败的服务实例
      const badPrisma = new PrismaClient({
        datasources: {
          db: {
            url: 'file:./nonexistent.db'
          }
        }
      });
      
      const badService = new SettingsBaseService(badPrisma);
      
      // 这个测试可能需要根据实际的错误处理逻辑调整
      await expect(badService.getPublicSettings()).rejects.toThrow();
      
      await badPrisma.$disconnect();
    });

    it('应该处理损坏的JSON数据', async () => {
      await testPrisma.systemSetting.create({
        data: {
          key: 'broken_json',
          value: '{"invalid": json}',
          isPublic: true,
          category: 'test',
          description: '损坏的JSON'
        }
      });

      const result = await settingsService.getPublicSettings();
      
      // 应该回退到原始字符串值
      expect(result.broken_json).toBe('{"invalid": json}');
    });
  });
});
