/**
 * @fileoverview VideoThumbnailGenerator 测试
 * @description 测试视频缩略图生成器的功能
 */

import { VideoThumbnailGenerator } from '../VideoThumbnailGenerator';
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// Mock storage manager
const mockStorageManager = {
  uploadFile: jest.fn().mockResolvedValue({
    url: 'https://cdn.cosv5.com/test-thumbnail.jpg',
    cdnUrl: 'https://cdn.cosv5.com/test-thumbnail.jpg',
    key: 'test_thumbnail.jpg',
    size: 1024,
    etag: 'test-etag',
  }),
};

const mockGetStorageManager = jest.fn().mockResolvedValue(mockStorageManager);

describe('VideoThumbnailGenerator', () => {
  let generator: VideoThumbnailGenerator;
  let tempDir: string;
  let testVideoPath: string;

  beforeAll(async () => {
    tempDir = path.join(process.cwd(), 'temp', 'test-video-thumbnails');

    // 确保临时目录存在
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    generator = new VideoThumbnailGenerator(tempDir, mockGetStorageManager);

    // 创建一个测试视频文件（实际上是一个空文件，用于测试）
    testVideoPath = path.join(tempDir, 'test-video.mp4');
    await writeFile(testVideoPath, Buffer.from('fake video content'));
  });

  afterAll(async () => {
    // 清理测试文件
    try {
      await unlink(testVideoPath);
    } catch (error) {
      // 忽略清理错误
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateVideoThumbnail', () => {
    it('应该正确调用storageManager.uploadFile', async () => {
      const options = {
        originalStorageKey: 'videos/test-video.mp4',
        duration: 60,
        width: 600,
        seekTime: 10,
      };

      // Mock FFmpeg 生成缩略图的过程
      const originalGenerateThumbnailWithFFmpeg = (generator as any).generateThumbnailWithFFmpeg;
      (generator as any).generateThumbnailWithFFmpeg = jest.fn().mockResolvedValue(undefined);

      // Mock 文件读取
      const mockThumbnailBuffer = Buffer.from('fake thumbnail data');
      jest.doMock('fs', () => ({
        promises: {
          readFile: jest.fn().mockResolvedValue(mockThumbnailBuffer),
        },
      }));

      try {
        const result = await generator.generateVideoThumbnail(testVideoPath, options);

        // 验证结果
        expect(result).toBe('https://cdn.cosv5.com/test-thumbnail.jpg');

        // 验证 getStorageManager 被调用
        expect(mockGetStorageManager).toHaveBeenCalledTimes(1);

        // 验证 uploadFile 被正确调用
        expect(mockStorageManager.uploadFile).toHaveBeenCalledTimes(1);
        expect(mockStorageManager.uploadFile).toHaveBeenCalledWith({
          key: 'videos/test-video_thumbnail.jpg',
          buffer: expect.any(Buffer),
          contentType: 'image/jpeg',
          size: expect.any(Number),
          metadata: {
            type: 'video-thumbnail',
            originalKey: 'videos/test-video.mp4',
            seekTime: '10',
            width: '600',
            generatedAt: expect.any(String),
          },
        });
      } finally {
        // 恢复原始方法
        (generator as any).generateThumbnailWithFFmpeg = originalGenerateThumbnailWithFFmpeg;
      }
    });

    it('应该处理storageManager初始化失败', async () => {
      const failingGetStorageManager = jest.fn().mockRejectedValue(new Error('Storage manager initialization failed'));
      const failingGenerator = new VideoThumbnailGenerator(tempDir, failingGetStorageManager);

      // Mock FFmpeg 生成缩略图的过程
      (failingGenerator as any).generateThumbnailWithFFmpeg = jest.fn().mockResolvedValue(undefined);

      const options = {
        originalStorageKey: 'videos/test-video.mp4',
        duration: 60,
      };

      await expect(failingGenerator.generateVideoThumbnail(testVideoPath, options))
        .rejects
        .toThrow('视频缩略图生成失败');
    }, 15000);

    it('应该正确处理metadata中的数值转换', async () => {
      const options = {
        originalStorageKey: 'videos/test-video.mp4',
        duration: 120.5,
        width: 800,
        seekTime: 30.25,
      };

      // Mock FFmpeg 和文件读取
      (generator as any).generateThumbnailWithFFmpeg = jest.fn().mockResolvedValue(undefined);
      const mockThumbnailBuffer = Buffer.from('fake thumbnail data');

      // 重新导入fs模块的mock
      jest.doMock('fs', () => ({
        promises: {
          readFile: jest.fn().mockResolvedValue(mockThumbnailBuffer),
        },
      }));

      await generator.generateVideoThumbnail(testVideoPath, options);

      // 验证metadata中的数值被正确转换为字符串
      const uploadCall = mockStorageManager.uploadFile.mock.calls[0][0];
      expect(uploadCall.metadata.seekTime).toBe('30.25');
      expect(uploadCall.metadata.width).toBe('800');
      expect(typeof uploadCall.metadata.seekTime).toBe('string');
      expect(typeof uploadCall.metadata.width).toBe('string');
    });
  });

  describe('checkThumbnailCapability', () => {
    it('应该检查FFmpeg缩略图生成能力', async () => {
      const capability = await generator.checkThumbnailCapability();
      expect(typeof capability).toBe('boolean');
    }, 15000);
  });

  describe('estimateThumbnailTime', () => {
    it('应该估算缩略图生成时间', () => {
      const time1 = generator.estimateThumbnailTime(60);
      const time2 = generator.estimateThumbnailTime(120, 2);

      expect(time1).toBeGreaterThan(0);
      expect(time2).toBeGreaterThan(time1);
    });
  });
});
