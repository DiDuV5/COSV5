/**
 * @fileoverview 更新用户权限脚本
 * @description 为现有用户设置发布权限
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @prisma/client: ^5.22.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateUserPermissions() {
  console.log('开始更新用户权限...');

  try {
    // 更新所有用户的发布权限
    const result = await prisma.user.updateMany({
      where: {
        canPublish: false, // 只更新当前没有发布权限的用户
      },
      data: {
        canPublish: true, // 给予发布权限
      },
    });

    console.log(`✓ 成功更新 ${result.count} 个用户的发布权限`);

    // 确保管理员用户有完整权限
    const adminResult = await prisma.user.updateMany({
      where: {
        userLevel: 'ADMIN',
      },
      data: {
        canPublish: true,
        isVerified: true,
        isActive: true,
      },
    });

    console.log(`✓ 成功更新 ${adminResult.count} 个管理员用户的权限`);

    // 显示当前用户权限统计
    const stats = await prisma.user.groupBy({
      by: ['canPublish', 'userLevel'],
      _count: {
        id: true,
      },
    });

    console.log('\n当前用户权限统计:');
    stats.forEach(stat => {
      console.log(`- ${stat.userLevel} 用户 (canPublish: ${stat.canPublish}): ${stat._count.id} 人`);
    });

    console.log('\n用户权限更新完成！');
  } catch (error) {
    console.error('更新用户权限时出错:', error);
    throw error;
  }
}

// 如果直接运行此文件
if (require.main === module) {
  updateUserPermissions()
    .catch((e) => {
      console.error('用户权限更新失败:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { updateUserPermissions };
