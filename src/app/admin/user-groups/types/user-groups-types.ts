/**
 * @fileoverview 用户组管理类型定义
 * @description 定义用户组管理相关的所有类型和接口
 */

import { z } from "zod";

/**
 * 用户等级类型
 */
export type UserLevel = "GUEST" | "USER" | "VIP" | "CREATOR" | "ADMIN" | "SUPER_ADMIN";

/**
 * 批量操作类型
 */
export type BatchOperationType = "updateLevel" | "updateStatus" | "delete" | "export";

/**
 * 用户组统计数据
 */
export interface UserGroupStats {
  userLevel: UserLevel;
  count: number;
  percentage: number;
  totalPosts: number;
  activeUsers: number;
  newUsers: number;
  avgSessionTime: number;
  color: string;
}

/**
 * 用户统计概览
 */
export interface UserStatsOverview {
  totalUsers: number;
  totalActiveUsers: number;
  totalNewUsers: number;
  totalPosts: number;
  growthRate: number;
  activeRate: number;
}

/**
 * 批量操作表单数据
 */
export const batchOperationSchema = z.object({
  operation: z.enum(["updateLevel", "updateStatus", "delete", "export"]),
  targetLevel: z.enum(["GUEST", "USER", "VIP", "CREATOR", "ADMIN", "SUPER_ADMIN"]).optional(),
  isActive: z.boolean().optional(),
  reason: z.string().min(1, "请输入操作原因"),
  sendNotification: z.boolean().default(false),
});

export type BatchOperationFormData = z.infer<typeof batchOperationSchema>;

/**
 * 用户组管理页面属性
 */
export interface UserGroupsPageProps {
  className?: string;
}

/**
 * 图表数据点
 */
export interface ChartDataPoint {
  name: string;
  value: number;
  color: string;
  percentage?: number;
}

/**
 * 用户等级配置
 */
export const USER_LEVEL_CONFIG = {
  GUEST: {
    label: "游客",
    color: "#6B7280",
    description: "未注册用户",
    permissions: ["view_public_content"],
  },
  USER: {
    label: "普通用户",
    color: "#3B82F6",
    description: "已注册的基础用户",
    permissions: ["view_content", "create_comment", "like_content"],
  },
  VIP: {
    label: "VIP用户",
    color: "#10B981",
    description: "付费用户，享受特权",
    permissions: ["view_content", "create_comment", "like_content", "upload_media", "create_post"],
  },
  CREATOR: {
    label: "创作者",
    color: "#8B5CF6",
    description: "内容创作者",
    permissions: ["view_content", "create_comment", "like_content", "upload_media", "create_post", "manage_own_content"],
  },
  ADMIN: {
    label: "管理员",
    color: "#EF4444",
    description: "平台管理员",
    permissions: ["all_permissions"],
  },
  SUPER_ADMIN: {
    label: "超级管理员",
    color: "#DC2626",
    description: "最高权限管理员",
    permissions: ["all_permissions", "system_management"],
  },
} as const;

/**
 * 批量操作选项
 */
export const BATCH_OPERATION_OPTIONS = [
  {
    value: "updateLevel",
    label: "更新用户等级",
    description: "批量修改选中用户的等级",
    icon: "Shield",
    color: "blue",
  },
  {
    value: "updateStatus",
    label: "更新用户状态",
    description: "批量启用或禁用用户账户",
    icon: "UserCheck",
    color: "green",
  },
  {
    value: "delete",
    label: "删除用户",
    description: "批量删除选中的用户账户",
    icon: "Trash",
    color: "red",
  },
  {
    value: "export",
    label: "导出用户数据",
    description: "导出选中用户的详细信息",
    icon: "Download",
    color: "purple",
  },
] as const;

/**
 * 图表颜色配置
 */
export const CHART_COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
];

/**
 * 工具函数：获取用户等级配置
 */
export function getUserLevelConfig(level: UserLevel) {
  return USER_LEVEL_CONFIG[level];
}

/**
 * 工具函数：获取用户等级标签
 */
export function getUserLevelLabel(level: UserLevel): string {
  const config = USER_LEVEL_CONFIG[level];
  return config?.label || level;
}

/**
 * 工具函数：获取用户等级颜色
 */
export function getUserLevelColor(level: UserLevel): string {
  const config = USER_LEVEL_CONFIG[level];
  return config?.color || "#6B7280";
}

/**
 * 工具函数：格式化数字
 */
export function formatNumber(num: number): string {
  if (typeof num !== 'number' || isNaN(num)) {
    return '0';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * 工具函数：格式化百分比
 */
export function formatPercentage(num: number): string {
  if (typeof num !== 'number' || isNaN(num)) {
    return '0.0%';
  }
  return `${num.toFixed(1)}%`;
}

/**
 * 工具函数：计算增长率
 */
export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * 工具函数：生成图表数据
 */
export function generateChartData(stats: UserGroupStats[]): ChartDataPoint[] {
  return stats.map(stat => ({
    name: getUserLevelLabel(stat.userLevel),
    value: stat.count,
    color: getUserLevelColor(stat.userLevel),
    percentage: stat.percentage,
  }));
}

/**
 * 工具函数：计算用户统计概览
 */
export function calculateStatsOverview(stats: UserGroupStats[]): UserStatsOverview {
  const totalUsers = stats.reduce((sum, stat) => sum + stat.count, 0);
  const totalActiveUsers = stats.reduce((sum, stat) => sum + stat.activeUsers, 0);
  const totalNewUsers = stats.reduce((sum, stat) => sum + stat.newUsers, 0);
  const totalPosts = stats.reduce((sum, stat) => sum + stat.totalPosts, 0);

  const activeRate = totalUsers > 0 ? (totalActiveUsers / totalUsers) * 100 : 0;
  const growthRate = calculateGrowthRate(totalNewUsers, totalUsers - totalNewUsers);

  return {
    totalUsers,
    totalActiveUsers,
    totalNewUsers,
    totalPosts,
    growthRate,
    activeRate,
  };
}

/**
 * 工具函数：验证批量操作权限
 */
export function validateBatchOperation(
  operation: BatchOperationType,
  userLevel: UserLevel,
  targetCount: number
): { isValid: boolean; message?: string } {
  // 只有管理员可以执行批量操作
  if (!["ADMIN", "SUPER_ADMIN"].includes(userLevel)) {
    return {
      isValid: false,
      message: "只有管理员可以执行批量操作",
    };
  }

  // 删除操作需要额外确认
  if (operation === "delete" && targetCount > 10) {
    return {
      isValid: false,
      message: "单次删除用户数量不能超过10个",
    };
  }

  // 等级更新操作限制
  if (operation === "updateLevel" && targetCount > 100) {
    return {
      isValid: false,
      message: "单次更新用户等级数量不能超过100个",
    };
  }

  return { isValid: true };
}

/**
 * 工具函数：生成操作日志
 */
export function generateOperationLog(
  operation: BatchOperationType,
  targetCount: number,
  operatorId: string,
  details?: any
): string {
  const timestamp = new Date().toISOString();
  const operationLabels = {
    updateLevel: "批量更新用户等级",
    updateStatus: "批量更新用户状态",
    delete: "批量删除用户",
    export: "批量导出用户数据",
  };

  return `[${timestamp}] ${operationLabels[operation]} - 操作者: ${operatorId}, 影响用户: ${targetCount}个, 详情: ${JSON.stringify(details)}`;
}

/**
 * 工具函数：导出用户数据为CSV
 */
export function exportUsersToCSV(users: any[]): string {
  if (!users.length) return '';

  const headers = [
    'ID',
    '用户名',
    '邮箱',
    '显示名称',
    '用户等级',
    '状态',
    '注册时间',
    '最后登录',
    '发布数量',
  ];

  const rows = users.map(user => [
    user.id,
    user.username,
    user.email || '',
    user.displayName || '',
    getUserLevelLabel(user.userLevel),
    user.isActive ? '活跃' : '禁用',
    new Date(user.createdAt).toLocaleDateString('zh-CN'),
    user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('zh-CN') : '从未登录',
    user._count?.posts || 0,
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  return csvContent;
}

/**
 * 工具函数：下载CSV文件
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * 工具函数：生成模拟统计数据（用于开发测试）
 */
export function generateMockStats(): UserGroupStats[] {
  return [
    {
      userLevel: 'GUEST',
      count: 1500,
      percentage: 30.0,
      totalPosts: 0,
      activeUsers: 800,
      newUsers: 200,
      avgSessionTime: 120,
      color: getUserLevelColor('GUEST'),
    },
    {
      userLevel: 'USER',
      count: 2000,
      percentage: 40.0,
      totalPosts: 5000,
      activeUsers: 1600,
      newUsers: 300,
      avgSessionTime: 300,
      color: getUserLevelColor('USER'),
    },
    {
      userLevel: 'VIP',
      count: 800,
      percentage: 16.0,
      totalPosts: 3000,
      activeUsers: 700,
      newUsers: 80,
      avgSessionTime: 450,
      color: getUserLevelColor('VIP'),
    },
    {
      userLevel: 'CREATOR',
      count: 600,
      percentage: 12.0,
      totalPosts: 8000,
      activeUsers: 550,
      newUsers: 50,
      avgSessionTime: 600,
      color: getUserLevelColor('CREATOR'),
    },
    {
      userLevel: 'ADMIN',
      count: 80,
      percentage: 1.6,
      totalPosts: 500,
      activeUsers: 75,
      newUsers: 5,
      avgSessionTime: 800,
      color: getUserLevelColor('ADMIN'),
    },
    {
      userLevel: 'SUPER_ADMIN',
      count: 20,
      percentage: 0.4,
      totalPosts: 100,
      activeUsers: 20,
      newUsers: 1,
      avgSessionTime: 1000,
      color: getUserLevelColor('SUPER_ADMIN'),
    },
  ];
}
