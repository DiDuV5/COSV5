/**
 * @fileoverview 严格文件安全验证器测试 - CoserEden平台
 * @description 测试文件安全验证功能，确保禁止可执行文件和恶意文件类型
 * @author Augment AI
 * @date 2025-06-21
 * @version 1.0.0
 * @since 1.0.0
 */

import { StrictFileSecurityValidator, validateFileStrict } from '../strict-file-security-validator';
import { FORBIDDEN_FILE_TYPES, ALLOWED_FILE_TYPES } from '../file-security-constants';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import type { UserLevel } from '@/types/user-level';

import { auditLogger } from '@/lib/audit-logger';

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

describe('StrictFileSecurityValidator', () => {
  let validator: StrictFileSecurityValidator;

  beforeEach(() => {
    validator = new StrictFileSecurityValidator();
    jest.clearAllMocks();
  });

  describe('基础文件验证', () => {
    test('应该允许安全的图片文件', async () => {
      // 创建一个简单的PNG文件头
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        ...Array(100).fill(0) // 填充数据
      ]);

      const result = await validator.validateFile(
        pngBuffer,
        'test.png',
        'image/png',
        'USER'
      );

      expect(result.isValid).toBe(true);
      expect(result.isSafe).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.riskLevel).toBe('low');
    });

    test('应该允许安全的JPEG文件', async () => {
      // 创建一个简单的JPEG文件头
      const jpegBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, // JPEG signature
        ...Array(100).fill(0) // 填充数据
      ]);

      const result = await validator.validateFile(
        jpegBuffer,
        'photo.jpg',
        'image/jpeg',
        'CREATOR'
      );

      expect(result.isValid).toBe(true);
      expect(result.isSafe).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('应该拒绝可执行文件扩展名', async () => {
      const executableBuffer = Buffer.from('fake executable content');

      const result = await validator.validateFile(
        executableBuffer,
        'malware.exe',
        'application/octet-stream',
        'USER'
      );

      expect(result.isValid).toBe(false);
      expect(result.isSafe).toBe(false);
      expect(result.errors).toContain('禁止的文件扩展名: .exe');
      expect(result.riskLevel).toBe('critical');
    });

    test('应该拒绝服务器脚本文件', async () => {
      const phpBuffer = Buffer.from('<?php echo "hello"; ?>');

      const result = await validator.validateFile(
        phpBuffer,
        'script.php',
        'application/x-php',
        'ADMIN'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('禁止的文件扩展名: .php');
      expect(result.riskLevel).toBe('critical');
    });
  });

  describe('MIME类型验证', () => {
    test('应该拒绝不在白名单中的MIME类型', async () => {
      const buffer = Buffer.from('some content');

      const result = await validator.validateFile(
        buffer,
        'test.unknown',
        'application/unknown',
        'USER'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('MIME类型不在允许列表中: application/unknown');
    });

    test('应该拒绝危险的MIME类型', async () => {
      const buffer = Buffer.from('malicious script');

      const result = await validator.validateFile(
        buffer,
        'script.js',
        'application/javascript',
        'USER'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('检测到危险的MIME类型: application/javascript');
      expect(result.riskLevel).toBe('critical');
    });
  });

  describe('文件大小验证', () => {
    test('普通用户不应该能上传视频文件', async () => {
      const videoBuffer = Buffer.from('fake video content');

      const result = await validator.validateFile(
        videoBuffer,
        'video.mp4',
        'video/mp4',
        'USER'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('您的用户级别(USER)不允许上传此类文件');
      expect(result.riskLevel).toBe('high');
    });

    test('创作者应该能上传适当大小的视频文件', async () => {
      // 创建一个小的MP4文件头
      const mp4Buffer = Buffer.from([
        0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, // MP4 signature
        ...Array(100).fill(0) // 填充数据
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

    test('应该拒绝超出大小限制的文件', async () => {
      // 创建一个超大的缓冲区（模拟大文件）
      const largeBuffer = Buffer.alloc(100 * 1024 * 1024); // 100MB
      largeBuffer.fill(0xFF, 0, 4); // JPEG header

      const result = await validator.validateFile(
        largeBuffer,
        'huge.jpg',
        'image/jpeg',
        'USER'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('文件大小超出限制'))).toBe(true);
      expect(result.riskLevel).toBe('high'); // 因为MIME类型不匹配也会提升风险等级
    });
  });

  describe('文件名安全检查', () => {
    test('应该拒绝包含路径遍历的文件名', async () => {
      const buffer = Buffer.from('content');

      const result = await validator.validateFile(
        buffer,
        '../../../etc/passwd',
        'image/jpeg',
        'USER'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('文件名包含路径遍历字符，存在安全风险');
      expect(result.riskLevel).toBe('critical');
    });

    test('应该拒绝过长的文件名', async () => {
      const buffer = Buffer.from('content');
      const longFileName = 'a'.repeat(300) + '.jpg';

      const result = await validator.validateFile(
        buffer,
        longFileName,
        'image/jpeg',
        'USER'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('文件名过长，最大允许255个字符');
      expect(result.riskLevel).toBe('high'); // 因为MIME类型不匹配也会提升风险等级
    });
  });

  describe('双扩展名攻击检测', () => {
    test('应该检测双扩展名攻击', async () => {
      const buffer = Buffer.from('malicious content');

      const result = await validator.validateFile(
        buffer,
        'image.jpg.exe',
        'application/octet-stream',
        'USER'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('检测到双扩展名攻击: image.jpg.exe');
      expect(result.riskLevel).toBe('critical');
    });
  });

  describe('恶意内容检测', () => {
    test('应该检测可执行文件特征', async () => {
      // 创建包含PE文件头的缓冲区
      const peBuffer = Buffer.from([
        0x4D, 0x5A, // MZ header (PE file)
        ...Array(100).fill(0)
      ]);

      const result = await validator.validateFile(
        peBuffer,
        'fake.jpg',
        'image/jpeg',
        'USER'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('检测到可执行文件特征: fake.jpg');
      expect(result.riskLevel).toBe('critical');
    });

    test('应该检测脚本内容', async () => {
      const scriptBuffer = Buffer.from('<script>alert("xss")</script>');

      const result = await validator.validateFile(
        scriptBuffer,
        'test.txt',
        'text/plain',
        'USER'
      );

      expect(result.warnings).toContain('检测到可疑的脚本内容');
    });
  });

  describe('文件头验证', () => {
    test('应该验证JPEG文件头', async () => {
      // 错误的文件头，但声明为JPEG
      const fakeJpegBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, // PNG header
        ...Array(100).fill(0)
      ]);

      const result = await validator.validateFile(
        fakeJpegBuffer,
        'fake.jpg',
        'image/jpeg',
        'USER'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('文件头与声明的MIME类型不匹配: image/jpeg');
      expect(result.riskLevel).toBe('high');
    });
  });

  describe('严格模式检查', () => {
    test('应该拒绝空文件', async () => {
      const emptyBuffer = Buffer.alloc(0);

      const result = await validator.validateFile(
        emptyBuffer,
        'empty.jpg',
        'image/jpeg',
        'USER',
        { strictMode: true }
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('文件为空');
      expect(result.riskLevel).toBe('high'); // 因为MIME类型不匹配也会提升风险等级
    });

    test('应该警告过小的文件', async () => {
      const tinyBuffer = Buffer.from([1, 2, 3]);

      const result = await validator.validateFile(
        tinyBuffer,
        'tiny.jpg',
        'image/jpeg',
        'USER',
        { strictMode: true }
      );

      expect(result.warnings).toContain('文件过小，可能存在问题');
    });
  });

  describe('便捷验证函数', () => {
    test('validateFileStrict应该抛出错误当throwOnError为true', async () => {
      const executableBuffer = Buffer.from('fake executable');

      await expect(
        validateFileStrict(
          executableBuffer,
          'malware.exe',
          'application/octet-stream',
          'USER',
          { throwOnError: true }
        )
      ).rejects.toThrow();
    });

    test('validateFileStrict应该记录违规日志当logViolations为true', async () => {
      const executableBuffer = Buffer.from('fake executable');

      await validateFileStrict(
        executableBuffer,
        'malware.exe',
        'application/octet-stream',
        'USER',
        {
          logViolations: true,
          userId: 'test-user',
          throwOnError: false
        }
      );

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user',
          eventType: 'SUSPICIOUS_ACTIVITY',
          message: expect.stringContaining('文件安全验证失败'),
        })
      );
    });
  });

  describe('用户权限级别测试', () => {
    const testCases: Array<{
      userLevel: UserLevel;
      fileType: string;
      mimeType: string;
      shouldAllow: boolean;
    }> = [
      { userLevel: 'USER', fileType: 'image.jpg', mimeType: 'image/jpeg', shouldAllow: true },
      { userLevel: 'USER', fileType: 'video.mp4', mimeType: 'video/mp4', shouldAllow: false },
      { userLevel: 'VIP', fileType: 'video.mp4', mimeType: 'video/mp4', shouldAllow: true },
      { userLevel: 'CREATOR', fileType: 'large-video.mp4', mimeType: 'video/mp4', shouldAllow: true },
      { userLevel: 'ADMIN', fileType: 'document.pdf', mimeType: 'application/pdf', shouldAllow: true },
    ];

    testCases.forEach(({ userLevel, fileType, mimeType, shouldAllow }) => {
      test(`${userLevel}用户${shouldAllow ? '应该' : '不应该'}能上传${fileType}`, async () => {
        const buffer = Buffer.alloc(1024); // 1KB file

        // 根据MIME类型设置适当的文件头
        if (mimeType === 'image/jpeg') {
          buffer[0] = 0xFF;
          buffer[1] = 0xD8;
          buffer[2] = 0xFF; // 完整的JPEG头
        } else if (mimeType === 'image/png') {
          buffer[0] = 0x89;
          buffer[1] = 0x50;
          buffer[2] = 0x4E;
          buffer[3] = 0x47;
          buffer[4] = 0x0D;
          buffer[5] = 0x0A;
          buffer[6] = 0x1A;
          buffer[7] = 0x0A;
        } else if (mimeType === 'video/mp4') {
          // MP4文件头：前4字节是大小，然后是'ftyp'
          buffer[0] = 0x00;
          buffer[1] = 0x00;
          buffer[2] = 0x00;
          buffer[3] = 0x18;
          buffer.write('ftyp', 4);
        } else if (mimeType === 'application/pdf') {
          buffer.write('%PDF', 0);
        }

        const result = await validator.validateFile(
          buffer,
          fileType,
          mimeType,
          userLevel
        );



        if (shouldAllow) {
          expect(result.isValid).toBe(true);
          expect(result.isSafe).toBe(true);
        } else {
          expect(result.isValid).toBe(false);
        }
      });
    });
  });

  describe('错误处理', () => {
    test('应该处理验证过程中的异常', async () => {
      // 模拟验证过程中的错误
      const originalValidateFileHeaders = (validator as any).fileHeaderValidator.validateFileHeaders;
      (validator as any).fileHeaderValidator.validateFileHeaders = jest.fn().mockImplementation(() => {
        throw new Error('Validation error');
      });

      const buffer = Buffer.from('test content');
      const result = await validator.validateFile(
        buffer,
        'test.jpg',
        'image/jpeg',
        'USER'
      );

      expect(result.isValid).toBe(false);
      expect(result.isSafe).toBe(false);
      expect(result.riskLevel).toBe('critical');
      expect(result.errors).toContain('安全验证过程中发生错误: Validation error');

      // 恢复原始方法
      (validator as any).fileHeaderValidator.validateFileHeaders = originalValidateFileHeaders;
    });
  });

  describe('安全配置常量测试', () => {
    test('禁止的文件扩展名应该包含所有危险类型', () => {
      const allForbidden = [
        ...FORBIDDEN_FILE_TYPES.SERVER_SCRIPTS,
        ...FORBIDDEN_FILE_TYPES.EXECUTABLES,
        ...FORBIDDEN_FILE_TYPES.SYSTEM_CONFIG,
        ...FORBIDDEN_FILE_TYPES.DANGEROUS_IN_ARCHIVES,
      ];

      // 检查关键的危险扩展名
      expect(allForbidden).toContain('.exe');
      expect(allForbidden).toContain('.php');
      expect(allForbidden).toContain('.bat');
      expect(allForbidden).toContain('.sh');
      expect(allForbidden).toContain('.js');
      expect(allForbidden).toContain('.vbs');
      expect(allForbidden).toContain('.sql');
      expect(allForbidden).toContain('.htaccess');
    });

    test('允许的文件类型应该只包含安全类型', () => {
      const allAllowed = [
        ...ALLOWED_FILE_TYPES.IMAGES,
        ...ALLOWED_FILE_TYPES.VIDEOS,
        ...ALLOWED_FILE_TYPES.DOCUMENTS,
        ...ALLOWED_FILE_TYPES.ARCHIVES,
      ];

      // 检查安全的MIME类型
      expect(allAllowed).toContain('image/jpeg');
      expect(allAllowed).toContain('image/png');
      expect(allAllowed).toContain('video/mp4');
      expect(allAllowed).toContain('application/pdf');

      // 确保不包含危险类型
      expect(allAllowed).not.toContain('application/x-executable');
      expect(allAllowed).not.toContain('application/javascript');
      expect(allAllowed).not.toContain('text/x-php');
    });
  });
});
