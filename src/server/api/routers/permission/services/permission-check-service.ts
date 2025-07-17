/**
 * @fileoverview 权限检查服务
 * @description 处理用户权限验证和限制检查
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';

/**
 * 权限操作类型
 */
export type PermissionAction =
  | 'PUBLISH_MOMENT'
  | 'PUBLISH_POST'
  | 'UPLOAD_IMAGE'
  | 'UPLOAD_VIDEO'
  | 'VIEW_POSTS'
  | 'VIEW_PROFILES'
  | 'VIEW_COMMENTS'
  | 'PLAY_VIDEOS'
  | 'DOWNLOAD_IMAGES'
  | 'SEARCH_CONTENT'
  | 'VIEW_TAGS'
  | 'LIKE_POSTS'
  | 'COMMENT'
  | 'FOLLOW'
  | 'SHARE';

/**
 * 权限检查结果接口
 */
export interface PermissionCheckResult {
  allowed: boolean;
  hasPermission: boolean;
  config?: any;
  userLevel: string;
  message: string;
  details: string;
}

/**
 * 每日限制检查结果接口
 */
export interface DailyLimitCheckResult {
  canPublish: boolean;
  currentCount: number;
  dailyLimit: number;
  remaining: number;
  resetTime: Date;
  message: string;
}

/**
 * 权限检查服务类
 */
export class PermissionCheckService {
  constructor(private db: PrismaClient) {}

  /**
   * 检查用户权限
   */
  async checkPermission(userId: string, action: PermissionAction): Promise<PermissionCheckResult> {
    try {
      // 验证输入参数
      if (!userId || typeof userId !== 'string') {
        throw TRPCErrorHandler.businessError(
          'BAD_REQUEST' as any,
          '用户ID参数无效',
          {
            context: { userId, action, operation: 'checkPermission' },
            recoveryActions: ['检查用户ID格式', '确认用户已登录']
          }
        );
      }

      if (!action) {
        throw TRPCErrorHandler.businessError(
          'BAD_REQUEST' as any,
          '权限操作参数无效',
          {
            context: { userId, action, operation: 'checkPermission' },
            recoveryActions: ['检查权限操作参数', '使用有效的权限操作类型']
          }
        );
      }

      // 获取用户信息
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: {
          userLevel: true,
          isActive: true,
          approvalStatus: true
        },
      });

      if (!user) {
        throw TRPCErrorHandler.businessError(
          'NOT_FOUND' as any,
          '用户不存在或已被删除',
          {
            context: { userId, action, operation: 'checkPermission' },
            recoveryActions: ['确认用户ID是否正确', '检查用户是否已注册', '重新登录']
          }
        );
      }

      // 检查用户状态
      if (!user.isActive) {
        return {
          allowed: false,
          hasPermission: false,
          message: "用户账户未激活",
          details: "您的账户尚未激活，无法执行此操作",
          userLevel: user.userLevel,
        };
      }

      if (user.approvalStatus !== 'APPROVED') {
        return {
          allowed: false,
          hasPermission: false,
          message: "用户审核未通过",
          details: "您的账户审核尚未通过，无法执行此操作",
          userLevel: user.userLevel,
        };
      }

      // 获取权限配置
      const config = await this.db.userPermissionConfig.findUnique({
        where: { userLevel: user.userLevel },
      });

      if (!config) {
        return {
          allowed: false,
          hasPermission: false,
          message: "权限配置不存在",
          details: `用户等级 ${user.userLevel} 的权限配置不存在，请联系管理员`,
          userLevel: user.userLevel,
        };
      }

      // 检查具体权限
      const hasPermission = this.checkSpecificPermission(config, action);

      return {
        allowed: hasPermission,
        hasPermission,
        config,
        userLevel: user.userLevel,
        message: hasPermission ? "权限检查通过" : "权限不足",
        details: `用户等级: ${user.userLevel}, 操作: ${action}`,
      };
    } catch (error: unknown) {
      // 如果已经是TRPCError，直接重新抛出
      if (error instanceof Error && 'code' in error) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);

      throw TRPCErrorHandler.businessError(
        'INTERNAL_SERVER_ERROR' as any,
        '权限检查失败，请稍后重试',
        {
          context: {
            error: errorMessage,
            userId,
            action,
            operation: 'checkPermission',
            timestamp: new Date().toISOString()
          },
          recoveryActions: [
            '检查网络连接',
            '稍后重试操作',
            '联系技术支持'
          ]
        }
      );
    }
  }

  /**
   * 检查用户今日发布限制
   */
  async checkDailyLimit(userId: string, contentType: 'MOMENT' | 'POST'): Promise<DailyLimitCheckResult> {
    // 获取用户信息和权限配置
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { userLevel: true },
    });

    if (!user) {
      throw TRPCErrorHandler.notFound("用户不存在");
    }

    const config = await this.db.userPermissionConfig.findUnique({
      where: { userLevel: user.userLevel },
    });

    if (!config) {
      throw TRPCErrorHandler.notFound("权限配置不存在");
    }

    // 获取今日发布数量
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const currentCount = await this.db.post.count({
      where: {
        authorId: userId,
        contentType,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // 获取限制数量
    const dailyLimit = contentType === 'MOMENT' ? config.dailyMomentsLimit : config.dailyPostsLimit;
    const remaining = Math.max(0, dailyLimit - currentCount);
    const canPublish = remaining > 0;

    // 计算重置时间（明天0点）
    const resetTime = new Date(tomorrow);

    return {
      canPublish,
      currentCount,
      dailyLimit,
      remaining,
      resetTime,
      message: canPublish
        ? `今日还可发布 ${remaining} 个${contentType === 'MOMENT' ? '动态' : '帖子'}`
        : `今日发布限制已达上限 (${dailyLimit})`,
    };
  }

  /**
   * 检查媒体访问权限
   */
  async checkMediaAccess(userId: string, mediaId: string): Promise<{
    allowed: boolean;
    reason?: string;
    accessPercentage: number;
  }> {
    // 获取用户权限配置
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { userLevel: true },
    });

    if (!user) {
      return { allowed: false, reason: '用户不存在', accessPercentage: 0 };
    }

    const config = await this.db.userPermissionConfig.findUnique({
      where: { userLevel: user.userLevel },
    });

    if (!config) {
      return { allowed: false, reason: '权限配置不存在', accessPercentage: 0 };
    }

    // 检查媒体访问百分比
    const accessPercentage = config.mediaAccessPercentage || 0;

    // 基于媒体ID和用户ID生成一个确定性的随机数
    const hash = this.generateDeterministicHash(mediaId + userId);
    const randomPercentage = hash % 100;

    const allowed = randomPercentage < accessPercentage;

    return {
      allowed,
      reason: allowed ? undefined : `媒体访问权限不足 (${accessPercentage}%)`,
      accessPercentage,
    };
  }

  /**
   * 批量检查权限
   */
  async batchCheckPermissions(userId: string, actions: PermissionAction[]): Promise<Record<PermissionAction, boolean>> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { userLevel: true },
    });

    if (!user) {
      throw TRPCErrorHandler.notFound("用户不存在");
    }

    const config = await this.db.userPermissionConfig.findUnique({
      where: { userLevel: user.userLevel },
    });

    if (!config) {
      // 如果没有配置，返回所有权限为false
      const result: Record<PermissionAction, boolean> = {} as any;
      actions.forEach(action => {
        result[action] = false;
      });
      return result;
    }

    const result: Record<PermissionAction, boolean> = {} as any;
    actions.forEach(action => {
      result[action] = this.checkSpecificPermission(config, action);
    });

    return result;
  }

  /**
   * 检查上传权限和限制
   */
  async checkUploadPermission(userId: string, mediaType: 'IMAGE' | 'VIDEO', count: number): Promise<{
    allowed: boolean;
    reason?: string;
    maxAllowed: number;
  }> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { userLevel: true },
    });

    if (!user) {
      return { allowed: false, reason: '用户不存在', maxAllowed: 0 };
    }

    const config = await this.db.userPermissionConfig.findUnique({
      where: { userLevel: user.userLevel },
    });

    if (!config) {
      return { allowed: false, reason: '权限配置不存在', maxAllowed: 0 };
    }

    // 检查基础上传权限
    const canUpload = mediaType === 'IMAGE' ? config.canUploadImages : config.canUploadVideos;
    if (!canUpload) {
      return { allowed: false, reason: `没有上传${mediaType === 'IMAGE' ? '图片' : '视频'}的权限`, maxAllowed: 0 };
    }

    // 检查数量限制
    const maxAllowed = mediaType === 'IMAGE' ? config.maxImagesPerUpload : config.maxVideosPerUpload;
    if (count > maxAllowed) {
      return {
        allowed: false,
        reason: `超出单次上传限制，最多可上传 ${maxAllowed} 个${mediaType === 'IMAGE' ? '图片' : '视频'}`,
        maxAllowed
      };
    }

    return { allowed: true, maxAllowed };
  }

  /**
   * 检查具体权限
   */
  private checkSpecificPermission(config: any, action: PermissionAction): boolean {
    switch (action) {
      case 'PUBLISH_MOMENT':
        return config.canPublishMoments;
      case 'PUBLISH_POST':
        return config.canPublishPosts;
      case 'UPLOAD_IMAGE':
        return config.canUploadImages;
      case 'UPLOAD_VIDEO':
        return config.canUploadVideos;
      case 'VIEW_POSTS':
        return config.canViewPosts ?? true;
      case 'VIEW_PROFILES':
        return config.canViewProfiles ?? true;
      case 'VIEW_COMMENTS':
        return config.canViewComments ?? true;
      case 'PLAY_VIDEOS':
        return config.canPlayVideos ?? true;
      case 'DOWNLOAD_IMAGES':
        return config.canDownloadImages ?? true;
      case 'SEARCH_CONTENT':
        return config.canSearchContent ?? true;
      case 'VIEW_TAGS':
        return config.canViewTags ?? true;
      case 'LIKE_POSTS':
        return config.canLikePosts ?? false;
      case 'COMMENT':
        return config.canComment ?? false;
      case 'FOLLOW':
        return config.canFollow ?? false;
      case 'SHARE':
        return config.canShare ?? true;
      default:
        return false;
    }
  }

  /**
   * 生成确定性哈希
   */
  private generateDeterministicHash(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash);
  }
}

/**
 * 导出服务创建函数
 */
export const createPermissionCheckService = (db: PrismaClient) => new PermissionCheckService(db);
