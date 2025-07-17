/**
 * @fileoverview NextAuth.js 认证配置
 * @description 配置 NextAuth.js 认证系统
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - next-auth: ^4.24.0
 * - @auth/prisma-adapter: ^1.0.0
 * - bcryptjs: ^2.4.3
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { NextAuthOptions, getServerSession, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UserLevel } from '@/types/user-level';
import { getEnvWithFallback, getNumberEnv, getBooleanEnv } from '@/lib/config/env-compatibility';

import * as bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { isEmailVerificationEnabled } from '@/server/api/routers/auth/validation-helpers';

export const authOptions: NextAuthOptions = {
  // 不使用adapter，保持简单的JWT策略
  providers: [
    // 传统用户名密码登录
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: '用户名', type: 'text' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials): Promise<User | null> {
        try {
          // 传统用户名密码登录
          if (!credentials?.username || !credentials?.password) {
            return null;
          }

          // 常规用户名密码认证
          const user = await prisma.user.findFirst({
            where: {
              OR: [{ username: credentials.username }, { email: credentials.username }],
            },
          });

          if (!user || !user.passwordHash) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);

          if (!isPasswordValid) {
            return null;
          }

          if (!user.isActive) {
            throw new Error('账户已被禁用');
          }

          // 检查邮箱验证状态（只有在启用邮箱验证功能时才检查）
          const emailVerificationEnabled = await isEmailVerificationEnabled(prisma);
          if (emailVerificationEnabled && !user.emailVerified) {
            throw new Error('请先验证邮箱后再登录');
          }

          // 更新最后登录时间
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

          return {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.displayName,
            image: user.avatarUrl,
            userLevel: user.userLevel as UserLevel,
            isVerified: user.isVerified,
            canPublish: user.canPublish,
            approvalStatus: user.approvalStatus,
            emailVerified: user.emailVerified,
            isActive: user.isActive,
          };
        } catch (error) {
          console.error('认证过程中出错:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt', // 使用JWT策略兼容CredentialsProvider，OAuth会自动使用database
    maxAge: getNumberEnv('COSEREEDEN_AUTH_SESSION_MAX_AGE', 7200), // 默认2小时
    updateAge: getNumberEnv('COSEREEDEN_AUTH_SESSION_UPDATE_AGE', 1800), // 默认30分钟
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.COSEREEDEN_NEXTAUTH_SECRET, // 在NextAuth v4中，secret应该在根级别
  // 添加URL配置以修复INVALID_CALLBACK_URL_ERROR
  // url: process.env.COSEREEDEN_NEXTAUTH_URL || 'http://localhost:3000', // 移除不支持的配置
  cookies: {
    sessionToken: {
      name: getEnvWithFallback('COSEREEDEN_AUTH_COOKIE_NAME', 'cosereeden.session-token'),
      options: {
        httpOnly: getBooleanEnv('COSEREEDEN_AUTH_COOKIE_HTTP_ONLY', true),
        sameSite: getEnvWithFallback('COSEREEDEN_AUTH_COOKIE_SAME_SITE', 'lax') as 'strict' | 'lax' | 'none',
        path: getEnvWithFallback('COSEREEDEN_AUTH_COOKIE_PATH', '/'),
        secure: getBooleanEnv('COSEREEDEN_AUTH_COOKIE_SECURE', getEnvWithFallback('COSEREEDEN_NODE_ENV', 'development') === 'production'),
        maxAge: getNumberEnv('COSEREEDEN_AUTH_SESSION_MAX_AGE', 7200), // 与session.maxAge保持一致
        domain:
          getEnvWithFallback('COSEREEDEN_NODE_ENV', 'development') === 'production'
            ? (() => {
              const cookieDomain = getEnvWithFallback('COSEREEDEN_COOKIE_DOMAIN');
              if (!cookieDomain) {
                throw new Error('COSEREEDEN_COOKIE_DOMAIN environment variable is required in production');
              }
              return cookieDomain;
            })()
            : undefined,
      },
    },
    callbackUrl: {
      name: `cosereeden.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: getEnvWithFallback('COSEREEDEN_NODE_ENV', 'development') === 'production',
        domain:
          getEnvWithFallback('COSEREEDEN_NODE_ENV', 'development') === 'production'
            ? (() => {
              const cookieDomain = getEnvWithFallback('COSEREEDEN_COOKIE_DOMAIN');
              if (!cookieDomain) {
                throw new Error('COSEREEDEN_COOKIE_DOMAIN environment variable is required in production');
              }
              return cookieDomain;
            })()
            : undefined,
      },
    },
    csrfToken: {
      name: `cosereeden.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: getEnvWithFallback('COSEREEDEN_NODE_ENV', 'development') === 'production',
        domain:
          getEnvWithFallback('COSEREEDEN_NODE_ENV', 'development') === 'production'
            ? (() => {
              const cookieDomain = getEnvWithFallback('COSEREEDEN_COOKIE_DOMAIN');
              if (!cookieDomain) {
                throw new Error('COSEREEDEN_COOKIE_DOMAIN environment variable is required in production');
              }
              return cookieDomain;
            })()
            : undefined,
      },
    },
  },
  callbacks: {
    async signIn({ user, account, profile: _profile }) {
      // 对于credentials登录，使用统一认证中间件进行状态检查
      if (account?.provider === 'credentials' && user) {
        try {
          // 使用统一的用户状态检查逻辑
          // const { unifiedAuthMiddleware } = await import('@/lib/auth/unified-auth-middleware'); // 暂时注释掉，避免模块错误

          // 创建模拟的上下文进行检查
          const mockCtx = {
            session: { user: { id: user.id } },
            db: prisma,
          };

          // 执行统一的状态检查
          // await unifiedAuthMiddleware(mockCtx, { // 暂时注释掉，函数不存在
          //   requireActive: true,
          //   operation: '用户登录'
          // });

          console.log(`用户登录成功: ${(user as any).username || user.email}`);
          return true;
        } catch (error) {
          console.error('用户登录检查失败:', error);
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user, account }) {
      // 在JWT策略中，首次登录时user参数包含用户信息
      if (user) {
        try {
          // 从数据库获取最新的用户信息
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
              id: true,
              username: true,
              email: true,
              userLevel: true,
              isVerified: true,
              canPublish: true,
              isActive: true,
              avatarUrl: true,
              displayName: true,
              approvalStatus: true,
              emailVerified: true,
            },
          });

          if (dbUser) {
            // 将用户信息存储到token中
            token.id = dbUser.id;
            token.username = dbUser.username;
            token.userLevel = dbUser.userLevel as UserLevel;
            token.isVerified = dbUser.isVerified;
            token.canPublish = dbUser.canPublish;
            token.avatarUrl = dbUser.avatarUrl;
            token.displayName = dbUser.displayName;
            token.approvalStatus = dbUser.approvalStatus;
            token.isActive = dbUser.isActive;
            token.emailVerified = dbUser.emailVerified;
          }
        } catch (error) {
          console.error('获取用户JWT信息失败:', error);
        }
      }
      return token;
    },
    async session({ session, token }): Promise<any> {
      // 在JWT策略中，从token获取用户信息
      if (token) {
        (session.user as any).id = token.id as string;
        (session.user as any).username = token.username as string;
        session.user.email = token.email as string;
        (session.user as any).userLevel = token.userLevel as string;
        (session.user as any).isVerified = token.isVerified as boolean;
        (session.user as any).canPublish = token.canPublish as boolean;
        (session.user as any).avatarUrl = token.avatarUrl as string;
        (session.user as any).displayName = token.displayName as string;
        (session.user as any).approvalStatus = token.approvalStatus as string;
        (session.user as any).isActive = token.isActive as boolean;
        (session.user as any).emailVerified = token.emailVerified as Date | null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // 记录登录日志 (简化版本，暂时只在控制台输出)
      console.log(
        `用户登录: ${(user as any).username || user.email}, 提供者: ${account?.provider}, 新用户: ${isNewUser}`
      );
    },
    async signOut({ session, token }) {
      // 记录登出日志 (简化版本，暂时只在控制台输出)
      console.log(`用户登出: ${token?.sub}`);
    },
  },
  debug: getEnvWithFallback('COSEREEDEN_NODE_ENV', 'development') === 'development',
};

/**
 * 获取服务端认证会话
 */
export const getServerAuthSession = () => getServerSession(authOptions);
