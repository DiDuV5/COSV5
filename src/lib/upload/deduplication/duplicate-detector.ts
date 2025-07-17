/**
 * @fileoverview 重复文件检测器
 * @description 检测和管理重复文件，基于哈希值进行去重
 */

import { prisma } from '@/lib/prisma';
import { HashCalculator } from './hash-calculator';

export interface DuplicateFile {
  id: string;
  hash: string;
  url: string;
  filename: string;
  fileSize: number;
  uploadCount: number;
}

export interface DeduplicationResult {
  isDuplicate: boolean;
  existingFile?: DuplicateFile;
  shouldUpload: boolean;
}

/**
 * 重复文件检测器类
 */
export class DuplicateDetector {
  /**
   * 查找重复文件（基于哈希值）
   */
  public static async findDuplicateFile(fileHash: string): Promise<DuplicateFile | null> {
    if (!fileHash || !HashCalculator.isValidHash(fileHash)) {
      return null;
    }

    try {
      const existingFile = await prisma.fileHash.findUnique({
        where: { hash: fileHash },
      });

      if (existingFile) {
        return {
          id: existingFile.id,
          hash: existingFile.hash,
          url: existingFile.url,
          filename: existingFile.filename,
          fileSize: existingFile.fileSize,
          uploadCount: existingFile.uploadCount,
        };
      }

      return null;
    } catch (error) {
      console.error('查找重复文件时出错:', error);
      return null;
    }
  }

  /**
   * 检查文件是否重复
   */
  public static async checkDeduplication(
    fileHash: string,
    options: {
      enableDeduplication?: boolean;
      updateUploadCount?: boolean;
    } = {}
  ): Promise<DeduplicationResult> {
    const { enableDeduplication = true, updateUploadCount = true } = options;

    if (!enableDeduplication) {
      return {
        isDuplicate: false,
        shouldUpload: true,
      };
    }

    try {
      const existingFile = await this.findDuplicateFile(fileHash);

      if (existingFile) {
        // 更新上传次数
        if (updateUploadCount) {
          await this.incrementUploadCount(fileHash);
        }

        console.log(`🔄 发现重复文件: ${existingFile.filename} (上传次数: ${existingFile.uploadCount + 1})`);

        return {
          isDuplicate: true,
          existingFile: {
            ...existingFile,
            uploadCount: existingFile.uploadCount + (updateUploadCount ? 1 : 0),
          },
          shouldUpload: false,
        };
      }

      return {
        isDuplicate: false,
        shouldUpload: true,
      };
    } catch (error) {
      console.error('检查文件去重时出错:', error);
      // 出错时允许上传，避免阻塞用户
      return {
        isDuplicate: false,
        shouldUpload: true,
      };
    }
  }

  /**
   * 增加文件上传次数
   */
  public static async incrementUploadCount(fileHash: string): Promise<void> {
    try {
      await prisma.fileHash.update({
        where: { hash: fileHash },
        data: {
          uploadCount: { increment: 1 },
          lastUploadAt: new Date(),
        },
      });
    } catch (error) {
      console.error('更新上传次数时出错:', error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 批量检查多个文件的重复状态
   */
  public static async batchCheckDeduplication(
    fileHashes: string[]
  ): Promise<Map<string, DeduplicationResult>> {
    const results = new Map<string, DeduplicationResult>();

    if (fileHashes.length === 0) {
      return results;
    }

    try {
      // 批量查询数据库
      const existingFiles = await prisma.fileHash.findMany({
        where: {
          hash: { in: fileHashes },
        },
      });

      // 创建哈希到文件的映射
      const hashToFileMap = new Map<string, DuplicateFile>();
      existingFiles.forEach(file => {
        hashToFileMap.set(file.hash, {
          id: file.id,
          hash: file.hash,
          url: file.url,
          filename: file.filename,
          fileSize: file.fileSize,
          uploadCount: file.uploadCount,
        });
      });

      // 为每个哈希生成结果
      fileHashes.forEach(hash => {
        const existingFile = hashToFileMap.get(hash);

        if (existingFile) {
          results.set(hash, {
            isDuplicate: true,
            existingFile,
            shouldUpload: false,
          });
        } else {
          results.set(hash, {
            isDuplicate: false,
            shouldUpload: true,
          });
        }
      });

      return results;
    } catch (error) {
      console.error('批量检查去重时出错:', error);

      // 出错时为所有文件返回允许上传的结果
      fileHashes.forEach(hash => {
        results.set(hash, {
          isDuplicate: false,
          shouldUpload: true,
        });
      });

      return results;
    }
  }

  /**
   * 获取重复文件列表
   */
  public static async getDuplicateFiles(options: {
    page?: number;
    limit?: number;
    sortBy?: 'uploadCount' | 'fileSize' | 'lastUploadAt';
    sortOrder?: 'asc' | 'desc';
    minUploadCount?: number;
  } = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'uploadCount',
      sortOrder = 'desc',
      minUploadCount = 2,
    } = options;

    try {
      const duplicateFiles = await prisma.fileHash.findMany({
        where: {
          uploadCount: { gte: minUploadCount },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * limit,
        take: limit,
      });

      const total = await prisma.fileHash.count({
        where: {
          uploadCount: { gte: minUploadCount },
        },
      });

      return {
        files: duplicateFiles.map(file => ({
          id: file.id,
          hash: file.hash,
          url: file.url,
          filename: file.filename,
          fileSize: file.fileSize,
          uploadCount: file.uploadCount,
          lastUploadAt: file.lastUploadAt,
          savedSpace: file.fileSize * (file.uploadCount - 1),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('获取重复文件列表时出错:', error);
      return {
        files: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      };
    }
  }

  /**
   * 删除重复文件记录
   */
  public static async removeDuplicateRecord(fileHash: string): Promise<boolean> {
    try {
      await prisma.fileHash.delete({
        where: { hash: fileHash },
      });

      console.log(`🗑️ 删除重复文件记录: ${fileHash}`);
      return true;
    } catch (error) {
      console.error('删除重复文件记录时出错:', error);
      return false;
    }
  }

  /**
   * 检测媒体列表中的重复文件（兼容性方法）
   */
  public static async detectDuplicateMedia(mediaList: any[]): Promise<any[]> {
    if (!mediaList.length) return mediaList;

    // 获取所有文件哈希
    const fileHashes = mediaList.map(media => media.fileHash).filter(Boolean);

    if (!fileHashes.length) return mediaList;

    try {
      // 查询每个哈希的使用次数
      const hashCounts = await prisma.fileHash.findMany({
        where: {
          hash: {
            in: fileHashes
          }
        },
        select: {
          hash: true,
          uploadCount: true,
        }
      });

      // 创建哈希计数映射
      const hashCountMap = new Map<string, number>();
      hashCounts.forEach(item => {
        // 使用 uploadCount
        const count = item.uploadCount || 0;
        hashCountMap.set(item.hash, count);
      });

      // 标记重复文件
      return mediaList.map(media => ({
        ...media,
        isDuplicate: (hashCountMap.get(media.fileHash) || 1) > 1,
        duplicateCount: hashCountMap.get(media.fileHash) || 1
      }));

    } catch (error) {
      console.error('检测重复文件失败:', error);
      // 发生错误时返回原始数据
      return mediaList;
    }
  }

  /**
   * 清理无效的重复文件记录
   */
  public static async cleanupInvalidRecords(): Promise<{
    cleaned: number;
    errors: string[];
  }> {
    const result = {
      cleaned: 0,
      errors: [] as string[],
    };

    try {
      // 查找所有重复文件记录
      const allRecords = await prisma.fileHash.findMany();

      for (const record of allRecords) {
        try {
          // 检查文件是否仍然存在于PostMedia表中
          const mediaExists = await prisma.postMedia.findFirst({
            where: { fileHash: record.hash },
          });

          if (!mediaExists) {
            // 如果没有关联的媒体记录，删除哈希记录
            await prisma.fileHash.delete({
              where: { id: record.id },
            });
            result.cleaned++;
            console.log(`🧹 清理无效记录: ${record.filename}`);
          }
        } catch (error) {
          const errorMsg = `清理记录 ${record.id} 失败: ${error}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      console.log(`✅ 清理完成: 删除了 ${result.cleaned} 个无效记录`);
      return result;
    } catch (error) {
      console.error('清理无效记录时出错:', error);
      result.errors.push(`清理过程失败: ${error}`);
      return result;
    }
  }
}
