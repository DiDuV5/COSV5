/**
 * @fileoverview 主种子数据文件
 * @description 统一执行所有种子数据的初始化
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @prisma/client: ^5.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { PrismaClient } from '@prisma/client';
import { seedUsers } from './seed-users';
import { seedPermissions } from './seed-permissions';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始初始化数据库种子数据...');
  console.log('');

  try {
    // 1. 初始化权限配置
    console.log('📋 步骤 1: 初始化权限配置');
    await seedPermissions();
    console.log('');

    // 2. 创建用户数据
    console.log('👥 步骤 2: 创建用户数据');
    await seedUsers();
    console.log('');

    console.log('✅ 所有种子数据初始化完成！');
    console.log('');
    console.log('🚀 现在可以启动应用并使用以下账户登录:');
    console.log('');
    console.log('🔐 管理员账户:');
    console.log('   用户名: admin');
    console.log('   密码: douyusm');
    console.log('   权限: 完整管理员权限');
    console.log('');
    console.log('🧪 测试账户:');
    console.log('   用户名: testuser');
    console.log('   密码: douyusm');
    console.log('   权限: 创作者权限');
    console.log('');
    console.log('👤 普通用户:');
    console.log('   用户名: user1');
    console.log('   密码: douyusm');
    console.log('   权限: 基础用户权限');
    console.log('');
    console.log('💎 会员用户:');
    console.log('   用户名: member1');
    console.log('   密码: douyusm');
    console.log('   权限: 会员权限');
    console.log('');
    console.log('🌐 访问地址:');
    console.log('   前台: http://localhost:3000');
    console.log('   管理后台: http://localhost:3000/admin');
    console.log('   权限管理: http://localhost:3000/admin/permissions');
    console.log('   动态发布: http://localhost:3000/moments/create');

  } catch (error) {
    console.error('❌ 种子数据初始化失败:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('种子数据初始化过程中发生错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
