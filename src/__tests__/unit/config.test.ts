/**
 * 配置测试
 */

describe('Configuration', () => {
  it('should have test environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.COSEREEDEN_TEST_MODE).toBe('true');
  });

  it('should have database URL configured', () => {
    expect(process.env.COSEREEDEN_DATABASE_URL).toBeDefined();
    expect(process.env.COSEREEDEN_DATABASE_URL).toContain('test.db');
  });

  it('should have NextAuth secret configured', () => {
    expect(process.env.COSEREEDEN_NEXTAUTH_SECRET).toBeDefined();
    expect(process.env.COSEREEDEN_NEXTAUTH_SECRET).toContain('test-secret');
  });
});
