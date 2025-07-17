/**
 * @fileoverview 帖子种子数据模块
 * @description 创建测试帖子和内容
 * @author Augment AI
 * @date 2025-01-XX
 * @version 2.0.0
 */

import { PrismaClient } from '@prisma/client';

/**
 * 测试帖子配置
 */
const TEST_POSTS_CONFIG = [
  {
    title: '【原神】甘雨cosplay作品集',
    content: '最新完成的甘雨cosplay作品，包含多套服装和场景拍摄。感谢摄影师的专业拍摄！\n\n#原神 #甘雨 #cosplay #二次元',
    type: 'WORK' as const,
    status: 'PUBLISHED' as const,
    tags: ['原神', '甘雨', 'cosplay', '二次元', '游戏'],
    authorUsername: 'sakura_cos',
    media: [
      {
        type: 'IMAGE',
        url: 'https://pub-5c260d3ebc214eb5bdcdf7e45225fe5b.r2.dev/posts/ganyu-1.jpg',
        thumbnailUrl: 'https://pub-5c260d3ebc214eb5bdcdf7e45225fe5b.r2.dev/posts/thumbs/ganyu-1.jpg',
        alt: '甘雨cosplay正面照',
        width: 1920,
        height: 1080,
      },
      {
        type: 'IMAGE',
        url: 'https://pub-5c260d3ebc214eb5bdcdf7e45225fe5b.r2.dev/posts/ganyu-2.jpg',
        thumbnailUrl: 'https://pub-5c260d3ebc214eb5bdcdf7e45225fe5b.r2.dev/posts/thumbs/ganyu-2.jpg',
        alt: '甘雨cosplay侧面照',
        width: 1920,
        height: 1080,
      },
    ],
  },
  {
    title: '【黑暗之魂】骑士套装制作过程',
    content: '分享一下最近制作的黑暗之魂骑士套装的制作过程，从设计到完成花了3个月时间。\n\n材料主要使用了EVA泡沫和热塑性塑料，细节部分用了3D打印。',
    type: 'WORK' as const,
    status: 'PUBLISHED' as const,
    tags: ['黑暗之魂', '骑士', '道具制作', '游戏', 'EVA'],
    authorUsername: 'knight_zero',
    media: [
      {
        type: 'IMAGE',
        url: 'https://pub-5c260d3ebc214eb5bdcdf7e45225fe5b.r2.dev/posts/knight-armor.jpg',
        thumbnailUrl: 'https://pub-5c260d3ebc214eb5bdcdf7e45225fe5b.r2.dev/posts/thumbs/knight-armor.jpg',
        alt: '骑士套装完成品',
        width: 1920,
        height: 1080,
      },
    ],
  },
  {
    title: '初音未来演唱会cosplay回顾',
    content: '参加了上周末的初音未来演唱会，和其他coser一起cosplay了不同版本的初音。现场氛围超棒！',
    type: 'MOMENT' as const,
    status: 'PUBLISHED' as const,
    tags: ['初音未来', 'Vocaloid', '演唱会', '活动'],
    authorUsername: 'miku_fan',
    media: [
      {
        type: 'IMAGE',
        url: 'https://pub-5c260d3ebc214eb5bdcdf7e45225fe5b.r2.dev/posts/miku-concert.jpg',
        thumbnailUrl: 'https://pub-5c260d3ebc214eb5bdcdf7e45225fe5b.r2.dev/posts/thumbs/miku-concert.jpg',
        alt: '演唱会现场cosplay',
        width: 1920,
        height: 1080,
      },
    ],
  },
  {
    title: '新手cosplay入门指南',
    content: '作为一个刚入坑的新手，想分享一些我学到的cosplay基础知识，希望能帮助到其他新手朋友。\n\n1. 选择角色的建议\n2. 服装购买vs自制\n3. 化妆基础技巧\n4. 拍摄注意事项',
    type: 'MOMENT' as const,
    status: 'PUBLISHED' as const,
    tags: ['新手指南', 'cosplay入门', '教程'],
    authorUsername: 'anime_lover',
    media: [],
  },
  {
    title: '【鬼灭之刃】炭治郎cosplay',
    content: '最新完成的炭治郎cosplay，从服装到道具都是自己制作的。特别是日轮刀的制作花了很多心思。',
    type: 'WORK' as const,
    status: 'PUBLISHED' as const,
    tags: ['鬼灭之刃', '炭治郎', '道具制作', '动漫'],
    authorUsername: 'cosplay_master',
    media: [
      {
        type: 'IMAGE',
        url: 'https://pub-5c260d3ebc214eb5bdcdf7e45225fe5b.r2.dev/posts/tanjiro.jpg',
        thumbnailUrl: 'https://pub-5c260d3ebc214eb5bdcdf7e45225fe5b.r2.dev/posts/thumbs/tanjiro.jpg',
        alt: '炭治郎cosplay',
        width: 1920,
        height: 1080,
      },
    ],
  },
];

/**
 * 创建测试帖子
 */
export async function createTestPosts(prisma: PrismaClient) {
  console.log('📝 创建测试帖子...');

  const users = await prisma.user.findMany({
    where: {
      username: {
        in: TEST_POSTS_CONFIG.map(p => p.authorUsername)
      }
    }
  });

  for (const postData of TEST_POSTS_CONFIG) {
    const author = users.find(u => u.username === postData.authorUsername);
    if (!author) {
      console.warn(`⚠️ 未找到作者: ${postData.authorUsername}`);
      continue;
    }

    const post = await prisma.post.create({
      data: {
        title: postData.title,
        content: postData.content,
        // type: postData.type, // Field may not exist in current schema
        // status: postData.status, // Field may not exist in current schema
        tags: postData.tags.join(','),
        authorId: author.id,
        publishedAt: new Date(),
        media: {
          create: postData.media.map(mediaItem => ({
            filename: `${mediaItem.alt}.jpg`,
            originalName: `${mediaItem.alt}.jpg`,
            mimeType: 'image/jpeg',
            fileSize: 1024000,
            mediaType: mediaItem.type as 'IMAGE' | 'VIDEO',
            url: mediaItem.url,
            thumbnailUrl: mediaItem.thumbnailUrl,
            // alt: mediaItem.alt, // Field may not exist in schema
            width: mediaItem.width,
            height: mediaItem.height,
          })),
        },
      },
      include: {
        media: true,
      },
    });

    console.log(`✅ 创建测试帖子: ${post.title}`);
  }
}

/**
 * 创建通知测试内容
 */
export async function createNotificationTestContent(prisma: PrismaClient, users: any[]) {
  console.log('📝 创建通知测试内容...');

  // 为每个用户创建一些测试内容
  for (const user of users) {
    if (user.userLevel === 'GUEST') continue; // 访客不能发布内容

    const postCount = user.userLevel === 'ADMIN' ? 3 : user.userLevel === 'CREATOR' ? 2 : 1;

    for (let i = 0; i < postCount; i++) {
      await prisma.post.create({
        data: {
          title: `${user.displayName}的测试内容 ${i + 1}`,
          content: `这是${user.displayName}发布的第${i + 1}个测试内容，用于测试通知系统功能。`,
          // type: i % 2 === 0 ? 'WORK' : 'MOMENT', // Field may not exist in current schema
          // status: 'PUBLISHED', // Field may not exist in current schema
          tags: '测试,通知系统',
          authorId: user.id,
          publishedAt: new Date(),
        },
      });
    }
  }

  // 创建互动数据（点赞、评论、关注）
  await createTestInteractions(prisma, users);
}

/**
 * 创建测试互动数据
 */
export async function createTestInteractions(prisma: PrismaClient, users: any[]) {
  console.log('💬 创建测试互动数据...');

  // 获取所有测试内容
  const posts = await prisma.post.findMany({
    where: {
      authorId: {
        in: users.map(u => u.id)
      }
    }
  });

  // 创建点赞数据
  for (const post of posts) {
    const likeCount = Math.floor(Math.random() * 5) + 1;
    const randomUsers = users.sort(() => 0.5 - Math.random()).slice(0, likeCount);

    for (const user of randomUsers) {
      if (user.id !== post.authorId) {
        // Note: Reaction model may not exist in current schema
        // await prisma.reaction.upsert({
        //   where: {
        //     userId_targetId_targetType: {
        //       userId: user.id,
        //       targetId: post.id,
        //       targetType: 'POST',
        //     },
        //   },
        //   update: {},
        //   create: {
        //     userId: user.id,
        //     targetId: post.id,
        //     targetType: 'POST',
        //     type: 'THUMBS_UP',
        //   },
        // });
      }
    }
  }

  // 创建评论数据
  for (const post of posts) {
    const commentCount = Math.floor(Math.random() * 3) + 1;
    const randomUsers = users.sort(() => 0.5 - Math.random()).slice(0, commentCount);

    for (const user of randomUsers) {
      if (user.id !== post.authorId) {
        await prisma.comment.create({
          data: {
            content: `这是${user.displayName}对《${post.title}》的评论，内容很棒！`,
            authorId: user.id,
            postId: post.id,
          },
        });
      }
    }
  }

  console.log('✅ 测试互动数据创建完成');
}

/**
 * 创建所有帖子相关的种子数据
 */
export async function seedPosts(prisma: PrismaClient) {
  console.log('🌱 开始创建帖子种子数据...');

  // 创建测试帖子
  await createTestPosts(prisma);

  console.log('✅ 帖子种子数据创建完成');
}
