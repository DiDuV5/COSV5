/**
 * @fileoverview 上传验证器
 * @description 提供上传请求验证和文件分析功能
 * @author Augment AI
 * @date 2025-07-03
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import crypto from 'crypto';
import {
  UploadType,
  getUploadTypeFromMimeType,
  type FileAnalysis,
  type UnifiedUploadRequest
} from '../index';

/**
 * 上传验证器类
 */
export class UploadValidators {

  /**
   * 验证上传请求
   */
  static validateRequest(request: UnifiedUploadRequest): void {
    if (!request.filename) {
      throw TRPCErrorHandler.validationError('文件名不能为空');
    }

    if (!request.buffer || request.buffer.length === 0) {
      throw TRPCErrorHandler.validationError('文件内容不能为空');
    }

    if (!request.mimeType) {
      throw TRPCErrorHandler.validationError('文件类型不能为空');
    }

    // 验证文件大小限制
    this.validateFileSize(request);

    // 验证文件类型
    this.validateFileType(request);

    // 验证文件名格式
    this.validateFilename(request.filename);
  }

  /**
   * 验证文件大小
   */
  private static validateFileSize(request: UnifiedUploadRequest): void {
    const fileSize = request.buffer.length;
    const maxSize = this.getMaxFileSize(request.mimeType);

    if (fileSize > maxSize) {
      const sizeMB = Math.round(fileSize / 1024 / 1024);
      const maxSizeMB = Math.round(maxSize / 1024 / 1024);
      throw TRPCErrorHandler.validationError(
        `文件大小超出限制: ${sizeMB}MB，最大允许: ${maxSizeMB}MB`
      );
    }

    if (fileSize < 100) { // 100字节最小限制
      throw TRPCErrorHandler.validationError('文件大小过小，可能是损坏的文件');
    }
  }

  /**
   * 获取最大文件大小限制
   */
  private static getMaxFileSize(mimeType: string): number {
    const uploadType = getUploadTypeFromMimeType(mimeType);

    switch (uploadType) {
      case UploadType.IMAGE:
      case UploadType.AVATAR:
        return 50 * 1024 * 1024; // 50MB
      case UploadType.VIDEO:
        return 2 * 1024 * 1024 * 1024; // 2GB
      case UploadType.DOCUMENT:
        return 100 * 1024 * 1024; // 100MB
      default:
        return 10 * 1024 * 1024; // 10MB
    }
  }

  /**
   * 验证文件类型
   */
  private static validateFileType(request: UnifiedUploadRequest): void {
    const uploadType = getUploadTypeFromMimeType(request.mimeType);

    if (!uploadType) {
      throw TRPCErrorHandler.validationError(`不支持的文件类型: ${request.mimeType}`);
    }

    // 验证MIME类型与文件扩展名是否匹配
    const extension = this.getFileExtension(request.filename);
    if (!this.isMimeTypeMatchingExtension(request.mimeType, extension)) {
      throw TRPCErrorHandler.validationError(
        `文件类型与扩展名不匹配: ${request.mimeType} vs .${extension}`
      );
    }
  }

  /**
   * 验证文件名格式
   */
  private static validateFilename(filename: string): void {
    // 检查文件名长度
    if (filename.length > 255) {
      throw TRPCErrorHandler.validationError('文件名过长，最大255个字符');
    }

    // 检查非法字符
    const illegalChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (illegalChars.test(filename)) {
      throw TRPCErrorHandler.validationError('文件名包含非法字符');
    }

    // 检查是否有文件扩展名
    if (!filename.includes('.')) {
      throw TRPCErrorHandler.validationError('文件名必须包含扩展名');
    }
  }

  /**
   * 分析文件
   */
  static analyzeFile(request: UnifiedUploadRequest): FileAnalysis {
    const uploadType = getUploadTypeFromMimeType(request.mimeType);
    const fileSize = request.buffer.length;
    const securityCheck = this.performSecurityCheck(request);

    return {
      filename: request.filename,
      mimeType: request.mimeType,
      size: fileSize,
      uploadType,
      isSafe: securityCheck.isSafe,
      securityIssues: securityCheck.threats,
      needsProcessing: true,
      processingRequirements: this.getProcessingRequirements(uploadType, request),
      recommendedStrategy: this.getRecommendedStrategy(fileSize),
      strategyReason: this.getStrategyReason(fileSize),
      estimatedProcessingTime: this.estimateProcessingTime(uploadType, fileSize),
      estimatedStorageSize: fileSize
    };
  }

  /**
   * 获取文件扩展名
   */
  private static getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * 检查MIME类型与扩展名是否匹配
   */
  private static isMimeTypeMatchingExtension(mimeType: string, extension: string): boolean {
    const mimeExtensionMap: Record<string, string[]> = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/gif': ['gif'],
      'image/webp': ['webp'],
      'video/mp4': ['mp4'],
      'video/webm': ['webm'],
      'video/quicktime': ['mov'],
      'application/pdf': ['pdf'],
      'text/plain': ['txt'],
      'application/msword': ['doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx']
    };

    const expectedExtensions = mimeExtensionMap[mimeType];
    return expectedExtensions ? expectedExtensions.includes(extension) : true;
  }

  /**
   * 提取文件元数据
   */
  private static extractMetadata(request: UnifiedUploadRequest): Record<string, any> {
    const metadata: Record<string, any> = {
      originalSize: request.buffer.length,
      uploadedAt: new Date().toISOString(),
      checksum: this.calculateChecksum(request.buffer)
    };

    // 根据文件类型提取特定元数据
    const uploadType = getUploadTypeFromMimeType(request.mimeType);

    if (uploadType === UploadType.IMAGE || uploadType === UploadType.AVATAR) {
      metadata.imageMetadata = this.extractImageMetadata(request.buffer);
    } else if (uploadType === UploadType.VIDEO) {
      metadata.videoMetadata = this.extractVideoMetadata(request.buffer);
    }

    return metadata;
  }

  /**
   * 计算文件校验和
   */
  private static calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  /**
   * 提取图片元数据
   */
  private static extractImageMetadata(buffer: Buffer): Record<string, any> {
    // 简单的图片信息提取
    const metadata: Record<string, any> = {};

    try {
      // 检查图片格式
      if (buffer.subarray(0, 4).toString('hex') === '89504e47') {
        metadata.format = 'PNG';
      } else if (buffer.subarray(0, 2).toString('hex') === 'ffd8') {
        metadata.format = 'JPEG';
      } else if (buffer.subarray(0, 6).toString() === 'GIF87a' || buffer.subarray(0, 6).toString() === 'GIF89a') {
        metadata.format = 'GIF';
      }
    } catch (error) {
      console.warn('图片元数据提取失败:', error);
    }

    return metadata;
  }

  /**
   * 提取视频元数据
   */
  private static extractVideoMetadata(buffer: Buffer): Record<string, any> {
    // 简单的视频信息提取
    const metadata: Record<string, any> = {};

    try {
      // 检查视频格式
      if (buffer.subarray(4, 12).toString() === 'ftypmp4') {
        metadata.format = 'MP4';
      } else if (buffer.subarray(0, 4).toString('hex') === '1a45dfa3') {
        metadata.format = 'WebM';
      }
    } catch (error) {
      console.warn('视频元数据提取失败:', error);
    }

    return metadata;
  }

  /**
   * 执行安全检查
   */
  private static performSecurityCheck(request: UnifiedUploadRequest): {
    isSafe: boolean;
    threats: string[];
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const threats: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // 检查文件头是否与MIME类型匹配
    if (!this.validateFileHeader(request.buffer, request.mimeType)) {
      threats.push('文件头与MIME类型不匹配');
      riskLevel = 'medium';
    }

    // 检查可疑的文件内容
    if (this.containsSuspiciousContent(request.buffer)) {
      threats.push('包含可疑内容');
      riskLevel = 'high';
    }

    // 检查文件大小异常
    if (this.isFileSizeAnomalous(request.buffer, request.mimeType)) {
      threats.push('文件大小异常');
      riskLevel = 'medium';
    }

    return {
      isSafe: threats.length === 0,
      threats,
      riskLevel
    };
  }

  /**
   * 验证文件头
   */
  private static validateFileHeader(buffer: Buffer, mimeType: string): boolean {
    const header = buffer.subarray(0, 20); // 增加到20字节以便更好地检查MP4

    // 简单的文件头验证
    switch (mimeType) {
      case 'image/jpeg':
        return header.subarray(0, 2).toString('hex') === 'ffd8';
      case 'image/png':
        return header.subarray(0, 4).toString('hex') === '89504e47';
      case 'image/gif':
        const gifHeader = header.subarray(0, 6).toString();
        return gifHeader === 'GIF87a' || gifHeader === 'GIF89a';
      case 'video/mp4':
        // MP4文件头检查：第5-8字节应该是 "ftyp"
        const ftypSignature = header.subarray(4, 8).toString();
        if (ftypSignature !== 'ftyp') {
          return false;
        }
        // 检查品牌标识（第9-12字节），常见的有 mp41, mp42, isom, avc1, dash 等
        const brand = header.subarray(8, 12).toString();
        const validBrands = ['mp41', 'mp42', 'isom', 'avc1', 'dash', 'iso2', 'iso4', 'iso5', 'iso6', 'mmp4'];
        return validBrands.includes(brand);
      case 'video/webm':
        // WebM文件头：1A 45 DF A3
        return header.subarray(0, 4).toString('hex') === '1a45dfa3';
      case 'video/quicktime':
        // QuickTime文件头：第5-8字节是 "ftyp" 或者前4字节包含 "moov", "mdat", "free" 等
        const qtSignature = header.subarray(4, 8).toString();
        return qtSignature === 'ftyp' || qtSignature === 'moov' || qtSignature === 'mdat' || qtSignature === 'free';
      default:
        return true; // 对于未知类型，暂时通过
    }
  }

  /**
   * 检查可疑内容
   */
  private static containsSuspiciousContent(buffer: Buffer): boolean {
    const content = buffer.toString('utf8', 0, Math.min(1024, buffer.length));

    // 检查脚本标签
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(content));
  }

  /**
   * 检查文件大小是否异常
   */
  private static isFileSizeAnomalous(buffer: Buffer, mimeType: string): boolean {
    const fileSize = buffer.length;

    // 根据文件类型设置最小大小限制
    const minSizeLimits: Record<string, number> = {
      'image/jpeg': 200,    // JPEG最小约200字节
      'image/png': 67,      // PNG最小约67字节
      'image/gif': 43,      // GIF最小约43字节
      'image/webp': 26,     // WebP最小约26字节
      'video/mp4': 1024,    // MP4最小约1KB
      'video/webm': 512,    // WebM最小约512字节
      'video/quicktime': 1024, // QuickTime最小约1KB
    };

    const minSize = minSizeLimits[mimeType] || 50; // 默认最小50字节

    // 检查是否过小（可能是恶意文件或损坏文件）
    if (fileSize < minSize) {
      return true;
    }

    // 检查是否与类型不符
    if (mimeType.startsWith('image/') && fileSize > 50 * 1024 * 1024) {
      return true; // 图片超过50MB可能异常
    }

    if (mimeType.startsWith('video/') && fileSize > 2 * 1024 * 1024 * 1024) {
      return true; // 视频超过2GB可能异常
    }

    return false;
  }

  /**
   * 估算处理时间
   */
  private static estimateProcessingTime(uploadType: UploadType, fileSize: number): number {
    const baseTimes = {
      [UploadType.IMAGE]: 500,
      [UploadType.AVATAR]: 300,
      [UploadType.VIDEO]: 2000,
      [UploadType.DOCUMENT]: 200,
      [UploadType.AUDIO]: 100
    };

    const baseTime = baseTimes[uploadType as keyof typeof baseTimes] || 100;
    const sizeMultiplier = Math.max(1, fileSize / (1024 * 1024)); // 每MB增加处理时间

    return Math.round(baseTime * sizeMultiplier);
  }

  /**
   * 获取处理需求
   */
  private static getProcessingRequirements(uploadType: UploadType, request: UnifiedUploadRequest): string[] {
    const requirements: string[] = [];

    if (uploadType === UploadType.IMAGE || uploadType === UploadType.AVATAR) {
      requirements.push('图片处理');
      if (request.generateThumbnails !== false) requirements.push('缩略图生成');
    }

    if (uploadType === UploadType.VIDEO) {
      requirements.push('视频处理');
      requirements.push('编码验证');
    }

    if (uploadType === UploadType.DOCUMENT) {
      requirements.push('文档处理');
    }

    return requirements;
  }

  /**
   * 获取推荐策略
   */
  private static getRecommendedStrategy(fileSize: number): any {
    if (fileSize > 200 * 1024 * 1024) return 'MEMORY_SAFE';
    if (fileSize > 50 * 1024 * 1024) return 'STREAM';
    return 'DIRECT';
  }

  /**
   * 获取策略原因
   */
  private static getStrategyReason(fileSize: number): string {
    const sizeMB = Math.round(fileSize / 1024 / 1024);

    if (fileSize > 200 * 1024 * 1024) {
      return `文件过大(${sizeMB}MB)，使用内存安全策略`;
    }
    if (fileSize > 50 * 1024 * 1024) {
      return `文件较大(${sizeMB}MB)，使用流式上传`;
    }
    return `文件较小(${sizeMB}MB)，使用直接上传`;
  }
}
