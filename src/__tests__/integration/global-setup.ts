/**
 * @fileoverview Jest集成测试全局设置
 * @description 在所有集成测试开始前执行的全局设置
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import { execSync } from 'child_process';

export default async function globalSetup() {
  console.log('🚀 开始集成测试全局设置...');

  try {
    // 检查PostgreSQL是否运行
    try {
      execSync('pg_isready', { stdio: 'ignore' });
      console.log('✅ PostgreSQL 服务正在运行');
    } catch (_error) {
      console.error('❌ PostgreSQL 服务未运行，请启动PostgreSQL服务');
      throw new Error('PostgreSQL service is not running');
    }

    // 检查数据库连接
    try {
      execSync('psql -c "SELECT 1;" postgresql://postgres:password@localhost:5432/postgres', {
        stdio: 'ignore',
      });
      console.log('✅ 数据库连接正常');
    } catch (_error) {
      console.warn('⚠️ 数据库连接失败，请检查连接配置');
      // 不抛出错误，让具体测试处理连接问题
    }

    // 确保Prisma客户端已生成
    try {
      execSync('npx prisma generate', { stdio: 'ignore' });
      console.log('✅ Prisma客户端已生成');
    } catch (error) {
      console.error('❌ Prisma客户端生成失败:', error);
      throw error;
    }

    // 设置测试环境标识
    process.env.INTEGRATION_TEST_MODE = 'true';

    console.log('✅ 集成测试全局设置完成');
  } catch (error) {
    console.error('❌ 集成测试全局设置失败:', error);
    throw error;
  }
}
