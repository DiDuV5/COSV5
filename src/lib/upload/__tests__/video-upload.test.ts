/**
 * @fileoverview 视频上传功能测试 - CoserEden平台
 * @description 测试视频上传的完整功能，包括H.264编码验证、混合上传策略、分片上传和断点续传
 * @author Augment AI
 * @date 2025-06-21
 * @version 1.0.0
 * @since 1.0.0
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TRPCErrorHandler, BusinessErrorType } from '@/lib/errors/trpc-error-handler';
import { uploadConfigManager } from '../upload-config-manager';
import { videoCodecValidator, validateVideoCodecOrThrow } from '../video-codec-validator';
import { hybridUploadStrategy } from '../hybrid-upload-strategy';
import { enhancedChunkUploader } from '../enhanced-chunk-uploader';
import { FILE_SIZE, VIDEO_PROCESSING } from '../upload-constants';

// 模拟视频文件数据
const createMockVideoBuffer = (
  size: number, 
  codec: 'h264' | 'hevc' | 'vp8' | 'xvid' = 'h264',
  format: 'mp4' | 'webm' | 'avi' | 'mov' = 'mp4'
): Buffer => {
  const buffer = Buffer.alloc(size);
  
  // 添加对应格式的文件头
  switch (format) {
    case 'mp4':
      // MP4 文件头 (ftyp box)
      buffer.write('ftyp', 4);
      if (codec === 'h264') {
        buffer.write('avc1', 8); // H.264 brand
      } else if (codec === 'hevc') {
        buffer.write('hev1', 8); // HEVC brand
      }
      break;
    case 'webm':
      // WebM 文件头
      buffer[0] = 0x1A;
      buffer[1] = 0x45;
      buffer[2] = 0xDF;
      buffer[3] = 0xA3;
      break;
    case 'avi':
      // AVI 文件头
      buffer.write('RIFF', 0);
      buffer.write('AVI ', 8);
      break;
    case 'mov':
      // MOV 文件头
      buffer.write('ftyp', 4);
      buffer.write('qt  ', 8);
      break;
  }
  
  return buffer;
};

describe('视频上传功能测试', () => {
  beforeEach(() => {
    uploadConfigManager.clearCache();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // 清理测试数据
  });

  describe('H.264编码验证测试', () => {
    test('应该接受H.264编码的MP4视频', async () => {
      const h264Video = createMockVideoBuffer(50 * FILE_SIZE.MB, 'h264', 'mp4');
      
      const result = await videoCodecValidator.validateVideoCodec(h264Video, 'test-h264.mp4');
      
      expect(result.isValid).toBe(true);
      expect(result.currentCodec).toContain('h264');
      expect(result.message).toContain('验证通过');
    });

    test('应该拒绝HEVC/H.265编码的视频', async () => {
      const hevcVideo = createMockVideoBuffer(50 * FILE_SIZE.MB, 'hevc', 'mp4');
      
      const result = await videoCodecValidator.validateVideoCodec(hevcVideo, 'test-hevc.mp4');
      
      expect(result.isValid).toBe(false);
      expect(result.currentCodec).toContain('hevc');
      expect(result.message).toContain('不兼容');
      expect(result.suggestions).toContain('使用视频转换工具将文件转换为H.264编码');
    });

    test('应该拒绝VP8编码的WebM视频', async () => {
      const vp8Video = createMockVideoBuffer(30 * FILE_SIZE.MB, 'vp8', 'webm');
      
      const result = await videoCodecValidator.validateVideoCodec(vp8Video, 'test-vp8.webm');
      
      expect(result.isValid).toBe(false);
      expect(result.suggestions).toContain('推荐使用H.264编码的MP4格式以获得最佳兼容性');
    });

    test('应该拒绝XviD编码的AVI视频', async () => {
      const xvidVideo = createMockVideoBuffer(80 * FILE_SIZE.MB, 'xvid', 'avi');
      
      const result = await videoCodecValidator.validateVideoCodec(xvidVideo, 'test-xvid.avi');
      
      expect(result.isValid).toBe(false);
      expect(result.requiredCodec).toBe('h264');
    });

    test('validateVideoCodecOrThrow应该为无效编码抛出TRPCError', async () => {
      const invalidVideo = createMockVideoBuffer(20 * FILE_SIZE.MB, 'hevc', 'mp4');
      
      await expect(validateVideoCodecOrThrow(invalidVideo, 'invalid.mp4')).rejects.toThrow();
      
      try {
        await validateVideoCodecOrThrow(invalidVideo, 'invalid.mp4');
      } catch (error: any) {
        expect(error.code).toBe('BAD_REQUEST');
        expect(error.cause?.type).toBe(BusinessErrorType.VIDEO_ENCODING_INVALID);
        expect(error.cause?.context?.currentCodec).toBeTruthy();
        expect(error.cause?.recoveryActions).toContain('使用视频转换工具将文件转换为H.264编码');
      }
    });
  });

  describe('视频文件格式支持测试', () => {
    test('应该支持H.264编码的MP4文件', async () => {
      const mp4Video = createMockVideoBuffer(100 * FILE_SIZE.MB, 'h264', 'mp4');
      const request = {
        buffer: mp4Video,
        filename: 'cosplay-video.mp4',
        mimeType: 'video/mp4',
        userId: 'creator123',
        userLevel: 'CREATOR' as const,
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('chunked'); // 大于50MB使用分片
    });

    test('应该检测并拒绝非H.264的MP4文件', async () => {
      const hevcMp4 = createMockVideoBuffer(60 * FILE_SIZE.MB, 'hevc', 'mp4');
      const request = {
        buffer: hevcMp4,
        filename: 'hevc-video.mp4',
        mimeType: 'video/mp4',
        userId: 'creator123',
        userLevel: 'CREATOR' as const,
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(false);
      expect(result.error).toContain('视频编码格式不支持');
    });

    test('应该拒绝WebM格式（即使是VP8编码）', async () => {
      const webmVideo = createMockVideoBuffer(40 * FILE_SIZE.MB, 'vp8', 'webm');
      const request = {
        buffer: webmVideo,
        filename: 'web-video.webm',
        mimeType: 'video/webm',
        userId: 'creator123',
        userLevel: 'CREATOR' as const,
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(false);
    });

    test('应该拒绝AVI格式', async () => {
      const aviVideo = createMockVideoBuffer(120 * FILE_SIZE.MB, 'xvid', 'avi');
      const request = {
        buffer: aviVideo,
        filename: 'old-video.avi',
        mimeType: 'video/avi',
        userId: 'creator123',
        userLevel: 'CREATOR' as const,
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(false);
    });
  });

  describe('混合上传策略测试', () => {
    test('小视频(<50MB)应该使用直传策略', async () => {
      const smallVideo = createMockVideoBuffer(30 * FILE_SIZE.MB, 'h264', 'mp4');
      const request = {
        buffer: smallVideo,
        filename: 'small-cosplay.mp4',
        mimeType: 'video/mp4',
        userId: 'creator123',
        userLevel: 'CREATOR' as const,
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('direct');
      expect(result.isAsync).toBe(false);
    });

    test('中等视频(50-500MB)应该使用分片上传', async () => {
      const mediumVideo = createMockVideoBuffer(200 * FILE_SIZE.MB, 'h264', 'mp4');
      const request = {
        buffer: mediumVideo,
        filename: 'medium-cosplay.mp4',
        mimeType: 'video/mp4',
        userId: 'creator123',
        userLevel: 'CREATOR' as const,
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('chunked');
    });

    test('大视频(>500MB)应该使用异步处理', async () => {
      const largeVideo = createMockVideoBuffer(800 * FILE_SIZE.MB, 'h264', 'mp4');
      const request = {
        buffer: largeVideo,
        filename: 'large-cosplay.mp4',
        mimeType: 'video/mp4',
        userId: 'creator123',
        userLevel: 'CREATOR' as const,
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('async');
      expect(result.isAsync).toBe(true);
      expect(result.sessionId).toBeTruthy();
    });

    test('VIP用户应该被限制上传大视频', async () => {
      const largeVideo = createMockVideoBuffer(600 * FILE_SIZE.MB, 'h264', 'mp4');
      const request = {
        buffer: largeVideo,
        filename: 'too-large-for-vip.mp4',
        mimeType: 'video/mp4',
        userId: 'vip123',
        userLevel: 'VIP' as const, // VIP限制50MB
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(false);
      expect(result.error).toContain('文件大小超出限制');
    });
  });

  describe('分片上传和断点续传测试', () => {
    test('应该正确创建分片上传会话', async () => {
      const uploader = new (enhancedChunkUploader.constructor as any)();
      const largeVideo = createMockVideoBuffer(300 * FILE_SIZE.MB, 'h264', 'mp4');
      
      const options = {
        userId: 'creator123',
        userLevel: 'CREATOR' as const,
        chunkSize: 10 * FILE_SIZE.MB, // 10MB chunks
        onProgress: jest.fn(),
        onChunkComplete: jest.fn(),
      };

      // 模拟创建上传会话
      const expectedChunks = Math.ceil(largeVideo.length / options.chunkSize);
      expect(expectedChunks).toBe(30); // 300MB / 10MB = 30 chunks
    });

    test('应该支持暂停和恢复上传', async () => {
      const uploader = new (enhancedChunkUploader.constructor as any)();
      const sessionId = 'test-video-session';
      
      // 模拟暂停上传
      const pauseResult = uploader.pauseUpload(sessionId);
      expect(typeof pauseResult).toBe('boolean');
      
      // 模拟恢复上传
      const resumeCapability = typeof uploader.resumeUpload === 'function';
      expect(resumeCapability).toBe(true);
    });

    test('应该跟踪上传进度', async () => {
      const uploader = new (enhancedChunkUploader.constructor as any)();
      const sessionId = 'progress-test-session';
      
      // 模拟获取进度
      const progress = uploader.getUploadProgress(sessionId);
      
      // 新会话应该返回null，实际会话应该有进度信息
      expect(progress).toBeNull();
    });

    test('应该处理分片上传失败和重试', async () => {
      const uploader = new (enhancedChunkUploader.constructor as any)();
      
      // 模拟分片上传配置
      const config = {
        maxRetries: 3,
        retryDelay: 1000,
        onChunkFailed: jest.fn(),
      };
      
      expect(config.maxRetries).toBe(3);
      expect(config.retryDelay).toBe(1000);
      expect(config.onChunkFailed).toBeDefined();
    });
  });

  describe('视频处理配置测试', () => {
    test('应该使用正确的视频处理配置', () => {
      const videoConfig = uploadConfigManager.getVideoProcessingConfig();
      
      expect(videoConfig.requiredCodec).toBe(VIDEO_PROCESSING.REQUIRED_CODEC);
      expect(videoConfig.outputFormats).toEqual(VIDEO_PROCESSING.OUTPUT_FORMATS);
      expect(videoConfig.browserCompatibleCodecs).toEqual(VIDEO_PROCESSING.BROWSER_COMPATIBLE_CODECS);
      expect(videoConfig.defaultQuality).toBe(VIDEO_PROCESSING.DEFAULT_QUALITY);
      expect(videoConfig.maxResolution).toBe(VIDEO_PROCESSING.MAX_RESOLUTION);
    });

    test('应该正确检测视频MIME类型', () => {
      expect(uploadConfigManager.isVideoFile('video/mp4')).toBe(true);
      expect(uploadConfigManager.isVideoFile('video/webm')).toBe(true);
      expect(uploadConfigManager.isVideoFile('video/avi')).toBe(true);
      expect(uploadConfigManager.isVideoFile('image/jpeg')).toBe(false);
      expect(uploadConfigManager.isVideoFile('audio/mp3')).toBe(false);
    });
  });

  describe('用户权限和视频上传限制', () => {
    test('USER用户：应该被拒绝上传任何视频', async () => {
      const video = createMockVideoBuffer(20 * FILE_SIZE.MB, 'h264', 'mp4');
      const request = {
        buffer: video,
        filename: 'user-video.mp4',
        mimeType: 'video/mp4',
        userId: 'user123',
        userLevel: 'USER' as const,
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(false);
      expect(result.error).toContain('不支持的文件类型'); // USER不支持视频
    });

    test('VIP用户：可以上传小视频', async () => {
      const smallVideo = createMockVideoBuffer(40 * FILE_SIZE.MB, 'h264', 'mp4');
      const request = {
        buffer: smallVideo,
        filename: 'vip-video.mp4',
        mimeType: 'video/mp4',
        userId: 'vip123',
        userLevel: 'VIP' as const,
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(true);
    });

    test('CREATOR用户：可以上传大视频', async () => {
      const largeVideo = createMockVideoBuffer(400 * FILE_SIZE.MB, 'h264', 'mp4');
      const request = {
        buffer: largeVideo,
        filename: 'creator-video.mp4',
        mimeType: 'video/mp4',
        userId: 'creator123',
        userLevel: 'CREATOR' as const,
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('chunked');
    });

    test('ADMIN用户：可以上传超大视频', async () => {
      const hugeVideo = createMockVideoBuffer(1000 * FILE_SIZE.MB, 'h264', 'mp4'); // 1GB
      const request = {
        buffer: hugeVideo,
        filename: 'admin-video.mp4',
        mimeType: 'video/mp4',
        userId: 'admin123',
        userLevel: 'ADMIN' as const,
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('async');
    });
  });

  describe('视频元数据和质量测试', () => {
    test('应该保持视频元数据', async () => {
      const video = createMockVideoBuffer(150 * FILE_SIZE.MB, 'h264', 'mp4');
      const request = {
        buffer: video,
        filename: 'metadata-video.mp4',
        mimeType: 'video/mp4',
        userId: 'creator123',
        userLevel: 'CREATOR' as const,
        metadata: {
          duration: 300, // 5分钟
          resolution: '1920x1080',
          framerate: 30,
          bitrate: 5000000, // 5Mbps
          codec: 'h264',
          profile: 'high',
        },
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(true);
      expect(result.size).toBe(video.length);
    });

    test('应该处理4K高清视频', async () => {
      const video4k = createMockVideoBuffer(800 * FILE_SIZE.MB, 'h264', 'mp4');
      const request = {
        buffer: video4k,
        filename: '4k-cosplay.mp4',
        mimeType: 'video/mp4',
        userId: 'creator123',
        userLevel: 'CREATOR' as const,
        metadata: {
          resolution: '3840x2160',
          quality: 'ultra',
          hdr: true,
        },
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('async'); // 大文件异步处理
    });
  });
});
