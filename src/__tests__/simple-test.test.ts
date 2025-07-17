/**
 * @fileoverview 简单的Jest测试验证
 * @description 验证Jest基本功能是否正常
 */

describe('简单测试验证', () => {
  it('应该能够运行基本的Jest测试', () => {
    expect(1 + 1).toBe(2);
  });

  it('应该能够测试字符串', () => {
    expect('hello').toBe('hello');
  });

  it('应该能够测试异步函数', async () => {
    const result = await Promise.resolve('async test');
    expect(result).toBe('async test');
  });
});
