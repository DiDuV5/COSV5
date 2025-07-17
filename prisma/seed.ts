/**
 * @fileoverview CoserEden 平台数据库种子文件 (重构版本)
 * @description 初始化开发环境的完整测试数据，模块化设计
 * @author Augment AI
 * @date 2025-01-XX
 * @version 3.0.0 (重构版本)
 * @since 1.0.0
 *
 * @features
 * - 模块化设计: 拆分为多个独立模块
 * - 管理员账户: douyu (douyu112211)
 * - 8个测试用户: 涵盖不同用户等级和角色
 * - 测试内容: 作品和动态，包含丰富媒体
 * - 完整配置: 罐头系统、用户权限、精选内容
 *
 * @dependencies
 * - @prisma/client: ^5.0.0
 * - bcryptjs: ^2.4.3
 *
 * @changelog
 * - 2025-01-XX: v3.0.0 重构为模块化设计，符合400行文件限制
 */

import { PrismaClient } from '@prisma/client';
import { seedUsers } from './seeds/seed-users';
import { seedPosts } from './seeds/seed-posts';
import { seedCommentsAndNotifications as _seedCommentsAndNotifications } from './seeds/seed-comments-notifications';
import { seedFeaturedContentWithCovers } from './seeds/featured-content-with-covers';
import { seedCansSystemConfig } from './seeds/cans-system-config';
import { seedUserGroupConfigs } from './seeds/user-group-configs';
import { seedAuthSystemSettings } from './seeds/auth-system-settings';

const prisma = new PrismaClient();

/**
 * 主函数：执行所有种子数据初始化
 */
async function main() {
  console.log('🌱 开始 CoserEden 平台数据库种子数据初始化...');

  try {
    // 1. 创建用户数据（包括管理员和测试用户）
    await seedUsers(prisma);

    // 2. 创建帖子和内容数据
    await seedPosts(prisma);

    // 3. 创建评论和通知数据
    // await seedCommentsAndNotifications(prisma); // 暂时跳过通知偏好设置

    // 4. 创建带封面的精选内容
    await seedFeaturedContentWithCovers();

    // 5. 创建罐头系统配置
    await seedCansSystemConfig();

    // 6. 创建用户组权限配置
    await seedUserGroupConfigs();

    // 7. 初始化认证系统设置
    await seedAuthSystemSettings();

    console.log('🎉 CoserEden 数据库种子数据初始化完成！');
  } catch (error) {
    console.error('❌ 种子数据初始化失败:', error);
    throw error;
  }
}

// 执行主函数
main()
  .catch((e) => {
    console.error('❌ 种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
