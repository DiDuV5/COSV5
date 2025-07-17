/**
 * @fileoverview 用户种子数据
 * @description 创建测试用户和管理员账户
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @prisma/client: ^5.0.0
 * - bcryptjs: ^2.4.3
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function seedUsers() {
  console.log('开始创建种子用户数据...');

  // 创建管理员用户
  const adminPassword = await bcrypt.hash('douyusm', 12);
  try {
    const admin = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {
        passwordHash: adminPassword,
        userLevel: 'ADMIN',
        isVerified: true,
        isActive: true,
        canPublish: true,
      },
      create: {
        username: 'admin',
        email: 'admin@tu.com',
        passwordHash: adminPassword,
        displayName: '系统管理员',
        bio: '系统管理员账户',
        userLevel: 'ADMIN',
        isVerified: true,
        isActive: true,
        canPublish: true,
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        likeCount: 0,
        points: 1000,
      },
    });
    console.log('✅ 管理员用户已创建:', admin.username);
  } catch (error) {
    console.error('❌ 创建管理员用户失败:', error);
  }

  // 创建测试用户 (使用实际存在的用户名)
  const testPassword = await bcrypt.hash('douyusm', 12);
  try {
    const testUser = await prisma.user.upsert({
      where: { username: 'sakura_cos' },
      update: {
        passwordHash: testPassword,
        userLevel: 'CREATOR',
        isVerified: true,
        isActive: true,
        canPublish: true,
      },
      create: {
        username: 'sakura_cos',
        email: 'sakura@tutu365.com',
        passwordHash: testPassword,
        displayName: '樱花小姐',
        bio: '专业cosplayer，擅长动漫角色扮演。已有5年cosplay经验，参与过多次漫展活动。',
        userLevel: 'CREATOR',
        isVerified: true,
        isActive: true,
        canPublish: true,
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        likeCount: 0,
        points: 500,
      },
    });
    console.log('✅ 测试用户已创建:', testUser.username);
  } catch (error) {
    console.error('❌ 创建测试用户失败:', error);
  }

  // 创建普通用户示例
  const userPassword = await bcrypt.hash('douyusm', 12);
  try {
    const normalUser = await prisma.user.upsert({
      where: { username: 'user1' },
      update: {
        passwordHash: userPassword,
        userLevel: 'USER',
        isVerified: false,
        isActive: true,
        canPublish: false,
      },
      create: {
        username: 'user1',
        email: 'user1@tu.com',
        passwordHash: userPassword,
        displayName: '普通用户',
        bio: '这是一个普通用户账户',
        userLevel: 'USER',
        isVerified: false,
        isActive: true,
        canPublish: false,
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        likeCount: 0,
        points: 100,
      },
    });
    console.log('✅ 普通用户已创建:', normalUser.username);
  } catch (error) {
    console.error('❌ 创建普通用户失败:', error);
  }

  // 创建VIP用户示例
  const vipPassword = await bcrypt.hash('douyusm', 12);
  try {
    const vipUser = await prisma.user.upsert({
      where: { username: 'vip1' },
      update: {
        passwordHash: vipPassword,
        userLevel: 'VIP',
        isVerified: true,
        isActive: true,
        canPublish: true,
      },
      create: {
        username: 'vip1',
        email: 'vip1@tu.com',
        passwordHash: vipPassword,
        displayName: 'VIP用户',
        bio: '这是一个VIP会员用户账户',
        userLevel: 'VIP',
        isVerified: true,
        isActive: true,
        canPublish: true,
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        likeCount: 0,
        points: 300,
      },
    });
    console.log('✅ VIP用户已创建:', vipUser.username);
  } catch (error) {
    console.error('❌ 创建VIP用户失败:', error);
  }

  console.log('用户种子数据创建完成！');
  console.log('');
  console.log('🔑 登录信息:');
  console.log('管理员: douyu / douyu112211');
  console.log('测试用户: sakura_cos / douyu112211');
  console.log('普通用户: user1 / douyusm');
  console.log('VIP用户: vip1 / douyusm');
}

// 如果直接运行此文件，则执行种子数据
if (require.main === module) {
  seedUsers()
    .catch(e => {
      console.error('用户种子数据创建失败:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
