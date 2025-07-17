/**
 * @fileoverview 通知系统接口定义
 * @description 定义Tu Cosplay平台的通知接口类型
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

import {
  NotificationChannel,
  NotificationPriority,
  NotificationType,
  NotificationStatus
} from './notification-enums';

/**
 * 通知类型配置
 */
export interface NotificationTypeConfig {
  type: NotificationType;
  name: string;
  description: string;
  priority: NotificationPriority;
  defaultChannels: string[];
  availableChannels: string[];
  isUserConfigurable: boolean;
  cooldownMinutes?: number;
}

/**
 * 用户通知偏好设置
 */
export interface UserNotificationPreference {
  userId: string;
  notificationType: NotificationType;
  channels: NotificationChannel[];
  isEnabled: boolean;
  quietHours?: {
    start: string; // HH:mm格式
    end: string;   // HH:mm格式
  };
}

/**
 * 通知发送记录
 */
export interface NotificationDelivery {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt?: Date;
  failureReason?: string;
  retryCount: number;
  nextRetryAt?: Date;
}
