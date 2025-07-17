/**
 * @fileoverview 种子数据基础配置
 * @description 统一的配置常量和类型定义
 * @author Augment AI
 * @date 2025-01-XX
 * @version 2.0.0
 */

// 统一的管理员账户配置
export const ADMIN_CONFIG = {
  username: 'douyu',
  email: 'douyu@cosereeden.com',
  password: 'douyu112211',
  displayName: '抖御',
  bio: 'CoserEden 平台创始人，致力于推广cosplay文化，为广大coser提供优质的分享平台。',
};

// 测试用户配置
export const TEST_USERS_CONFIG = [
  {
    username: 'sakura_cos',
    email: 'sakura@tutu365.com',
    displayName: '樱花小仙女',
    bio: '专业cosplayer，擅长动漫角色扮演，已有3年cosplay经验。',
    userLevel: 'VIP',
    approvalStatus: 'APPROVED',
    isActive: true,
    avatarUrl: 'https://pub-5c260d3ebc214eb5bdcdf7e45225fe5b.r2.dev/avatars/sakura.jpg',
  },
  {
    username: 'knight_zero',
    email: 'knight@tutu365.com',
    displayName: '零骑士',
    bio: '游戏角色cosplay爱好者，特别喜欢RPG游戏角色。',
    userLevel: 'CREATOR',
    approvalStatus: 'APPROVED',
    isActive: true,
    avatarUrl: 'https://pub-5c260d3ebc214eb5bdcdf7e45225fe5b.r2.dev/avatars/knight.jpg',
  },
  {
    username: 'miku_fan',
    email: 'miku@tutu365.com',
    displayName: '初音未来粉',
    bio: 'Vocaloid系列角色cosplay专家，特别是初音未来。',
    userLevel: 'USER',
    approvalStatus: 'APPROVED',
    isActive: true,
    avatarUrl: 'https://pub-5c260d3ebc214eb5bdcdf7e45225fe5b.r2.dev/avatars/miku.jpg',
  },
  {
    username: 'anime_lover',
    email: 'anime@tutu365.com',
    displayName: '动漫爱好者',
    bio: '新手cosplayer，正在学习中，希望能和大家多多交流。',
    userLevel: 'USER',
    approvalStatus: 'APPROVED',
    isActive: true,
    avatarUrl: 'https://pub-5c260d3ebc214eb5bdcdf7e45225fe5b.r2.dev/avatars/anime.jpg',
  },
  {
    username: 'cosplay_master',
    email: 'master@tutu365.com',
    displayName: 'Cosplay大师',
    bio: '资深cosplayer，10年经验，擅长各种类型的角色扮演。',
    userLevel: 'CREATOR',
    approvalStatus: 'APPROVED',
    isActive: true,
    avatarUrl: 'https://pub-5c260d3ebc214eb5bdcdf7e45225fe5b.r2.dev/avatars/master.jpg',
  },
  {
    username: 'newbie_cos',
    email: 'newbie@tutu365.com',
    displayName: '新手小白',
    bio: '刚入坑的cosplay新手，请多多指教！',
    userLevel: 'USER',
    approvalStatus: 'PENDING',
    isActive: true,
    avatarUrl: 'https://pub-5c260d3ebc214eb5bdcdf7e45225fe5b.r2.dev/avatars/newbie.jpg',
  },
  {
    username: 'photo_artist',
    email: 'photo@tutu365.com',
    displayName: '摄影艺术家',
    bio: '专业cosplay摄影师，为coser提供高质量的拍摄服务。',
    userLevel: 'VIP',
    approvalStatus: 'APPROVED',
    isActive: true,
    avatarUrl: 'https://pub-5c260d3ebc214eb5bdcdf7e45225fe5b.r2.dev/avatars/photo.jpg',
  },
  {
    username: 'guest_user',
    email: 'guest@tutu365.com',
    displayName: '访客用户',
    bio: '临时访客账户，用于测试访客权限。',
    userLevel: 'GUEST',
    approvalStatus: 'APPROVED',
    isActive: true,
    avatarUrl: 'https://pub-5c260d3ebc214eb5bdcdf7e45225fe5b.r2.dev/avatars/guest.jpg',
  },
];

// 通知测试用户配置
export const NOTIFICATION_TEST_USERS = [
  {
    username: 'notification_admin',
    email: 'notif_admin@tutu365.com',
    displayName: '通知管理员',
    bio: '负责测试通知系统的管理员账户',
    userLevel: 'ADMIN',
    approvalStatus: 'APPROVED',
    isActive: true,
  },
  {
    username: 'notification_creator',
    email: 'notif_creator@tutu365.com',
    displayName: '通知创作者',
    bio: '测试创作者级别通知功能',
    userLevel: 'CREATOR',
    approvalStatus: 'APPROVED',
    isActive: true,
  },
  {
    username: 'notification_vip',
    email: 'notif_vip@tutu365.com',
    displayName: '通知VIP用户',
    bio: '测试VIP级别通知功能',
    userLevel: 'VIP',
    approvalStatus: 'APPROVED',
    isActive: true,
  },
  {
    username: 'notification_user',
    email: 'notif_user@tutu365.com',
    displayName: '通知普通用户',
    bio: '测试普通用户级别通知功能',
    userLevel: 'USER',
    approvalStatus: 'APPROVED',
    isActive: true,
  },
  {
    username: 'notification_guest',
    email: 'notif_guest@tutu365.com',
    displayName: '通知访客',
    bio: '测试访客级别通知功能',
    userLevel: 'GUEST',
    approvalStatus: 'APPROVED',
    isActive: true,
  },
];

// 通知类型配置
export const NOTIFICATION_TYPES = [
  'LIKE',
  'COMMENT',
  'FOLLOW',
  'MENTION',
  'POST_APPROVED',
  'POST_REJECTED',
  'SYSTEM_ANNOUNCEMENT',
  'WEEKLY_DIGEST',
] as const;

export type NotificationType = typeof NOTIFICATION_TYPES[number];
