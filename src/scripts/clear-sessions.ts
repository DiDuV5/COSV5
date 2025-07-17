/**
 * @fileoverview 清理session数据脚本
 * @description 清理旧的session和account数据，解决JWT错误
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 */

import { prisma } from '../lib/prisma';

async function clearSessions() {
  try {
    console.log('🧹 开始清理session数据...');

    // 清理所有session
    const deletedSessions = await prisma.session.deleteMany({});
    console.log(`✅ 已清理 ${deletedSessions.count} 个session记录`);

    // 清理所有account
    const deletedAccounts = await prisma.account.deleteMany({});
    console.log(`✅ 已清理 ${deletedAccounts.count} 个account记录`);

    // 清理所有verification token
    const deletedTokens = await prisma.verificationToken.deleteMany({});
    console.log(`✅ 已清理 ${deletedTokens.count} 个verification token记录`);

    console.log('🎉 Session数据清理完成！');
  } catch (_error) {
    console.error('❌ 清理session数据失败:', _error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行清理脚本
clearSessions();
