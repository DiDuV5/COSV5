/**
 * @fileoverview 环境变量验证测试
 * @description 测试环境变量验证功能
 */

import { validateStorageConfig, validateDatabaseConfig, validateAuthConfig } from '@/lib/env';

// 保存原始环境变量
const originalEnv = process.env;

describe('环境变量验证', () => {
  beforeEach(() => {
    // 重置环境变量
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // 恢复原始环境变量
    process.env = originalEnv;
  });

  describe('validateStorageConfig', () => {
    it('应该在Cloudflare R2配置完整时通过验证', () => {
      process.env.COSEREEDEN_STORAGE_PROVIDER = 'cloudflare-r2';
      process.env.COSEREEDEN_CLOUDFLARE_R2_ACCOUNT_ID = 'test-account-id';
      process.env.COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID = 'test-access-key';
      process.env.COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY = 'test-secret-key';
      process.env.COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME = 'test-bucket';
      process.env.COSEREEDEN_CLOUDFLARE_R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com';

      expect(() => validateStorageConfig()).not.toThrow();
    });

    it('应该在Cloudflare R2配置缺失时抛出错误', () => {
      process.env.COSEREEDEN_STORAGE_PROVIDER = 'cloudflare-r2';
      delete process.env.COSEREEDEN_CLOUDFLARE_R2_ACCOUNT_ID;

      expect(() => validateStorageConfig()).toThrow('Cloudflare R2配置缺失');
    });
  });

  describe('validateDatabaseConfig', () => {
    it('应该在数据库URL有效时通过验证', () => {
      process.env.COSEREEDEN_DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

      expect(() => validateDatabaseConfig()).not.toThrow();
    });

    it('应该在数据库URL缺失时抛出错误', () => {
      delete process.env.COSEREEDEN_DATABASE_URL;
      delete process.env.DATABASE_URL; // 清理向后兼容变量

      expect(() => validateDatabaseConfig()).toThrow('DATABASE_URL环境变量未设置');
    });

    it('应该在数据库URL格式无效时抛出错误', () => {
      process.env.COSEREEDEN_DATABASE_URL = 'invalid-url';

      expect(() => validateDatabaseConfig()).toThrow('DATABASE_URL格式无效');
    });
  });

  describe('validateAuthConfig', () => {
    it('应该在NextAuth密钥有效时通过验证', () => {
      process.env.COSEREEDEN_NEXTAUTH_SECRET = 'a-very-long-secret-key-for-testing';

      expect(() => validateAuthConfig()).not.toThrow();
    });

    it('应该在NextAuth密钥缺失时抛出错误', () => {
      delete process.env.COSEREEDEN_NEXTAUTH_SECRET;
      delete process.env.NEXTAUTH_SECRET; // 清理向后兼容变量

      expect(() => validateAuthConfig()).toThrow('NEXTAUTH_SECRET环境变量未设置');
    });

    it('应该在NextAuth密钥过短时发出警告', () => {
      process.env.COSEREEDEN_NEXTAUTH_SECRET = 'short';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      validateAuthConfig();

      expect(consoleSpy).toHaveBeenCalledWith('⚠️ NEXTAUTH_SECRET长度建议至少32个字符');
      consoleSpy.mockRestore();
    });
  });
});
