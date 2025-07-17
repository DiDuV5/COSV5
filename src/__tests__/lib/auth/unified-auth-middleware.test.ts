/**
 * @fileoverview 统一认证中间件测试
 * @description 测试统一认证中间件的核心功能
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

import { jest } from '@jest/globals';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';

import authMiddleware from '@/lib/auth/unified-auth-middleware';

// Mock dependencies
jest.mock('@/lib/errors/trpc-error-handler');
jest.mock('@/lib/prisma');

const mockTRPCErrorHandler = TRPCErrorHandler as jest.Mocked<typeof TRPCErrorHandler>;

describe('Unified Auth Middleware', () => {
  let unifiedAuthMiddleware: any;
  let basicAuth: any;
  let verifiedAuth: any;
  let creatorAuth: any;
  let adminAuth: any;
  let superAdminAuth: any;

  let mockContext: any;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Import after mocks are set up
    unifiedAuthMiddleware = authMiddleware.unifiedAuthMiddleware;
    basicAuth = authMiddleware.basicAuth;
    verifiedAuth = authMiddleware.verifiedAuth;
    creatorAuth = authMiddleware.creatorAuth;
    adminAuth = authMiddleware.adminAuth;
    superAdminAuth = authMiddleware.superAdminAuth;

    // Setup mock context
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
      },
    };

    mockContext = {
      session: {
        user: {
          id: 'user-1',
          username: 'testuser',
          userLevel: 'USER',
        },
      },
      prisma: mockPrisma,
      db: mockPrisma,
    };

    // Setup TRPCErrorHandler mocks
    mockTRPCErrorHandler.unauthorized.mockImplementation((message) => {
      const error = new Error(message);
      (error as any).code = 'UNAUTHORIZED';
      throw error;
    });

    mockTRPCErrorHandler.forbidden.mockImplementation((message) => {
      const error = new Error(message);
      (error as any).code = 'FORBIDDEN';
      throw error;
    });
  });

  describe('unifiedAuthMiddleware', () => {
    it('should throw unauthorized error when session is missing', async () => {
      const contextWithoutSession = { ...mockContext, session: null };

      await expect(unifiedAuthMiddleware(contextWithoutSession))
        .rejects.toThrow('请先登录');
    });

    it('should throw unauthorized error when user is missing from session', async () => {
      const contextWithoutUser = {
        ...mockContext,
        session: { user: null }
      };

      await expect(unifiedAuthMiddleware(contextWithoutUser))
        .rejects.toThrow('请先登录');
    });

    it('should throw unauthorized error when user not found in database', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(unifiedAuthMiddleware(mockContext))
        .rejects.toThrow('用户不存在');
    });

    it('should return authenticated context for valid user', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        userLevel: 'USER',
        isVerified: true,
        canPublish: false,
        isActive: true,
        approvalStatus: 'APPROVED',
        avatarUrl: null,
        displayName: 'Test User',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await unifiedAuthMiddleware(mockContext);

      expect(result).toEqual({
        ...mockContext,
        user: mockUser,
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          id: true,
          username: true,
          email: true,
          userLevel: true,
          isVerified: true,
          canPublish: true,
          isActive: true,
          approvalStatus: true,
          avatarUrl: true,
          displayName: true,
        },
      });
    });

    it('should handle requireActive option', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        userLevel: 'USER',
        isVerified: true,
        canPublish: false,
        isActive: false, // Inactive user
        approvalStatus: 'APPROVED',
        avatarUrl: null,
        displayName: 'Test User',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(unifiedAuthMiddleware(mockContext, { requireActive: true }))
        .rejects.toThrow();
    });

    it('should handle requireVerified option', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        userLevel: 'USER',
        isVerified: false, // Unverified user
        canPublish: false,
        isActive: true,
        approvalStatus: 'APPROVED',
        avatarUrl: null,
        displayName: 'Test User',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(unifiedAuthMiddleware(mockContext, { requireVerified: true }))
        .rejects.toThrow();
    });

    it('should handle requiredLevel option', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        userLevel: 'USER',
        isVerified: true,
        canPublish: false,
        isActive: true,
        approvalStatus: 'APPROVED',
        avatarUrl: null,
        displayName: 'Test User',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(unifiedAuthMiddleware(mockContext, { requiredLevel: 'ADMIN' }))
        .rejects.toThrow();
    });

    it('should use db fallback when prisma is not available', async () => {
      const contextWithDb = {
        session: mockContext.session,
        db: mockPrisma,
      };

      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        userLevel: 'USER',
        isVerified: true,
        canPublish: false,
        isActive: true,
        approvalStatus: 'APPROVED',
        avatarUrl: null,
        displayName: 'Test User',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await unifiedAuthMiddleware(contextWithDb);

      expect(result.user).toEqual(mockUser);
    });
  });

  describe('basicAuth', () => {
    it('should return authenticated context for basic auth', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        userLevel: 'USER',
        isVerified: true,
        canPublish: false,
        isActive: true,
        approvalStatus: 'APPROVED',
        avatarUrl: null,
        displayName: 'Test User',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await basicAuth(mockContext);

      expect(result.user).toEqual(mockUser);
    });
  });

  describe('verifiedAuth', () => {
    it('should require verified user', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        userLevel: 'USER',
        isVerified: false, // Not verified
        canPublish: false,
        isActive: true,
        approvalStatus: 'APPROVED',
        avatarUrl: null,
        displayName: 'Test User',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(verifiedAuth(mockContext))
        .rejects.toThrow();
    });

    it('should allow verified user', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        userLevel: 'USER',
        isVerified: true, // Verified
        canPublish: false,
        isActive: true,
        approvalStatus: 'APPROVED',
        avatarUrl: null,
        displayName: 'Test User',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await verifiedAuth(mockContext);

      expect(result.user).toEqual(mockUser);
    });
  });

  describe('creatorAuth', () => {
    it('should require creator level or higher', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        userLevel: 'USER', // Not creator level
        isVerified: true,
        canPublish: false,
        isActive: true,
        approvalStatus: 'APPROVED',
        avatarUrl: null,
        displayName: 'Test User',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(creatorAuth(mockContext))
        .rejects.toThrow();
    });

    it('should allow creator level user', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        userLevel: 'CREATOR', // Creator level
        isVerified: true,
        canPublish: true,
        isActive: true,
        approvalStatus: 'APPROVED',
        avatarUrl: null,
        displayName: 'Test User',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await creatorAuth(mockContext);

      expect(result.user).toEqual(mockUser);
    });
  });

  describe('adminAuth', () => {
    it('should require admin level or higher', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        userLevel: 'CREATOR', // Not admin level
        isVerified: true,
        canPublish: true,
        isActive: true,
        approvalStatus: 'APPROVED',
        avatarUrl: null,
        displayName: 'Test User',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(adminAuth(mockContext))
        .rejects.toThrow();
    });

    it('should allow admin level user', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        userLevel: 'ADMIN', // Admin level
        isVerified: true,
        canPublish: true,
        isActive: true,
        approvalStatus: 'APPROVED',
        avatarUrl: null,
        displayName: 'Test User',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await adminAuth(mockContext);

      expect(result.user).toEqual(mockUser);
    });
  });

  describe('superAdminAuth', () => {
    it('should require super admin level', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        userLevel: 'ADMIN', // Not super admin level
        isVerified: true,
        canPublish: true,
        isActive: true,
        approvalStatus: 'APPROVED',
        avatarUrl: null,
        displayName: 'Test User',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(superAdminAuth(mockContext))
        .rejects.toThrow();
    });

    it('should allow super admin level user', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        userLevel: 'SUPER_ADMIN', // Super admin level
        isVerified: true,
        canPublish: true,
        isActive: true,
        approvalStatus: 'APPROVED',
        avatarUrl: null,
        displayName: 'Test User',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await superAdminAuth(mockContext);

      expect(result.user).toEqual(mockUser);
    });
  });
});
