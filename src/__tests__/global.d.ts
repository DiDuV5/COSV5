/**
 * @fileoverview 全局测试类型声明
 * @description 为Jest测试环境提供全局类型定义
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

declare global {
  /**
   * 创建Mock用户对象
   */
  function createMockUser(overrides?: Partial<{
    id: string;
    username: string;
    email: string;
    displayName: string | null;
    userLevel: string;
    emailVerified: Date | null;
    isActive: boolean;
    approvalStatus: string;
    createdAt: Date;
    updatedAt: Date;
  }>): {
    id: string;
    username: string;
    email: string;
    displayName: string | null;
    userLevel: string;
    emailVerified: Date | null;
    isActive: boolean;
    approvalStatus: string;
    createdAt: Date;
    updatedAt: Date;
  };

  /**
   * 创建Mock上下文对象
   */
  function createMockContext(userOverrides?: Partial<{
    id: string;
    username: string;
    email: string;
    displayName: string | null;
    userLevel: string;
    emailVerified: Date | null;
    isActive: boolean;
    approvalStatus: string;
  }>): {
    session: {
      user: {
        id: string;
        username: string;
        email: string;
        displayName: string | null;
        userLevel: string;
        emailVerified: Date | null;
        isActive: boolean;
      };
    };
    user: {
      id: string;
      username: string;
      email: string;
      displayName: string | null;
      userLevel: string;
      emailVerified: Date | null;
      isActive: boolean;
    };
    prisma: {
      user: {
        findUnique: jest.MockedFunction<any>;
        findMany: jest.MockedFunction<any>;
        update: jest.MockedFunction<any>;
        updateMany: jest.MockedFunction<any>;
        count: jest.MockedFunction<any>;
      };
      userApprovalLog: {
        create: jest.MockedFunction<any>;
      };
      systemSetting: {
        findFirst: jest.MockedFunction<any>;
        findMany: jest.MockedFunction<any>;
        upsert: jest.MockedFunction<any>;
      };
      auditLog: {
        create: jest.MockedFunction<any>;
      };
    };
  };

  namespace jest {
    interface MockedFunction<T extends (...args: any[]) => any> {
      (...args: Parameters<T>): ReturnType<T>;
      mockResolvedValue(value: Awaited<ReturnType<T>>): this;
      mockRejectedValue(value: any): this;
      mockReturnValue(value: ReturnType<T>): this;
      mockImplementation(fn?: T): this;
      mockClear(): this;
      mockReset(): this;
      mockRestore(): void;
    }
  }
}

export {};
