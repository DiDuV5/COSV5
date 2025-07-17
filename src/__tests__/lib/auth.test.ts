/**
 * @fileoverview NextAuth.js 认证配置测试
 * @description 测试NextAuth认证系统的核心功能
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

import { jest } from '@jest/globals';
import * as bcrypt from 'bcryptjs';

import authModule from '@/lib/auth';
import prismaModule from '@/lib/prisma';
import authModule from '@/lib/auth';
import authModule from '@/lib/auth';

// Mock dependencies before importing the module under test
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockBcrypt = bcrypt as any;

describe('NextAuth Configuration', () => {
  let authOptions: any;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset modules to get fresh imports
    jest.resetModules();

    // Import after mocks are set up
    authOptions = authModule.authOptions;

    mockPrisma = prismaModule.prisma;
  });

  describe('Credentials Provider', () => {
    let credentialsProvider: any;

    beforeEach(() => {
      credentialsProvider = authOptions.providers[0];
    });

    it('should have correct provider configuration', () => {
      expect(credentialsProvider.name).toBe('credentials');
      expect(credentialsProvider.credentials).toEqual({
        username: { label: '用户名', type: 'text' },
        password: { label: '密码', type: 'password' },
      });
    });

    describe('authorize function', () => {
      it('should return null when credentials are missing', async () => {
        const result = await credentialsProvider.authorize({});
        expect(result).toBeNull();
      });

      it('should return null when username is missing', async () => {
        const result = await credentialsProvider.authorize({
          password: 'password123',
        });
        expect(result).toBeNull();
      });

      it('should return null when password is missing', async () => {
        const result = await credentialsProvider.authorize({
          username: 'testuser',
        });
        expect(result).toBeNull();
      });

      it('should return null when user is not found', async () => {
        mockPrisma.user.findFirst.mockResolvedValue(null);

        const result = await credentialsProvider.authorize({
          username: 'nonexistent',
          password: 'password123',
        });

        expect(result).toBeNull();
        expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
          where: {
            OR: [
              { username: 'nonexistent' },
              { email: 'nonexistent' },
            ],
          },
        });
      });

      it('should return null when user has no password hash', async () => {
        mockPrisma.user.findFirst.mockResolvedValue({
          id: 'user-1',
          username: 'testuser',
          passwordHash: null,
        });

        const result = await credentialsProvider.authorize({
          username: 'testuser',
          password: 'password123',
        });

        expect(result).toBeNull();
      });

      it('should return null when password is invalid', async () => {
        mockPrisma.user.findFirst.mockResolvedValue({
          id: 'user-1',
          username: 'testuser',
          passwordHash: 'hashed-password',
          isActive: true,
        });
        mockBcrypt.compare.mockResolvedValue(false);

        const result = await credentialsProvider.authorize({
          username: 'testuser',
          password: 'wrongpassword',
        });

        expect(result).toBeNull();
        expect(mockBcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashed-password');
      });

      it('should throw error when user is inactive', async () => {
        mockPrisma.user.findFirst.mockResolvedValue({
          id: 'user-1',
          username: 'testuser',
          passwordHash: 'hashed-password',
          isActive: false,
        });
        mockBcrypt.compare.mockResolvedValue(true);

        await expect(credentialsProvider.authorize({
          username: 'testuser',
          password: 'password123',
        })).rejects.toThrow('账户已被禁用');
      });

      it('should return user object when credentials are valid', async () => {
        const mockUser = {
          id: 'user-1',
          username: 'testuser',
          email: 'test@example.com',
          displayName: 'Test User',
          avatarUrl: 'https://example.com/avatar.jpg',
          userLevel: 'USER',
          isVerified: true,
          canPublish: false,
          approvalStatus: 'APPROVED',
          isActive: true,
          passwordHash: 'hashed-password',
        };

        mockPrisma.user.findFirst.mockResolvedValue(mockUser);
        mockPrisma.user.update.mockResolvedValue(mockUser);
        mockBcrypt.compare.mockResolvedValue(true);

        const result = await credentialsProvider.authorize({
          username: 'testuser',
          password: 'password123',
        });

        expect(result).toEqual({
          id: 'user-1',
          username: 'testuser',
          email: 'test@example.com',
          name: 'Test User',
          image: 'https://example.com/avatar.jpg',
          userLevel: 'USER',
          isVerified: true,
          canPublish: false,
          approvalStatus: 'APPROVED',
        });

        // Should update last login time
        expect(mockPrisma.user.update).toHaveBeenCalledWith({
          where: { id: 'user-1' },
          data: { lastLoginAt: expect.any(Date) },
        });
      });

      it('should handle database errors gracefully', async () => {
        mockPrisma.user.findFirst.mockRejectedValue(new Error('Database error'));

        const result = await credentialsProvider.authorize({
          username: 'testuser',
          password: 'password123',
        });

        expect(result).toBeNull();
      });

      it('should support email login', async () => {
        const mockUser = {
          id: 'user-1',
          username: 'testuser',
          email: 'test@example.com',
          passwordHash: 'hashed-password',
          isActive: true,
          displayName: 'Test User',
          userLevel: 'USER',
          isVerified: true,
          canPublish: false,
          approvalStatus: 'APPROVED',
        };

        mockPrisma.user.findFirst.mockResolvedValue(mockUser);
        mockPrisma.user.update.mockResolvedValue(mockUser);
        mockBcrypt.compare.mockResolvedValue(true);

        const result = await credentialsProvider.authorize({
          username: 'test@example.com',
          password: 'password123',
        });

        expect(result).toBeTruthy();
        expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
          where: {
            OR: [
              { username: 'test@example.com' },
              { email: 'test@example.com' },
            ],
          },
        });
      });
    });
  });

  describe('Session Configuration', () => {
    it('should use JWT strategy', () => {
      expect(authOptions.session.strategy).toBe('jwt');
    });

    it('should have correct session duration', () => {
      expect(authOptions.session.maxAge).toBe(2 * 60 * 60); // 2 hours
      expect(authOptions.session.updateAge).toBe(30 * 60); // 30 minutes
    });
  });

  describe('Cookie Configuration', () => {
    it('should have secure cookie settings', () => {
      const sessionCookie = authOptions.cookies.sessionToken;

      expect(sessionCookie.name).toBe('cosereeden.session-token');
      expect(sessionCookie.options.httpOnly).toBe(true);
      expect(sessionCookie.options.sameSite).toBe('lax');
      expect(sessionCookie.options.path).toBe('/');
      expect(sessionCookie.options.maxAge).toBe(2 * 60 * 60);
    });

    it('should set secure flag in production', () => {
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true
      });

      // Re-import to get updated config
      jest.resetModules();
      const prodAuthOptions = authModule.authOptions;

      expect(prodAuthOptions.cookies.sessionToken.options.secure).toBe(true);

      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true
      });
    });
  });

  describe('Environment Configuration', () => {
    it('should have required environment variables', () => {
      expect(authOptions.secret).toBeDefined();
      expect(authOptions.url).toBeDefined();
    });

    it('should use default URL in development', () => {
      const originalUrl = process.env.COSEREEDEN_NEXTAUTH_URL;
      delete process.env.COSEREEDEN_NEXTAUTH_URL;
      delete process.env.NEXTAUTH_URL; // 清理向后兼容变量

      jest.resetModules();
      const devAuthOptions = authModule.authOptions;

      expect(devAuthOptions.url).toBe(process.env.COSEREEDEN_NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

      process.env.COSEREEDEN_NEXTAUTH_URL = originalUrl;
    });
  });
});
