/**
 * @fileoverview 邮箱清理服务
 * @description 定期清理长时间未验证的用户记录，释放邮箱地址
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';

/**
 * 邮箱清理配置
 */
interface EmailCleanupConfig {
  // 清理间隔（小时）
  cleanupIntervalHours: number;
  // 未验证用户保留时间（小时）
  unverifiedUserRetentionHours: number;
  // 失败注册用户保留时间（小时）
  failedRegistrationRetentionHours: number;
  // 每次清理的最大记录数
  maxCleanupRecords: number;
}

/**
 * 默认清理配置
 */
const DEFAULT_CLEANUP_CONFIG: EmailCleanupConfig = {
  cleanupIntervalHours: 24, // 每24小时清理一次
  unverifiedUserRetentionHours: 72, // 未验证用户保留72小时（3天）
  failedRegistrationRetentionHours: 24, // 失败注册用户保留24小时（1天）
  maxCleanupRecords: 100, // 每次最多清理100条记录
};

/**
 * 清理结果接口
 */
interface CleanupResult {
  success: boolean;
  message: string;
  details: {
    failedRegistrationsDeleted: number;
    unverifiedUsersDeleted: number;
    totalDeleted: number;
    errors: string[];
  };
}

/**
 * 邮箱清理服务类
 */
export class EmailCleanupService {
  private prisma: PrismaClient;
  private config: EmailCleanupConfig;
  private isRunning: boolean = false;

  constructor(prisma: PrismaClient, config?: Partial<EmailCleanupConfig>) {
    this.prisma = prisma;
    this.config = { ...DEFAULT_CLEANUP_CONFIG, ...config };
  }

  /**
   * 执行邮箱清理
   */
  async performCleanup(): Promise<CleanupResult> {
    if (this.isRunning) {
      return {
        success: false,
        message: '清理任务正在运行中',
        details: {
          failedRegistrationsDeleted: 0,
          unverifiedUsersDeleted: 0,
          totalDeleted: 0,
          errors: ['清理任务正在运行中'],
        },
      };
    }

    this.isRunning = true;
    const errors: string[] = [];
    let failedRegistrationsDeleted = 0;
    let unverifiedUsersDeleted = 0;

    try {
      console.log('🧹 开始执行邮箱清理任务...');

      // 1. 清理失败的注册记录
      try {
        const failedCutoffTime = new Date(
          Date.now() - this.config.failedRegistrationRetentionHours * 60 * 60 * 1000
        );

        const failedUsers = await this.prisma.user.findMany({
          where: {
            registrationStatus: 'FAILED',
            createdAt: {
              lt: failedCutoffTime,
            },
          },
          take: Math.floor(this.config.maxCleanupRecords / 2),
          select: {
            id: true,
            email: true,
            username: true,
            createdAt: true,
          },
        });

        if (failedUsers.length > 0) {
          const deleteResult = await this.prisma.user.deleteMany({
            where: {
              id: {
                in: failedUsers.map(user => user.id),
              },
            },
          });

          failedRegistrationsDeleted = deleteResult.count;
          console.log(`🗑️ 清理失败注册记录: ${failedRegistrationsDeleted} 条`);
        }
      } catch (error) {
        const errorMsg = `清理失败注册记录时出错: ${error instanceof Error ? error.message : '未知错误'}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }

      // 2. 清理长时间未验证的用户
      try {
        const unverifiedCutoffTime = new Date(
          Date.now() - this.config.unverifiedUserRetentionHours * 60 * 60 * 1000
        );

        const unverifiedUsers = await this.prisma.user.findMany({
          where: {
            isVerified: false,
            email: {
              not: null,
            },
            createdAt: {
              lt: unverifiedCutoffTime,
            },
          },
          take: Math.floor(this.config.maxCleanupRecords / 2),
          select: {
            id: true,
            email: true,
            username: true,
            createdAt: true,
          },
        });

        if (unverifiedUsers.length > 0) {
          const deleteResult = await this.prisma.user.deleteMany({
            where: {
              id: {
                in: unverifiedUsers.map(user => user.id),
              },
            },
          });

          unverifiedUsersDeleted = deleteResult.count;
          console.log(`🗑️ 清理未验证用户记录: ${unverifiedUsersDeleted} 条`);
        }
      } catch (error) {
        const errorMsg = `清理未验证用户记录时出错: ${error instanceof Error ? error.message : '未知错误'}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }

      const totalDeleted = failedRegistrationsDeleted + unverifiedUsersDeleted;
      const success = errors.length === 0;

      console.log(`✅ 邮箱清理任务完成，共清理 ${totalDeleted} 条记录`);

      return {
        success,
        message: success
          ? `清理完成，共清理 ${totalDeleted} 条记录`
          : `清理完成但有错误，共清理 ${totalDeleted} 条记录`,
        details: {
          failedRegistrationsDeleted,
          unverifiedUsersDeleted,
          totalDeleted,
          errors,
        },
      };
    } catch (error) {
      const errorMsg = `邮箱清理任务执行失败: ${error instanceof Error ? error.message : '未知错误'}`;
      console.error(errorMsg);

      return {
        success: false,
        message: errorMsg,
        details: {
          failedRegistrationsDeleted,
          unverifiedUsersDeleted,
          totalDeleted: failedRegistrationsDeleted + unverifiedUsersDeleted,
          errors: [...errors, errorMsg],
        },
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 获取清理统计信息
   */
  async getCleanupStats(): Promise<{
    pendingEmailUsers: number;
    failedRegistrations: number;
    oldUnverifiedUsers: number;
    oldFailedRegistrations: number;
  }> {
    const now = new Date();
    const unverifiedCutoffTime = new Date(
      now.getTime() - this.config.unverifiedUserRetentionHours * 60 * 60 * 1000
    );
    const failedCutoffTime = new Date(
      now.getTime() - this.config.failedRegistrationRetentionHours * 60 * 60 * 1000
    );

    const [
      pendingEmailUsers,
      failedRegistrations,
      oldUnverifiedUsers,
      oldFailedRegistrations,
    ] = await Promise.all([
      // 等待邮箱验证的用户（未验证且有邮箱）
      this.prisma.user.count({
        where: {
          isVerified: false,
          email: {
            not: null,
          },
        },
      }),
      // 注册失败的用户（未验证且邮箱为空）
      this.prisma.user.count({
        where: {
          isVerified: false,
          email: null,
        },
      }),
      // 长时间未验证的用户
      this.prisma.user.count({
        where: {
          isVerified: false,
          email: {
            not: null,
          },
          createdAt: {
            lt: unverifiedCutoffTime,
          },
        },
      }),
      // 长时间失败的注册记录
      this.prisma.user.count({
        where: {
          isVerified: false,
          email: null,
          createdAt: {
            lt: failedCutoffTime,
          },
        },
      }),
    ]);

    return {
      pendingEmailUsers,
      failedRegistrations,
      oldUnverifiedUsers,
      oldFailedRegistrations,
    };
  }

  /**
   * 手动清理指定邮箱的失败记录
   */
  async cleanupEmailRecords(email: string): Promise<{
    success: boolean;
    message: string;
    deletedCount: number;
  }> {
    try {
      const deleteResult = await this.prisma.user.deleteMany({
        where: {
          email,
          isVerified: false,
        },
      });

      return {
        success: true,
        message: `成功清理邮箱 ${email} 的 ${deleteResult.count} 条记录`,
        deletedCount: deleteResult.count,
      };
    } catch (error) {
      const errorMsg = `清理邮箱 ${email} 记录失败: ${error instanceof Error ? error.message : '未知错误'}`;
      console.error(errorMsg);

      return {
        success: false,
        message: errorMsg,
        deletedCount: 0,
      };
    }
  }

  /**
   * 检查邮箱是否可以重新注册
   */
  async canEmailReregister(email: string): Promise<{
    canReregister: boolean;
    reason?: string;
    existingUser?: {
      id: string;
      registrationStatus: string;
      createdAt: Date;
      emailSendAttempts: number;
    };
  }> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email,
      },
      select: {
        id: true,
        registrationStatus: true,
        isVerified: true,
        createdAt: true,
        emailSendAttempts: true,
      },
    });

    if (!existingUser) {
      return { canReregister: true };
    }

    if (existingUser.registrationStatus === 'COMPLETED' && existingUser.isVerified) {
      return {
        canReregister: false,
        reason: '该邮箱已完成注册并验证',
        existingUser,
      };
    }

    if (existingUser.registrationStatus === 'PENDING_EMAIL' || existingUser.registrationStatus === 'FAILED') {
      return {
        canReregister: true,
        reason: '存在未完成的注册记录，将在重新注册时清理',
        existingUser,
      };
    }

    return {
      canReregister: false,
      reason: '邮箱状态未知',
      existingUser,
    };
  }
}
