/**
 * @fileoverview 测试路由导入是否正常
 * @description 简单测试验证emailVerificationRouter是否能正确导入
 */

import { describe, it, expect } from '@jest/globals';

// Mock problematic dependencies
jest.mock('@/lib/config/email-verification-config', () => ({
  emailVerificationConfig: {
    initialize: jest.fn(),
    getConfig: jest.fn(() => ({
      baseUrl: process.env.COSEREEDEN_NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      verificationPath: '/auth/verify-email',
      tokenExpiryHours: 24,
      fromEmail: 'test@test.com',
      fromName: 'Test App',
      enableEmailVerification: true,
    })),
  },
  getTokenExpiryDate: jest.fn(() => new Date(Date.now() + 24 * 60 * 60 * 1000)),
}));

jest.mock('@/server/api/routers/auth/services/email-verification-service', () => ({
  EmailVerificationService: {
    verifyEmailToken: jest.fn(),
    sendTestEmail: jest.fn(),
  },
}));

jest.mock('@/server/api/routers/auth/security/email-security-manager', () => ({
  EmailSecurityManager: {
    logSecurityEvent: jest.fn(),
  },
}));

describe('Router Import Test', () => {
  it('should import emailVerificationRouter without errors', async () => {
    console.log('Attempting to import emailVerificationRouter...');

    let importedModule;
    try {
      importedModule = await import('@/server/api/routers/auth/email-verification');
    } catch (error) {
      console.error('Import failed with error:', error);
      throw new Error(`Failed to import module: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log('Module imported successfully');
    console.log('Module keys:', Object.keys(importedModule));
    console.log('emailVerificationRouter type:', typeof importedModule.emailVerificationRouter);

    const { emailVerificationRouter } = importedModule;
    expect(emailVerificationRouter).toBeDefined();
    expect(typeof emailVerificationRouter.createCaller).toBe('function');
  });
});
