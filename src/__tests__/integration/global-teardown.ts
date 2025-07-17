/**
 * @fileoverview Jest集成测试全局清理
 * @description 在所有集成测试结束后执行的全局清理
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

export default async function globalTeardown() {
  console.log('🧹 开始集成测试全局清理...');

  try {
    // 清理环境标识
    delete process.env.INTEGRATION_TEST_MODE;

    // 等待所有异步操作完成
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('✅ 集成测试全局清理完成');
  } catch (error) {
    console.error('❌ 集成测试全局清理失败:', error);
  }
}
