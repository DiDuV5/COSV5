/**
 * @fileoverview 访客分析类型定义
 * @description 定义访客分析相关的所有类型和接口
 */

/**
 * 时间范围类型
 */
export type TimeRange = 'today' | 'week' | 'month' | 'year';

/**
 * 用户等级类型
 */
export type UserLevel = 'GUEST' | 'USER' | 'VIP' | 'CREATOR' | 'ADMIN' | 'SUPER_ADMIN';

/**
 * 设备类型
 */
export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';

/**
 * 访客统计数据
 */
export interface VisitorStats {
  totalVisitors: number;
  uniqueVisitors: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
  devices: DeviceStats[];
  browsers: BrowserStats[];
  locations: LocationStats[];
  userLevels: UserLevelStats[];
}

/**
 * 设备统计
 */
export interface DeviceStats {
  device: DeviceType;
  _count: {
    id: number;
  };
  percentage: number;
}

/**
 * 浏览器统计
 */
export interface BrowserStats {
  browser: string;
  version?: string;
  _count: {
    id: number;
  };
  percentage: number;
}

/**
 * 地理位置统计
 */
export interface LocationStats {
  country: string;
  city?: string;
  _count: {
    id: number;
  };
  percentage: number;
}

/**
 * 用户等级统计
 */
export interface UserLevelStats {
  userLevel: UserLevel;
  _count: {
    id: number;
  };
  percentage: number;
}

/**
 * 页面统计数据
 */
export interface PageStats {
  path: string;
  title?: string;
  views: number;
  uniqueViews: number;
  avgTimeOnPage: number;
  bounceRate: number;
  exitRate: number;
}

/**
 * 注册来源统计
 */
export interface RegistrationStats {
  sources: RegistrationSource[];
  total: number;
  growth: number;
}

/**
 * 注册来源
 */
export interface RegistrationSource {
  source: string;
  _count: {
    id: number;
  };
  percentage: number;
  growth: number;
}

/**
 * 用户访客统计
 */
export interface UserVisitorStats {
  userId: string;
  username: string;
  displayName?: string;
  avatar?: string;
  userLevel: UserLevel;
  visitCount: number;
  lastVisit: Date;
  totalTimeSpent: number;
  pagesViewed: number;
  isOnline: boolean;
}

/**
 * 概览统计数据
 */
export interface OverviewStats {
  totalVisitors: number;
  uniqueVisitors: number;
  pageViews: number;
  newRegistrations: number;
  growth: number;
  bounceRate: number;
  avgSessionDuration: number;
}

/**
 * 趋势数据点
 */
export interface TrendDataPoint {
  date: string;
  visitors: number;
  pageViews: number;
  uniqueVisitors: number;
  registrations: number;
}

/**
 * 图表数据
 */
export interface ChartData {
  name: string;
  value: number;
  color?: string;
  percentage?: number;
}

/**
 * 访客分析组件属性
 */
export interface VisitorAnalyticsProps {
  onUpdate?: () => void;
  timeRange?: TimeRange;
  className?: string;
}

/**
 * 用户等级颜色映射
 */
export const USER_LEVEL_COLORS: Record<UserLevel, string> = {
  GUEST: '#6B7280',
  USER: '#3B82F6',
  VIP: '#10B981',
  CREATOR: '#8B5CF6',
  ADMIN: '#EF4444',
  SUPER_ADMIN: '#DC2626',
};

/**
 * 用户等级标签映射
 */
export const USER_LEVEL_LABELS: Record<UserLevel, string> = {
  GUEST: '游客',
  USER: '普通用户',
  VIP: 'VIP用户',
  CREATOR: '创作者',
  ADMIN: '管理员',
  SUPER_ADMIN: '超级管理员',
};

/**
 * 图表颜色配置
 */
export const CHART_COLORS = [
  '#0088FE',
  '#00C49F', 
  '#FFBB28',
  '#FF8042',
  '#8884D8',
  '#82CA9D',
  '#FFC658',
  '#FF7C7C',
  '#8DD1E1',
  '#D084D0'
];

/**
 * 设备类型图标映射
 */
export const DEVICE_ICONS = {
  desktop: 'Monitor',
  mobile: 'Smartphone',
  tablet: 'Tablet',
  unknown: 'HelpCircle',
} as const;

/**
 * 时间范围选项
 */
export const TIME_RANGE_OPTIONS = [
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'year', label: '本年' },
] as const;

/**
 * 工具函数：格式化数字
 */
export function formatNumber(num: number): string {
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
  return `${num.toFixed(1)}%`;
}

/**
 * 工具函数：格式化时长
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * 工具函数：获取用户等级标签
 */
export function getUserLevelLabel(level: UserLevel): string {
  return USER_LEVEL_LABELS[level] || level;
}

/**
 * 工具函数：获取用户等级颜色
 */
export function getUserLevelColor(level: UserLevel): string {
  return USER_LEVEL_COLORS[level] || '#6B7280';
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
export function generateChartData(
  data: Array<{ name: string; count: number }>,
  colors: string[] = CHART_COLORS
): ChartData[] {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  
  return data.map((item, index) => ({
    name: item.name,
    value: item.count,
    color: colors[index % colors.length],
    percentage: total > 0 ? (item.count / total) * 100 : 0,
  }));
}

/**
 * 工具函数：格式化日期
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * 工具函数：格式化时间
 */
export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 工具函数：格式化日期时间
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 工具函数：获取时间范围标签
 */
export function getTimeRangeLabel(range: TimeRange): string {
  const option = TIME_RANGE_OPTIONS.find(opt => opt.value === range);
  return option?.label || range;
}

/**
 * 工具函数：判断是否在线
 */
export function isUserOnline(lastVisit: Date | string): boolean {
  const now = new Date();
  const lastVisitDate = new Date(lastVisit);
  const diffMinutes = (now.getTime() - lastVisitDate.getTime()) / (1000 * 60);
  return diffMinutes <= 5; // 5分钟内算在线
}

/**
 * 工具函数：生成模拟数据（用于开发测试）
 */
export function generateMockVisitorStats(): VisitorStats {
  return {
    totalVisitors: 1234,
    uniqueVisitors: 987,
    pageViews: 5678,
    bounceRate: 45.6,
    avgSessionDuration: 180,
    devices: [
      { device: 'desktop', _count: { id: 500 }, percentage: 50.5 },
      { device: 'mobile', _count: { id: 400 }, percentage: 40.4 },
      { device: 'tablet', _count: { id: 87 }, percentage: 8.8 },
      { device: 'unknown', _count: { id: 3 }, percentage: 0.3 },
    ],
    browsers: [
      { browser: 'Chrome', _count: { id: 600 }, percentage: 60.6 },
      { browser: 'Safari', _count: { id: 200 }, percentage: 20.2 },
      { browser: 'Firefox', _count: { id: 150 }, percentage: 15.2 },
      { browser: 'Edge', _count: { id: 40 }, percentage: 4.0 },
    ],
    locations: [
      { country: '中国', city: '北京', _count: { id: 400 }, percentage: 40.4 },
      { country: '中国', city: '上海', _count: { id: 300 }, percentage: 30.3 },
      { country: '中国', city: '广州', _count: { id: 200 }, percentage: 20.2 },
      { country: '美国', _count: { id: 87 }, percentage: 8.8 },
    ],
    userLevels: [
      { userLevel: 'GUEST', _count: { id: 500 }, percentage: 50.5 },
      { userLevel: 'USER', _count: { id: 300 }, percentage: 30.3 },
      { userLevel: 'VIP', _count: { id: 100 }, percentage: 10.1 },
      { userLevel: 'CREATOR', _count: { id: 80 }, percentage: 8.1 },
      { userLevel: 'ADMIN', _count: { id: 10 }, percentage: 1.0 },
    ],
  };
}
