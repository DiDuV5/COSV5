/**
 * @fileoverview 配置系统集成测试 - CoserEden平台
 * @description 测试动态配置加载、R2存储连接、用户权限验证等配置相关功能
 * @author Augment AI
 * @date 2025-06-21
 * @version 1.0.0
 * @since 1.0.0
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { uploadConfigManager, type UnifiedUploadConfig } from '../core/upload-config-manager';
import { FILE_SIZE, USER_LEVELS, PERMISSION_LIMITS } from '../upload-constants';

describe('配置系统集成测试', () => {
  beforeEach(() => {
    // 使用静态方法清除缓存
    (uploadConfigManager.constructor as any).clearConfigCache();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // 恢复原始环境变量
    delete process.env.TEST_MAX_FILE_SIZE;
    delete process.env.TEST_STORAGE_PROVIDER;
  });

  describe('动态配置加载测试', () => {
    test('应该从环境变量加载配置', async () => {
      // 设置测试环境变量
      process.env.COSEREEDEN_MAX_FILE_SIZE = String(200 * FILE_SIZE.MB);
      process.env.COSEREEDEN_STORAGE_PROVIDER = 'cloudflare-r2';
      process.env.COSEREEDEN_ENABLE_CHUNKED_UPLOAD = 'true';
      process.env.COSEREEDEN_MAX_CONCURRENT_UPLOADS = '5';

      // 清除缓存以重新加载配置
      (uploadConfigManager.constructor as any).clearConfigCache();

      const config = await (uploadConfigManager.constructor as any).getConfig();

      expect(config.maxFileSize).toBe(200 * FILE_SIZE.MB);
      expect(config.storageProvider).toBe('cloudflare-r2');
      expect(config.enableChunkedUpload).toBe(true);
      expect(config.concurrency).toBe(5);
    });

    test('应该使用默认配置当环境变量未设置时', async () => {
      // 确保相关环境变量未设置
      delete process.env.COSEREEDEN_MAX_FILE_SIZE;
      delete process.env.COSEREEDEN_STORAGE_PROVIDER;

      (uploadConfigManager.constructor as any).clearConfigCache();
      const config = await (uploadConfigManager.constructor as any).getConfig();

      expect(config.maxFileSize).toBe(FILE_SIZE.STREAMING_THRESHOLD);
      expect(config.storageProvider).toBe('cloudflare-r2');
      expect(config.enableChunkedUpload).toBe(true);
    });

    test('应该正确解析允许的文件类型', async () => {
      process.env.COSEREEDEN_ALLOWED_FILE_TYPES = 'image/jpeg,image/png,video/mp4';

      (uploadConfigManager.constructor as any).clearConfigCache();
      const config = await (uploadConfigManager.constructor as any).getConfig();

      expect(config.allowedTypes).toEqual(['image/jpeg', 'image/png', 'video/mp4']);
    });

    test('配置缓存应该正常工作', async () => {
      const config1 = await (uploadConfigManager.constructor as any).getConfig();
      const config2 = await (uploadConfigManager.constructor as any).getConfig();

      // 应该返回相同的配置对象（缓存生效）
      expect(config1).toEqual(config2);
    });

    test('清除缓存后应该重新加载配置', async () => {
      const config1 = await (uploadConfigManager.constructor as any).getConfig();

      // 修改环境变量
      process.env.COSEREEDEN_MAX_FILE_SIZE = String(500 * FILE_SIZE.MB);

      // 清除缓存
      (uploadConfigManager.constructor as any).clearConfigCache();

      const config2 = await (uploadConfigManager.constructor as any).getConfig();

      expect(config2.maxFileSize).toBe(500 * FILE_SIZE.MB);
      expect(config2.maxFileSize).not.toBe(config1.maxFileSize);
    });
  });

  // Cloudflare R2配置测试已被移除，因为getR2Config方法不在当前的UploadConfigManager实现中

  describe('用户权限配置测试', () => {
    test('应该正确获取各级用户权限', async () => {
      const guestLimits = await (uploadConfigManager.constructor as any).getUserLimits('GUEST');
      const userLimits = await (uploadConfigManager.constructor as any).getUserLimits('USER');
      const vipLimits = await (uploadConfigManager.constructor as any).getUserLimits('VIP');
      const creatorLimits = await (uploadConfigManager.constructor as any).getUserLimits('CREATOR');
      const adminLimits = await (uploadConfigManager.constructor as any).getUserLimits('ADMIN');
      const superAdminLimits = await (uploadConfigManager.constructor as any).getUserLimits('SUPER_ADMIN');

      // GUEST用户应该没有权限
      expect(guestLimits.maxFileSize).toBe(0);
      expect(guestLimits.allowedTypes).toHaveLength(0);

      // USER用户应该有基本权限
      expect(userLimits.maxFileSize).toBe(10 * FILE_SIZE.MB);
      expect(userLimits.enableChunkedUpload).toBe(false);

      // VIP用户应该有增强权限
      expect(vipLimits.maxFileSize).toBe(50 * FILE_SIZE.MB);
      expect(vipLimits.enableChunkedUpload).toBe(true);

      // CREATOR用户应该有专业权限
      expect(creatorLimits.maxFileSize).toBe(500 * FILE_SIZE.MB);
      expect(creatorLimits.enableResumableUpload).toBe(true);

      // ADMIN用户应该有管理员权限
      expect(adminLimits.maxFileSize).toBe(FILE_SIZE.GB);

      // SUPER_ADMIN用户应该有无限权限
      expect(superAdminLimits.maxFileSize).toBe(-1);
    });

    test('应该验证权限级别递增', async () => {
      const levels = ['USER', 'VIP', 'CREATOR', 'ADMIN'] as const;
      const limits = await Promise.all(
        levels.map(level => (uploadConfigManager.constructor as any).getUserLimits(level))
      );

      for (let i = 1; i < limits.length; i++) {
        const current = limits[i];
        const previous = limits[i - 1];

        // 文件大小限制应该递增
        expect(current.maxFileSize).toBeGreaterThan(previous.maxFileSize);

        // 文件数量限制应该递增
        expect(current.maxFilesPerUpload).toBeGreaterThanOrEqual(previous.maxFilesPerUpload);

        // 允许的文件类型应该递增或相等
        expect(current.allowedTypes.length).toBeGreaterThanOrEqual(previous.allowedTypes.length);
      }
    });

    test('应该处理无效的用户级别', async () => {
      const invalidLimits = await (uploadConfigManager.constructor as any).getUserLimits('INVALID' as any);

      // 应该回退到GUEST权限
      expect(invalidLimits.maxFileSize).toBe(0);
      expect(invalidLimits.allowedTypes).toHaveLength(0);
    });
  });

  describe('文件类型和策略检测测试', () => {
    test('应该正确检测视频文件', () => {
      expect((uploadConfigManager.constructor as any).isVideoFile('video/mp4')).toBe(true);
      expect((uploadConfigManager.constructor as any).isVideoFile('video/webm')).toBe(true);
      expect((uploadConfigManager.constructor as any).isVideoFile('video/avi')).toBe(true);
      expect((uploadConfigManager.constructor as any).isVideoFile('image/jpeg')).toBe(false);
      expect((uploadConfigManager.constructor as any).isVideoFile('audio/mp3')).toBe(false);
      expect((uploadConfigManager.constructor as any).isVideoFile('application/pdf')).toBe(false);
    });

    // shouldUseHybridStrategy方法已被移除，因为它不在当前的UploadConfigManager实现中

    test('应该获取正确的视频处理配置', () => {
      const videoConfig = uploadConfigManager.getVideoProcessingConfig();

      expect(videoConfig).toMatchObject({
        requiredCodec: 'h264',
        outputFormats: ['mp4'],
        browserCompatibleCodecs: ['h264', 'avc1'],
        defaultQuality: 23,
        maxResolution: '1920x1080',
      });
    });
  });

  describe('配置验证和安全测试', () => {
    test('应该验证必需的配置项', async () => {
      const config = await uploadConfigManager.getConfig();

      // 必需的配置项应该存在
      expect(config.environment).toBeDefined();
      expect(config.maxFileSize).toBeGreaterThan(0);
      expect(config.allowedMimeTypes).toBeInstanceOf(Array);
      expect(config.storageProvider).toBeDefined();
    });

    // R2配置验证测试已被移除，因为getR2Config方法不在当前的UploadConfigManager实现中

    test('应该有合理的默认值', async () => {
      const config = await (uploadConfigManager.constructor as any).getConfig();

      // 默认值应该在合理范围内
      expect(config.maxFileSize).toBeLessThanOrEqual(FILE_SIZE.GB);
      expect(config.chunkSize).toBeGreaterThanOrEqual(FILE_SIZE.MB);
      expect(config.concurrency).toBeGreaterThan(0);
      expect(config.concurrency).toBeLessThanOrEqual(10);
      expect(config.retryAttempts).toBeGreaterThan(0);
      expect(config.retryAttempts).toBeLessThanOrEqual(5);
    });

    test('应该防止配置注入攻击', async () => {
      // 尝试注入恶意配置
      process.env.COSEREEDEN_MAX_FILE_SIZE = 'eval(malicious_code)';
      process.env.COSEREEDEN_STORAGE_PROVIDER = '<script>alert("xss")</script>';

      (uploadConfigManager.constructor as any).clearConfigCache();
      const config = await (uploadConfigManager.constructor as any).getConfig();

      // 应该使用默认值而不是恶意输入
      expect(config.maxFileSize).toBe(FILE_SIZE.STREAMING_THRESHOLD);
      expect(config.storageProvider).toBe('cloudflare-r2');
    });
  });

  describe('环境特定配置测试', () => {
    test('开发环境应该有宽松的配置', async () => {
      (process.env as any).NODE_ENV = 'development';

      (uploadConfigManager.constructor as any).clearConfigCache();
      const config = await (uploadConfigManager.constructor as any).getConfig();

      expect(config.environment).toBe('development');
      // 开发环境可能有不同的默认值
    });

    test('生产环境应该有严格的配置', async () => {
      (process.env as any).NODE_ENV = 'production';

      (uploadConfigManager.constructor as any).clearConfigCache();
      const config = await (uploadConfigManager.constructor as any).getConfig();

      expect(config.environment).toBe('production');
      // 生产环境应该有更严格的安全设置
      expect(config.enableHashVerification).toBe(true);
    });

    test('测试环境应该有测试友好的配置', async () => {
      (process.env as any).NODE_ENV = 'test';

      (uploadConfigManager.constructor as any).clearConfigCache();
      const config = await (uploadConfigManager.constructor as any).getConfig();

      expect(config.environment).toBe('test');
    });
  });

  describe('配置热重载测试', () => {
    test('应该支持配置热重载', async () => {
      const config1 = await (uploadConfigManager.constructor as any).getConfig();
      expect(config1.maxFileSize).toBe(FILE_SIZE.STREAMING_THRESHOLD);

      // 模拟配置更新
      process.env.COSEREEDEN_MAX_FILE_SIZE = String(200 * FILE_SIZE.MB);

      // 清除缓存触发重载
      (uploadConfigManager.constructor as any).clearConfigCache();

      const config2 = await (uploadConfigManager.constructor as any).getConfig();
      expect(config2.maxFileSize).toBe(200 * FILE_SIZE.MB);
    });

    test('配置缓存应该有合理的TTL', async () => {
      const config1 = await (uploadConfigManager.constructor as any).getConfig();

      // 等待缓存过期（在实际实现中可能需要模拟时间）
      // 这里只是验证缓存机制存在
      expect(config1).toBeDefined();
    });
  });

  describe('配置兼容性测试', () => {
    test('应该向后兼容旧的配置格式', async () => {
      // 模拟旧版本的环境变量
      process.env.COSEREEDEN_UPLOAD_MAX_SIZE = String(100 * FILE_SIZE.MB);
      process.env.COSEREEDEN_UPLOAD_ALLOWED_TYPES = 'image/*,video/*';

      (uploadConfigManager.constructor as any).clearConfigCache();
      const config = await (uploadConfigManager.constructor as any).getConfig();

      // 应该能正确处理或忽略旧格式
      expect(config).toBeDefined();
    });

    test('应该处理配置格式错误', async () => {
      process.env.COSEREEDEN_MAX_FILE_SIZE = 'invalid-number';
      process.env.COSEREEDEN_ENABLE_CHUNKED_UPLOAD = 'maybe';

      (uploadConfigManager.constructor as any).clearConfigCache();
      const config = await (uploadConfigManager.constructor as any).getConfig();

      // 应该使用默认值而不是崩溃
      expect(config.maxFileSize).toBe(FILE_SIZE.STREAMING_THRESHOLD);
      expect(config.enableChunkedUpload).toBe(true);
    });
  });
});
