/**
 * 测试环境设置
 */

import { config } from 'dotenv';

// 加载测试环境变量
config({ path: '.env.test' });

// 设置测试超时
jest.setTimeout(30000);

// 模拟外部依赖
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    verify: jest.fn().mockResolvedValue(true)
  }))
}));

// 模拟Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    disconnect: jest.fn().mockResolvedValue(undefined)
  }));
});

// 全局测试清理
afterEach(() => {
  jest.clearAllMocks();
});

// 全局错误处理
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection in tests:', reason);
});
