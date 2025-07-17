/**
 * @fileoverview tRPC认证路由集成测试
 * @description 测试tRPC认证路由的核心功能
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

import { jest } from '@jest/globals';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { createMockPrismaClient as _createMockPrismaClient, type MockPrismaClient as _MockPrismaClient } from '@/__tests__/types/mock-types';

import userRegistrationModule from '@/server/api/routers/auth/user-registration';
import validationModule from '@/server/api/routers/auth/validation-helpers';
import routerModule from '@/server/api/routers/auth-router';
import authIndexModule from '@/server/api/routers/auth/index';
import authIndexModule from '@/server/api/routers/auth/index';

// Mock dependencies
jest.mock('@/lib/errors/trpc-error-handler');
jest.mock('@/lib/prisma');
jest.mock('@/server/api/routers/auth/user-registration');
jest.mock('@/server/api/routers/auth/validation-helpers');

const mockTRPCErrorHandler = TRPCErrorHandler as jest.Mocked<typeof TRPCErrorHandler>;

describe('Auth Router', () => {
  let authRouter: any;
  let mockContext: any;
  let mockPrisma: any;
  let mockProcessUserRegistration: any;
  let mockValidateUsernameAvailability: any;
  let mockValidateEmailAvailability: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Setup mocks
    mockPrisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    mockContext = {
      prisma: mockPrisma,
      session: null,
    };

    // Mock registration functions
    mockProcessUserRegistration = userRegistrationModule.processUserRegistration = jest.fn();

    mockValidateUsernameAvailability = validationModule.validateUsernameAvailability = jest.fn();
    mockValidateEmailAvailability = validationModule.validateEmailAvailability = jest.fn();

    // Setup TRPCErrorHandler mocks
    mockTRPCErrorHandler.businessError.mockImplementation((type, message) => {
      const error = new Error(message);
      (error as any).code = 'BAD_REQUEST';
      throw error;
    });

    // Import router after mocks
    authRouter = routerModule.authRouter;
  });

  describe('register mutation', () => {
    const validRegistrationInput = {
      username: 'testuser',
      email: 'test@example.com',
      displayName: 'Test User',
      password: 'password123',
    };

    it('should successfully register a new user', async () => {
      const mockRegistrationResult = {
        success: true,
        message: '注册成功',
        user: {
          id: 'user-1',
          username: 'testuser',
          email: 'test@example.com',
          displayName: 'Test User',
          userLevel: 'USER',
          isVerified: false,
          canPublish: false,
          approvalStatus: 'PENDING',
          createdAt: new Date(),
        },
        requiresEmailVerification: true,
      };

      mockProcessUserRegistration.mockResolvedValue(mockRegistrationResult);

      const caller = authRouter.createCaller(mockContext);
      const result = await caller.register(validRegistrationInput);

      expect(result).toEqual(mockRegistrationResult);
      expect(mockProcessUserRegistration).toHaveBeenCalledWith(
        mockPrisma,
        validRegistrationInput
      );
    });

    it('should handle registration errors', async () => {
      const registrationError = new Error('用户名已存在');
      mockProcessUserRegistration.mockRejectedValue(registrationError);

      const caller = authRouter.createCaller(mockContext);

      await expect(caller.register(validRegistrationInput))
        .rejects.toThrow('用户名已存在');
    });

    it('should validate input schema', async () => {
      const invalidInput = {
        username: '', // Empty username
        email: 'invalid-email', // Invalid email
        displayName: '',
        password: '',
      };

      const caller = authRouter.createCaller(mockContext);

      await expect(caller.register(invalidInput))
        .rejects.toThrow();
    });

    it('should handle missing optional email', async () => {
      const inputWithoutEmail = {
        username: 'testuser',
        displayName: 'Test User',
        password: 'password123',
      };

      const mockRegistrationResult = {
        success: true,
        message: '注册成功',
        user: {
          id: 'user-1',
          username: 'testuser',
          email: null,
          displayName: 'Test User',
          userLevel: 'USER',
          isVerified: true, // No email verification needed
          canPublish: false,
          approvalStatus: 'PENDING',
          createdAt: new Date(),
        },
        requiresEmailVerification: false,
      };

      mockProcessUserRegistration.mockResolvedValue(mockRegistrationResult);

      const caller = authRouter.createCaller(mockContext);
      const result = await caller.register(inputWithoutEmail);

      expect(result).toEqual(mockRegistrationResult);
    });
  });

  describe('checkUsername query', () => {
    it('should return username availability', async () => {
      const mockAvailabilityResult = {
        available: true,
        message: '用户名可用',
      };

      mockValidateUsernameAvailability.mockResolvedValue(mockAvailabilityResult);

      const caller = authRouter.createCaller(mockContext);
      const result = await caller.checkUsername({ username: 'testuser' });

      expect(result).toEqual(mockAvailabilityResult);
      expect(mockValidateUsernameAvailability).toHaveBeenCalledWith(
        mockPrisma,
        'testuser'
      );
    });

    it('should handle username check errors', async () => {
      mockValidateUsernameAvailability.mockRejectedValue(new Error('Database error'));

      const caller = authRouter.createCaller(mockContext);

      await expect(caller.checkUsername({ username: 'testuser' }))
        .rejects.toThrow();

      expect(mockTRPCErrorHandler.businessError).toHaveBeenCalledWith(
        expect.any(String),
        '检查用户名可用性失败'
      );
    });

    it('should validate username input', async () => {
      const caller = authRouter.createCaller(mockContext);

      await expect(caller.checkUsername({ username: '' }))
        .rejects.toThrow();
    });
  });

  describe('checkEmail query', () => {
    it('should return email availability', async () => {
      const mockAvailabilityResult = {
        available: true,
        message: '邮箱可用',
      };

      mockValidateEmailAvailability.mockResolvedValue(mockAvailabilityResult);

      const caller = authRouter.createCaller(mockContext);
      const result = await caller.checkEmail({ email: 'test@example.com' });

      expect(result).toEqual(mockAvailabilityResult);
      expect(mockValidateEmailAvailability).toHaveBeenCalledWith(
        mockPrisma,
        'test@example.com'
      );
    });

    it('should handle email check errors', async () => {
      mockValidateEmailAvailability.mockRejectedValue(new Error('Database error'));

      const caller = authRouter.createCaller(mockContext);

      await expect(caller.checkEmail({ email: 'test@example.com' }))
        .rejects.toThrow();

      expect(mockTRPCErrorHandler.businessError).toHaveBeenCalledWith(
        expect.any(String),
        '检查邮箱可用性失败'
      );
    });

    it('should validate email input', async () => {
      const caller = authRouter.createCaller(mockContext);

      await expect(caller.checkEmail({ email: 'invalid-email' }))
        .rejects.toThrow();
    });
  });

  describe('getUserProfile query', () => {
    it('should require authentication', async () => {
      const caller = authRouter.createCaller(mockContext);

      await expect(caller.getUserProfile())
        .rejects.toThrow();
    });

    it('should return user profile for authenticated user', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        userLevel: 'USER',
        isVerified: true,
        canPublish: false,
        approvalStatus: 'APPROVED',
      };

      const authenticatedContext = {
        ...mockContext,
        session: {
          user: mockUser,
        },
        user: mockUser,
      };

      // Mock the getUserProfile function
      authIndexModule.getUserProfile = jest.fn<() => Promise<any>>().mockResolvedValue(mockUser);

      const caller = authRouter.createCaller(authenticatedContext);
      const result = await caller.getUserProfile();

      expect(result).toEqual(mockUser);
    });
  });

  describe('updateProfile mutation', () => {
    it('should require authentication', async () => {
      const caller = authRouter.createCaller(mockContext);

      await expect(caller.updateProfile({
        displayName: 'New Name',
      })).rejects.toThrow();
    });

    it('should update user profile for authenticated user', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        userLevel: 'USER',
        isVerified: true,
        canPublish: false,
        approvalStatus: 'APPROVED',
      };

      const authenticatedContext = {
        ...mockContext,
        session: {
          user: mockUser,
        },
        user: mockUser,
      };

      const updateData = {
        displayName: 'Updated Name',
        bio: 'Updated bio',
      };

      const updatedUser = {
        ...mockUser,
        ...updateData,
      };

      // Mock the updateUserProfile function
      authIndexModule.updateUserProfile = jest.fn<() => Promise<any>>().mockResolvedValue(updatedUser);

      const caller = authRouter.createCaller(authenticatedContext);
      const result = await caller.updateProfile(updateData);

      expect(result).toEqual(updatedUser);
    });
  });

  describe('changePassword mutation', () => {
    it('should require authentication', async () => {
      const caller = authRouter.createCaller(mockContext);

      await expect(caller.changePassword({
        currentPassword: 'oldpass',
        newPassword: 'newpass',
      })).rejects.toThrow();
    });

    it('should validate password change input', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        userLevel: 'USER',
      };

      const authenticatedContext = {
        ...mockContext,
        session: { user: mockUser },
        user: mockUser,
      };

      const caller = authRouter.createCaller(authenticatedContext);

      // Test missing current password
      await expect(caller.changePassword({
        currentPassword: '',
        newPassword: 'newpass123',
      })).rejects.toThrow();

      // Test short new password
      await expect(caller.changePassword({
        currentPassword: 'oldpass',
        newPassword: '123',
      })).rejects.toThrow();
    });
  });
});
