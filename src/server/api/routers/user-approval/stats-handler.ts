/**
 * @fileoverview 用户审批统计处理器
 * @description 处理用户审批相关的统计信息和日志查询
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import type { ApprovalStats, ApprovalLogsResult, ApprovalAction } from './types';
import { buildLogWhereClause, processPaginatedResult, getTodayStart } from './utils';

/**
 * 获取审批统计信息
 */
export async function getApprovalStatistics(db: any): Promise<ApprovalStats> {
  const todayStart = getTodayStart();

  const [
    pendingCount,
    approvedCount,
    rejectedCount,
    totalCount,
    todayApprovals,
    todayRejections,
  ] = await Promise.all([
    db.user.count({ where: { approvalStatus: "PENDING" } }),
    db.user.count({ where: { approvalStatus: "APPROVED" } }),
    db.user.count({ where: { approvalStatus: "REJECTED" } }),
    db.user.count(),
    db.userApprovalLog.count({
      where: {
        action: "APPROVE",
        createdAt: { gte: todayStart },
      },
    }),
    db.userApprovalLog.count({
      where: {
        action: "REJECT",
        createdAt: { gte: todayStart },
      },
    }),
  ]);

  // 计算平均处理时间（简化版本）
  const averageProcessingTime = 0; // TODO: 实现平均处理时间计算

  return {
    pendingCount,
    approvedCount,
    rejectedCount,
    totalCount,
    todayApprovals,
    todayRejections,
    averageProcessingTime,
  };
}

/**
 * 获取审批日志列表
 */
export async function getApprovalLogsList(
  db: any,
  limit: number,
  cursor: string | undefined,
  userId: string | undefined,
  adminId: string | undefined,
  action: ApprovalAction | undefined,
  startDate: Date | undefined,
  endDate: Date | undefined
): Promise<ApprovalLogsResult> {
  const where = buildLogWhereClause(userId, adminId, action, startDate, endDate, cursor);

  const logs = await db.userApprovalLog.findMany({
    where,
    take: limit + 1,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
      admin: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
    },
  });

  return processPaginatedResult(logs, limit);
}

/**
 * 计算审批处理时间统计
 */
export async function calculateProcessingTimeStats(db: any): Promise<{
  averageTime: number;
  medianTime: number;
  minTime: number;
  maxTime: number;
}> {
  // 获取最近30天的审批记录
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const logs = await db.userApprovalLog.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
      action: { in: ["APPROVE", "REJECT"] },
    },
    include: {
      user: {
        select: {
          createdAt: true,
        },
      },
    },
  });

  if (logs.length === 0) {
    return {
      averageTime: 0,
      medianTime: 0,
      minTime: 0,
      maxTime: 0,
    };
  }

  // 计算处理时间（从注册到审批的时间，单位：小时）
  const processingTimes = logs.map((log: any) => {
    const registrationTime = new Date(log.user.createdAt);
    const approvalTime = new Date(log.createdAt);
    return (approvalTime.getTime() - registrationTime.getTime()) / (1000 * 60 * 60); // 转换为小时
  }).filter((time: number) => time >= 0); // 过滤掉负值

  if (processingTimes.length === 0) {
    return {
      averageTime: 0,
      medianTime: 0,
      minTime: 0,
      maxTime: 0,
    };
  }

  // 排序用于计算中位数
  const sortedTimes = processingTimes.sort((a: number, b: number) => a - b);

  const averageTime = processingTimes.reduce((sum: number, time: number) => sum + time, 0) / processingTimes.length;
  const medianTime = sortedTimes.length % 2 === 0
    ? (sortedTimes[sortedTimes.length / 2 - 1] + sortedTimes[sortedTimes.length / 2]) / 2
    : sortedTimes[Math.floor(sortedTimes.length / 2)];
  const minTime = Math.min(...processingTimes);
  const maxTime = Math.max(...processingTimes);

  return {
    averageTime: Math.round(averageTime * 100) / 100, // 保留两位小数
    medianTime: Math.round(medianTime * 100) / 100,
    minTime: Math.round(minTime * 100) / 100,
    maxTime: Math.round(maxTime * 100) / 100,
  };
}

/**
 * 获取审批趋势数据
 */
export async function getApprovalTrends(db: any, days: number = 30): Promise<{
  dates: string[];
  approvals: number[];
  rejections: number[];
  pending: number[];
}> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // 生成日期范围
  const dates: string[] = [];
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // 获取每日审批数据
  const dailyStats = await Promise.all(
    dates.map(async (date) => {
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const [approvals, rejections] = await Promise.all([
        db.userApprovalLog.count({
          where: {
            action: "APPROVE",
            createdAt: {
              gte: dayStart,
              lt: dayEnd,
            },
          },
        }),
        db.userApprovalLog.count({
          where: {
            action: "REJECT",
            createdAt: {
              gte: dayStart,
              lt: dayEnd,
            },
          },
        }),
      ]);

      return { approvals, rejections };
    })
  );

  // 获取每日待审核数量（简化版本，实际应该查询历史快照）
  const currentPending = await db.user.count({
    where: { approvalStatus: "PENDING" },
  });

  return {
    dates,
    approvals: dailyStats.map(stat => stat.approvals),
    rejections: dailyStats.map(stat => stat.rejections),
    pending: new Array(dates.length).fill(currentPending), // 简化处理
  };
}

/**
 * 获取管理员审批活动统计
 */
export async function getAdminActivityStats(db: any, days: number = 30): Promise<Array<{
  adminId: string;
  adminName: string;
  approvals: number;
  rejections: number;
  total: number;
}>> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const adminStats = await db.userApprovalLog.groupBy({
    by: ['adminId'],
    where: {
      createdAt: { gte: startDate },
    },
    _count: {
      action: true,
    },
  });

  // 获取管理员详细信息和分类统计
  const detailedStats = await Promise.all(
    adminStats.map(async (stat: any) => {
      const admin = await db.user.findUnique({
        where: { id: stat.adminId },
        select: { username: true, displayName: true },
      });

      const [approvals, rejections] = await Promise.all([
        db.userApprovalLog.count({
          where: {
            adminId: stat.adminId,
            action: "APPROVE",
            createdAt: { gte: startDate },
          },
        }),
        db.userApprovalLog.count({
          where: {
            adminId: stat.adminId,
            action: "REJECT",
            createdAt: { gte: startDate },
          },
        }),
      ]);

      return {
        adminId: stat.adminId,
        adminName: admin?.displayName || admin?.username || '未知管理员',
        approvals,
        rejections,
        total: approvals + rejections,
      };
    })
  );

  return detailedStats.sort((a, b) => b.total - a.total);
}
