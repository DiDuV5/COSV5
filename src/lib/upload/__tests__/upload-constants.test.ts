/**
 * @fileoverview 上传常量测试 - CoserEden平台
 * @description 测试上传系统常量定义的正确性
 */

import { describe, test, expect } from '@jest/globals';
import {
  FILE_SIZE,
  CHUNK_CONFIG,
  SUPPORTED_FILE_TYPES,
  USER_LEVELS,
  PERMISSION_LIMITS,
  VIDEO_PROCESSING,
} from '../upload-constants';

describe('上传常量测试', () => {
  describe('FILE_SIZE 常量', () => {
    test('应该定义正确的文件大小常量', () => {
      expect(FILE_SIZE.KB).toBe(1024);
      expect(FILE_SIZE.MB).toBe(1024 * 1024);
      expect(FILE_SIZE.GB).toBe(1024 * 1024 * 1024);
      expect(FILE_SIZE.SMALL_FILE_THRESHOLD).toBe(50 * 1024 * 1024);
      expect(FILE_SIZE.LARGE_FILE_THRESHOLD).toBe(500 * 1024 * 1024);
    });
  });

  describe('CHUNK_CONFIG 常量', () => {
    test('应该定义正确的分片配置', () => {
      expect(CHUNK_CONFIG.DEFAULT_CHUNK_SIZE).toBe(5 * 1024 * 1024);
      expect(CHUNK_CONFIG.MIN_CHUNK_SIZE).toBe(1024 * 1024);
      expect(CHUNK_CONFIG.MAX_CHUNK_SIZE).toBe(10 * 1024 * 1024);
      expect(CHUNK_CONFIG.MAX_CONCURRENT_UPLOADS).toBe(3);
      expect(CHUNK_CONFIG.MAX_RETRY_ATTEMPTS).toBe(3);
    });
  });

  describe('SUPPORTED_FILE_TYPES 常量', () => {
    test('应该包含所有支持的图像类型', () => {
      expect(SUPPORTED_FILE_TYPES.IMAGES).toContain('image/jpeg');
      expect(SUPPORTED_FILE_TYPES.IMAGES).toContain('image/png');
      expect(SUPPORTED_FILE_TYPES.IMAGES).toContain('image/gif');
      expect(SUPPORTED_FILE_TYPES.IMAGES).toContain('image/webp');
    });

    test('应该包含所有支持的视频类型', () => {
      expect(SUPPORTED_FILE_TYPES.VIDEOS).toContain('video/mp4');
      expect(SUPPORTED_FILE_TYPES.VIDEOS).toContain('video/webm');
      expect(SUPPORTED_FILE_TYPES.VIDEOS).toContain('video/avi');
    });

    test('应该包含所有支持的音频类型', () => {
      expect(SUPPORTED_FILE_TYPES.AUDIO).toContain('audio/mp3');
      expect(SUPPORTED_FILE_TYPES.AUDIO).toContain('audio/wav');
      expect(SUPPORTED_FILE_TYPES.AUDIO).toContain('audio/ogg');
    });
  });

  describe('USER_LEVELS 常量', () => {
    test('应该定义所有用户级别', () => {
      expect(USER_LEVELS.GUEST).toBe('GUEST');
      expect(USER_LEVELS.USER).toBe('USER');
      expect(USER_LEVELS.VIP).toBe('VIP');
      expect(USER_LEVELS.CREATOR).toBe('CREATOR');
      expect(USER_LEVELS.ADMIN).toBe('ADMIN');
      expect(USER_LEVELS.SUPER_ADMIN).toBe('SUPER_ADMIN');
    });
  });

  describe('PERMISSION_LIMITS 常量', () => {
    test('GUEST 用户应该没有上传权限', () => {
      const guestLimits = PERMISSION_LIMITS[USER_LEVELS.GUEST];
      expect(guestLimits.maxFileSize).toBe(0);
      expect(guestLimits.maxFilesPerUpload).toBe(0);
      expect(guestLimits.allowedTypes).toHaveLength(0);
    });

    test('USER 用户应该有基本上传权限', () => {
      const userLimits = PERMISSION_LIMITS[USER_LEVELS.USER];
      expect(userLimits.maxFileSize).toBe(10 * FILE_SIZE.MB);
      expect(userLimits.maxFilesPerUpload).toBe(5);
      expect(userLimits.enableChunkedUpload).toBe(false);
      expect(userLimits.allowedTypes).toEqual(SUPPORTED_FILE_TYPES.IMAGES);
    });

    test('VIP 用户应该有增强权限', () => {
      const vipLimits = PERMISSION_LIMITS[USER_LEVELS.VIP];
      expect(vipLimits.maxFileSize).toBe(50 * FILE_SIZE.MB);
      expect(vipLimits.enableChunkedUpload).toBe(true);
      expect(vipLimits.enableHybridStrategy).toBe(true);
      expect(vipLimits.allowedTypes).toEqual([
        ...SUPPORTED_FILE_TYPES.IMAGES,
        ...SUPPORTED_FILE_TYPES.VIDEOS,
      ]);
    });

    test('CREATOR 用户应该有专业权限', () => {
      const creatorLimits = PERMISSION_LIMITS[USER_LEVELS.CREATOR];
      expect(creatorLimits.maxFileSize).toBe(500 * FILE_SIZE.MB);
      expect(creatorLimits.enableResumableUpload).toBe(true);
      expect(creatorLimits.allowedTypes).toEqual([
        ...SUPPORTED_FILE_TYPES.IMAGES,
        ...SUPPORTED_FILE_TYPES.VIDEOS,
        ...SUPPORTED_FILE_TYPES.AUDIO,
      ]);
    });

    test('ADMIN 用户应该有管理员权限', () => {
      const adminLimits = PERMISSION_LIMITS[USER_LEVELS.ADMIN];
      expect(adminLimits.maxFileSize).toBe(FILE_SIZE.GB);
      expect(adminLimits.maxFilesPerUpload).toBe(500);
    });

    test('SUPER_ADMIN 用户应该有无限权限', () => {
      const superAdminLimits = PERMISSION_LIMITS[USER_LEVELS.SUPER_ADMIN];
      expect(superAdminLimits.maxFileSize).toBe(-1);
      expect(superAdminLimits.maxFilesPerUpload).toBe(-1);
      expect(superAdminLimits.maxDailyUploads).toBe(-1);
    });
  });

  describe('VIDEO_PROCESSING 常量', () => {
    test('应该强制要求H.264编码', () => {
      expect(VIDEO_PROCESSING.REQUIRED_CODEC).toBe('h264');
      expect(VIDEO_PROCESSING.BROWSER_COMPATIBLE_CODECS).toContain('h264');
      expect(VIDEO_PROCESSING.BROWSER_COMPATIBLE_CODECS).toContain('avc1');
    });

    test('应该定义默认视频处理参数', () => {
      expect(VIDEO_PROCESSING.DEFAULT_QUALITY).toBe(23);
      expect(VIDEO_PROCESSING.MAX_RESOLUTION).toBe('1920x1080');
      expect(VIDEO_PROCESSING.DEFAULT_FRAMERATE).toBe(30);
      expect(VIDEO_PROCESSING.OUTPUT_FORMATS).toEqual(['mp4']);
    });
  });

  describe('权限级别递增验证', () => {
    test('用户级别权限应该递增', () => {
      const levels = [
        USER_LEVELS.GUEST,
        USER_LEVELS.USER,
        USER_LEVELS.VIP,
        USER_LEVELS.CREATOR,
        USER_LEVELS.ADMIN,
        USER_LEVELS.SUPER_ADMIN,
      ];

      for (let i = 1; i < levels.length - 1; i++) {
        const currentLevel = levels[i];
        const previousLevel = levels[i - 1];
        
        const currentLimits = PERMISSION_LIMITS[currentLevel];
        const previousLimits = PERMISSION_LIMITS[previousLevel];

        // 文件大小限制应该递增（除了SUPER_ADMIN的-1）
        if (currentLimits.maxFileSize !== -1 && previousLimits.maxFileSize !== -1) {
          expect(currentLimits.maxFileSize).toBeGreaterThan(previousLimits.maxFileSize);
        }

        // 文件数量限制应该递增
        if (currentLimits.maxFilesPerUpload !== -1 && previousLimits.maxFilesPerUpload !== -1) {
          expect(currentLimits.maxFilesPerUpload).toBeGreaterThanOrEqual(previousLimits.maxFilesPerUpload);
        }

        // 允许的文件类型应该递增或相等
        expect(currentLimits.allowedTypes.length).toBeGreaterThanOrEqual(previousLimits.allowedTypes.length);
      }
    });
  });
});
