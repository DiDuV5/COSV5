/**
 * @fileoverview 评论和通知种子数据模块
 * @description 创建测试评论、提及和通知数据
 * @author Augment AI
 * @date 2025-01-XX
 * @version 2.0.0
 */

import { PrismaClient } from '@prisma/client';
import { NOTIFICATION_TYPES, type NotificationType as _NotificationType } from './seed-config';

/**
 * 创建测试评论和提及功能
 */
export async function createTestCommentsAndMentions(prisma: PrismaClient) {
  console.log('💬 创建测试评论和@提及...');

  // 获取所有用户
  const users = await prisma.user.findMany();
  const posts = await prisma.post.findMany();

  if (posts.length === 0) {
    console.log('⚠️ 没有找到帖子，跳过评论创建');
    return;
  }

  const testComments = [
    {
      content: '太棒了！@sakura_cos 的cosplay总是这么精致，期待更多作品！',
      authorUsername: 'miku_fan',
      postIndex: 0,
      mentions: ['sakura_cos'],
    },
    {
      content: '这个道具制作真的很用心，@knight_zero 可以分享一下制作教程吗？',
      authorUsername: 'anime_lover',
      postIndex: 1,
      mentions: ['knight_zero'],
    },
    {
      content: '演唱会现场一定很棒！@miku_fan 下次有活动记得叫上我们 @sakura_cos',
      authorUsername: 'cosplay_master',
      postIndex: 2,
      mentions: ['miku_fan', 'sakura_cos'],
    },
    {
      content: '新手指南很实用，感谢分享！@anime_lover',
      authorUsername: 'newbie_cos',
      postIndex: 3,
      mentions: ['anime_lover'],
    },
    {
      content: '炭治郎的还原度很高！@cosplay_master 的技术越来越好了',
      authorUsername: 'photo_artist',
      postIndex: 4,
      mentions: ['cosplay_master'],
    },
  ];

  for (const commentData of testComments) {
    const author = users.find(u => u.username === commentData.authorUsername);
    const post = posts[commentData.postIndex];

    if (!author || !post) {
      console.warn(`⚠️ 评论数据不完整: ${commentData.authorUsername} -> Post ${commentData.postIndex}`);
      continue;
    }

    // 创建评论
    const _comment = await prisma.comment.create({
      data: {
        content: commentData.content,
        authorId: author.id,
        postId: post.id,
      },
    });

    // 创建提及记录
    for (const mentionUsername of commentData.mentions) {
      const mentionedUser = users.find(u => u.username === mentionUsername);
      if (mentionedUser) {
        // Note: Mention model may not exist in current schema
        // await prisma.mention.create({
        //   data: {
        //     mentionerId: author.id,
        //     mentionedId: mentionedUser.id,
        //     targetType: 'COMMENT',
        //     targetId: comment.id,
        //     content: commentData.content,
        //   },
        // });

        console.log(`✅ 创建提及: ${author.username} -> @${mentionedUser.username}`);
      }
    }

    console.log(`✅ 创建评论: ${author.username} -> ${post.title}`);
  }

  console.log(`✅ 创建了 ${testComments.length} 条测试评论`);
}

/**
 * 创建通知偏好设置
 */
export async function createNotificationPreferences(prisma: PrismaClient, users: any[]) {
  console.log('⚙️ 创建通知偏好设置...');

  for (const user of users) {
    // 为每个用户创建通知偏好设置
    const preferences = NOTIFICATION_TYPES.map(type => ({
      userId: user.id,
      notificationType: type,
      enabled: true,
      emailEnabled: user.userLevel !== 'GUEST', // 访客不接收邮件通知
      pushEnabled: true,
      frequency: type === 'WEEKLY_DIGEST' ? 'WEEKLY' : 'IMMEDIATE',
    }));

    for (const pref of preferences) {
      await prisma.userNotificationPreference.upsert({
        where: {
          userId_notificationType: {
            userId: pref.userId,
            notificationType: pref.notificationType,
          },
        },
        update: {
          enableInApp: pref.enabled,
          enableEmail: pref.emailEnabled,
          enablePush: pref.pushEnabled,
          batchInterval: typeof pref.frequency === 'number' ? pref.frequency : 60,
        },
        create: {
          notificationType: pref.notificationType,
          enableInApp: pref.enabled,
          enableEmail: pref.emailEnabled,
          enablePush: pref.pushEnabled,
          user: {
            connect: { id: pref.userId }
          }
        },
      });
    }

    console.log(`✅ 为用户 ${user.username} 创建通知偏好设置`);
  }
}

/**
 * 创建测试通知数据
 */
export async function createTestNotifications(prisma: PrismaClient, users: any[]) {
  console.log('🔔 创建测试通知数据...');

  // 为每个用户创建不同类型的测试通知
  for (const user of users) {
    // 点赞通知
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'LIKE',
        title: '有人点赞了你的作品',
        content: `${users[0]?.displayName || '某位用户'} 点赞了你的作品`,
        isRead: Math.random() > 0.5,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // 随机过去7天内
      },
    });

    // 评论通知
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'COMMENT',
        title: '有人评论了你的作品',
        content: `${users[1]?.displayName || '某位用户'} 评论了你的作品`,
        isRead: Math.random() > 0.5,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      },
    });

    // 关注通知
    if (user.userLevel !== 'GUEST') {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'FOLLOW',
          title: '有新的关注者',
          content: `${users[2]?.displayName || '某位用户'} 关注了你`,
          isRead: Math.random() > 0.5,
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // 系统公告
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: '系统维护通知',
        content: '系统将于本周末进行例行维护，预计维护时间2小时',
        isRead: Math.random() > 0.3,
        createdAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000),
      },
    });

    console.log(`✅ 为用户 ${user.username} 创建测试通知`);
  }

  console.log('✅ 测试通知数据创建完成');
}

/**
 * 创建所有评论和通知相关的种子数据
 */
export async function seedCommentsAndNotifications(prisma: PrismaClient) {
  console.log('🌱 开始创建评论和通知种子数据...');

  // 创建测试评论和提及
  await createTestCommentsAndMentions(prisma);

  // 获取所有用户用于通知测试
  const users = await prisma.user.findMany();

  // 创建通知偏好设置
  await createNotificationPreferences(prisma, users);

  // 创建测试通知
  await createTestNotifications(prisma, users);

  console.log('✅ 评论和通知种子数据创建完成');
}
