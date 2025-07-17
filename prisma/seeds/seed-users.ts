/**
 * @fileoverview 用户种子数据模块
 * @description 创建测试用户和管理员账户
 * @author Augment AI
 * @date 2025-01-XX
 * @version 2.0.0
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ADMIN_CONFIG, TEST_USERS_CONFIG, NOTIFICATION_TEST_USERS } from './seed-config';

/**
 * 创建管理员用户
 */
export async function createAdminUser(prisma: PrismaClient) {
  console.log('👑 创建管理员用户...');

  const adminPassword = await bcrypt.hash(ADMIN_CONFIG.password, 12);
  const admin = await prisma.user.upsert({
    where: { username: ADMIN_CONFIG.username },
    update: {},
    create: {
      username: ADMIN_CONFIG.username,
      email: ADMIN_CONFIG.email,
      passwordHash: adminPassword,
      displayName: ADMIN_CONFIG.displayName,
      bio: ADMIN_CONFIG.bio,
      userLevel: 'ADMIN',
      approvalStatus: 'APPROVED',
      isActive: true,
      emailVerified: new Date(),
      avatarUrl: 'https://pub-5c260d3ebc214eb5bdcdf7e45225fe5b.r2.dev/avatars/admin.jpg',
    },
  });

  console.log(`✅ 管理员用户创建成功: ${admin.username} (${admin.email})`);
  return admin;
}

/**
 * 创建测试用户
 */
export async function createTestUsers(prisma: PrismaClient) {
  console.log('👥 创建测试用户...');

  const createdUsers: any[] = [];

  for (const userData of TEST_USERS_CONFIG) {
    const hashedPassword = await bcrypt.hash('password123', 12);

    const user = await prisma.user.upsert({
      where: { username: userData.username },
      update: {},
      create: {
        ...userData,
        passwordHash: hashedPassword,
        emailVerified: new Date(),
      },
    });

    createdUsers.push(user);
    console.log(`✅ 创建测试用户: ${user.username} (${user.userLevel})`);
  }

  return createdUsers;
}

/**
 * 创建通知测试用户
 */
export async function createNotificationTestUsers(prisma: PrismaClient) {
  console.log('🔔 创建通知测试用户...');

  const createdUsers: any[] = [];

  for (const userData of NOTIFICATION_TEST_USERS) {
    const hashedPassword = await bcrypt.hash('notification123', 12);

    const user = await prisma.user.upsert({
      where: { username: userData.username },
      update: {},
      create: {
        ...userData,
        passwordHash: hashedPassword,
        emailVerified: new Date(),
      },
    });

    createdUsers.push(user);
    console.log(`✅ 创建通知测试用户: ${user.username} (${user.userLevel})`);
  }

  return createdUsers;
}

/**
 * 创建用户关注关系
 */
export async function createUserFollows(prisma: PrismaClient) {
  console.log('👥 创建用户关注关系...');

  const users = await prisma.user.findMany({
    where: {
      username: {
        in: TEST_USERS_CONFIG.map(u => u.username)
      }
    }
  });

  // 创建一些关注关系
  const followRelations = [
    { follower: 'sakura_cos', following: 'knight_zero' },
    { follower: 'sakura_cos', following: 'cosplay_master' },
    { follower: 'miku_fan', following: 'sakura_cos' },
    { follower: 'anime_lover', following: 'cosplay_master' },
    { follower: 'newbie_cos', following: 'sakura_cos' },
    { follower: 'newbie_cos', following: 'knight_zero' },
    { follower: 'photo_artist', following: 'cosplay_master' },
  ];

  for (const relation of followRelations) {
    const follower = users.find(u => u.username === relation.follower);
    const following = users.find(u => u.username === relation.following);

    if (follower && following) {
      await prisma.follow.upsert({
        where: {
          followerId_followingId: {
            followerId: follower.id,
            followingId: following.id,
          },
        },
        update: {},
        create: {
          followerId: follower.id,
          followingId: following.id,
        },
      });

      console.log(`✅ 创建关注关系: ${follower.username} -> ${following.username}`);
    }
  }
}

/**
 * 创建所有用户相关的种子数据
 */
export async function seedUsers(prisma: PrismaClient) {
  console.log('🌱 开始创建用户种子数据...');

  // 创建管理员
  await createAdminUser(prisma);

  // 创建测试用户
  await createTestUsers(prisma);

  // 创建通知测试用户
  await createNotificationTestUsers(prisma);

  // 创建关注关系
  await createUserFollows(prisma);

  console.log('✅ 用户种子数据创建完成');
}
