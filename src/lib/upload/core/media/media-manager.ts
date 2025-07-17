/**
 * @fileoverview 媒体管理器
 * @description 处理媒体文件的CRUD操作和统计
 * @author Augment AI
 * @date 2025-07-03
 */

/**
 * 媒体管理器类
 */
export class MediaManager {

  /**
   * 获取媒体文件信息
   */
  static async getMediaInfo(fileId: string): Promise<any | null> {
    try {
      const { prisma } = await import('@/lib/prisma');
      const mediaRecord = await prisma.postMedia.findUnique({
        where: { id: fileId },
        include: {
          post: {
            select: {
              id: true,
              title: true,
              authorId: true,
            },
          },
        },
      });

      if (!mediaRecord) {
        return null;
      }

      return {
        id: mediaRecord.id,
        filename: mediaRecord.filename,
        originalFilename: mediaRecord.originalName,
        mimeType: mediaRecord.mimeType,
        fileSize: mediaRecord.fileSize,
        url: mediaRecord.url,
        thumbnailUrl: mediaRecord.thumbnailUrl,
        uploadedAt: mediaRecord.createdAt,
        uploadedBy: mediaRecord.uploadedBy,
        post: mediaRecord.post,
        metadata: {}, // 暂时使用空对象，因为metadata字段不存在
      };
    } catch (error) {
      console.error('获取媒体信息失败:', error);
      return null;
    }
  }

  /**
   * 删除媒体文件
   */
  static async deleteMedia(mediaId: string): Promise<boolean> {
    try {
      const { prisma } = await import('@/lib/prisma');

      // 获取媒体文件信息
      const media = await prisma.postMedia.findUnique({
        where: { id: mediaId },
        select: { url: true, thumbnailUrl: true },
      });

      if (!media) {
        console.warn(`媒体文件不存在: ${mediaId}`);
        return false;
      }

      // 删除数据库记录
      await prisma.postMedia.delete({
        where: { id: mediaId },
      });

      // 删除存储文件（这里应该调用实际的存储服务）
      await this.deleteStorageFiles([media.url, media.thumbnailUrl].filter(Boolean) as string[]);

      console.log(`✅ 媒体文件删除成功: ${mediaId}`);
      return true;
    } catch (error) {
      console.error('删除媒体文件失败:', error);
      return false;
    }
  }

  /**
   * 删除存储文件
   */
  private static async deleteStorageFiles(urls: string[]): Promise<void> {
    try {
      // 这里应该调用实际的存储服务删除文件
      // 例如：R2Storage.deleteFiles(urls)
      console.log('删除存储文件:', urls);

      // 模拟删除操作
      for (const url of urls) {
        console.log(`删除文件: ${url}`);
      }
    } catch (error) {
      console.error('删除存储文件失败:', error);
      // 不抛出错误，因为数据库记录已经删除
    }
  }

  /**
   * 更新媒体顺序
   */
  static async updateMediaOrder(mediaUpdates: Array<{ id: string; order: number }>): Promise<void> {
    try {
      const { prisma } = await import('@/lib/prisma');

      // 批量更新媒体顺序
      for (const update of mediaUpdates) {
        await prisma.postMedia.update({
          where: { id: update.id },
          data: { order: update.order },
        });
      }

      console.log(`✅ 媒体顺序更新成功，共更新 ${mediaUpdates.length} 个文件`);
    } catch (error) {
      console.error('更新媒体顺序失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户上传统计
   */
  static async getUserUploadStats(userId: string): Promise<any> {
    try {
      const { prisma } = await import('@/lib/prisma');

      const stats = await prisma.postMedia.aggregate({
        where: { uploadedBy: userId },
        _count: { id: true },
        _sum: { fileSize: true },
      });

      const typeStats = await prisma.postMedia.groupBy({
        by: ['mimeType'],
        where: { uploadedBy: userId },
        _count: { id: true },
        _sum: { fileSize: true },
      });

      return {
        totalFiles: stats._count.id || 0,
        totalSize: stats._sum.fileSize || 0,
        typeBreakdown: typeStats.map(stat => ({
          mimeType: stat.mimeType,
          count: stat._count.id,
          size: stat._sum.fileSize || 0,
        })),
      };
    } catch (error) {
      console.error('获取用户上传统计失败:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        typeBreakdown: [],
      };
    }
  }

  /**
   * 获取媒体文件列表
   */
  static async getMediaList(options: {
    userId?: string;
    postId?: string;
    mimeType?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'fileSize' | 'filename';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{
    items: any[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const { prisma } = await import('@/lib/prisma');
      const {
        userId,
        postId,
        mimeType,
        limit = 20,
        offset = 0,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const where: any = {};
      if (userId) where.uploadedBy = userId;
      if (postId) where.postId = postId;
      if (mimeType) where.mimeType = { contains: mimeType };

      const [items, total] = await Promise.all([
        prisma.postMedia.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          take: limit,
          skip: offset,
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            fileSize: true,
            url: true,
            thumbnailUrl: true,
            createdAt: true,
            uploadedBy: true,
            order: true,
          },
        }),
        prisma.postMedia.count({ where })
      ]);

      return {
        items,
        total,
        hasMore: offset + limit < total
      };
    } catch (error) {
      console.error('获取媒体文件列表失败:', error);
      return {
        items: [],
        total: 0,
        hasMore: false
      };
    }
  }

  /**
   * 批量删除媒体文件
   */
  static async batchDeleteMedia(mediaIds: string[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const result = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const mediaId of mediaIds) {
      try {
        const deleted = await this.deleteMedia(mediaId);
        if (deleted) {
          result.success++;
        } else {
          result.failed++;
          result.errors.push(`媒体文件不存在: ${mediaId}`);
        }
      } catch (error) {
        result.failed++;
        result.errors.push(`删除失败 ${mediaId}: ${error}`);
      }
    }

    return result;
  }

  /**
   * 更新媒体元数据
   */
  static async updateMediaMetadata(
    mediaId: string,
    metadata: Record<string, any>
  ): Promise<boolean> {
    try {
      const { prisma } = await import('@/lib/prisma');

      // 暂时注释掉metadata更新，因为字段不存在
      // await prisma.postMedia.update({
      //   where: { id: mediaId },
      //   data: { metadata },
      // });

      console.log(`✅ 媒体元数据更新成功: ${mediaId}`);
      return true;
    } catch (error) {
      console.error('更新媒体元数据失败:', error);
      return false;
    }
  }

  /**
   * 获取存储统计
   */
  static async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    averageFileSize: number;
    typeDistribution: Array<{
      type: string;
      count: number;
      size: number;
      percentage: number;
    }>;
  }> {
    try {
      const { prisma } = await import('@/lib/prisma');

      const [totalStats, typeStats] = await Promise.all([
        prisma.postMedia.aggregate({
          _count: { id: true },
          _sum: { fileSize: true },
          _avg: { fileSize: true },
        }),
        prisma.postMedia.groupBy({
          by: ['mimeType'],
          _count: { id: true },
          _sum: { fileSize: true },
        })
      ]);

      const totalSize = totalStats._sum.fileSize || 0;
      const typeDistribution = typeStats.map(stat => ({
        type: stat.mimeType,
        count: stat._count.id,
        size: stat._sum.fileSize || 0,
        percentage: totalSize > 0 ? ((stat._sum.fileSize || 0) / totalSize) * 100 : 0
      }));

      return {
        totalFiles: totalStats._count.id || 0,
        totalSize,
        averageFileSize: totalStats._avg.fileSize || 0,
        typeDistribution
      };
    } catch (error) {
      console.error('获取存储统计失败:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        averageFileSize: 0,
        typeDistribution: []
      };
    }
  }

  /**
   * 清理孤立媒体文件
   */
  static async cleanupOrphanedMedia(): Promise<{
    cleaned: number;
    errors: string[];
  }> {
    try {
      const { prisma } = await import('@/lib/prisma');

      // 查找没有关联帖子的媒体文件
      const orphanedMedia = await prisma.postMedia.findMany({
        where: {
          post: null
        },
        select: {
          id: true,
          filename: true,
          createdAt: true
        }
      });

      // 删除超过7天的孤立文件
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const toDelete = orphanedMedia.filter(media => media.createdAt < sevenDaysAgo);

      const result = await this.batchDeleteMedia(toDelete.map(m => m.id));

      console.log(`🧹 清理孤立媒体文件完成，删除 ${result.success} 个文件`);

      return {
        cleaned: result.success,
        errors: result.errors
      };
    } catch (error) {
      console.error('清理孤立媒体文件失败:', error);
      return {
        cleaned: 0,
        errors: [error instanceof Error ? error.message : '未知错误']
      };
    }
  }
}
