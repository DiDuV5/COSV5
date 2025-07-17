/**
 * @fileoverview 文件处理器
 * @description 处理文件的删除、归档和压缩操作
 * @author Augment AI
 * @date 2025-06-27
 * @version 1.0.0
 * @since 1.0.0
 */

import { StorageManager } from '../object-storage/storage-manager';
import type { FileInfo } from '../object-storage/base-storage-provider';
import type {
  CleanupRule,
  CleanupResult,
  ArchiveConfig,
  FileProcessingOptions
} from './lifecycle-types';

/**
 * 文件处理器
 */
export class FileProcessor {
  private storageManager: StorageManager;
  private archiveConfig: ArchiveConfig | null = null;

  constructor(storageManager: StorageManager) {
    this.storageManager = storageManager;
  }

  /**
   * 设置归档配置
   */
  public setArchiveConfig(config: ArchiveConfig): void {
    this.archiveConfig = config;
  }

  /**
   * 处理单个文件
   */
  public async processFile(
    file: FileInfo,
    rule: CleanupRule,
    result: CleanupResult
  ): Promise<void> {
    try {
      switch (rule.action) {
        case 'delete':
          await this.deleteFile(file);
          result.deletedFiles++;
          result.freedSpace += BigInt(file.size);
          break;

        case 'archive':
          await this.archiveFile(file);
          result.archivedFiles++;
          break;

        case 'compress':
          await this.compressFile(file);
          result.compressedFiles++;
          break;

        default:
          throw new Error(`Unknown action: ${rule.action}`);
      }

      result.processedFiles++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Failed to process ${file.key}: ${errorMessage}`);
      console.error(`Failed to process file ${file.key}:`, error);
    }
  }

  /**
   * 批量处理文件
   */
  public async processFiles(
    files: FileInfo[],
    rule: CleanupRule,
    options: FileProcessingOptions = {}
  ): Promise<CleanupResult> {
    const result: CleanupResult = {
      ruleName: rule.name,
      scannedFiles: files.length,
      processedFiles: 0,
      deletedFiles: 0,
      archivedFiles: 0,
      compressedFiles: 0,
      freedSpace: BigInt(0),
      startTime: new Date(),
      endTime: new Date(),
      errors: []
    };

    const {
      parallel = false,
      concurrency = 5,
      skipErrors = true,
      onProgress,
      onError
    } = options;

    try {
      if (parallel) {
        await this.processFilesParallel(files, rule, result, concurrency, onProgress, onError);
      } else {
        await this.processFilesSequential(files, rule, result, onProgress, onError);
      }
    } catch (error) {
      if (!skipErrors) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Batch processing failed: ${errorMessage}`);
    }

    result.endTime = new Date();
    return result;
  }

  /**
   * 顺序处理文件
   */
  private async processFilesSequential(
    files: FileInfo[],
    rule: CleanupRule,
    result: CleanupResult,
    onProgress?: (processed: number, total: number) => void,
    onError?: (error: Error, file: string) => void
  ): Promise<void> {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await this.processFile(file, rule, result);
      } catch (error) {
        if (onError) {
          onError(error as Error, file.key);
        }
      }

      if (onProgress) {
        onProgress(i + 1, files.length);
      }
    }
  }

  /**
   * 并行处理文件
   */
  private async processFilesParallel(
    files: FileInfo[],
    rule: CleanupRule,
    result: CleanupResult,
    concurrency: number,
    onProgress?: (processed: number, total: number) => void,
    onError?: (error: Error, file: string) => void
  ): Promise<void> {
    let processed = 0;
    const chunks = this.chunkArray(files, concurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(async (file) => {
        try {
          await this.processFile(file, rule, result);
        } catch (error) {
          if (onError) {
            onError(error as Error, file.key);
          }
        }
        processed++;
        if (onProgress) {
          onProgress(processed, files.length);
        }
      });

      await Promise.all(promises);
    }
  }

  /**
   * 删除文件
   */
  private async deleteFile(file: FileInfo): Promise<void> {
    await this.storageManager.deleteFile(file.key);
    console.log(`🗑️ Deleted file: ${file.key}`);
  }

  /**
   * 归档文件
   */
  private async archiveFile(file: FileInfo): Promise<void> {
    if (!this.archiveConfig) {
      throw new Error('Archive configuration not set');
    }

    // 下载原文件
    const downloadResult = await this.storageManager.downloadFile(file.key);

    // 生成归档路径
    const archivePath = this.generateArchivePath(file.key);

    let fileBuffer = downloadResult.buffer;

    // 如果需要压缩
    if (this.archiveConfig.compress) {
      fileBuffer = await this.compressBuffer(fileBuffer, this.archiveConfig.compressionFormat);
    }

    // 上传到归档位置
    await this.storageManager.uploadFile({
      key: archivePath,
      buffer: fileBuffer,
      size: fileBuffer.length,
      contentType: downloadResult.contentType || 'application/octet-stream',
      metadata: {
        originalPath: file.key,
        archivedAt: new Date().toISOString(),
        compressed: this.archiveConfig.compress.toString()
      }
    });

    // 如果配置为删除原文件
    if (this.archiveConfig.deleteOriginal) {
      await this.deleteFile(file);
    }

    console.log(`📦 Archived file: ${file.key} -> ${archivePath}`);
  }

  /**
   * 压缩文件
   */
  private async compressFile(file: FileInfo): Promise<void> {
    // 下载原文件
    const downloadResult = await this.storageManager.downloadFile(file.key);

    // 压缩文件
    const compressedBuffer = await this.compressBuffer(downloadResult.buffer, 'gzip');

    // 生成压缩文件路径
    const compressedPath = `${file.key}.gz`;

    // 上传压缩文件
    await this.storageManager.uploadFile({
      key: compressedPath,
      buffer: compressedBuffer,
      size: compressedBuffer.length,
      contentType: 'application/gzip',
      metadata: {
        originalPath: file.key,
        compressedAt: new Date().toISOString(),
        originalSize: downloadResult.buffer.length.toString(),
        compressedSize: compressedBuffer.length.toString()
      }
    });

    // 删除原文件
    await this.deleteFile(file);

    console.log(`🗜️ Compressed file: ${file.key} -> ${compressedPath}`);
  }

  /**
   * 压缩缓冲区
   */
  private async compressBuffer(
    buffer: Buffer,
    format: 'gzip' | 'brotli' | 'deflate' = 'gzip'
  ): Promise<Buffer> {
    const zlib = await import('zlib');
    const { promisify } = await import('util');

    switch (format) {
      case 'gzip':
        const gzip = promisify(zlib.gzip);
        return await gzip(buffer);

      case 'brotli':
        const brotliCompress = promisify(zlib.brotliCompress);
        return await brotliCompress(buffer);

      case 'deflate':
        const deflate = promisify(zlib.deflate);
        return await deflate(buffer);

      default:
        throw new Error(`Unsupported compression format: ${format}`);
    }
  }

  /**
   * 生成归档路径
   */
  private generateArchivePath(originalPath: string): string {
    if (!this.archiveConfig) {
      throw new Error('Archive configuration not set');
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const datePath = `${year}/${month}/${day}`;
    const fileName = originalPath.split('/').pop() || 'unknown';

    return `${this.archiveConfig.pathPrefix}/${datePath}/${fileName}`;
  }

  /**
   * 将数组分块
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 获取处理统计信息
   */
  public getProcessingStats(results: CleanupResult[]): {
    totalRules: number;
    totalProcessedFiles: number;
    totalDeletedFiles: number;
    totalArchivedFiles: number;
    totalCompressedFiles: number;
    totalFreedSpace: number;
    totalErrors: number;
    averageProcessingTime: number;
  } {
    const totalRules = results.length;
    const totalProcessedFiles = results.reduce((sum, r) => sum + r.processedFiles, 0);
    const totalDeletedFiles = results.reduce((sum, r) => sum + r.deletedFiles, 0);
    const totalArchivedFiles = results.reduce((sum, r) => sum + r.archivedFiles, 0);
    const totalCompressedFiles = results.reduce((sum, r) => sum + r.compressedFiles, 0);
    const totalFreedSpace = results.reduce((sum, r) => sum + Number(r.freedSpace), 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    const totalProcessingTime = results.reduce((sum, r) =>
      sum + (r.endTime.getTime() - r.startTime.getTime()), 0
    );
    const averageProcessingTime = totalRules > 0 ? totalProcessingTime / totalRules : 0;

    return {
      totalRules,
      totalProcessedFiles,
      totalDeletedFiles,
      totalArchivedFiles,
      totalCompressedFiles,
      totalFreedSpace,
      totalErrors,
      averageProcessingTime
    };
  }
}

/**
 * 导出单例实例工厂
 */
export function createFileProcessor(storageManager: StorageManager): FileProcessor {
  return new FileProcessor(storageManager);
}
