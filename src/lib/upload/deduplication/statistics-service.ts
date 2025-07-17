/**
 * @fileoverview 去重统计服务
 * @description 提供文件去重相关的统计信息和分析
 */

import { prisma } from '@/lib/prisma';

export interface DeduplicationStats {
  totalFiles: number;
  uniqueFiles: number;
  duplicateFiles: number;
  totalSize: number;
  savedSize: number;
  savingPercentage: number;
}

export interface DetailedStats extends DeduplicationStats {
  topDuplicates: Array<{
    hash: string;
    filename: string;
    fileSize: number;
    uploadCount: number;
    savedSpace: number;
  }>;
  sizeDistribution: Array<{
    range: string;
    count: number;
    totalSize: number;
  }>;
  timeDistribution: Array<{
    date: string;
    uploads: number;
    duplicates: number;
  }>;
}

/**
 * 去重统计服务类
 */
export class StatisticsService {
  /**
   * 获取基础去重统计信息
   */
  public static async getDeduplicationStats(): Promise<DeduplicationStats> {
    try {
      // 获取总文件数和大小
      const totalStats = await prisma.fileHash.aggregate({
        _count: { id: true },
        _sum: {
          fileSize: true,
          uploadCount: true,
        },
      });

      const totalFiles = totalStats._sum.uploadCount || 0;
      const uniqueFiles = totalStats._count.id || 0;
      const duplicateFiles = totalFiles - uniqueFiles;
      const totalUniqueSize = totalStats._sum.fileSize || 0;

      // 计算如果没有去重需要的总大小
      const duplicateStats = await prisma.fileHash.findMany({
        where: {
          uploadCount: { gt: 1 },
        },
        select: {
          fileSize: true,
          uploadCount: true,
        },
      });

      const savedSize = duplicateStats.reduce((total, file) => {
        return total + (file.fileSize * (file.uploadCount - 1));
      }, 0);

      const totalSizeWithoutDedup = totalUniqueSize + savedSize;
      const savingPercentage = totalSizeWithoutDedup > 0
        ? (savedSize / totalSizeWithoutDedup) * 100
        : 0;

      return {
        totalFiles,
        uniqueFiles,
        duplicateFiles,
        totalSize: totalUniqueSize,
        savedSize,
        savingPercentage: Math.round(savingPercentage * 100) / 100,
      };
    } catch (error) {
      console.error('获取去重统计信息时出错:', error);
      return {
        totalFiles: 0,
        uniqueFiles: 0,
        duplicateFiles: 0,
        totalSize: 0,
        savedSize: 0,
        savingPercentage: 0,
      };
    }
  }

  /**
   * 获取详细统计信息
   */
  public static async getDetailedStats(): Promise<DetailedStats> {
    try {
      const basicStats = await this.getDeduplicationStats();

      // 获取重复次数最多的文件
      const topDuplicates = await prisma.fileHash.findMany({
        where: {
          uploadCount: { gt: 1 },
        },
        orderBy: {
          uploadCount: 'desc',
        },
        take: 10,
        select: {
          hash: true,
          filename: true,
          fileSize: true,
          uploadCount: true,
        },
      });

      // 获取文件大小分布
      const sizeDistribution = await this.calculateSizeDistribution();

      // 获取时间分布（最近30天）
      const timeDistribution = await this.calculateTimeDistribution();

      return {
        ...basicStats,
        topDuplicates: topDuplicates.map(file => ({
          hash: file.hash,
          filename: file.filename,
          fileSize: file.fileSize,
          uploadCount: file.uploadCount,
          savedSpace: file.fileSize * (file.uploadCount - 1),
        })),
        sizeDistribution,
        timeDistribution,
      };
    } catch (error) {
      console.error('获取详细统计信息时出错:', error);
      const basicStats = await this.getDeduplicationStats();
      return {
        ...basicStats,
        topDuplicates: [],
        sizeDistribution: [],
        timeDistribution: [],
      };
    }
  }

  /**
   * 计算文件大小分布
   */
  private static async calculateSizeDistribution(): Promise<Array<{
    range: string;
    count: number;
    totalSize: number;
  }>> {
    try {
      const files = await prisma.fileHash.findMany({
        select: {
          fileSize: true,
        },
      });

      const ranges = [
        { min: 0, max: 1024 * 1024, label: '< 1MB' },
        { min: 1024 * 1024, max: 10 * 1024 * 1024, label: '1MB - 10MB' },
        { min: 10 * 1024 * 1024, max: 100 * 1024 * 1024, label: '10MB - 100MB' },
        { min: 100 * 1024 * 1024, max: 1024 * 1024 * 1024, label: '100MB - 1GB' },
        { min: 1024 * 1024 * 1024, max: Infinity, label: '> 1GB' },
      ];

      return ranges.map(range => {
        const filesInRange = files.filter(file =>
          file.fileSize >= range.min && file.fileSize < range.max
        );

        return {
          range: range.label,
          count: filesInRange.length,
          totalSize: filesInRange.reduce((sum, file) => sum + file.fileSize, 0),
        };
      });
    } catch (error) {
      console.error('计算文件大小分布时出错:', error);
      return [];
    }
  }

  /**
   * 计算时间分布（最近30天）
   */
  private static async calculateTimeDistribution(): Promise<Array<{
    date: string;
    uploads: number;
    duplicates: number;
  }>> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // 获取最近30天的上传记录
      const recentUploads = await prisma.fileHash.findMany({
        where: {
          firstUploadAt: {
            gte: thirtyDaysAgo,
          },
        },
        select: {
          firstUploadAt: true,
          uploadCount: true,
        },
      });

      // 按日期分组
      const dateMap = new Map<string, { uploads: number; duplicates: number }>();

      recentUploads.forEach(upload => {
        const dateKey = upload.firstUploadAt.toISOString().split('T')[0];
        const existing = dateMap.get(dateKey) || { uploads: 0, duplicates: 0 };

        existing.uploads += upload.uploadCount;
        if (upload.uploadCount > 1) {
          existing.duplicates += upload.uploadCount - 1;
        }

        dateMap.set(dateKey, existing);
      });

      // 转换为数组并排序
      return Array.from(dateMap.entries())
        .map(([date, stats]) => ({
          date,
          uploads: stats.uploads,
          duplicates: stats.duplicates,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

    } catch (error) {
      console.error('计算时间分布时出错:', error);
      return [];
    }
  }

  /**
   * 获取用户去重统计
   */
  public static async getUserDeduplicationStats(userId: string): Promise<{
    userFiles: number;
    userDuplicates: number;
    userSavedSpace: number;
  }> {
    try {
      // 获取用户上传的所有媒体文件
      const userMedia = await prisma.postMedia.findMany({
        where: {
          uploadedBy: userId,
          fileHash: { not: null },
        },
        select: {
          fileHash: true,
          fileSize: true,
        },
      });

      const userHashes = [...new Set(userMedia.map(m => m.fileHash).filter(Boolean))];

      if (userHashes.length === 0) {
        return {
          userFiles: 0,
          userDuplicates: 0,
          userSavedSpace: 0,
        };
      }

      // 获取这些文件的去重信息
      const hashStats = await prisma.fileHash.findMany({
        where: {
          hash: { in: userHashes as string[] },
        },
        select: {
          hash: true,
          fileSize: true,
          uploadCount: true,
        },
      });

      let userSavedSpace = 0;
      let userDuplicates = 0;

      hashStats.forEach(stat => {
        if (stat.uploadCount > 1) {
          userDuplicates += stat.uploadCount - 1;
          userSavedSpace += stat.fileSize * (stat.uploadCount - 1);
        }
      });

      return {
        userFiles: userMedia.length,
        userDuplicates,
        userSavedSpace,
      };
    } catch (error) {
      console.error('获取用户去重统计时出错:', error);
      return {
        userFiles: 0,
        userDuplicates: 0,
        userSavedSpace: 0,
      };
    }
  }

  /**
   * 获取存储效率报告
   */
  public static async getStorageEfficiencyReport(): Promise<{
    totalStorageUsed: number;
    potentialStorageWithoutDedup: number;
    efficiencyPercentage: number;
    topSpaceSavers: Array<{
      filename: string;
      uploadCount: number;
      spaceSaved: number;
    }>;
  }> {
    try {
      const stats = await this.getDeduplicationStats();

      const topSpaceSavers = await prisma.fileHash.findMany({
        where: {
          uploadCount: { gt: 1 },
        },
        orderBy: [
          {
            fileSize: 'desc',
          },
          {
            uploadCount: 'desc',
          },
        ],
        take: 5,
        select: {
          filename: true,
          fileSize: true,
          uploadCount: true,
        },
      });

      return {
        totalStorageUsed: stats.totalSize,
        potentialStorageWithoutDedup: stats.totalSize + stats.savedSize,
        efficiencyPercentage: stats.savingPercentage,
        topSpaceSavers: topSpaceSavers.map(file => ({
          filename: file.filename,
          uploadCount: file.uploadCount,
          spaceSaved: file.fileSize * (file.uploadCount - 1),
        })),
      };
    } catch (error) {
      console.error('获取存储效率报告时出错:', error);
      return {
        totalStorageUsed: 0,
        potentialStorageWithoutDedup: 0,
        efficiencyPercentage: 0,
        topSpaceSavers: [],
      };
    }
  }
}
