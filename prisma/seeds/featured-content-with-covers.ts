/**
 * @fileoverview Tu Cosplay 平台精选内容种子数据
 * @description 创建15个带封面图片的精选内容，用于首页展示和内容推荐
 * @author Augment AI
 * @date 2024-01-XX
 * @version 2.0.0
 * @since 1.0.0
 *
 * @features
 * - 15个精选内容: 涵盖作品集、教程、公告等多种类型
 * - 高质量封面: 使用Unsplash专业图片
 * - 自动关联: 为POST类型自动创建对应的内容记录
 * - 优先级排序: 支持位置排序和时效性控制
 *
 * @dependencies
 * - @prisma/client: ^5.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2025-01-XX: v2.0.0 优化内容质量，统一管理员账户
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 统一的管理员账户配置
const ADMIN_USERNAME = "douyu";

export async function seedFeaturedContentWithCovers() {
  console.log('🎨 开始创建带封面的精选内容...');

  // 获取管理员用户 (优先使用douyu账户)
  const admin = await prisma.user.findFirst({
    where: {
      OR: [
        { username: ADMIN_USERNAME },
        { userLevel: 'ADMIN' }
      ]
    },
    orderBy: { username: 'asc' } // douyu排在前面
  });

  if (!admin) {
    console.log('❌ 没有找到管理员用户，请先运行用户种子');
    return;
  }

  console.log(`✅ 使用管理员账户: ${admin.username} (${admin.displayName})`);

  // 获取现有用户
  const users = await prisma.user.findMany({
    take: 5,
  });

  if (users.length === 0) {
    console.log('❌ 没有找到用户，请先运行用户种子');
    return;
  }

  // 精选内容数据
  const featuredContents = [
    {
      title: "2025年度最佳Cosplay作品集",
      description: "汇集了本年度最精彩的Cosplay作品，展现创作者们的无限创意与精湛技艺",
      coverImage: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop",
      contentType: "POST" as const,
      priority: 1,
      isActive: true,
    },
    {
      title: "原神角色Cosplay专题",
      description: "精选原神游戏角色的高质量Cosplay作品，还原度极高的服装与妆容",
      coverImage: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop&q=80",
      contentType: "POST" as const,
      priority: 2,
      isActive: true,
    },
    {
      title: "动漫经典角色重现",
      description: "经典动漫角色的现代演绎，致敬那些陪伴我们成长的二次元形象",
      coverImage: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop",
      contentType: "POST" as const,
      priority: 3,
      isActive: true,
    },
    {
      title: "Cosplay摄影技巧分享",
      description: "专业摄影师分享Cosplay拍摄的灯光、构图与后期处理技巧",
      coverImage: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&h=600&fit=crop",
      contentType: "TUTORIAL" as const,
      priority: 4,
      isActive: true,
    },
    {
      title: "手工制作道具教程",
      description: "从零开始制作Cosplay道具，详细的材料选择与制作流程指导",
      coverImage: "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=800&h=600&fit=crop",
      contentType: "TUTORIAL" as const,
      priority: 5,
      isActive: true,
    },
    {
      title: "2025 Cosplay大赛公告",
      description: "兔图平台首届Cosplay创作大赛正式启动，丰厚奖品等你来拿！",
      coverImage: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=600&fit=crop",
      contentType: "ANNOUNCEMENT" as const,
      priority: 6,
      isActive: true,
    },
    {
      title: "古风Cosplay专场",
      description: "传统文化与现代Cosplay的完美结合，展现东方美学的独特魅力",
      coverImage: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop&sat=1.2",
      contentType: "POST" as const,
      priority: 7,
      isActive: true,
    },
    {
      title: "欧美超级英雄系列",
      description: "Marvel与DC经典超级英雄角色的精彩演绎，正义与力量的完美诠释",
      coverImage: "https://images.unsplash.com/photo-1635805737707-575885ab0820?w=800&h=600&fit=crop",
      contentType: "POST" as const,
      priority: 8,
      isActive: true,
    },
    {
      title: "妆容技巧进阶指南",
      description: "从基础妆容到特效化妆，全面提升你的Cosplay妆容技能",
      coverImage: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=600&fit=crop",
      contentType: "TUTORIAL" as const,
      priority: 9,
      isActive: true,
    },
    {
      title: "服装制作工艺详解",
      description: "专业裁缝师传授Cosplay服装制作的核心技巧与工艺要点",
      coverImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
      contentType: "TUTORIAL" as const,
      priority: 10,
      isActive: true,
    },
    {
      title: "日系校园风Cosplay",
      description: "青春校园题材的Cosplay作品，重温那些美好的校园时光",
      coverImage: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=600&fit=crop",
      contentType: "POST" as const,
      priority: 11,
      isActive: true,
    },
    {
      title: "奇幻世界角色扮演",
      description: "魔法师、精灵、龙族...进入奇幻世界，体验不同种族的魅力",
      coverImage: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop&hue=240",
      contentType: "POST" as const,
      priority: 12,
      isActive: true,
    },
    {
      title: "Cosplay社区活动预告",
      description: "本月精彩活动预告：线下聚会、作品展示、技能交流等你参与",
      coverImage: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&h=600&fit=crop",
      contentType: "ANNOUNCEMENT" as const,
      priority: 13,
      isActive: true,
    },
    {
      title: "新人入门完全指南",
      description: "Cosplay新手必看！从角色选择到作品完成的全流程指导",
      coverImage: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=600&fit=crop",
      contentType: "TUTORIAL" as const,
      priority: 14,
      isActive: true,
    },
    {
      title: "创作者访谈系列",
      description: "对话知名Cosplay创作者，分享他们的创作心得与成长历程",
      coverImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop",
      contentType: "POST" as const,
      priority: 15,
      isActive: true,
    },
  ];

  // 创建精选内容
  for (const contentData of featuredContents) {
    try {
      // 随机选择一个用户作为关联内容的作者
      const randomUser = users[Math.floor(Math.random() * users.length)];

      if (!randomUser) {
        console.warn(`跳过精选内容 ${contentData.title}：没有可用用户`);
        continue;
      }

      // 创建关联的内容（如果是POST类型）
      let relatedContent: any = null;
      if (contentData.contentType === 'POST') {
        relatedContent = await prisma.post.create({
          data: {
            title: contentData.title,
            content: contentData.description,
            authorId: randomUser.id,
            contentType: 'POST',
            isPublic: true,
            publishedAt: new Date(),
            viewCount: Math.floor(Math.random() * 1000) + 100,
          },
        });
      }

      // 创建精选内容
      const featuredContent = await prisma.featuredContent.create({
        data: {
          title: contentData.title,
          description: contentData.description,
          coverImage: contentData.coverImage,
          contentType: contentData.contentType,
          position: contentData.priority,
          isActive: contentData.isActive,
          viewCount: Math.floor(Math.random() * 500) + 50,
          contentId: relatedContent?.id || null,
          adminId: admin.id,
          reason: `精选推荐: ${contentData.title}`,
        },
      });

      console.log(`✅ 创建精选内容: ${featuredContent.title}`);
    } catch (error) {
      console.error(`❌ 创建精选内容失败 (${contentData.title}):`, error);
    }
  }

  console.log('🎉 带封面的精选内容创建完成！');
}

// 如果直接运行此文件
if (require.main === module) {
  seedFeaturedContentWithCovers()
    .catch((e) => {
      console.error('❌ 种子数据创建失败:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
