/**
 * @fileoverview 通知助手工具
 * @description 提供便捷的通知创建方法
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

import { NotificationService } from "./notification-service";
import { NotificationType } from "@/types/notification-types";

/**
 * 通知助手类
 * 提供各种场景下的通知创建快捷方法
 */
export class NotificationHelpers {
  /**
   * 创建点赞通知
   */
  static async createLikeNotification(params: {
    userId: string;           // 被点赞用户ID
    likerUsername: string;    // 点赞用户名
    contentType: string;      // 内容类型（作品/动态）
    contentTitle: string;     // 内容标题
    postId: string;          // 内容ID
  }) {
    return NotificationService.createNotification({
      userId: params.userId,
      type: NotificationType.LIKE,
      data: {
        username: params.likerUsername,
        contentType: params.contentType,
        contentTitle: params.contentTitle,
        postId: params.postId,
      },
    });
  }

  /**
   * 创建评论通知
   */
  static async createCommentNotification(params: {
    userId: string;           // 被评论用户ID
    commenterUsername: string; // 评论用户名
    contentType: string;      // 内容类型
    commentContent: string;   // 评论内容
    postId: string;          // 内容ID
    commentId: string;       // 评论ID
  }) {
    return NotificationService.createNotification({
      userId: params.userId,
      type: NotificationType.COMMENT,
      data: {
        username: params.commenterUsername,
        contentType: params.contentType,
        commentContent: params.commentContent.slice(0, 50) + (params.commentContent.length > 50 ? '...' : ''),
        postId: params.postId,
        commentId: params.commentId,
      },
    });
  }

  /**
   * 创建回复通知
   */
  static async createReplyNotification(params: {
    userId: string;           // 被回复用户ID
    replierUsername: string;  // 回复用户名
    replyContent: string;     // 回复内容
    postId: string;          // 内容ID
    commentId: string;       // 评论ID
  }) {
    return NotificationService.createNotification({
      userId: params.userId,
      type: NotificationType.REPLY,
      data: {
        username: params.replierUsername,
        replyContent: params.replyContent.slice(0, 50) + (params.replyContent.length > 50 ? '...' : ''),
        postId: params.postId,
        commentId: params.commentId,
      },
    });
  }

  /**
   * 创建关注通知
   */
  static async createFollowNotification(params: {
    userId: string;           // 被关注用户ID
    followerUsername: string; // 关注者用户名
  }) {
    return NotificationService.createNotification({
      userId: params.userId,
      type: NotificationType.FOLLOW,
      data: {
        username: params.followerUsername,
      },
    });
  }

  /**
   * 创建提及通知
   */
  static async createMentionNotification(params: {
    userId: string;           // 被提及用户ID
    mentionerUsername: string; // 提及者用户名
    contentType: string;      // 内容类型
    postId: string;          // 内容ID
  }) {
    return NotificationService.createNotification({
      userId: params.userId,
      type: NotificationType.MENTION,
      data: {
        username: params.mentionerUsername,
        contentType: params.contentType,
        postId: params.postId,
      },
    });
  }

  /**
   * 创建新内容发布通知（给关注者）
   */
  static async createPostPublishedNotification(params: {
    followerIds: string[];    // 关注者ID列表
    authorUsername: string;   // 作者用户名
    contentType: string;      // 内容类型
    contentTitle: string;     // 内容标题
    postId: string;          // 内容ID
  }) {
    const notifications = params.followerIds.map(userId => ({
      userId,
      type: NotificationType.POST_PUBLISHED,
      data: {
        username: params.authorUsername,
        contentType: params.contentType,
        contentTitle: params.contentTitle,
        postId: params.postId,
      },
    }));

    return NotificationService.createBulkNotifications(notifications);
  }

  /**
   * 创建内容被精选通知
   */
  static async createPostFeaturedNotification(params: {
    userId: string;           // 作者ID
    contentType: string;      // 内容类型
    contentTitle: string;     // 内容标题
    postId: string;          // 内容ID
  }) {
    return NotificationService.createNotification({
      userId: params.userId,
      type: NotificationType.POST_FEATURED,
      data: {
        contentType: params.contentType,
        contentTitle: params.contentTitle,
        postId: params.postId,
      },
    });
  }

  /**
   * 创建内容审核通过通知
   */
  static async createPostApprovedNotification(params: {
    userId: string;           // 作者ID
    contentType: string;      // 内容类型
    contentTitle: string;     // 内容标题
    postId: string;          // 内容ID
  }) {
    return NotificationService.createNotification({
      userId: params.userId,
      type: NotificationType.POST_APPROVED,
      data: {
        contentType: params.contentType,
        contentTitle: params.contentTitle,
        postId: params.postId,
      },
    });
  }

  /**
   * 创建内容审核拒绝通知
   */
  static async createPostRejectedNotification(params: {
    userId: string;           // 作者ID
    contentType: string;      // 内容类型
    contentTitle: string;     // 内容标题
    reason: string;          // 拒绝原因
    postId: string;          // 内容ID
  }) {
    return NotificationService.createNotification({
      userId: params.userId,
      type: NotificationType.POST_REJECTED,
      data: {
        contentType: params.contentType,
        contentTitle: params.contentTitle,
        reason: params.reason,
        postId: params.postId,
      },
    });
  }

  /**
   * 创建系统公告通知
   */
  static async createSystemAnnouncementNotification(params: {
    userIds: string[];        // 目标用户ID列表
    announcementContent: string; // 公告内容
    announcementId?: string;  // 公告ID
  }) {
    const notifications = params.userIds.map(userId => ({
      userId,
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      data: {
        announcementContent: params.announcementContent,
        announcementId: params.announcementId,
      },
    }));

    return NotificationService.createBulkNotifications(notifications);
  }

  /**
   * 创建系统维护通知
   */
  static async createSystemMaintenanceNotification(params: {
    userIds: string[];        // 目标用户ID列表
    maintenanceTime: string;  // 维护时间
    duration: string;         // 持续时间
  }) {
    const notifications = params.userIds.map(userId => ({
      userId,
      type: NotificationType.SYSTEM_MAINTENANCE,
      data: {
        maintenanceTime: params.maintenanceTime,
        duration: params.duration,
      },
    }));

    return NotificationService.createBulkNotifications(notifications);
  }

  /**
   * 创建账户安全通知
   */
  static async createAccountSecurityNotification(params: {
    userId: string;           // 用户ID
    securityMessage: string;  // 安全消息
  }) {
    return NotificationService.createNotification({
      userId: params.userId,
      type: NotificationType.ACCOUNT_SECURITY,
      data: {
        securityMessage: params.securityMessage,
      },
    });
  }

  /**
   * 创建等级升级通知
   */
  static async createLevelUpgradeNotification(params: {
    userId: string;           // 用户ID
    newLevel: string;         // 新等级
  }) {
    return NotificationService.createNotification({
      userId: params.userId,
      type: NotificationType.LEVEL_UPGRADE,
      data: {
        newLevel: params.newLevel,
      },
    });
  }

  /**
   * 创建罐头获得通知
   */
  static async createCansEarnedNotification(params: {
    userId: string;           // 用户ID
    amount: number;           // 获得数量
    reason: string;           // 获得原因
  }) {
    return NotificationService.createNotification({
      userId: params.userId,
      type: NotificationType.CANS_EARNED,
      data: {
        amount: params.amount,
        reason: params.reason,
      },
    });
  }

  /**
   * 创建罐头消费通知
   */
  static async createCansSpentNotification(params: {
    userId: string;           // 用户ID
    amount: number;           // 消费数量
    purpose: string;          // 消费用途
  }) {
    return NotificationService.createNotification({
      userId: params.userId,
      type: NotificationType.CANS_SPENT,
      data: {
        amount: params.amount,
        purpose: params.purpose,
      },
    });
  }

  /**
   * 创建每日签到通知
   */
  static async createDailyCheckinNotification(params: {
    userId: string;           // 用户ID
    reward: number;           // 奖励数量
    streak: number;           // 连续签到天数
  }) {
    return NotificationService.createNotification({
      userId: params.userId,
      type: NotificationType.DAILY_CHECKIN,
      data: {
        reward: params.reward,
        streak: params.streak,
      },
    });
  }

  /**
   * 创建任务完成通知
   */
  static async createTaskCompletedNotification(params: {
    userId: string;           // 用户ID
    taskName: string;         // 任务名称
    reward: number;           // 奖励数量
  }) {
    return NotificationService.createNotification({
      userId: params.userId,
      type: NotificationType.TASK_COMPLETED,
      data: {
        taskName: params.taskName,
        reward: params.reward,
      },
    });
  }

  /**
   * 创建下载链接被兑换通知
   */
  static async createDownloadPurchasedNotification(params: {
    userId: string;           // 链接作者ID
    buyerUsername: string;    // 兑换者用户名
    linkTitle: string;        // 链接标题
    earnings: number;         // 收益
    postId: string;          // 内容ID
  }) {
    return NotificationService.createNotification({
      userId: params.userId,
      type: NotificationType.DOWNLOAD_PURCHASED,
      data: {
        username: params.buyerUsername,
        linkTitle: params.linkTitle,
        earnings: params.earnings,
        postId: params.postId,
      },
    });
  }

  /**
   * 创建下载链接过期通知
   */
  static async createDownloadExpiredNotification(params: {
    userId: string;           // 兑换者ID
    linkTitle: string;        // 链接标题
    expiryTime: string;       // 过期时间
  }) {
    return NotificationService.createNotification({
      userId: params.userId,
      type: NotificationType.DOWNLOAD_EXPIRED,
      data: {
        linkTitle: params.linkTitle,
        expiryTime: params.expiryTime,
      },
    });
  }
}
