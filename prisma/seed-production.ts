/**
 * @fileoverview Tu Cosplay 平台数据库种子文件 (生产环境)
 * @description 初始化生产环境的基础数据，仅包含必要的管理员账户和系统配置
 * @author Augment AI
 * @date 2025-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @features
 * - 管理员账户: douyu (douyu112211)
 * - 系统配置: 罐头系统、用户权限
 * - 无测试数据: 适合生产环境部署
 *
 * @dependencies
 * - @prisma/client: ^5.0.0
 * - bcryptjs: ^2.4.3
 *
 * @changelog
 * - 2025-01-XX: 初始版本创建，生产环境专用
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedCansSystemConfig } from './seeds/cans-system-config';
import { seedUserGroupConfigs } from './seeds/user-group-configs';

const prisma = new PrismaClient();

// 生产环境管理员账户配置
const PRODUCTION_ADMIN_CONFIG = {
  username: 'douyu',
  email: 'kellisonyd@gmail.com',
  password: 'douyu112211',
  displayName: '斗鱼',
  bio: 'Tu Cosplay 平台创始人，致力于推广cosplay文化，为广大coser提供优质的分享平台。',
};

async function main() {
  console.log('🚀 开始 Tu Cosplay 平台生产环境数据库初始化...');

  // 创建生产环境管理员用户
  const adminPassword = await bcrypt.hash(PRODUCTION_ADMIN_CONFIG.password, 12);
  const admin = await prisma.user.upsert({
    where: { username: PRODUCTION_ADMIN_CONFIG.username },
    update: {},
    create: {
      username: PRODUCTION_ADMIN_CONFIG.username,
      email: PRODUCTION_ADMIN_CONFIG.email,
      passwordHash: adminPassword,
      displayName: PRODUCTION_ADMIN_CONFIG.displayName,
      userLevel: 'ADMIN',
      isVerified: true,
      isActive: true,
      canPublish: true,
      bio: PRODUCTION_ADMIN_CONFIG.bio,
      avatarUrl:
        'https://api.dicebear.com/7.x/avataaars/svg?seed=douyu&backgroundColor=b6e3f4&topType=shortHair&accessoriesType=prescription02&hairColor=black&facialHairType=blank&clotheType=hoodie&clotheColor=blue01&eyeType=happy&eyebrowType=default&mouthType=smile',
      bannerUrl:
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200&h=400&fit=crop&q=80',
      location: '中国',
      website: 'https://cos.tutu365.com',
      points: 0, // 生产环境从0开始
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      likeCount: 0,
    },
  });

  console.log('✅ 创建生产环境管理员用户:', admin.username, `(${admin.email})`);

  // 创建罐头系统配置
  await seedCansSystemConfig();

  // 创建用户组权限配置
  await seedUserGroupConfigs();

  // 创建欢迎帖子
  const welcomePost = await prisma.post.upsert({
    where: { id: 'welcome-post-production' },
    update: {},
    create: {
      id: 'welcome-post-production',
      title: '欢迎来到 Tu Cosplay 平台！',
      content: `# 欢迎来到 Tu Cosplay 平台！🎭

## 关于我们

Tu Cosplay 是一个专为cosplay爱好者打造的分享平台，在这里你可以：

### 📸 分享作品
- 上传你的cosplay作品和写真照片
- 展示制作过程和技巧心得
- 获得社区的认可和支持

### 💬 互动交流
- 与其他coser交流经验
- 参与话题讨论
- 结识志同道合的朋友

### 🎯 成长进步
- 学习化妆和服装制作技巧
- 参与平台活动和挑战
- 提升自己的cosplay水平

## 社区规则

1. **尊重原创** - 标注作品出处，尊重他人创作
2. **友善交流** - 保持礼貌，禁止恶意评论
3. **内容健康** - 发布符合平台规范的内容
4. **鼓励新人** - 帮助新手成长，营造良好氛围

## 开始你的cosplay之旅

现在就开始分享你的第一个作品吧！如有任何问题，欢迎联系管理员。

---

*Tu Cosplay 平台管理团队*`,
      excerpt: '欢迎来到 Tu Cosplay 平台！这里是cosplay爱好者的聚集地，开始你的创作之旅吧！',
      contentType: 'POST',

      authorId: admin.id,
      isPublic: true,
      visibility: 'PUBLIC',
      publishedAt: new Date(),
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
    },
  });

  console.log('✅ 创建欢迎帖子:', welcomePost.title);

  console.log('🎉 Tu Cosplay 平台生产环境数据库初始化完成！');
  console.log('\n📋 生产环境账户信息:');
  console.log(`👤 管理员: ${admin.username}`);
  console.log(`📧 邮箱: ${admin.email}`);
  console.log(`🔐 密码: ${PRODUCTION_ADMIN_CONFIG.password}`);
  console.log('\n⚠️  请妥善保管管理员账户信息，建议首次登录后立即修改密码！');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async e => {
    console.error('❌ 生产环境种子数据初始化失败:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
