/**
 * @fileoverview 访客数据种子脚本
 * @description 生成模拟访客数据用于测试访客统计功能
 * @author Augment AI
 * @date 2025-01-XX
 * @version 1.0.0
 *
 * @dependencies
 * - @prisma/client
 *
 * @changelog
 * - 2025-01-XX: 初始版本创建
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 模拟数据配置
const VISITOR_TYPES = ['GUEST', 'USER', 'VIP', 'CREATOR', 'ADMIN', 'SUPER_ADMIN'];
const DEVICES = ['Desktop', 'Mobile', 'Tablet'];
const BROWSERS = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'];
const COUNTRIES = ['中国', '美国', '日本', '韩国', '英国', '德国', '法国'];
const CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉'];
const PAGES = [
  '/',
  '/posts',
  '/users/sakura_cos',
  '/users/douyu',
  '/create',
  '/moments/create',
  '/search',
  '/tags',
];
const REFERRERS = [
  'https://google.com',
  'https://baidu.com',
  'https://weibo.com',
  'https://twitter.com',
  'https://facebook.com',
];

// 生成随机IP地址
function generateRandomIP(): string {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

// 生成随机User-Agent
function generateRandomUserAgent(): string {
  const browser = BROWSERS[Math.floor(Math.random() * BROWSERS.length)];
  const version = Math.floor(Math.random() * 100) + 1;
  return `Mozilla/5.0 (compatible; ${browser}/${version})`;
}

// 生成随机日期（最近30天内）
function generateRandomDate(): Date {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const randomTime = thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime());
  return new Date(randomTime);
}

// 生成网站访客数据
export async function seedSiteVisitors(count: number = 1000) {
  console.log(`开始生成 ${count} 条网站访客数据...`);

  // 获取现有用户
  const users = await prisma.user.findMany({
    select: { id: true },
  });

  const siteVisitors: any[] = [];

  for (let i = 0; i < count; i++) {
    const visitorType = VISITOR_TYPES[Math.floor(Math.random() * VISITOR_TYPES.length)];
    const isGuest = visitorType === 'GUEST' || Math.random() < 0.3; // 30% 概率是游客

    siteVisitors.push({
      visitorId: isGuest ? null : users[Math.floor(Math.random() * users.length)]?.id,
      visitorIp: generateRandomIP(),
      userAgent: generateRandomUserAgent(),
      visitedAt: generateRandomDate(),
      page: PAGES[Math.floor(Math.random() * PAGES.length)],
      referrer: REFERRERS[Math.floor(Math.random() * REFERRERS.length)],
      country: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
      city: CITIES[Math.floor(Math.random() * CITIES.length)],
      device: DEVICES[Math.floor(Math.random() * DEVICES.length)],
      browser: BROWSERS[Math.floor(Math.random() * BROWSERS.length)],
      visitorType: visitorType,
    });
  }

  // 批量插入数据
  await prisma.siteVisitor.createMany({
    data: siteVisitors,
  });

  console.log(`✅ 成功生成 ${count} 条网站访客数据`);
}

// 生成用户资料访客数据
export async function seedProfileVisitors(count: number = 500) {
  console.log(`开始生成 ${count} 条用户资料访客数据...`);

  // 获取现有用户
  const users = await prisma.user.findMany({
    select: { id: true },
  });

  if (users.length < 2) {
    console.log('❌ 需要至少2个用户才能生成资料访客数据');
    return;
  }

  const profileVisitors: any[] = [];

  for (let i = 0; i < count; i++) {
    const profileOwner = users[Math.floor(Math.random() * users.length)];
    const isGuest = Math.random() < 0.4; // 40% 概率是游客访问
    let visitor: any = null;
    let visitorType = 'GUEST';

    if (!isGuest) {
      visitor = users[Math.floor(Math.random() * users.length)];
      // 确保访问者不是资料所有者
      while (visitor.id === profileOwner.id) {
        visitor = users[Math.floor(Math.random() * users.length)];
      }
      visitorType = VISITOR_TYPES[Math.floor(Math.random() * (VISITOR_TYPES.length - 1)) + 1]; // 排除GUEST
    }

    profileVisitors.push({
      profileId: profileOwner.id,
      visitorId: visitor?.id || null,
      visitorIp: isGuest ? generateRandomIP() : null,
      userAgent: generateRandomUserAgent(),
      visitedAt: generateRandomDate(),
      visitorType: visitorType,
    });
  }

  // 批量插入数据
  await prisma.profileVisitor.createMany({
    data: profileVisitors,
  });

  console.log(`✅ 成功生成 ${count} 条用户资料访客数据`);
}

// 生成用户注册来源数据
export async function seedRegistrationSources(count: number = 100) {
  console.log('开始生成用户注册来源数据...');

  // 获取现有用户（排除管理员）
  const users = await prisma.user.findMany({
    where: {
      userLevel: {
        not: 'ADMIN',
      },
    },
    select: { id: true },
  });

  const sources = ['organic', 'social', 'referral', 'direct', 'email'];
  const mediums = ['cpc', 'organic', 'referral', 'social', 'email', 'direct'];
  const campaigns = ['summer2024', 'cosplay_contest', 'new_user', 'creator_program'];
  const registrationSources: any[] = [];

  for (let i = 0; i < count; i++) {
    const inviter = Math.random() < 0.3 ? users[Math.floor(Math.random() * users.length)] : null;

    registrationSources.push({
      userId: users[i % users.length].id,
      ip: generateRandomIP(),
      userAgent: generateRandomUserAgent(),
      referrer: Math.random() < 0.5 ? REFERRERS[Math.floor(Math.random() * REFERRERS.length)] : null,
      invitedBy: inviter?.id || null,
      campaign: Math.random() < 0.3 ? campaigns[Math.floor(Math.random() * campaigns.length)] : null,
      medium: mediums[Math.floor(Math.random() * mediums.length)],
      source: sources[Math.floor(Math.random() * sources.length)],
      visitCount: Math.floor(Math.random() * 10) + 1,
      firstVisit: generateRandomDate(),
      lastVisit: generateRandomDate(),
      country: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
      city: CITIES[Math.floor(Math.random() * CITIES.length)],
    });
  }

  // 批量插入数据
  if (registrationSources.length > 0) {
    await prisma.userRegistrationSource.createMany({
      data: registrationSources,
    });
  }

  console.log(`✅ 成功生成 ${registrationSources.length} 条用户注册来源数据`);
}

// 主函数：生成所有访客数据
export async function seedAllVisitorData() {
  try {
    console.log('🚀 开始生成访客统计数据...');

    await seedSiteVisitors(1000);
    await seedProfileVisitors(500);
    await seedRegistrationSources();

    console.log('🎉 所有访客数据生成完成！');
  } catch (error) {
    console.error('❌ 生成访客数据时出错:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 清理访客数据
export async function clearVisitorData() {
  try {
    console.log('🧹 开始清理访客数据...');

    await prisma.siteVisitor.deleteMany({});
    await prisma.profileVisitor.deleteMany({});
    await prisma.userRegistrationSource.deleteMany({});

    console.log('✅ 访客数据清理完成');
  } catch (error) {
    console.error('❌ 清理访客数据时出错:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'clear') {
    clearVisitorData();
  } else {
    seedAllVisitorData();
  }
}
