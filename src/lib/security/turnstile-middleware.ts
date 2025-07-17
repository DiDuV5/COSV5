/**
 * @fileoverview Turnstile tRPC中间件
 * @description 为tRPC提供Turnstile验证中间件，遵循12-Factor App原则
 * @author Augment AI
 * @date 2025-07-10
 * @version 2.0.0
 */

import { z } from 'zod';
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import {
  createTRPCRouter,
  publicProcedure,
  adminProcedure,
  type createTRPCContext
} from '@/server/api/trpc';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import {
  validateTurnstileToken,
  createTurnstileValidationError
} from './turnstile-validator';
import { turnstileFeatureManager } from './turnstile-server-config';
import {
  turnstileFallbackManager,
  SecurityLevel,
  FEATURE_SECURITY_LEVELS
} from './turnstile-fallback-manager';
import type { TurnstileFeatureId } from '@/types/turnstile';

/**
 * 创建本地tRPC实例用于中间件，使用正确的上下文类型
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

/**
 * Turnstile验证输入Schema
 */
export const turnstileTokenSchema = z.object({
  turnstileToken: z.string().optional()
});

/**
 * 扩展输入Schema以包含Turnstile token
 */
export function withTurnstileToken<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.extend({
    turnstileToken: z.string().optional()
  });
}

/**
 * 创建Turnstile验证中间件
 */
export function createTurnstileMiddleware(featureId: TurnstileFeatureId) {
  return t.middleware(async ({ ctx, next, input }) => {
    try {
      // 检查功能是否启用
      const isEnabled = await turnstileFeatureManager.isFeatureEnabled(featureId);

      if (!isEnabled) {
        // 功能未启用，跳过验证
        console.log(`🔓 Turnstile功能 ${featureId} 未启用，跳过验证`);
        return next({ ctx });
      }

      // 检查是否应该降级
      if (turnstileFallbackManager.shouldFallback(featureId)) {
        const fallbackState = turnstileFallbackManager.getFallbackState(featureId);
        const securityLevel = FEATURE_SECURITY_LEVELS[featureId] || SecurityLevel.MEDIUM;

        // 根据安全级别决定降级行为
        if (securityLevel === SecurityLevel.CRITICAL) {
          console.warn(`🔒 关键操作${featureId}不允许降级，强制验证`);
          // 继续正常验证流程
        } else {
          console.warn(`🔄 使用Turnstile降级模式: ${featureId}, 原因: ${fallbackState?.reason}`);

          // 降级成功，跳过验证
          return next({
            ctx: {
              ...ctx,
              turnstileValidation: {
                featureId,
                success: true,
                timestamp: new Date(),
                responseTime: 0,
                fallbackUsed: true,
                fallbackReason: fallbackState?.reason
              }
            }
          });
        }
      }

      // 获取客户端IP
      const clientIp = getClientIp(ctx);

      // 从输入中提取token
      const turnstileToken = extractTurnstileToken(input);

      if (!turnstileToken) {
        // 检查是否可以在缺少token时降级
        if (turnstileFallbackManager.shouldFallback(featureId)) {
          const securityLevel = FEATURE_SECURITY_LEVELS[featureId] || SecurityLevel.MEDIUM;

          if (securityLevel !== SecurityLevel.CRITICAL) {
            console.warn(`🔄 缺少token但使用降级模式: ${featureId}`);
            return next({
              ctx: {
                ...ctx,
                turnstileValidation: {
                  featureId,
                  success: true,
                  timestamp: new Date(),
                  responseTime: 0,
                  fallbackUsed: true,
                  fallbackReason: 'missing_token_fallback'
                }
              }
            });
          }
        }

        console.warn(`❌ 缺少Turnstile token: ${featureId}`);
        throw TRPCErrorHandler.validationError('请完成人机验证');
      }

      // 验证token
      const validationResult = await validateTurnstileToken(
        turnstileToken,
        clientIp,
        featureId
      );

      if (!validationResult.success) {
        console.warn(`❌ Turnstile验证失败: ${featureId}`, {
          errorCode: validationResult.errorCode,
          errorMessage: validationResult.errorMessage,
          responseTime: validationResult.responseTime
        });

        createTurnstileValidationError(validationResult);
      }

      // 检查是否使用了降级模式
      if (validationResult.fallbackUsed) {
        console.log(`🔄 Turnstile验证使用降级模式: ${featureId}`, {
          responseTime: validationResult.responseTime,
          message: validationResult.message
        });
      } else {
        console.log(`✅ Turnstile验证成功: ${featureId}`, {
          responseTime: validationResult.responseTime,
          hostname: validationResult.hostname
        });
      }

      // 验证成功（包括降级），继续执行
      return next({
        ctx: {
          ...ctx,
          turnstileValidation: {
            featureId,
            success: true,
            timestamp: validationResult.timestamp,
            responseTime: validationResult.responseTime,
            fallbackUsed: validationResult.fallbackUsed,
            hostname: validationResult.hostname
          }
        }
      });

    } catch (error) {
      // 其他错误，包装为内部错误
      console.error(`❌ Turnstile中间件异常: ${featureId}`, error);
      throw TRPCErrorHandler.internalError('人机验证服务暂时不可用');
    }
  });
}

/**
 * 获取客户端IP地址
 */
function getClientIp(ctx: any): string | undefined {
  // 尝试从不同的来源获取客户端IP
  const sources = [
    ctx.req?.headers?.['x-forwarded-for'],
    ctx.req?.headers?.['x-real-ip'],
    ctx.req?.headers?.['cf-connecting-ip'], // Cloudflare
    ctx.req?.connection?.remoteAddress,
    ctx.req?.socket?.remoteAddress,
    ctx.req?.ip
  ];

  for (const source of sources) {
    if (source) {
      // 处理x-forwarded-for可能包含多个IP的情况
      const ip = Array.isArray(source) ? source[0] : source.split(',')[0];
      if (ip && ip.trim()) {
        return ip.trim();
      }
    }
  }

  return undefined;
}

/**
 * 从输入中提取Turnstile token
 */
function extractTurnstileToken(input: unknown): string | undefined {
  if (!input || typeof input !== 'object') {
    return undefined;
  }

  const inputObj = input as Record<string, unknown>;
  const token = inputObj.turnstileToken;

  if (typeof token === 'string' && token.trim()) {
    return token.trim();
  }

  return undefined;
}

/**
 * 创建带Turnstile验证的procedure
 */
export function createTurnstileProcedure(featureId: TurnstileFeatureId) {
  const middleware = createTurnstileMiddleware(featureId);
  return t.procedure.use(middleware);
}

/**
 * 预定义的Turnstile procedures
 */
export const turnstileProcedures = {
  /** 用户注册验证 */
  userRegister: createTurnstileProcedure('USER_REGISTER'),

  /** 用户登录验证 */
  userLogin: createTurnstileProcedure('USER_LOGIN'),

  /** 密码重置验证 */
  passwordReset: createTurnstileProcedure('PASSWORD_RESET'),

  /** 游客评论验证 */
  guestComment: createTurnstileProcedure('GUEST_COMMENT')
};

/**
 * 条件性Turnstile验证中间件
 * 根据条件决定是否启用验证
 */
export function createConditionalTurnstileMiddleware(
  featureId: TurnstileFeatureId,
  condition: (ctx: any, input: any) => boolean | Promise<boolean>
) {
  return t.middleware(async ({ ctx, next, input }) => {
    try {
      // 检查条件
      const shouldValidate = await condition(ctx, input);

      if (!shouldValidate) {
        console.log(`🔓 条件不满足，跳过Turnstile验证: ${featureId}`);
        return next({ ctx });
      }

      // 执行正常的Turnstile验证 - 直接调用验证逻辑
      // 检查功能是否启用
      const isEnabled = await turnstileFeatureManager.isFeatureEnabled(featureId);

      if (!isEnabled) {
        console.log(`🔓 Turnstile功能 ${featureId} 未启用，跳过验证`);
        return next({ ctx });
      }

      // 获取客户端IP
      const clientIp = getClientIp(ctx);

      // 从输入中提取token
      const turnstileToken = extractTurnstileToken(input);

      if (!turnstileToken) {
        console.warn(`❌ 缺少Turnstile token: ${featureId}`);
        throw TRPCErrorHandler.validationError('请完成人机验证');
      }

      // 验证token
      const validationResult = await validateTurnstileToken(
        turnstileToken,
        clientIp,
        featureId
      );

      if (!validationResult.success) {
        console.warn(`❌ Turnstile验证失败: ${featureId}`, {
          errorCode: validationResult.errorCode,
          errorMessage: validationResult.errorMessage,
          responseTime: validationResult.responseTime
        });

        createTurnstileValidationError(validationResult);
      }

      console.log(`✅ Turnstile验证成功: ${featureId}`, {
        responseTime: validationResult.responseTime,
        hostname: validationResult.hostname
      });

      // 验证成功，继续执行
      return next({
        ctx: {
          ...ctx,
          turnstileValidation: {
            featureId,
            success: true,
            timestamp: validationResult.timestamp,
            responseTime: validationResult.responseTime
          }
        }
      });

    } catch (error) {
      console.error(`❌ 条件性Turnstile中间件异常: ${featureId}`, error);
      throw error;
    }
  });
}

/**
 * 游客评论专用中间件
 * 只对游客用户进行验证，已登录用户跳过
 */
export const guestCommentTurnstileMiddleware = createConditionalTurnstileMiddleware(
  'GUEST_COMMENT',
  (ctx) => {
    // 如果用户已登录，跳过验证
    return !ctx.session?.user;
  }
);

/**
 * 创建带条件验证的procedure
 */
export function createConditionalTurnstileProcedure(
  featureId: TurnstileFeatureId,
  condition: (ctx: any, input: any) => boolean | Promise<boolean>
) {
  const middleware = createConditionalTurnstileMiddleware(featureId, condition);
  return t.procedure.use(middleware);
}

/**
 * 游客评论专用procedure
 */
export const guestCommentProcedure = t.procedure.use(guestCommentTurnstileMiddleware);

/**
 * Turnstile验证结果类型扩展
 */
declare module '@/server/api/trpc' {
  interface Context {
    turnstileValidation?: {
      featureId: TurnstileFeatureId;
      success: boolean;
      timestamp: Date;
      responseTime: number;
    };
  }
}

/**
 * 验证辅助函数
 */
export const TurnstileMiddlewareUtils = {
  /**
   * 检查请求是否包含有效的Turnstile token
   */
  hasValidToken: (input: unknown): boolean => {
    const token = extractTurnstileToken(input);
    return !!token && token.length > 0;
  },

  /**
   * 从上下文中获取验证结果
   */
  getValidationResult: (ctx: any) => {
    return ctx.turnstileValidation;
  },

  /**
   * 检查验证是否成功
   */
  isValidationSuccessful: (ctx: any): boolean => {
    const result = ctx.turnstileValidation;
    return result?.success === true;
  },

  /**
   * 获取验证响应时间
   */
  getValidationResponseTime: (ctx: any): number | undefined => {
    return ctx.turnstileValidation?.responseTime;
  }
};

/**
 * 错误处理辅助函数
 */
export const TurnstileErrorUtils = {
  /**
   * 检查错误是否为Turnstile相关
   */
  isTurnstileError: (error: unknown): boolean => {
    return error instanceof TRPCError &&
           ((error as any).cause === 'MISSING_TURNSTILE_TOKEN' ||
            error.code === 'BAD_REQUEST' &&
            error.message.includes('人机验证'));
  },

  /**
   * 创建用户友好的错误消息
   */
  createUserFriendlyMessage: (error: TRPCError): string => {
    if ((error as any).cause === 'MISSING_TURNSTILE_TOKEN') {
      return '请完成人机验证后再试';
    }

    if (error.message.includes('验证已过期')) {
      return '验证已过期，请刷新页面重新验证';
    }

    if (error.message.includes('验证失败')) {
      return '人机验证失败，请重新验证';
    }

    return '验证出现问题，请稍后重试';
  }
};
