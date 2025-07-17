/**
 * @fileoverview 文档处理器
 * @description 专门处理文档文件的上传、验证和存储
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { BaseProcessor } from './base-processor';
import {
  UploadType,
  ProcessingStatus,
  type UnifiedUploadRequest,
} from '../core/index';

/**
 * 文档处理器类
 */
export class DocumentProcessor extends BaseProcessor {
  readonly processorName = 'DocumentProcessor';
  readonly supportedTypes = [UploadType.DOCUMENT];

  // 支持的文档格式
  private readonly supportedFormats = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/rtf',
  ];

  // 文件大小限制（50MB）
  private readonly maxFileSize = 50 * 1024 * 1024;

  /**
   * 特定文件验证
   */
  protected async validateSpecificFile(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<boolean> {
    // 检查MIME类型
    if (!this.supportedFormats.includes(mimeType)) {
      throw TRPCErrorHandler.validationError(
        `不支持的文档格式: ${mimeType}。支持的格式: ${this.supportedFormats.join(', ')}`
      );
    }

    // 检查文件大小
    if (buffer.length > this.maxFileSize) {
      throw TRPCErrorHandler.validationError(
        `文档文件过大: ${Math.round(buffer.length / 1024 / 1024)}MB。最大支持: ${Math.round(this.maxFileSize / 1024 / 1024)}MB`
      );
    }

    // 检查文件头部签名
    const isValidFormat = this.validateFileSignature(buffer, mimeType);
    if (!isValidFormat) {
      throw TRPCErrorHandler.validationError('文档文件格式验证失败，可能文件已损坏');
    }

    console.log(`📄 文档验证通过: ${filename} (${Math.round(buffer.length / 1024)}KB)`);
    return true;
  }

  /**
   * 预处理文件
   */
  protected async preprocessFile(request: UnifiedUploadRequest): Promise<{
    buffer: Buffer;
    metadata?: Record<string, any>;
  }> {
    // 文档文件通常不需要预处理，直接返回原始数据
    const metadata = {
      originalSize: request.buffer.length,
      mimeType: request.mimeType,
      encoding: this.detectEncoding(request.buffer, request.mimeType),
      pageCount: await this.estimatePageCount(request.buffer, request.mimeType),
    };

    console.log(`📝 文档预处理完成: ${request.filename}`);

    return {
      buffer: request.buffer,
      metadata,
    };
  }

  /**
   * 后处理文件
   */
  protected async postProcessFile(
    request: UnifiedUploadRequest,
    uploadResult: any
  ): Promise<{
    isProcessed: boolean;
    processingStatus: ProcessingStatus;
    metadata?: Record<string, any>;
    processedAt?: Date;
  }> {
    try {
      // 提取文档信息
      const documentInfo = await this.extractDocumentInfo(request.buffer, request.mimeType);

      return {
        isProcessed: true,
        processingStatus: ProcessingStatus.COMPLETED,
        metadata: {
          ...documentInfo,
          fileType: 'document',
          isSearchable: this.isSearchableFormat(request.mimeType),
          securityLevel: this.assessSecurityLevel(request.buffer, request.mimeType),
        },
        processedAt: new Date(),
      };

    } catch (error) {
      console.error('文档后处理失败:', error);

      return {
        isProcessed: false,
        processingStatus: ProcessingStatus.FAILED,
        metadata: {
          error: error instanceof Error ? error.message : '未知错误',
        },
        processedAt: new Date(),
      };
    }
  }

  /**
   * 验证文件签名
   */
  private validateFileSignature(buffer: Buffer, mimeType: string): boolean {
    if (buffer.length < 8) return false;

    const header = buffer.subarray(0, 8);

    switch (mimeType) {
      case 'application/pdf':
        return header.toString('ascii', 0, 4) === '%PDF';

      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/vnd.ms-excel':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'application/vnd.ms-powerpoint':
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        // Office文档通常以PK开头（ZIP格式）或者是OLE格式
        return header[0] === 0x50 && header[1] === 0x4B || // PK (ZIP)
               header[0] === 0xD0 && header[1] === 0xCF; // OLE

      case 'text/plain':
      case 'text/csv':
        // 文本文件，检查是否包含有效的文本字符
        return this.isValidTextFile(buffer);

      case 'application/rtf':
        return header.toString('ascii', 0, 5) === '{\\rtf';

      default:
        return true; // 其他格式暂时通过
    }
  }

  /**
   * 检查是否为有效的文本文件
   */
  private isValidTextFile(buffer: Buffer): boolean {
    // 检查前1KB内容是否为有效文本
    const sampleSize = Math.min(1024, buffer.length);
    const sample = buffer.subarray(0, sampleSize);

    // 计算非文本字符的比例
    let nonTextChars = 0;
    for (let i = 0; i < sample.length; i++) {
      const byte = sample[i];
      // 检查是否为控制字符（除了常见的换行、制表符等）
      if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
        nonTextChars++;
      }
    }

    // 如果非文本字符超过5%，认为不是有效的文本文件
    return (nonTextChars / sample.length) < 0.05;
  }

  /**
   * 检测文件编码
   */
  private detectEncoding(buffer: Buffer, mimeType: string): string {
    if (!mimeType.startsWith('text/')) {
      return 'binary';
    }

    // 简单的编码检测
    const sample = buffer.subarray(0, Math.min(1024, buffer.length));

    // 检查BOM
    if (sample.length >= 3 && sample[0] === 0xEF && sample[1] === 0xBB && sample[2] === 0xBF) {
      return 'utf-8-bom';
    }

    if (sample.length >= 2 && sample[0] === 0xFF && sample[1] === 0xFE) {
      return 'utf-16le';
    }

    if (sample.length >= 2 && sample[0] === 0xFE && sample[1] === 0xFF) {
      return 'utf-16be';
    }

    // 尝试解析为UTF-8
    try {
      sample.toString('utf8');
      return 'utf-8';
    } catch {
      return 'ascii';
    }
  }

  /**
   * 估算页数
   */
  private async estimatePageCount(buffer: Buffer, mimeType: string): Promise<number> {
    // 简单的页数估算
    switch (mimeType) {
      case 'application/pdf':
        // PDF页数估算（简化版）
        const pdfText = buffer.toString('binary');
        const pageMatches = pdfText.match(/\/Count\s+(\d+)/g);
        if (pageMatches && pageMatches.length > 0) {
          const lastMatch = pageMatches[pageMatches.length - 1];
          const count = parseInt(lastMatch.match(/\d+/)?.[0] || '1');
          return Math.max(1, count);
        }
        return 1;

      case 'text/plain':
        // 文本文件按行数估算页数（每页50行）
        const lines = buffer.toString('utf8').split('\n').length;
        return Math.max(1, Math.ceil(lines / 50));

      default:
        return 1;
    }
  }

  /**
   * 提取文档信息
   */
  private async extractDocumentInfo(buffer: Buffer, mimeType: string): Promise<Record<string, any>> {
    const info: Record<string, any> = {
      mimeType,
      size: buffer.length,
      createdAt: new Date(),
    };

    // 根据文件类型提取特定信息
    switch (mimeType) {
      case 'application/pdf':
        info.type = 'PDF文档';
        info.pageCount = await this.estimatePageCount(buffer, mimeType);
        break;

      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        info.type = 'Word文档';
        break;

      case 'application/vnd.ms-excel':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        info.type = 'Excel表格';
        break;

      case 'application/vnd.ms-powerpoint':
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        info.type = 'PowerPoint演示文稿';
        break;

      case 'text/plain':
        info.type = '纯文本文档';
        info.encoding = this.detectEncoding(buffer, mimeType);
        info.lineCount = buffer.toString('utf8').split('\n').length;
        break;

      case 'text/csv':
        info.type = 'CSV数据文件';
        info.encoding = this.detectEncoding(buffer, mimeType);
        break;

      default:
        info.type = '文档文件';
    }

    return info;
  }

  /**
   * 检查是否为可搜索格式
   */
  private isSearchableFormat(mimeType: string): boolean {
    const searchableFormats = [
      'text/plain',
      'text/csv',
      'application/rtf',
    ];
    return searchableFormats.includes(mimeType);
  }

  /**
   * 评估安全级别
   */
  private assessSecurityLevel(buffer: Buffer, mimeType: string): string {
    // 简单的安全级别评估
    if (mimeType.startsWith('text/')) {
      return 'low'; // 文本文件安全性较高
    }

    if (mimeType === 'application/pdf') {
      return 'medium'; // PDF可能包含脚本
    }

    if (mimeType.includes('office') || mimeType.includes('ms-')) {
      return 'high'; // Office文档可能包含宏
    }

    return 'medium';
  }

  /**
   * 估算处理时间
   */
  public override estimateProcessingTime(fileSize: number): number {
    // 文档处理相对简单：每MB需要20ms
    return Math.max(200, Math.round(fileSize / 1024 / 1024 * 20));
  }
}
