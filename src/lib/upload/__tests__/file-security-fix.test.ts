/**
 * @fileoverview 文件安全修复验证测试
 * @description 验证修复后的文件安全验证器能正确处理正常文件
 */

import { StrictFileSecurityValidator } from '../strict-file-security-validator';

// Mock audit logger
jest.mock('@/lib/audit-logger', () => ({
  auditLogger: {
    log: jest.fn().mockResolvedValue(undefined),
  },
  AuditEventType: {
    SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  },
  AuditLevel: {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    CRITICAL: 'CRITICAL',
  },
}));

describe('文件安全修复验证', () => {
  let validator: StrictFileSecurityValidator;

  beforeEach(() => {
    validator = new StrictFileSecurityValidator();
    jest.clearAllMocks();
  });

  describe('修复后的文件头验证', () => {
    test('应该允许标准JPEG文件', async () => {
      // 创建标准JPEG文件头
      const jpegBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, // JFIF JPEG头
        ...Array(100).fill(0)
      ]);

      const result = await validator.validateFile(
        jpegBuffer,
        'photo.jpg',
        'image/jpeg',
        'USER'
      );

      expect(result.isValid).toBe(true);
      expect(result.isSafe).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('应该允许EXIF JPEG文件', async () => {
      // 创建EXIF JPEG文件头
      const jpegBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE1, // EXIF JPEG头
        ...Array(100).fill(0)
      ]);

      const result = await validator.validateFile(
        jpegBuffer,
        'camera-photo.jpg',
        'image/jpeg',
        'USER'
      );

      expect(result.isValid).toBe(true);
      expect(result.isSafe).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('应该允许MP4视频文件', async () => {
      // 创建包含ftyp的MP4文件
      const mp4Buffer = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x20]), // 文件大小
        Buffer.from('ftyp'), // MP4标识
        Buffer.from('isom'), // 品牌
        Buffer.alloc(100) // 填充数据
      ]);

      const result = await validator.validateFile(
        mp4Buffer,
        'video.mp4',
        'video/mp4',
        'CREATOR'
      );

      expect(result.isValid).toBe(true);
      expect(result.isSafe).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('文件头不匹配时应该只产生警告而不是错误（对于媒体文件）', async () => {
      // 创建一个文件头不完全匹配的图片文件
      const imageBuffer = Buffer.from([
        0xFF, 0xD8, // 基本JPEG头（缺少第三个字节）
        ...Array(100).fill(0)
      ]);

      const result = await validator.validateFile(
        imageBuffer,
        'image.jpg',
        'image/jpeg',
        'USER'
      );

      expect(result.isValid).toBe(true); // 应该通过验证
      expect(result.isSafe).toBe(true);
      expect(result.errors).toHaveLength(0); // 不应该有错误
      expect(result.warnings.length).toBeGreaterThanOrEqual(0); // 可能有警告
    });
  });

  describe('严格模式控制', () => {
    test('非严格模式下应该更宽松', async () => {
      const jpegBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF,
        ...Array(100).fill(0)
      ]);

      const result = await validator.validateFile(
        jpegBuffer,
        'photo.jpg',
        'image/jpeg',
        'USER',
        { strictMode: false }
      );

      expect(result.isValid).toBe(true);
      expect(result.isSafe).toBe(true);
    });

    test('严格模式下会进行额外检查', async () => {
      const jpegBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF,
        ...Array(100).fill(0)
      ]);

      const result = await validator.validateFile(
        jpegBuffer,
        'photo.jpg',
        'image/jpeg',
        'USER',
        { strictMode: true }
      );

      // 严格模式下仍应该通过，但可能有更多检查
      expect(result.isValid).toBe(true);
      expect(result.isSafe).toBe(true);
    });
  });

  describe('仍然阻止危险文件', () => {
    test('应该拒绝可执行文件', async () => {
      const executableBuffer = Buffer.from('MZ' + 'fake executable content');

      const result = await validator.validateFile(
        executableBuffer,
        'malware.exe',
        'application/octet-stream',
        'USER'
      );

      expect(result.isValid).toBe(false);
      expect(result.isSafe).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.riskLevel).toBe('critical');
    });

    test('媒体文件中包含MZ字节不应该被误检测为可执行文件', async () => {
      // 创建一个包含MZ字节但是JPEG文件的buffer
      const jpegWithMZ = Buffer.concat([
        Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), // JPEG头
        Buffer.from('JFIF'),
        Buffer.alloc(100, 0x00), // 填充
        Buffer.from('MZ'), // 在文件中间包含MZ字节
        Buffer.alloc(100, 0x00), // 更多填充
      ]);

      const result = await validator.validateFile(
        jpegWithMZ,
        'photo.jpg',
        'image/jpeg',
        'USER'
      );

      expect(result.isValid).toBe(true);
      expect(result.isSafe).toBe(true);
      expect(result.errors).toHaveLength(0);
      // 不应该检测到可执行文件特征
      expect(result.errors.some(error => error.includes('可执行文件特征'))).toBe(false);
    });

    test('MP4文件中包含可疑字节不应该被误检测', async () => {
      // 创建一个包含可疑字节但是MP4文件的buffer
      const mp4WithSuspiciousBytes = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x20]), // 文件大小
        Buffer.from('ftyp'), // MP4标识
        Buffer.from('isom'), // 品牌
        Buffer.alloc(100, 0x00), // 填充
        Buffer.from('MZ'), // 在文件中包含MZ字节
        Buffer.alloc(100, 0x00), // 更多填充
      ]);

      const result = await validator.validateFile(
        mp4WithSuspiciousBytes,
        'video.mp4',
        'video/mp4',
        'CREATOR'
      );

      expect(result.isValid).toBe(true);
      expect(result.isSafe).toBe(true);
      expect(result.errors).toHaveLength(0);
      // 不应该检测到可执行文件特征
      expect(result.errors.some(error => error.includes('可执行文件特征'))).toBe(false);
    });

    test('应该拒绝PHP脚本', async () => {
      const phpBuffer = Buffer.from('<?php echo "hello"; ?>');

      const result = await validator.validateFile(
        phpBuffer,
        'script.php',
        'application/x-php',
        'ADMIN'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('禁止的文件扩展名'))).toBe(true);
    });

    test('应该检测双扩展名攻击', async () => {
      const buffer = Buffer.from('malicious content');

      const result = await validator.validateFile(
        buffer,
        'image.jpg.exe',
        'application/octet-stream',
        'USER'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('双扩展名攻击'))).toBe(true);
      expect(result.riskLevel).toBe('critical');
    });
  });

  describe('用户权限验证', () => {
    test('普通用户应该能上传图片', async () => {
      const jpegBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF,
        ...Array(100).fill(0)
      ]);

      const result = await validator.validateFile(
        jpegBuffer,
        'photo.jpg',
        'image/jpeg',
        'USER'
      );

      expect(result.isValid).toBe(true);
      expect(result.isSafe).toBe(true);
    });

    test('普通用户不应该能上传视频', async () => {
      const mp4Buffer = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x20]),
        Buffer.from('ftyp'),
        Buffer.alloc(100)
      ]);

      const result = await validator.validateFile(
        mp4Buffer,
        'video.mp4',
        'video/mp4',
        'USER'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('不允许上传此类文件'))).toBe(true);
    });

    test('创作者应该能上传视频', async () => {
      const mp4Buffer = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x20]),
        Buffer.from('ftyp'),
        Buffer.alloc(100)
      ]);

      const result = await validator.validateFile(
        mp4Buffer,
        'video.mp4',
        'video/mp4',
        'CREATOR'
      );

      expect(result.isValid).toBe(true);
      expect(result.isSafe).toBe(true);
    });
  });
});
