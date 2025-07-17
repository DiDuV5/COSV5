/**
 * @fileoverview 文件清理器 - CoserEden平台
 * @description 处理文件存储相关的清理操作
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
  AbortMultipartUploadCommand,
  ListMultipartUploadsCommand
} from '@aws-sdk/client-s3';
import {
  CleanupTaskType,
  type CleanupStats,
  type FileCleanupOptions,
  type OrphanFileInfo,
  type IFileCleanup,
  type CleanupContext,
} from './cleanup-types';

/**
 * 文件清理器类
 * 负责处理文件存储相关的清理操作
 */
export class FileCleanup extends EventEmitter implements IFileCleanup {
  private s3Client: S3Client;
  private prisma: any;
  private bucketName: string;

  constructor(context: CleanupContext) {
    super();
    this.s3Client = context.s3Client;
    this.prisma = context.prisma;
    this.bucketName = context.config.storage.bucketName;
  }

  /**
   * 清理孤儿文件
   */
  public async cleanupOrphanFiles(options?: FileCleanupOptions): Promise<CleanupStats> {
    const startTime = Date.now();
    const stats: CleanupStats = {
      taskType: CleanupTaskType.ORPHAN_FILES,
      processedCount: 0,
      cleanedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      executionTimeMs: 0,
      errors: [],
    };

    try {
      console.log('🔍 开始检测孤儿文件');
      this.emit('taskStarted', { taskType: CleanupTaskType.ORPHAN_FILES });

      // 获取R2中的所有文件
      const r2Files = await this.listAllR2Files();
      stats.processedCount = r2Files.length;

      // 获取数据库中的所有存储键
      const dbStorageKeys = await this.prisma.postMedia.findMany({
        select: { storageKey: true },
      });

      const dbKeys = new Set(dbStorageKeys.map((item: any) => item.storageKey).filter(Boolean));

      // 检测孤儿文件
      const orphanFiles = r2Files.filter(file => !dbKeys.has(file.Key!));

      for (const orphanFile of orphanFiles) {
        try {
          // 记录孤儿文件
          await this.recordOrphanFile(orphanFile);

          // 检查文件是否超过保留期
          const retentionDays = options?.retentionDays || 7;
          const fileAge = Date.now() - (orphanFile.LastModified?.getTime() || 0);
          const retentionPeriod = retentionDays * 24 * 60 * 60 * 1000;

          if (fileAge > retentionPeriod) {
            // 检查是否受保护
            const isProtected = await this.isFileProtected(orphanFile.Key!);

            if (!isProtected || options?.includeProtected) {
              if (!options?.dryRun) {
                // 删除孤儿文件
                await this.deleteFile(orphanFile.Key!);

                // 更新孤儿文件状态
                await this.updateOrphanFileStatus(orphanFile.Key!, 'CLEANED');
              }

              stats.cleanedCount++;
              console.log(`✅ ${options?.dryRun ? '[DRY RUN] ' : ''}清理孤儿文件: ${orphanFile.Key}`);
            } else {
              stats.skippedCount++;
              console.log(`⏭️ 跳过受保护文件: ${orphanFile.Key}`);
            }
          } else {
            stats.skippedCount++;
          }

        } catch (error) {
          stats.failedCount++;
          stats.errors.push(`文件${orphanFile.Key}: ${error instanceof Error ? error.message : '未知错误'}`);
          console.error(`❌ 处理孤儿文件失败: ${orphanFile.Key}`, error);
        }
      }

      stats.executionTimeMs = Date.now() - startTime;
      console.log(`✅ 孤儿文件检测完成: 检测${orphanFiles.length}个，清理${stats.cleanedCount}个`);
      this.emit('taskCompleted', { taskType: CleanupTaskType.ORPHAN_FILES, stats });

    } catch (error) {
      stats.executionTimeMs = Date.now() - startTime;
      stats.errors.push(error instanceof Error ? error.message : '未知错误');
      console.error('❌ 孤儿文件检测失败:', error);
      this.emit('taskFailed', { taskType: CleanupTaskType.ORPHAN_FILES, error });
    }

    return stats;
  }

  /**
   * 清理临时文件
   */
  public async cleanupTempFiles(options?: FileCleanupOptions): Promise<CleanupStats> {
    const startTime = Date.now();
    const stats: CleanupStats = {
      taskType: CleanupTaskType.TEMP_FILES,
      processedCount: 0,
      cleanedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      executionTimeMs: 0,
      errors: [],
    };

    try {
      console.log('🧹 开始清理临时文件');
      this.emit('taskStarted', { taskType: CleanupTaskType.TEMP_FILES });

      const retentionDays = options?.retentionDays || 30;
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      // 获取临时文件模式
      const tempPatterns = options?.filePatterns || [
        'temp/',
        'thumbnails/',
        'processing/',
        'cache/',
      ];

      for (const pattern of tempPatterns) {
        const files = await this.listFilesByPattern(pattern);
        stats.processedCount += files.length;

        for (const file of files) {
          try {
            if (file.LastModified && file.LastModified < cutoffDate) {
              if (!options?.dryRun) {
                await this.deleteFile(file.Key!);
              }

              stats.cleanedCount++;
              console.log(`✅ ${options?.dryRun ? '[DRY RUN] ' : ''}清理临时文件: ${file.Key}`);
            } else {
              stats.skippedCount++;
            }
          } catch (error) {
            stats.failedCount++;
            stats.errors.push(`文件${file.Key}: ${error instanceof Error ? error.message : '未知错误'}`);
          }
        }
      }

      stats.executionTimeMs = Date.now() - startTime;
      console.log(`✅ 临时文件清理完成: 处理${stats.processedCount}个，清理${stats.cleanedCount}个`);
      this.emit('taskCompleted', { taskType: CleanupTaskType.TEMP_FILES, stats });

    } catch (error) {
      stats.executionTimeMs = Date.now() - startTime;
      stats.errors.push(error instanceof Error ? error.message : '未知错误');
      console.error('❌ 清理临时文件失败:', error);
      this.emit('taskFailed', { taskType: CleanupTaskType.TEMP_FILES, error });
    }

    return stats;
  }

  /**
   * 清理未完成的多部分上传
   */
  public async cleanupIncompleteUploads(options?: FileCleanupOptions): Promise<CleanupStats> {
    const startTime = Date.now();
    const stats: CleanupStats = {
      taskType: CleanupTaskType.INCOMPLETE_UPLOADS,
      processedCount: 0,
      cleanedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      executionTimeMs: 0,
      errors: [],
    };

    try {
      console.log('🧹 开始清理未完成的多部分上传');
      this.emit('taskStarted', { taskType: CleanupTaskType.INCOMPLETE_UPLOADS });

      // 获取未完成的多部分上传
      const command = new ListMultipartUploadsCommand({
        Bucket: this.bucketName,
      });

      const response = await this.s3Client.send(command);
      const incompleteUploads = response.Uploads || [];
      stats.processedCount = incompleteUploads.length;

      const maxAgeHours = 24; // 24小时
      const maxAge = maxAgeHours * 60 * 60 * 1000;

      for (const upload of incompleteUploads) {
        try {
          // 检查上传是否超过指定时间
          const uploadAge = Date.now() - (upload.Initiated?.getTime() || 0);

          if (uploadAge > maxAge) {
            if (!options?.dryRun) {
              // 中止多部分上传
              const abortCommand = new AbortMultipartUploadCommand({
                Bucket: this.bucketName,
                Key: upload.Key!,
                UploadId: upload.UploadId!,
              });

              await this.s3Client.send(abortCommand);
            }

            stats.cleanedCount++;
            console.log(`✅ ${options?.dryRun ? '[DRY RUN] ' : ''}中止过期的多部分上传: ${upload.Key} (${upload.UploadId})`);
          } else {
            stats.skippedCount++;
          }

        } catch (error) {
          stats.failedCount++;
          stats.errors.push(`上传${upload.Key}: ${error instanceof Error ? error.message : '未知错误'}`);
          console.error(`❌ 中止多部分上传失败: ${upload.Key}`, error);
        }
      }

      stats.executionTimeMs = Date.now() - startTime;
      console.log(`✅ 未完成上传清理完成: 处理${stats.processedCount}个，清理${stats.cleanedCount}个`);
      this.emit('taskCompleted', { taskType: CleanupTaskType.INCOMPLETE_UPLOADS, stats });

    } catch (error) {
      stats.executionTimeMs = Date.now() - startTime;
      stats.errors.push(error instanceof Error ? error.message : '未知错误');
      console.error('❌ 清理未完成上传失败:', error);
      this.emit('taskFailed', { taskType: CleanupTaskType.INCOMPLETE_UPLOADS, error });
    }

    return stats;
  }

  /**
   * 列出孤儿文件
   */
  public async listOrphanFiles(): Promise<OrphanFileInfo[]> {
    const r2Files = await this.listAllR2Files();
    const dbStorageKeys = await this.prisma.postMedia.findMany({
      select: { storageKey: true },
    });

    const dbKeys = new Set(dbStorageKeys.map((item: any) => item.storageKey).filter(Boolean));
    const orphanFiles = r2Files.filter(file => !dbKeys.has(file.Key!));

    return orphanFiles.map(file => ({
      key: file.Key!,
      size: file.Size || 0,
      lastModified: file.LastModified || new Date(),
      isProtected: false, // 需要实际检查
      retentionExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }));
  }

  /**
   * 删除文件
   */
  public async deleteFile(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.emit('fileDeleted', { key });
      return true;
    } catch (error) {
      console.error(`删除文件失败: ${key}`, error);
      this.emit('errorOccurred', { operation: 'deleteFile', key, error });
      return false;
    }
  }

  /**
   * 检查文件是否受保护
   */
  public async isFileProtected(key: string): Promise<boolean> {
    try {
      // 检查是否在保护列表中
      const protectedFile = await this.prisma.protectedFile.findUnique({
        where: { storageKey: key },
      });

      return !!protectedFile;
    } catch (error) {
      console.error(`检查文件保护状态失败: ${key}`, error);
      return false;
    }
  }

  // 私有方法

  private async listAllR2Files(): Promise<any[]> {
    const files: any[] = [];
    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });

      const response = await this.s3Client.send(command);

      if (response.Contents) {
        files.push(...response.Contents);
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return files;
  }

  private async listFilesByPattern(pattern: string): Promise<any[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: pattern,
      MaxKeys: 1000,
    });

    const response = await this.s3Client.send(command);
    return response.Contents || [];
  }

  private async recordOrphanFile(file: any): Promise<void> {
    try {
      await this.prisma.orphanFile.upsert({
        where: { storageKey: file.Key },
        update: {
          lastSeen: new Date(),
          size: file.Size,
        },
        create: {
          storageKey: file.Key,
          size: file.Size,
          lastModified: file.LastModified,
          firstSeen: new Date(),
          lastSeen: new Date(),
          status: 'DETECTED',
        },
      });
    } catch (error) {
      console.error(`记录孤儿文件失败: ${file.Key}`, error);
    }
  }

  private async updateOrphanFileStatus(key: string, status: string): Promise<void> {
    try {
      await this.prisma.orphanFile.update({
        where: { storageKey: key },
        data: {
          status,
          cleanedAt: status === 'CLEANED' ? new Date() : undefined,
        },
      });
    } catch (error) {
      console.error(`更新孤儿文件状态失败: ${key}`, error);
    }
  }
}
