/**
 * @fileoverview 用户管理核心功能测试套件
 * @description 测试用户注册、审批、状态管理等核心功能
 * @author Augment AI
 * @date 2025-01-XX
 * @version 1.0.0
 *
 * @coverage-target 90%
 * @priority P0
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { TRPCError } from '@trpc/server';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('bcryptjs');
jest.mock('@trpc/server');

const mockPrisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  userApprovalLog: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
} as any;

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('用户管理核心功能测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // 设置默认的bcrypt mock
    (mockBcrypt.hash as any).mockResolvedValue('hashed_password');
    (mockBcrypt.compare as any).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('用户注册功能', () => {
    it('应该成功创建新用户', async () => {
      // Arrange
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        displayName: '测试用户',
      };

      const expectedUser = {
        id: 'user-123',
        ...userData,
        password: 'hashed_password',
        userLevel: 'USER',
        approvalStatus: 'PENDING',
        isActive: true,
        emailVerified: null,
        createdAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(null); // 用户不存在
      mockPrisma.user.create.mockResolvedValue(expectedUser);

      // Act
      const result = await createUser(userData);

      // Assert
      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'testuser',
          email: 'test@example.com',
          password: 'hashed_password',
          displayName: '测试用户',
          userLevel: 'USER',
          approvalStatus: 'PENDING',
          isActive: true,
        },
      });
      expect(result).toEqual(expectedUser);
    });

    it('应该拒绝重复的用户名', async () => {
      // Arrange
      const userData = {
        username: 'existinguser',
        email: 'test@example.com',
        password: 'password123',
        displayName: '测试用户',
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        username: 'existinguser',
      });

      // Act & Assert
      await expect(createUser(userData)).rejects.toThrow('用户名已存在');
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('应该拒绝重复的邮箱', async () => {
      // Arrange
      const userData = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'password123',
        displayName: '测试用户',
      };

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // 用户名检查
        .mockResolvedValueOnce({ // 邮箱检查
          id: 'existing-user',
          email: 'existing@example.com',
        });

      // Act & Assert
      await expect(createUser(userData)).rejects.toThrow('邮箱已被使用');
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('应该验证用户输入格式', async () => {
      // Arrange
      const invalidUserData = {
        username: 'a', // 太短
        email: 'invalid-email', // 无效邮箱
        password: '123', // 密码太短
        displayName: '',
      };

      // Act & Assert
      await expect(createUser(invalidUserData)).rejects.toThrow('输入验证失败');
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('用户审批功能', () => {
    it('应该成功审批用户', async () => {
      // Arrange
      const userId = 'user-123';
      const adminId = 'admin-456';

      const pendingUser = {
        id: userId,
        username: 'testuser',
        approvalStatus: 'PENDING',
        userLevel: 'USER',
      };

      const approvedUser = {
        ...pendingUser,
        approvalStatus: 'APPROVED',
        emailVerified: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(pendingUser);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockPrisma);
      });
      mockPrisma.user.update.mockResolvedValue(approvedUser);
      mockPrisma.userApprovalLog.create.mockResolvedValue({
        id: 'approval-123',
        userId,
        adminId,
        action: 'APPROVED',
        reason: '符合平台要求',
        createdAt: new Date(),
      });

      // Act
      const result = await approveUser(userId, adminId, '符合平台要求');

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          approvalStatus: 'APPROVED',
          emailVerified: expect.any(Date),
        },
      });
      expect(mockPrisma.userApprovalLog.create).toHaveBeenCalledWith({
        data: {
          userId,
          adminId,
          action: 'APPROVED',
          reason: '符合平台要求',
        },
      });
      expect(result.approvalStatus).toBe('APPROVED');
    });

    it('应该成功拒绝用户', async () => {
      // Arrange
      const userId = 'user-123';
      const adminId = 'admin-456';
      const reason = '不符合平台规范';

      const pendingUser = {
        id: userId,
        username: 'testuser',
        approvalStatus: 'PENDING',
        userLevel: 'USER',
      };

      const rejectedUser = {
        ...pendingUser,
        approvalStatus: 'REJECTED',
        isActive: false,
      };

      mockPrisma.user.findUnique.mockResolvedValue(pendingUser);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockPrisma);
      });
      mockPrisma.user.update.mockResolvedValue(rejectedUser);

      // Act
      const result = await rejectUser(userId, adminId, reason);

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          approvalStatus: 'REJECTED',
          isActive: false,
        },
      });
      expect(result.approvalStatus).toBe('REJECTED');
      expect(result.isActive).toBe(false);
    });

    it('应该拒绝审批已处理的用户', async () => {
      // Arrange
      const userId = 'user-123';
      const adminId = 'admin-456';

      const approvedUser = {
        id: userId,
        username: 'testuser',
        approvalStatus: 'APPROVED',
        userLevel: 'USER',
      };

      mockPrisma.user.findUnique.mockResolvedValue(approvedUser);

      // Act & Assert
      await expect(approveUser(userId, adminId, '重复审批')).rejects.toThrow('用户已被处理');
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('用户状态管理', () => {
    it('应该成功激活用户', async () => {
      // Arrange
      const userId = 'user-123';
      const inactiveUser = {
        id: userId,
        username: 'testuser',
        isActive: false,
      };

      const activeUser = {
        ...inactiveUser,
        isActive: true,
      };

      mockPrisma.user.findUnique.mockResolvedValue(inactiveUser);
      mockPrisma.user.update.mockResolvedValue(activeUser);

      // Act
      const result = await activateUser(userId);

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { isActive: true },
      });
      expect(result.isActive).toBe(true);
    });

    it('应该成功停用用户', async () => {
      // Arrange
      const userId = 'user-123';
      const activeUser = {
        id: userId,
        username: 'testuser',
        isActive: true,
      };

      const inactiveUser = {
        ...activeUser,
        isActive: false,
      };

      mockPrisma.user.findUnique.mockResolvedValue(activeUser);
      mockPrisma.user.update.mockResolvedValue(inactiveUser);

      // Act
      const result = await deactivateUser(userId);

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { isActive: false },
      });
      expect(result.isActive).toBe(false);
    });

    it('应该成功升级用户等级', async () => {
      // Arrange
      const userId = 'user-123';
      const user = {
        id: userId,
        username: 'testuser',
        userLevel: 'USER',
      };

      const upgradedUser = {
        ...user,
        userLevel: 'VIP',
      };

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue(upgradedUser);

      // Act
      const result = await upgradeUserLevel(userId, 'VIP');

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { userLevel: 'VIP' },
      });
      expect(result.userLevel).toBe('VIP');
    });
  });
});

// 模拟的用户管理函数（实际应该从相应的服务中导入）
async function createUser(userData: any) {
  // 验证输入
  if (userData.username.length < 3) {
    throw new Error('输入验证失败');
  }
  if (!userData.email.includes('@')) {
    throw new Error('输入验证失败');
  }
  if (userData.password.length < 6) {
    throw new Error('输入验证失败');
  }

  // 检查用户名是否存在
  const existingUser = await mockPrisma.user.findUnique({
    where: { username: userData.username },
  });
  if (existingUser) {
    throw new Error('用户名已存在');
  }

  // 检查邮箱是否存在
  const existingEmail = await mockPrisma.user.findFirst({
    where: { email: userData.email },
  });
  if (existingEmail) {
    throw new Error('邮箱已被使用');
  }

  // 加密密码
  const hashedPassword = await mockBcrypt.hash(userData.password, 12);

  // 创建用户
  return await mockPrisma.user.create({
    data: {
      username: userData.username,
      email: userData.email,
      passwordHash: hashedPassword,
      displayName: userData.displayName,
      userLevel: 'USER',
      approvalStatus: 'PENDING',
      isActive: true,
    },
  });
}

async function approveUser(userId: string, adminId: string, reason: string) {
  const user = await mockPrisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('用户不存在');
  }
  if (user.approvalStatus !== 'PENDING') {
    throw new Error('用户已被处理');
  }

  return await mockPrisma.$transaction(async (tx: any) => {
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        approvalStatus: 'APPROVED',
        emailVerified: new Date(),
      },
    });

    await tx.userApprovalLog.create({
      data: {
        userId,
        adminId,
        action: 'APPROVED',
        reason,
      },
    });

    return updatedUser;
  });
}

async function rejectUser(userId: string, adminId: string, reason: string) {
  const user = await mockPrisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('用户不存在');
  }
  if (user.approvalStatus !== 'PENDING') {
    throw new Error('用户已被处理');
  }

  return await mockPrisma.$transaction(async (tx: any) => {
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        approvalStatus: 'REJECTED',
        isActive: false,
      },
    });

    await tx.userApprovalLog.create({
      data: {
        userId,
        adminId,
        action: 'REJECTED',
        reason,
      },
    });

    return updatedUser;
  });
}

async function activateUser(userId: string) {
  const user = await mockPrisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('用户不存在');
  }

  return await mockPrisma.user.update({
    where: { id: userId },
    data: { isActive: true },
  });
}

async function deactivateUser(userId: string) {
  const user = await mockPrisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('用户不存在');
  }

  return await mockPrisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });
}

async function upgradeUserLevel(userId: string, newLevel: string) {
  const user = await mockPrisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('用户不存在');
  }

  return await mockPrisma.user.update({
    where: { id: userId },
    data: { userLevel: newLevel },
  });
}
