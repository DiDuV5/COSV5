/**
 * @fileoverview 文件访问控制 tRPC 路由
 * @description 处理文件访问权限验证和重定向
 * @author Augment AI
 * @date 2025-06-28
 * @version 1.0.0
 */

import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../../trpc';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { prisma } from '@/lib/prisma';

/**
 * 获取R2存储的公共URL
 */
function getR2PublicUrl(filePath: string): string {
  const baseUrl = process.env.COSEREEDEN_CLOUDFLARE_R2_PUBLIC_URL || 'https://cc.tutu365.cc';
  return `${baseUrl}/media/${filePath}`;
}

/**
 * 检查用户是否有权限访问文件
 */
async function checkFilePermission(
  userId: string | undefined,
  userLevel: string | undefined,
  filePath: string
): Promise<{ allowed: boolean; reason?: string }> {
  // 如果用户未登录，只允许访问公共文件
  if (!userId) {
    // 只允许访问公共目录下的文件
    if (filePath.startsWith('public/') || filePath.startsWith('avatars/')) {
      return { allowed: true };
    }
    return { allowed: false, reason: '需要登录才能访问此文件' };
  }

  // 检查是否是管理员
  if (userLevel === 'ADMIN' || userLevel === 'SUPER_ADMIN') {
    return { allowed: true };
  }

  // 检查文件是否属于用户
  try {
    // 从文件路径中提取用户信息
    const pathParts = filePath.split('/');

    // 如果路径包含用户ID，检查是否匹配
    if (pathParts.includes(userId)) {
      return { allowed: true };
    }

    // 检查数据库中的媒体记录
    const media = await prisma.postMedia.findFirst({
      where: {
        OR: [
          { url: { contains: filePath } },
          { thumbnailUrl: { contains: filePath } }
        ]
      },
      include: {
        post: {
          select: {
            authorId: true,
            isPublic: true
          }
        }
      }
    });

    if (media) {
      // 如果是公开内容，允许访问
      if (media.post?.isPublic) {
        return { allowed: true };
      }

      // 如果是文件所有者，允许访问
      if (media.post?.authorId === userId) {
        return { allowed: true };
      }
    }

    return { allowed: false, reason: '无权限访问此文件' };
  } catch (error) {
    console.error('文件权限检查错误:', error);
    return { allowed: false, reason: '权限验证失败' };
  }
}

export const fileAccessRouter = createTRPCRouter({
  /**
   * 获取文件访问URL
   */
  getFileUrl: publicProcedure
    .input(z.object({
      path: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { path: filePath } = input;

      // 安全检查：防止路径遍历攻击
      if (filePath.includes('..') || filePath.includes('\\')) {
        throw TRPCErrorHandler.forbidden('非法文件路径');
      }

      // 检查权限
      const permission = await checkFilePermission(
        ctx.session?.user?.id,
        ctx.session?.user?.userLevel,
        filePath
      );

      if (!permission.allowed) {
        throw TRPCErrorHandler.forbidden(permission.reason || '无权限访问此文件');
      }

      // 返回R2存储URL
      const r2Url = getR2PublicUrl(filePath);
      
      return {
        url: r2Url,
        allowed: true,
      };
    }),

  /**
   * 检查文件访问权限
   */
  checkPermission: publicProcedure
    .input(z.object({
      path: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { path: filePath } = input;

      // 安全检查：防止路径遍历攻击
      if (filePath.includes('..') || filePath.includes('\\')) {
        return {
          allowed: false,
          reason: '非法文件路径'
        };
      }

      // 检查权限
      const permission = await checkFilePermission(
        ctx.session?.user?.id,
        ctx.session?.user?.userLevel,
        filePath
      );

      return permission;
    }),
});
