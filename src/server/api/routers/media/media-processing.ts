/**
 * @fileoverview 媒体处理tRPC路由
 * @description 处理视频转码和媒体安全检查
 * @author Augment AI
 * @date 2025-06-27
 * @version 1.0.0
 * @since 1.0.0
 */

import { z } from "zod";
import path from 'path';
import { createTRPCRouter, authProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCErrorHandler } from "@/lib/errors/trpc-error-handler";
import {
  getVideoInfo,
  convertVideoForWeb,
  generateCompatibleFilename,
  checkFFmpegAvailable
} from '@/lib/video-converter';
import { cdnSecurity } from '@/lib/media/cdn-security-middleware';
import { cdnConfig } from '@/lib/media/cdn-config-manager';

/**
 * 视频转码输入
 */
const ConvertVideoInput = z.object({
  filePath: z.string().min(1, "文件路径不能为空"),
  options: z.object({
    quality: z.enum(['low', 'medium', 'high']).optional(),
    maxWidth: z.number().positive().optional(),
    maxHeight: z.number().positive().optional(),
    preserveAudio: z.boolean().optional(),
  }).optional(),
});

/**
 * 视频信息输出
 */
const VideoInfoOutput = z.object({
  duration: z.number(),
  width: z.number(),
  height: z.number(),
  format: z.string(),
  codec: z.string(),
  bitrate: z.number(),
  isCompatible: z.boolean(),
  size: z.number(),
});

/**
 * CDN安全操作输入
 */
const CdnSecurityActionInput = z.object({
  action: z.enum(['stats', 'config', 'blocked-ips', 'block-ip', 'unblock-ip', 'update-config']),
  data: z.object({
    ip: z.string().optional(),
    config: z.any().optional(),
  }).optional(),
});

/**
 * 媒体处理路由
 * 迁移自: /api/convert-video 和 /api/media/security
 */
export const mediaProcessingRouter = createTRPCRouter({
  /**
   * 视频转码
   * 迁移自: POST /api/convert-video
   */
  convertVideo: authProcedure
    .input(ConvertVideoInput)
    .output(z.object({
      success: z.boolean(),
      message: z.string(),
      originalInfo: VideoInfoOutput.optional(),
      convertedInfo: VideoInfoOutput.optional(),
      originalPath: z.string().optional(),
      convertedPath: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }): Promise<any> => {
      try {
        const { filePath, options = {} } = input;

        // 检查 FFmpeg 是否可用
        const ffmpegAvailable = await checkFFmpegAvailable();
        if (!ffmpegAvailable) {
          throw TRPCErrorHandler.internalError('FFmpeg 未安装或不可用');
        }

        // 构建完整文件路径
        const fullPath = path.join(process.cwd(), 'public', filePath);

        // 获取视频信息
        const videoInfo = await getVideoInfo(fullPath);

        // 如果已经兼容，直接返回
        if (videoInfo.isCompatible) {
          return {
            success: true,
            message: '视频已经是兼容格式',
            originalInfo: videoInfo,
            originalPath: filePath,
          };
        }

        // 生成输出文件路径
        const outputPath = generateCompatibleFilename(fullPath);
        const relativeOutputPath = path.relative(
          path.join(process.cwd(), 'public'),
          outputPath
        );

        // 执行转码
        await convertVideoForWeb(fullPath, outputPath, {
          quality: 'medium',
          maxWidth: 1920,
          maxHeight: 1080,
          preserveAudio: true,
          ...options
        });

        // 获取转码后的视频信息
        const convertedVideoInfo = await getVideoInfo(outputPath);

        return {
          success: true,
          message: '视频转码完成',
          originalInfo: videoInfo,
          convertedInfo: convertedVideoInfo,
          originalPath: filePath,
          convertedPath: `/${relativeOutputPath.replace(/\\/g, '/')}`,
        };

      } catch (error) {
        console.error('视频转码失败:', error);

        if (error instanceof Error && 'code' in error) {
          throw error;
        }

        throw TRPCErrorHandler.internalError(
          '视频转码失败',
          { context: { details: error instanceof Error ? error.message : '未知错误' } }
        );
      }
    }),

  /**
   * 获取视频信息
   */
  getVideoInfo: authProcedure
    .input(z.object({ filePath: z.string() }))
    .output(VideoInfoOutput)
    .query(async ({ input }): Promise<any> => {
      try {
        const fullPath = path.join(process.cwd(), 'public', input.filePath);
        return await getVideoInfo(fullPath);
      } catch (error) {
        console.error('获取视频信息失败:', error);
        throw TRPCErrorHandler.internalError('获取视频信息失败');
      }
    }),

  /**
   * 检查FFmpeg可用性
   */
  checkFFmpegAvailable: authProcedure
    .output(z.object({ available: z.boolean() }))
    .query(async () => {
      try {
        const available = await checkFFmpegAvailable();
        return { available };
      } catch (error) {
        console.error('检查FFmpeg可用性失败:', error);
        return { available: false };
      }
    }),

  /**
   * CDN安全统计信息
   * 迁移自: GET /api/media/security?action=stats
   */
  getCdnSecurityStats: authProcedure
    .output(z.object({
      success: z.boolean(),
      data: z.any(),
    }))
    .query(async () => {
      try {
        const stats = cdnSecurity.getAccessStats();
        return {
          success: true,
          data: stats,
        };
      } catch (error) {
        console.error('获取CDN安全统计失败:', error);
        throw TRPCErrorHandler.internalError('获取CDN安全统计失败');
      }
    }),

  /**
   * CDN安全配置
   * 迁移自: GET /api/media/security?action=config
   */
  getCdnSecurityConfig: authProcedure
    .output(z.object({
      success: z.boolean(),
      data: z.any(),
    }))
    .query(async () => {
      try {
        const config = cdnConfig.getSecurityConfig();
        return {
          success: true,
          data: config,
        };
      } catch (error) {
        console.error('获取CDN安全配置失败:', error);
        throw TRPCErrorHandler.internalError('获取CDN安全配置失败');
      }
    }),

  /**
   * 获取被封禁的IP列表
   * 迁移自: GET /api/media/security?action=blocked-ips
   */
  getBlockedIPs: authProcedure
    .output(z.object({
      success: z.boolean(),
      data: z.array(z.string()),
    }))
    .query(async () => {
      try {
        const blockedIPs = cdnSecurity.getBlockedIPs();
        return {
          success: true,
          data: blockedIPs,
        };
      } catch (error) {
        console.error('获取被封禁IP列表失败:', error);
        throw TRPCErrorHandler.internalError('获取被封禁IP列表失败');
      }
    }),

  /**
   * 封禁IP
   * 迁移自: POST /api/media/security (action=block-ip)
   */
  blockIP: authProcedure
    .input(z.object({ ip: z.string().min(1, "IP地址不能为空") }))
    .output(z.object({
      success: z.boolean(),
      message: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        cdnSecurity.blockIP(input.ip);
        return {
          success: true,
          message: `IP ${input.ip} 已被封禁`,
        };
      } catch (error) {
        console.error('封禁IP失败:', error);
        throw TRPCErrorHandler.internalError('封禁IP失败');
      }
    }),

  /**
   * 解封IP
   * 迁移自: POST /api/media/security (action=unblock-ip)
   */
  unblockIP: authProcedure
    .input(z.object({ ip: z.string().min(1, "IP地址不能为空") }))
    .output(z.object({
      success: z.boolean(),
      message: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        cdnSecurity.unblockIP(input.ip);
        return {
          success: true,
          message: `IP ${input.ip} 已被解封`,
        };
      } catch (error) {
        console.error('解封IP失败:', error);
        throw TRPCErrorHandler.internalError('解封IP失败');
      }
    }),

  /**
   * 更新CDN安全配置
   * 迁移自: POST /api/media/security (action=update-config)
   */
  updateCdnSecurityConfig: authProcedure
    .input(z.object({ config: z.any() }))
    .output(z.object({
      success: z.boolean(),
      message: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const success = cdnConfig.updateConfig(input.config);
        if (success) {
          return {
            success: true,
            message: '配置已更新',
          };
        } else {
          throw TRPCErrorHandler.validationError('配置更新失败');
        }
      } catch (error) {
        console.error('更新CDN安全配置失败:', error);

        if (error instanceof Error && 'code' in error) {
          throw error;
        }

        throw TRPCErrorHandler.internalError('更新CDN安全配置失败');
      }
    }),

  /**
   * 验证媒体文件访问权限
   * 迁移自: HEAD /api/media/security
   */
  validateMediaAccess: publicProcedure
    .input(z.object({
      url: z.string(),
      userAgent: z.string().optional(),
      referer: z.string().optional(),
      ip: z.string().optional(),
    }))
    .output(z.object({
      allowed: z.boolean(),
      status: z.number(),
      reason: z.string().optional(),
    }))
    .query(async ({ input }) => {
      try {
        // 模拟NextRequest对象
        const mockRequest = {
          url: input.url,
          headers: new Map([
            ['user-agent', input.userAgent || ''],
            ['referer', input.referer || ''],
            ['x-forwarded-for', input.ip || ''],
          ]),
        } as any;

        const validation = await cdnSecurity.validateRequest(mockRequest);

        return {
          allowed: validation.allowed,
          status: validation.status,
          reason: validation.reason,
        };
      } catch (error) {
        console.error('验证媒体文件访问权限失败:', error);
        return {
          allowed: false,
          status: 500,
          reason: '服务器内部错误',
        };
      }
    }),
});
