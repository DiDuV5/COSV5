/**
 * @fileoverview 孤儿文件清理器
 * @description 检测和清理存储中的孤儿文件
 * @author Augment AI
 * @date 2025-07-03
 */

import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import {
  CleanupTaskType,
  CleanupStats,
  CleanupConfig,
  OrphanFileInfo
} from '../types/cleanup-service-types';

/**
 * 孤儿文件清理器类
 */
export class OrphanFileCleaner {
  private s3Client: S3Client;
  private prisma: PrismaClient;

  constructor(private config: CleanupConfig) {
    this.prisma = new PrismaClient();
    this.s3Client = new S3Client({
      region: process.env.COSEREEDEN_CLOUDFLARE_R2_REGION || 'auto',
      endpoint: process.env.COSEREEDEN_CLOUDFLARE_R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
      },
    });
    this.initializeS3Client();
  }

  /**
   * 初始化S3客户端
   */
  private initializeS3Client(): void {
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.COSEREEDEN_CLOUDFLARE_R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  /**
   * 检测和清理孤儿文件
   */
  async detectAndCleanupOrphanFiles(): Promise<CleanupStats> {
    const startTime = Date.now();
    const stats: CleanupStats = {
      taskType: CleanupTaskType.ORPHAN_FILES,
      processedCount: 0,
      cleanedCount: 0,
      failedCount: 0,
      executionTimeMs: 0,
      errors: []
    };

    try {
      console.log('🧹 开始检测和清理孤儿文件');

      // 第一步：获取存储中的所有文件
      const storageFiles = await this.listAllStorageFiles();
      console.log(`📊 存储中共有 ${storageFiles.length} 个文件`);

      // 第二步：获取数据库中的文件记录
      const dbFiles = await this.getAllDatabaseFiles();
      console.log(`📊 数据库中共有 ${dbFiles.length} 个文件记录`);

      // 第三步：识别孤儿文件
      const orphanFiles = await this.identifyOrphanFiles(storageFiles, dbFiles);
      stats.processedCount = orphanFiles.length;
      console.log(`📊 发现 ${orphanFiles.length} 个孤儿文件`);

      // 第四步：清理孤儿文件
      if (orphanFiles.length > 0) {
        const cleanupResult = await this.cleanupOrphanFiles(orphanFiles);
        stats.cleanedCount = cleanupResult.cleaned;
        stats.failedCount = cleanupResult.failed;
        stats.errors.push(...cleanupResult.errors);
      }

      stats.executionTimeMs = Date.now() - startTime;
      console.log(`✅ 孤儿文件清理完成: 处理 ${stats.processedCount}, 清理 ${stats.cleanedCount}, 失败 ${stats.failedCount}`);

      return stats;

    } catch (error) {
      stats.executionTimeMs = Date.now() - startTime;
      stats.errors.push(error instanceof Error ? error.message : '未知错误');
      console.error('❌ 孤儿文件清理失败:', error);
      throw error;
    }
  }

  /**
   * 获取存储中的所有文件
   */
  private async listAllStorageFiles(): Promise<any[]> {
    const files: any[] = [];
    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: process.env.COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME!,
        ContinuationToken: continuationToken,
        MaxKeys: 1000
      });

      const response = await this.s3Client.send(command);

      if (response.Contents) {
        files.push(...response.Contents);
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return files;
  }

  /**
   * 获取数据库中的所有文件记录
   */
  private async getAllDatabaseFiles(): Promise<string[]> {
    const mediaFiles = await this.prisma.postMedia.findMany({
      select: {
        url: true,
        thumbnailUrl: true
      }
    });

    const fileKeys = new Set<string>();

    mediaFiles.forEach(media => {
      if (media.url) {
        const key = this.extractKeyFromUrl(media.url);
        if (key) fileKeys.add(key);
      }
      if (media.thumbnailUrl) {
        const key = this.extractKeyFromUrl(media.thumbnailUrl);
        if (key) fileKeys.add(key);
      }
    });

    return Array.from(fileKeys);
  }

  /**
   * 从URL中提取存储键
   */
  private extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.substring(1); // 移除开头的 '/'
    } catch {
      return null;
    }
  }

  /**
   * 识别孤儿文件
   */
  private async identifyOrphanFiles(
    storageFiles: any[],
    dbFileKeys: string[]
  ): Promise<OrphanFileInfo[]> {
    const dbKeySet = new Set(dbFileKeys);
    const orphanFiles: OrphanFileInfo[] = [];
    const retentionDays = this.config.thresholds.orphanFileRetentionDays;
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    for (const file of storageFiles) {
      // 检查文件是否在数据库中存在
      if (!dbKeySet.has(file.Key)) {
        // 检查文件是否足够旧
        const lastModified = new Date(file.LastModified);
        if (lastModified < cutoffDate) {
          // 检查是否已经记录为孤儿文件
          const existingOrphan = await this.prisma.orphanFile.findUnique({
            where: { storageKey: file.Key }
          });

          const isConfirmedOrphan = existingOrphan ?
            (Date.now() - existingOrphan.createdAt.getTime()) > (7 * 24 * 60 * 60 * 1000) : // 7天确认期
            false;

          orphanFiles.push({
            storageKey: file.Key,
            size: file.Size || 0,
            lastModified,
            isConfirmedOrphan,
            retentionDays: Math.floor((Date.now() - lastModified.getTime()) / (24 * 60 * 60 * 1000)),
            cleanupStatus: (existingOrphan?.cleanupStatus || 'PENDING') as 'PENDING' | 'FAILED' | 'CLEANED'
          });

          // 记录或更新孤儿文件
          await this.recordOrphanFile(file);
        }
      }
    }

    return orphanFiles;
  }

  /**
   * 清理孤儿文件
   */
  private async cleanupOrphanFiles(orphanFiles: OrphanFileInfo[]): Promise<{
    cleaned: number;
    failed: number;
    errors: string[];
  }> {
    let cleaned = 0;
    let failed = 0;
    const errors: string[] = [];

    // 只清理已确认的孤儿文件
    const confirmedOrphans = orphanFiles.filter(file => file.isConfirmedOrphan);

    if (confirmedOrphans.length === 0) {
      console.log('📋 没有已确认的孤儿文件需要清理');
      return { cleaned, failed, errors };
    }

    console.log(`🗑️ 开始清理 ${confirmedOrphans.length} 个已确认的孤儿文件`);

    // 分批清理
    const batchSize = this.config.batchSizes.fileBatch;
    for (let i = 0; i < confirmedOrphans.length; i += batchSize) {
      const batch = confirmedOrphans.slice(i, i + batchSize);

      for (const orphan of batch) {
        try {
          // 删除存储文件
          await this.deleteStorageFile(orphan.storageKey);

          // 更新孤儿文件状态
          await this.updateOrphanFileStatus(orphan.storageKey, 'CLEANED');

          cleaned++;
          console.log(`✅ 已清理孤儿文件: ${orphan.storageKey}`);

        } catch (error) {
          failed++;
          const errorMsg = `清理文件失败 ${orphan.storageKey}: ${error instanceof Error ? error.message : '未知错误'}`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);

          // 更新失败状态
          await this.updateOrphanFileStatus(orphan.storageKey, 'FAILED');
        }
      }

      // 批次间延迟
      if (i + batchSize < confirmedOrphans.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { cleaned, failed, errors };
  }

  /**
   * 删除存储文件
   */
  private async deleteStorageFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: process.env.COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME!,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  /**
   * 记录孤儿文件
   */
  private async recordOrphanFile(file: any): Promise<void> {
    await this.prisma.orphanFile.upsert({
      where: { storageKey: file.Key },
      update: {
        lastCheckedAt: new Date(),
        fileSize: file.Size || 0,
        lastModified: new Date(file.LastModified)
      },
      create: {
        storageKey: file.Key,
        fileSize: file.Size || 0,
        lastModified: new Date(file.LastModified),
        cleanupStatus: 'PENDING',
        lastCheckedAt: new Date()
      }
    });
  }

  /**
   * 更新孤儿文件状态
   */
  private async updateOrphanFileStatus(storageKey: string, status: string): Promise<void> {
    await this.prisma.orphanFile.update({
      where: { storageKey },
      data: {
        cleanupStatus: status,
        cleanupCompletedAt: status === 'CLEANED' ? new Date() : undefined,
      }
    });
  }

  /**
   * 获取孤儿文件统计
   */
  async getOrphanFileStatistics(): Promise<{
    totalOrphanFiles: number;
    confirmedOrphans: number;
    cleanedOrphans: number;
    failedCleanups: number;
    totalOrphanSize: number;
  }> {
    const [total, confirmed, cleaned, failed, sizeResult] = await Promise.all([
      this.prisma.orphanFile.count(),
      this.prisma.orphanFile.count({
        where: {
          createdAt: {
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7天前
          }
        }
      }),
      this.prisma.orphanFile.count({
        where: { cleanupStatus: 'CLEANED' }
      }),
      this.prisma.orphanFile.count({
        where: { cleanupStatus: 'FAILED' }
      }),
      this.prisma.orphanFile.aggregate({
        _sum: { fileSize: true }
      })
    ]);

    return {
      totalOrphanFiles: total,
      confirmedOrphans: confirmed,
      cleanedOrphans: cleaned,
      failedCleanups: failed,
      totalOrphanSize: Number(sizeResult._sum.fileSize || 0)
    };
  }

  /**
   * 强制清理指定的孤儿文件
   */
  async forceCleanupOrphanFile(storageKey: string): Promise<void> {
    try {
      console.log(`🔧 强制清理孤儿文件: ${storageKey}`);

      // 删除存储文件
      await this.deleteStorageFile(storageKey);

      // 更新状态
      await this.updateOrphanFileStatus(storageKey, 'CLEANED');

      console.log(`✅ 强制清理完成: ${storageKey}`);

    } catch (error) {
      console.error(`❌ 强制清理失败: ${storageKey}`, error);
      await this.updateOrphanFileStatus(storageKey, 'FAILED');
      throw error;
    }
  }

  /**
   * 关闭清理器
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
