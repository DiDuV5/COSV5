/**
 * @fileoverview tRPC 服务器配置
 * @description 配置 tRPC 服务器实例和中间件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/server: ^11.4.2
 * - next-auth: ^4.24.0
 * - superjson: ^2.2.0
 * - zod: ^3.22.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { initTRPC } from "@trpc/server";
import { type Session } from "next-auth";
import superjson from "superjson";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { initializeAuthSystem as _initializeAuthSystem } from "@/lib/auth/auth-init";
import { createRepositories, type RepositoryContainer as _RepositoryContainer } from "@/lib/repositories/repository-manager";
import { initializeServer as _initializeServer } from "@/lib/server-init";
import { type UserLevel } from "@/types/user-level";
// 权限中间件已迁移到统一认证中间件

/**
 * 1. CONTEXT
 *
 * 这个部分定义了传递给 tRPC 路由的"上下文"。
 * 它允许你访问数据库、会话等。
 */

type CreateContextOptions = {
  session: Session | null;
};

/**
 * 这个辅助函数生成"内部"上下文，不依赖于请求。
 */
const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    session: opts.session,
    prisma,
    db: prisma, // 添加 db 别名以保持兼容性
    repositories: createRepositories(prisma), // 添加Repository容器
  };
};

/**
 * 这是实际的上下文，你将在你的路由中使用。
 * 它将用于每个请求。
 *
 * @see https://trpc.io/docs/context
 */
export const createTRPCContext = async (opts: {
  req?: Request;
  res?: Response | undefined;
  headers?: Headers;
}) => {
  // 恢复正常的会话获取
  let session: Session | null = null;
  try {
    // 在App Router中，我们需要在请求上下文中获取session
    if (typeof window === 'undefined') {
      // 服务器端环境
      try {
        // 尝试从request headers中获取cookies
        if (opts.req) {
          const cookieHeader = opts.req.headers.get('cookie');
          console.log('Cookie header存在:', !!cookieHeader);

          if (cookieHeader) {
            // 解析cookie字符串
            const cookies = cookieHeader.split(';').reduce((acc: Record<string, string>, cookie) => {
              const [name, value] = cookie.trim().split('=');
              if (name && value) {
                acc[name] = decodeURIComponent(value);
              }
              return acc;
            }, {});

            // 查找NextAuth session token
            const sessionTokenNames = [
              'cosereeden.session-token',
              'next-auth.session-token',
              '__Secure-next-auth.session-token',
              'authjs.session-token',
              '__Secure-authjs.session-token'
            ];

            let sessionToken: string | null = null;
            for (const tokenName of sessionTokenNames) {
              if (cookies[tokenName]) {
                sessionToken = cookies[tokenName];
                console.log('找到session token:', tokenName);
                break;
              }
            }

            if (sessionToken) {
              // 手动解析JWT token
              try {
                const { decode } = await import("next-auth/jwt");
                const token = await decode({
                  token: sessionToken,
                  secret: process.env.NEXTAUTH_SECRET || process.env.COSEREEDEN_NEXTAUTH_SECRET!,
                });

                if (token) {
                  session = {
                    user: {
                      id: token.id as string,
                      username: token.username as string,
                      email: token.email as string,
                      name: token.name as string,
                      userLevel: token.userLevel as UserLevel,
                      isVerified: token.isVerified as boolean,
                      canPublish: token.canPublish as boolean,
                      approvalStatus: token.approvalStatus as string,
                      emailVerified: token.emailVerified as Date | null,
                      isActive: token.isActive as boolean,
                      avatarUrl: token.avatarUrl as string | null,
                      displayName: token.displayName as string | null,
                    },
                    expires: new Date((typeof token.exp === 'number' ? token.exp : Date.now() / 1000 + 3600) * 1000).toISOString(),
                  };
                  console.log('JWT解码成功');
                }
              } catch (decodeError) {
                console.warn('JWT解码失败:', decodeError);
              }
            } else {
              console.log('未找到session token，可用cookies:', Object.keys(cookies));
            }
          }
        }

        // 如果上面的方法失败，尝试传统方式
        if (!session) {
          try {
            const { getServerSession } = await import("next-auth");
            const { authOptions } = await import("@/lib/auth");
            session = await getServerSession(authOptions);
          } catch (fallbackError) {
            console.warn('回退session获取失败:', fallbackError);
          }
        }

        // 开发环境临时解决方案：如果仍然没有session，提供默认管理员session
        // 暂时禁用此功能以修复前端状态不一致问题
        // eslint-disable-next-line no-constant-condition, no-constant-binary-expression
        if (false) {
          // 开发环境功能已禁用 - 此代码块不会执行
        }
      } catch (contextError) {
        console.warn('请求上下文获取失败:', contextError);
      }
    }

    // 调试日志
    if (session?.user) {
      console.log('tRPC会话获取成功:', {
        userId: session.user.id,
        username: session.user.username,
        userLevel: session.user.userLevel
      });
    } else {
      console.log('tRPC会话获取失败: 用户未登录或会话无效');
      // 添加更详细的调试信息
      if (opts.req) {
        const cookieHeader = opts.req.headers.get('cookie');
        console.log('Cookie header:', cookieHeader ? '存在' : '不存在');
        console.log('Request URL:', opts.req.url);
      }
    }
  } catch (error) {
    console.warn("获取会话失败:", error);
  }

  // 注意：移除了tRPC上下文中的初始化检查，避免每个API请求都触发初始化
  // 初始化现在在应用启动时进行，而不是在每个请求中检查
  // 这解决了重复初始化导致的3000ms+响应时间问题

  return createInnerTRPCContext({
    session,
  });
};



/**
 * 2. INITIALIZATION
 *
 * 这是初始化 tRPC 后端的地方。我们使用 superjson 库来允许我们
 * 传输 Date、Map、Set 等。
 */

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * 3. ROUTER & PROCEDURE HELPERS
 *
 * 这些是你将用来构建你的 tRPC API 的辅助函数。
 */

/**
 * 这是你创建新路由和子路由的方式
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * 公共（未认证）过程
 *
 * 这是任何人都可以查询的基本过程类型。
 */
export const publicProcedure = t.procedure;

// 废弃的认证中间件已移除，请使用新的统一认证中间件：
// - authProcedure: 基础认证
// - verifiedUserProcedure: 验证用户认证
// - creatorProcedure: 创作者认证
// - adminProcedure: 管理员认证
// - superAdminProcedure: 超级管理员认证

/**
 * 新的统一认证中间件 - 推荐使用
 */

/** 基础认证中间件 */
export const authProcedure = t.procedure.use(async ({ ctx, next }) => {
  const { basicAuth } = await import('@/lib/auth/unified-auth-middleware');
  const authenticatedCtx = await basicAuth(ctx);
  return next({ ctx: authenticatedCtx });
});

/** 验证用户中间件 */
export const verifiedUserProcedure = t.procedure.use(async ({ ctx, next }) => {
  const { verifiedAuth } = await import('@/lib/auth/unified-auth-middleware');
  const authenticatedCtx = await verifiedAuth(ctx);
  return next({ ctx: authenticatedCtx });
});

/** 创作者中间件 */
export const creatorProcedure = t.procedure.use(async ({ ctx, next }) => {
  const { creatorAuth } = await import('@/lib/auth/unified-auth-middleware');
  const authenticatedCtx = await creatorAuth(ctx);
  return next({ ctx: authenticatedCtx });
});

/** 管理员中间件 */
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  const { adminAuth } = await import('@/lib/auth/unified-auth-middleware');
  const authenticatedCtx = await adminAuth(ctx);
  return next({ ctx: authenticatedCtx });
});

/** 超级管理员中间件 */
export const superAdminProcedure = t.procedure.use(async ({ ctx, next }) => {
  const { superAdminAuth } = await import('@/lib/auth/unified-auth-middleware');
  const authenticatedCtx = await superAdminAuth(ctx);
  return next({ ctx: authenticatedCtx });
});

/** 上传权限中间件 */
export const uploadProcedure = t.procedure.use(async ({ ctx, next }) => {
  const { uploadAuth } = await import('@/lib/auth/unified-auth-middleware');
  const authenticatedCtx = await uploadAuth(ctx);
  return next({ ctx: authenticatedCtx });
});

/** 图片上传中间件 */
export const imageUploadProcedure = t.procedure.use(async ({ ctx, next }) => {
  const { imageUploadAuth } = await import('@/lib/auth/unified-auth-middleware');
  const authenticatedCtx = await imageUploadAuth(ctx);
  return next({ ctx: authenticatedCtx });
});

/** 视频上传中间件 */
export const videoUploadProcedure = t.procedure.use(async ({ ctx, next }) => {
  const { unifiedAuthMiddleware } = await import('@/lib/auth/unified-auth-middleware');
  const authenticatedCtx = await unifiedAuthMiddleware(ctx, {
    requireActive: true,
    requiredPermissions: ['UPLOAD_VIDEOS'],
    operation: '上传视频',
  });
  return next({ ctx: authenticatedCtx });
});
