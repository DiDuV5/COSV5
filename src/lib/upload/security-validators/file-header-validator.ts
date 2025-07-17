/**
 * @fileoverview 文件头验证器
 * @description 通过文件头魔数验证文件真实类型
 */

import type { FileValidationResult, FileHeaderValidationResult } from '../types/validation-types';

/**
 * 文件头验证器类
 */
export class FileHeaderValidator {
  /**
   * 验证文件头魔数
   */
  public validateFileHeaders(
    buffer: Buffer,
    expectedMimeType: string,
    result: FileValidationResult
  ): void {
    const headerResult = this.detectFileTypeByHeader(buffer);

    if (!headerResult.isValid) {
      result.warnings.push('无法通过文件头确定文件类型');
      this.updateRiskLevel(result, 'medium');
      return;
    }

    // 检查检测到的类型与期望类型是否匹配
    if (headerResult.detectedType && headerResult.detectedType !== expectedMimeType) {
      // 某些情况下允许类型不完全匹配
      if (!this.isAcceptableTypeMismatch(headerResult.detectedType, expectedMimeType)) {
        result.warnings.push(
          `文件头检测类型与声明类型不匹配: ${headerResult.detectedType} vs ${expectedMimeType}`
        );
        this.updateRiskLevel(result, 'medium');
      }
    }

    // 存储检测到的类型
    if (headerResult.detectedType) {
      result.detectedType = headerResult.detectedType;
    }
  }

  /**
   * 通过文件头检测文件类型
   */
  public detectFileTypeByHeader(buffer: Buffer): FileHeaderValidationResult {
    if (buffer.length < 4) {
      return {
        isValid: false,
        confidence: 0,
        message: '文件太小，无法检测文件头'
      };
    }

    // 定义文件签名
    const signatures = [
      // 图片文件
      { signature: [0xFF, 0xD8, 0xFF], mimeType: 'image/jpeg', name: 'JPEG' },
      { signature: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], mimeType: 'image/png', name: 'PNG' },
      { signature: [0x47, 0x49, 0x46, 0x38], mimeType: 'image/gif', name: 'GIF' },
      { signature: [0x52, 0x49, 0x46, 0x46], mimeType: 'image/webp', name: 'WebP', additionalCheck: (buf: Buffer) => buf.toString('ascii', 8, 12) === 'WEBP' },
      { signature: [0x42, 0x4D], mimeType: 'image/bmp', name: 'BMP' },
      { signature: [0x49, 0x49, 0x2A, 0x00], mimeType: 'image/tiff', name: 'TIFF (little endian)' },
      { signature: [0x4D, 0x4D, 0x00, 0x2A], mimeType: 'image/tiff', name: 'TIFF (big endian)' },

      // 视频文件 - MP4文件头检查（更灵活的检查方式）
      {
        signature: [], // 空签名，使用自定义检查
        mimeType: 'video/mp4',
        name: 'MP4',
        additionalCheck: (buf: Buffer) => {
          // MP4文件头检查：第5-8字节应该是 'ftyp'
          if (buf.length < 12) return false;
          const ftypSignature = buf.toString('ascii', 4, 8);
          if (ftypSignature !== 'ftyp') return false;

          // 检查品牌标识（第9-12字节）
          const brand = buf.toString('ascii', 8, 12);
          const validBrands = ['mp41', 'mp42', 'isom', 'avc1', 'dash', 'iso2', 'iso4', 'iso5', 'iso6', 'mmp4'];
          return validBrands.includes(brand);
        }
      },
      { signature: [0x52, 0x49, 0x46, 0x46], mimeType: 'video/avi', name: 'AVI', additionalCheck: (buf: Buffer) => buf.toString('ascii', 8, 12) === 'AVI ' },
      { signature: [0x1A, 0x45, 0xDF, 0xA3], mimeType: 'video/webm', name: 'WebM/MKV' },

      // 音频文件
      { signature: [0xFF, 0xFB], mimeType: 'audio/mpeg', name: 'MP3' },
      { signature: [0xFF, 0xF3], mimeType: 'audio/mpeg', name: 'MP3' },
      { signature: [0xFF, 0xF2], mimeType: 'audio/mpeg', name: 'MP3' },
      { signature: [0x52, 0x49, 0x46, 0x46], mimeType: 'audio/wav', name: 'WAV', additionalCheck: (buf: Buffer) => buf.toString('ascii', 8, 12) === 'WAVE' },
      { signature: [0x4F, 0x67, 0x67, 0x53], mimeType: 'audio/ogg', name: 'OGG' },

      // 文档文件
      { signature: [0x25, 0x50, 0x44, 0x46], mimeType: 'application/pdf', name: 'PDF' },
      { signature: [0x50, 0x4B, 0x03, 0x04], mimeType: 'application/zip', name: 'ZIP/Office' },
      { signature: [0x50, 0x4B, 0x05, 0x06], mimeType: 'application/zip', name: 'ZIP (empty)' },
      { signature: [0x50, 0x4B, 0x07, 0x08], mimeType: 'application/zip', name: 'ZIP (spanned)' },
      { signature: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], mimeType: 'application/msword', name: 'MS Office (old)' },

      // 压缩文件
      { signature: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x00], mimeType: 'application/x-rar-compressed', name: 'RAR' },
      { signature: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C], mimeType: 'application/x-7z-compressed', name: '7Z' },
      { signature: [0x1F, 0x8B], mimeType: 'application/gzip', name: 'GZIP' },
    ];

    // 检查每个签名
    for (const sig of signatures) {
      // 如果签名为空，只执行额外检查
      if (sig.signature.length === 0) {
        if (sig.additionalCheck && sig.additionalCheck(buffer)) {
          return {
            isValid: true,
            detectedType: sig.mimeType,
            confidence: 0.9,
            message: `检测到 ${sig.name} 文件`
          };
        }
        continue;
      }

      // 正常的签名匹配
      if (this.matchesSignature(buffer, sig.signature)) {
        // 如果有额外检查，执行额外检查
        if (sig.additionalCheck && !sig.additionalCheck(buffer)) {
          continue;
        }

        return {
          isValid: true,
          detectedType: sig.mimeType,
          confidence: 0.9,
          message: `检测到 ${sig.name} 文件`
        };
      }
    }

    // 如果没有匹配的签名，尝试文本文件检测
    if (this.isTextFile(buffer)) {
      return {
        isValid: true,
        detectedType: 'text/plain',
        confidence: 0.7,
        message: '检测到文本文件'
      };
    }

    return {
      isValid: false,
      confidence: 0,
      message: '无法识别的文件类型'
    };
  }

  /**
   * 检查签名是否匹配
   */
  private matchesSignature(buffer: Buffer, signature: number[]): boolean {
    if (buffer.length < signature.length) {
      return false;
    }

    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * 检查是否为文本文件
   */
  private isTextFile(buffer: Buffer): boolean {
    // 检查前1024字节是否都是可打印字符
    const sampleSize = Math.min(buffer.length, 1024);
    let textBytes = 0;

    for (let i = 0; i < sampleSize; i++) {
      const byte = buffer[i];
      // 可打印ASCII字符 (32-126) 或常见控制字符 (9, 10, 13)
      if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
        textBytes++;
      }
    }

    // 如果95%以上是文本字符，认为是文本文件
    return (textBytes / sampleSize) > 0.95;
  }

  /**
   * 检查类型不匹配是否可接受
   */
  private isAcceptableTypeMismatch(detectedType: string, expectedType: string): boolean {
    // 定义可接受的类型映射
    const acceptableMismatches: Record<string, string[]> = {
      'image/jpeg': ['image/jpg'],
      'image/jpg': ['image/jpeg'],
      'application/zip': [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ],
      'video/mp4': ['video/quicktime'],
      'audio/mpeg': ['audio/mp3']
    };

    const acceptable = acceptableMismatches[detectedType];
    return acceptable ? acceptable.includes(expectedType) : false;
  }

  /**
   * 更新风险等级
   */
  private updateRiskLevel(
    result: FileValidationResult,
    newLevel: 'low' | 'medium' | 'high' | 'critical'
  ): void {
    const levels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(result.riskLevel);
    const newIndex = levels.indexOf(newLevel);

    if (newIndex > currentIndex) {
      result.riskLevel = newLevel;
    }
  }
}
