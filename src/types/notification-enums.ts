/**
 * @fileoverview 通知系统枚举定义
 * @description 定义Tu Cosplay平台的通知枚举类型
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

/**
 * 通知渠道枚举
 */
export enum NotificationChannel {
  IN_APP = 'IN_APP',           // 站内通知
  TELEGRAM = 'TELEGRAM',       // Telegram Bot通知
  EMAIL = 'EMAIL',             // 邮箱通知
  PUSH = 'PUSH',              // 浏览器推送（未来扩展）
}

/**
 * 通知优先级枚举
 */
export enum NotificationPriority {
  URGENT = 'URGENT',           // 紧急：安全相关、账户异常
  IMPORTANT = 'IMPORTANT',     // 重要：关注、被提及、系统公告
  NORMAL = 'NORMAL',           // 普通：点赞、评论、新内容
  LOW = 'LOW',                 // 提醒：推荐内容、活动通知
}

/**
 * 通知类型枚举
 */
export enum NotificationType {
  // 社交互动类
  LIKE = 'LIKE',                    // 点赞通知
  COMMENT = 'COMMENT',              // 评论通知
  REPLY = 'REPLY',                  // 回复通知
  FOLLOW = 'FOLLOW',                // 关注通知
  MENTION = 'MENTION',              // 提及通知

  // 内容相关类
  POST_APPROVED = 'POST_APPROVED',  // 作品审核通过
  POST_REJECTED = 'POST_REJECTED',  // 作品审核拒绝
  POST_FEATURED = 'POST_FEATURED',  // 作品被推荐
  POST_PUBLISHED = 'POST_PUBLISHED', // 作品发布通知

  // 系统通知类
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',  // 系统公告
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',    // 系统维护通知
  MAINTENANCE = 'MAINTENANCE',                  // 维护通知
  SECURITY_ALERT = 'SECURITY_ALERT',           // 安全警告
  ACCOUNT_SECURITY = 'ACCOUNT_SECURITY',       // 账户安全通知

  // 账户相关类
  ACCOUNT_VERIFIED = 'ACCOUNT_VERIFIED',       // 账户验证通过
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',       // 密码修改
  LOGIN_ALERT = 'LOGIN_ALERT',                 // 异常登录
  LEVEL_UPGRADE = 'LEVEL_UPGRADE',             // 等级升级通知

  // 积分相关类
  CANS_EARNED = 'CANS_EARNED',                 // 获得积分
  CANS_SPENT = 'CANS_SPENT',                   // 消费积分

  // 任务活动类
  DAILY_CHECKIN = 'DAILY_CHECKIN',             // 每日签到
  TASK_COMPLETED = 'TASK_COMPLETED',           // 任务完成
  EVENT_REMINDER = 'EVENT_REMINDER',           // 活动提醒

  // 下载相关类
  DOWNLOAD_PURCHASED = 'DOWNLOAD_PURCHASED',   // 购买下载
  DOWNLOAD_EXPIRED = 'DOWNLOAD_EXPIRED',       // 下载过期

  // 推广类
  RECOMMENDATION = 'RECOMMENDATION',           // 内容推荐
  WEEKLY_DIGEST = 'WEEKLY_DIGEST',            // 周报摘要
}

/**
 * 通知发送状态
 */
export enum NotificationStatus {
  PENDING = 'PENDING',     // 待发送
  SENT = 'SENT',          // 已发送
  FAILED = 'FAILED',      // 发送失败
  RETRYING = 'RETRYING',  // 重试中
}
