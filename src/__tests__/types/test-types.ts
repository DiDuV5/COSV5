/**
 * @fileoverview 测试类型定义
 * @description 统一的测试类型定义，避免重复的类型错误
 */

// Mock TRPCError类型
export class MockTRPCError extends Error {
  code: string;
  constructor(options: { code: string; message: string }) {
    super(options.message);
    this.name = 'TRPCError';
    this.code = options.code;
  }
}

// Mock TRPCErrorHandler
export const createMockTRPCErrorHandler = () => ({
  businessError: jest.fn((type: string, message?: string, context?: any) => {
    return new MockTRPCError({
      code: 'BAD_REQUEST',
      message: message || 'Business error',
    });
  }),
  forbidden: jest.fn((message?: string, context?: any) => {
    return new MockTRPCError({
      code: 'FORBIDDEN',
      message: message || '权限不足',
    });
  }),
  unauthorized: jest.fn((message?: string, context?: any) => {
    return new MockTRPCError({
      code: 'UNAUTHORIZED',
      message: message || '请先登录',
    });
  }),
  internalServerError: jest.fn((message?: string, context?: any) => {
    return new MockTRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: message || '服务器内部错误',
    });
  }),
});

// Mock BusinessErrorType
export const MockBusinessErrorType = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
};

// Mock UserLevel
export const MockUserLevel = {
  GUEST: 'GUEST',
  USER: 'USER',
  VIP: 'VIP',
  CREATOR: 'CREATOR',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
};

// Mock Prisma类型
export interface MockPrismaUser {
  id: string;
  username: string;
  email: string | null;
  passwordHash: string;
  displayName: string | null;
  userLevel: string;
  isActive: boolean;
  emailVerified: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockPrismaSession {
  id: string;
  userId: string;
  sessionToken: string;
  expires: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockPrismaVerificationToken {
  id: string;
  token: string;
  identifier: string;
  expires: Date;
  userId?: string;
  createdAt: Date;
}

// Mock Prisma客户端
export const createMockPrisma = (): any => ({
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  userSession: {
    create: jest.fn(),
    findFirst: jest.fn(),
    deleteMany: jest.fn(),
    update: jest.fn(),
  },
  verificationToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn((callback: (prisma: any) => any): any => {
    return callback(createMockPrisma());
  }),
});

// Mock Context类型
export interface MockContext {
  session: any;
  user: any;
  prisma: ReturnType<typeof createMockPrisma>;
  db: ReturnType<typeof createMockPrisma>;
  repositories: any;
  req?: {
    headers: Record<string, string>;
    cookies: Record<string, string>;
  };
  res?: {
    setHeader: jest.Mock;
    getHeader: jest.Mock;
  };
}

// 创建Mock Context
export const createMockContext = (): MockContext => {
  const mockPrisma = createMockPrisma();
  return {
    session: null,
    user: null,
    prisma: mockPrisma,
    db: mockPrisma,
    repositories: {
      user: {
        findByUsername: jest.fn(),
        findByEmail: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      session: {
        create: jest.fn(),
        findByToken: jest.fn(),
        delete: jest.fn(),
      },
    },
    req: {
      headers: {},
      cookies: {},
    },
    res: {
      setHeader: jest.fn(),
      getHeader: jest.fn(),
    },
  };
};

// Mock bcrypt
export const createMockBcrypt = () => ({
  hash: jest.fn(),
  genSalt: jest.fn(),
  compare: jest.fn(),
});

// Mock JWT
export const createMockJWT = () => ({
  encode: jest.fn(),
  decode: jest.fn(),
  getToken: jest.fn(),
});

// Mock Redis
export const createMockRedis = (): any => ({
  ping: jest.fn().mockResolvedValue('PONG'),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setex: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  expire: jest.fn().mockResolvedValue(1),
  ttl: jest.fn().mockResolvedValue(-1),
  keys: jest.fn().mockResolvedValue([]),
  mget: jest.fn().mockResolvedValue([]),
  mset: jest.fn().mockResolvedValue('OK'),
  pipeline: jest.fn().mockReturnValue({
    get: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  }),
  multi: jest.fn().mockReturnValue({
    get: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  }),
  exec: jest.fn().mockResolvedValue([]),
  quit: jest.fn().mockResolvedValue('OK'),
  disconnect: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  status: 'ready' as const,
  connect: jest.fn().mockResolvedValue(undefined),
  flushdb: jest.fn().mockResolvedValue('OK'),
  info: jest.fn().mockResolvedValue(''),
  config: jest.fn().mockResolvedValue([]),
  eval: jest.fn().mockResolvedValue(null),
  evalsha: jest.fn().mockResolvedValue(null),
  script: jest.fn().mockResolvedValue(null),
  publish: jest.fn().mockResolvedValue(0),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  psubscribe: jest.fn(),
  punsubscribe: jest.fn(),
});

// Mock邮件服务
export const createMockEmailService = () => ({
  sendEmail: jest.fn(() => Promise.resolve(true)),
  sendVerificationEmail: jest.fn(() => Promise.resolve(true)),
  EmailService: {
    sendVerificationEmailDetailed: jest.fn(() => Promise.resolve({
      success: true,
      messageId: 'test-message-id',
    })),
  },
});

// 测试数据工厂
export const createTestUser = (overrides: Partial<MockPrismaUser> = {}): MockPrismaUser => ({
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  passwordHash: '$2a$10$hashedpassword',
  displayName: 'Test User',
  userLevel: 'USER',
  isActive: true,
  emailVerified: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestSession = (overrides: Partial<MockPrismaSession> = {}): MockPrismaSession => ({
  id: 'session-123',
  userId: 'user-123',
  sessionToken: 'session-token-123',
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestVerificationToken = (overrides: Partial<MockPrismaVerificationToken> = {}): MockPrismaVerificationToken => ({
  id: 'token-123',
  token: 'verification-token-123',
  identifier: 'test@example.com',
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  userId: 'user-123',
  createdAt: new Date(),
  ...overrides,
});

// 测试环境设置
export const setupTestEnvironment = () => {
  // 设置环境变量
  process.env.COSEREEDEN_NEXTAUTH_SECRET = 'test-secret-key-for-jwt';
  process.env.COSEREEDEN_REDIS_HOST = 'localhost';
  process.env.COSEREEDEN_REDIS_PORT = '6379';
  process.env.COSEREEDEN_REDIS_PASSWORD = '';
  process.env.COSEREEDEN_REDIS_DB = '1';
  process.env.COSEREEDEN_REDIS_KEY_PREFIX = 'test:cosereeden:';
  process.env.COSEREEDEN_REDIS_ENABLED = 'true';
};

// 清理测试环境
export const cleanupTestEnvironment = () => {
  jest.resetAllMocks();
  jest.clearAllMocks();
};
