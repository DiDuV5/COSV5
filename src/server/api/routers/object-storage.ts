/**
 * @fileoverview 对象存储服务管理API路由
 * @description 提供新的对象存储服务的管理和监控接口
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/server: tRPC服务端
 * - zod: 数据验证
 * - StorageManager: 存储管理器
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { z } from 'zod';
import { createTRPCRouter, authProcedure, publicProcedure as _publicProcedure } from '@/server/api/trpc';
import { TRPCErrorHandler, BusinessErrorType as _BusinessErrorType } from "@/lib/errors/trpc-error-handler";
import { getDefaultStorageManager, checkStorageConfig } from '@/lib/storage/object-storage/storage-factory';
import { MultipartUploadManager } from '@/lib/storage/utils/multipart-upload-manager';

export const objectStorageRouter = createTRPCRouter({
  // 获取存储配置信息
  getConfig: authProcedure.query(async ({ ctx }) => {
    // 只有管理员可以查看存储配置
    if (ctx.user.userLevel !== 'ADMIN') {
      throw TRPCErrorHandler.forbidden("权限不足");
    }

    try {
      const configCheck = checkStorageConfig();

      // 添加详细的环境变量信息
      const envInfo = {
        USE_NEW_STORAGE_SYSTEM: process.env.COSEREEDEN_USE_NEW_STORAGE_SYSTEM,
        STORAGE_PROVIDER: process.env.COSEREEDEN_STORAGE_PROVIDER,
        CLOUDFLARE_R2_BUCKET: process.env.COSEREEDEN_CLOUDFLARE_R2_BUCKET,
        CLOUDFLARE_R2_ENDPOINT: process.env.COSEREEDEN_CLOUDFLARE_R2_ENDPOINT,
        CLOUDFLARE_R2_CDN_DOMAIN: process.env.COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN,
        STORAGE_ENABLE_FAILOVER: process.env.COSEREEDEN_STORAGE_ENABLE_FAILOVER,
        STORAGE_FALLBACK_PROVIDER: process.env.COSEREEDEN_STORAGE_FALLBACK_PROVIDER,
        STORAGE_ENABLE_CACHE: process.env.COSEREEDEN_STORAGE_ENABLE_CACHE,
      };

      return {
        isValid: configCheck.isValid,
        errors: configCheck.errors,
        warnings: configCheck.warnings,
        summary: configCheck.summary,
        environmentVariables: envInfo,
      };
    } catch (_error) {
      throw TRPCErrorHandler.internalError("获取存储配置失败");
    }
  }),

  // 获取存储统计信息
  getStats: authProcedure.query(async ({ ctx }) => {
    if (ctx.user.userLevel !== 'ADMIN') {
      throw TRPCErrorHandler.forbidden("权限不足");
    }

    try {
      const storageManager = await getDefaultStorageManager();
      const stats = storageManager.getStorageStats();

      return {
        primary: stats.primary,
        fallback: stats.fallback,
        cacheSize: stats.cacheSize,
        timestamp: new Date(),
      };
    } catch (error) {
      throw TRPCErrorHandler.internalError("获取存储统计失败");
    }
  }),

  // 测试存储连接
  testConnection: authProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.userLevel !== 'ADMIN') {
      throw TRPCErrorHandler.forbidden("权限不足");
    }

    try {
      const storageManager = await getDefaultStorageManager();

      // 执行连接测试
      const testKey = `test/connection-test-${Date.now()}.txt`;
      const testContent = Buffer.from('连接测试文件');

      // 上传测试文件
      const uploadResult = await storageManager.uploadFile({
        buffer: testContent,
        key: testKey,
        contentType: 'text/plain',
        size: testContent.length,
        metadata: {
          test: 'true',
          timestamp: new Date().toISOString(),
        },
      });

      // 下载验证
      const downloadResult = await storageManager.downloadFile(testKey);

      // 验证内容
      const isValid = downloadResult.buffer.equals(testContent);

      // 清理测试文件
      await storageManager.deleteFile(testKey);

      return {
        success: true,
        isValid,
        uploadUrl: uploadResult.url,
        downloadSize: downloadResult.size,
        message: isValid ? '连接测试成功' : '连接测试失败：内容不匹配',
      };
    } catch (error) {
      return {
        success: false,
        isValid: false,
        message: `连接测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }),

  // 清除存储缓存
  clearCache: authProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.userLevel !== 'ADMIN') {
      throw TRPCErrorHandler.forbidden("权限不足");
    }

    try {
      const storageManager = await getDefaultStorageManager();
      storageManager.clearAllCache();

      return {
        success: true,
        message: '缓存清除成功',
        timestamp: new Date(),
      };
    } catch (error) {
      throw TRPCErrorHandler.internalError("清除缓存失败");
    }
  }),

  // 列出文件
  listFiles: authProcedure
    .input(z.object({
      prefix: z.string().optional(),
      maxKeys: z.number().min(1).max(1000).default(100),
      continuationToken: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.userLevel !== 'ADMIN') {
        throw TRPCErrorHandler.forbidden("权限不足");
      }

      try {
        const storageManager = await getDefaultStorageManager();
        const result = await storageManager.listFiles({
          prefix: input.prefix,
          maxKeys: input.maxKeys,
          nextContinuationToken: input.continuationToken,
        });

        return result;
      } catch (error) {
        throw TRPCErrorHandler.internalError("获取文件列表失败");
      }
    }),

  // 删除文件
  deleteFile: authProcedure
    .input(z.object({
      key: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.userLevel !== 'ADMIN') {
        throw TRPCErrorHandler.forbidden("权限不足");
      }

      try {
        const storageManager = await getDefaultStorageManager();
        await storageManager.deleteFile(input.key);

        return {
          success: true,
          message: '文件删除成功',
          key: input.key,
        };
      } catch (error) {
        throw TRPCErrorHandler.internalError("删除文件失败");
      }
    }),

  // 生成预签名URL
  generatePresignedUrl: authProcedure
    .input(z.object({
      key: z.string(),
      operation: z.enum(['get', 'put']),
      expiresIn: z.number().min(60).max(86400).default(3600), // 1分钟到24小时
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.userLevel !== 'ADMIN') {
        throw TRPCErrorHandler.forbidden("权限不足");
      }

      try {
        const storageManager = await getDefaultStorageManager();
        const url = await storageManager.generatePresignedUrl(
          input.key,
          input.operation,
          input.expiresIn
        );

        return {
          url,
          key: input.key,
          operation: input.operation,
          expiresIn: input.expiresIn,
          expiresAt: new Date(Date.now() + input.expiresIn * 1000),
        };
      } catch (error) {
        throw TRPCErrorHandler.internalError("生成预签名URL失败");
      }
    }),

  // 获取文件信息
  getFileInfo: authProcedure
    .input(z.object({
      key: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.userLevel !== 'ADMIN') {
        throw TRPCErrorHandler.forbidden("权限不足");
      }

      try {
        const storageManager = await getDefaultStorageManager();
        const fileInfo = await storageManager.getFileInfo(input.key);

        return fileInfo;
      } catch (error) {
        throw TRPCErrorHandler.internalError("获取文件信息失败");
      }
    }),

  // 检查文件是否存在
  fileExists: authProcedure
    .input(z.object({
      key: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.userLevel !== 'ADMIN') {
        throw TRPCErrorHandler.forbidden("权限不足");
      }

      try {
        const storageManager = await getDefaultStorageManager();
        const exists = await storageManager.fileExists(input.key);

        return {
          exists,
          key: input.key,
        };
      } catch (error) {
        throw TRPCErrorHandler.internalError("检查文件存在性失败");
      }
    }),

  // 复制文件
  copyFile: authProcedure
    .input(z.object({
      sourceKey: z.string(),
      destKey: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.userLevel !== 'ADMIN') {
        throw TRPCErrorHandler.forbidden("权限不足");
      }

      try {
        const storageManager = await getDefaultStorageManager();
        const result = await storageManager.copyFile(input.sourceKey, input.destKey);

        return {
          success: true,
          sourceKey: input.sourceKey,
          destKey: input.destKey,
          result,
        };
      } catch (error) {
        throw TRPCErrorHandler.internalError("复制文件失败");
      }
    }),

  // 获取活动上传列表
  getActiveUploads: authProcedure.query(async ({ ctx }) => {
    if (ctx.user.userLevel !== 'ADMIN') {
      throw TRPCErrorHandler.forbidden("权限不足");
    }

    try {
      const storageManager = await getDefaultStorageManager();
      const uploadManager = new MultipartUploadManager(storageManager);
      const activeUploads = uploadManager.getActiveUploads();

      return activeUploads;
    } catch (error) {
      throw TRPCErrorHandler.internalError("获取活动上传列表失败");
    }
  }),

  // 取消上传
  cancelUpload: authProcedure
    .input(z.object({
      key: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.userLevel !== 'ADMIN') {
        throw TRPCErrorHandler.forbidden("权限不足");
      }

      try {
        const storageManager = await getDefaultStorageManager();
        const uploadManager = new MultipartUploadManager(storageManager);
        await uploadManager.cancelUpload(input.key);

        return {
          success: true,
          message: '上传已取消',
          key: input.key,
        };
      } catch (error) {
        throw TRPCErrorHandler.internalError("取消上传失败");
      }
    }),
});
