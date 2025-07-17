/**
 * @fileoverview 通知系统类型定义
 * @description 定义Tu Cosplay平台的通知配置和模板
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

// 重新导出基础类型
export {
  NotificationChannel,
  NotificationPriority,
  NotificationType,
  NotificationStatus
} from './notification-enums';

export type {
  NotificationTypeConfig,
  UserNotificationPreference,
  NotificationDelivery
} from './notification-interfaces';

// 通知配置映射（从原文件中保留的配置部分）
export const NOTIFICATION_TYPE_CONFIGS = {
  // 社交互动类
  LIKE: {
    type: 'LIKE',
    name: '点赞通知',
    description: '有人点赞了你的内容',
    priority: 'NORMAL',
    defaultChannels: ['IN_APP'],
    availableChannels: ['IN_APP', 'TELEGRAM', 'EMAIL'],
    isUserConfigurable: true,
    cooldownMinutes: 5
  },
  COMMENT: {
    type: 'COMMENT',
    name: '评论通知',
    description: '有人评论了你的内容',
    priority: 'IMPORTANT',
    defaultChannels: ['IN_APP', 'TELEGRAM'],
    availableChannels: ['IN_APP', 'TELEGRAM', 'EMAIL'],
    isUserConfigurable: true
  },
  FOLLOW: {
    type: 'FOLLOW',
    name: '关注通知',
    description: '有人关注了你',
    priority: 'IMPORTANT',
    defaultChannels: ['IN_APP', 'TELEGRAM'],
    availableChannels: ['IN_APP', 'TELEGRAM', 'EMAIL'],
    isUserConfigurable: true
  },

  // 系统通知类
  SYSTEM_ANNOUNCEMENT: {
    type: 'SYSTEM_ANNOUNCEMENT',
    name: '系统公告',
    description: '重要系统公告和更新',
    priority: 'URGENT',
    defaultChannels: ['IN_APP', 'TELEGRAM', 'EMAIL'],
    availableChannels: ['IN_APP', 'TELEGRAM', 'EMAIL'],
    isUserConfigurable: false
  },

  // 内容相关类
  POST_APPROVED: {
    type: 'POST_APPROVED',
    name: '内容审核通过',
    description: '你的内容已通过审核',
    priority: 'IMPORTANT',
    defaultChannels: ['IN_APP', 'TELEGRAM'],
    availableChannels: ['IN_APP', 'TELEGRAM', 'EMAIL'],
    isUserConfigurable: true
  },
  POST_PUBLISHED: {
    type: 'POST_PUBLISHED',
    name: '内容发布成功',
    description: '你的内容已成功发布',
    priority: 'NORMAL',
    defaultChannels: ['IN_APP'],
    availableChannels: ['IN_APP', 'TELEGRAM'],
    isUserConfigurable: true
  },

  // 系统维护类
  SYSTEM_MAINTENANCE: {
    type: 'SYSTEM_MAINTENANCE',
    name: '系统维护通知',
    description: '系统将进行维护，请提前保存数据',
    priority: 'URGENT',
    defaultChannels: ['IN_APP', 'TELEGRAM', 'EMAIL'],
    availableChannels: ['IN_APP', 'TELEGRAM', 'EMAIL'],
    isUserConfigurable: false
  },

  // 账户安全类
  ACCOUNT_SECURITY: {
    type: 'ACCOUNT_SECURITY',
    name: '账户安全提醒',
    description: '检测到账户异常活动',
    priority: 'URGENT',
    defaultChannels: ['IN_APP', 'TELEGRAM', 'EMAIL'],
    availableChannels: ['IN_APP', 'TELEGRAM', 'EMAIL'],
    isUserConfigurable: false
  },
  LEVEL_UPGRADE: {
    type: 'LEVEL_UPGRADE',
    name: '等级升级',
    description: '恭喜！你的等级已升级',
    priority: 'IMPORTANT',
    defaultChannels: ['IN_APP', 'TELEGRAM'],
    availableChannels: ['IN_APP', 'TELEGRAM', 'EMAIL'],
    isUserConfigurable: true
  },

  // 积分相关类
  CANS_EARNED: {
    type: 'CANS_EARNED',
    name: '获得积分',
    description: '你获得了新的积分奖励',
    priority: 'NORMAL',
    defaultChannels: ['IN_APP'],
    availableChannels: ['IN_APP', 'TELEGRAM'],
    isUserConfigurable: true,
    cooldownMinutes: 10
  },
  CANS_SPENT: {
    type: 'CANS_SPENT',
    name: '积分消费',
    description: '你的积分已被消费',
    priority: 'NORMAL',
    defaultChannels: ['IN_APP'],
    availableChannels: ['IN_APP', 'TELEGRAM'],
    isUserConfigurable: true
  },

  // 任务活动类
  DAILY_CHECKIN: {
    type: 'DAILY_CHECKIN',
    name: '每日签到',
    description: '每日签到奖励已发放',
    priority: 'LOW',
    defaultChannels: ['IN_APP'],
    availableChannels: ['IN_APP', 'TELEGRAM'],
    isUserConfigurable: true
  },
  TASK_COMPLETED: {
    type: 'TASK_COMPLETED',
    name: '任务完成',
    description: '你已完成任务并获得奖励',
    priority: 'NORMAL',
    defaultChannels: ['IN_APP'],
    availableChannels: ['IN_APP', 'TELEGRAM'],
    isUserConfigurable: true
  },

  // 下载相关类
  DOWNLOAD_PURCHASED: {
    type: 'DOWNLOAD_PURCHASED',
    name: '下载购买成功',
    description: '你已成功购买下载权限',
    priority: 'IMPORTANT',
    defaultChannels: ['IN_APP', 'TELEGRAM'],
    availableChannels: ['IN_APP', 'TELEGRAM', 'EMAIL'],
    isUserConfigurable: true
  },
  DOWNLOAD_EXPIRED: {
    type: 'DOWNLOAD_EXPIRED',
    name: '下载权限过期',
    description: '你的下载权限即将或已过期',
    priority: 'IMPORTANT',
    defaultChannels: ['IN_APP', 'TELEGRAM'],
    availableChannels: ['IN_APP', 'TELEGRAM', 'EMAIL'],
    isUserConfigurable: true
  }
} as const;
