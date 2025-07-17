/**
 * @fileoverview 访客分析工具函数 - CoserEden平台
 * @description 访客分析系统的通用工具函数和辅助方法
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import type {
  TimeRange,
  TrendDirection,
  CalculationConfig,
  QueryOptions
} from './admin-analytics-types';

/**
 * 默认计算配置
 */
export const DEFAULT_CALCULATION_CONFIG: CalculationConfig = {
  visitorMultiplier: 8,
  pageViewMultiplier: 15,
  sessionMultiplier: 3,
  conversionRates: {
    visitorToUser: 0.1, // 10%
    userToVerified: 0.8, // 80%
    userToActive: 0.6, // 60%
  },
};

/**
 * 计算时间范围的开始和结束日期
 *
 * @param timeRange - 时间范围
 * @param startDate - 自定义开始日期
 * @param endDate - 自定义结束日期
 * @returns 时间范围对象
 */
export function calculateTimeRange(
  timeRange?: TimeRange,
  startDate?: Date,
  endDate?: Date
): { start: Date; end: Date } {
  const now = new Date();
  let rangeStart: Date;
  const rangeEnd: Date = endDate || now;

  if (startDate) {
    rangeStart = startDate;
  } else {
    switch (timeRange) {
      case 'day':
        rangeStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        rangeStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  return { start: rangeStart, end: rangeEnd };
}

/**
 * 计算上一个时间段的范围
 *
 * @param start - 当前时间段开始
 * @param end - 当前时间段结束
 * @returns 上一个时间段的范围
 */
export function calculatePreviousPeriod(start: Date, end: Date): { start: Date; end: Date } {
  const duration = end.getTime() - start.getTime();
  return {
    start: new Date(start.getTime() - duration),
    end: start,
  };
}

/**
 * 生成每日数据模板
 *
 * @param start - 开始日期
 * @param end - 结束日期
 * @param defaultValue - 默认值
 * @returns 每日数据对象
 */
export function generateDailyDataTemplate<T>(
  start: Date,
  end: Date,
  defaultValue: T
): Record<string, T> {
  const data: Record<string, T> = {};
  const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));

  for (let i = 0; i < days; i++) {
    const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const dateKey = formatDateKey(date);
    data[dateKey] = defaultValue;
  }

  return data;
}

/**
 * 格式化日期为键值
 *
 * @param date - 日期对象
 * @returns 格式化的日期字符串 (YYYY-MM-DD)
 */
export function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * 生成模拟的每日访客数据
 *
 * @param days - 天数
 * @param baseValue - 基础值
 * @param variance - 变化幅度（0-1）
 * @returns 每日访客数据
 */
export function generateDailyVisitorData(
  days: number,
  baseValue: number = 100,
  variance: number = 0.3
): Record<string, number> {
  const data: Record<string, number> = {};
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateKey = formatDateKey(date);

    // 添加随机变化和周末效应
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const weekendMultiplier = isWeekend ? 1.2 : 1.0;
    const randomVariance = 1 + (Math.random() - 0.5) * variance * 2;

    data[dateKey] = Math.floor(baseValue * weekendMultiplier * randomVariance);
  }

  return data;
}

/**
 * 生成模拟的每日注册数据
 *
 * @param days - 天数
 * @param totalRegistrations - 总注册数
 * @returns 每日注册数据
 */
export function generateDailyRegistrationData(
  days: number,
  totalRegistrations: number
): Record<string, number> {
  const data: Record<string, number> = {};
  const now = new Date();
  const avgDaily = Math.floor(totalRegistrations / days);

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateKey = formatDateKey(date);

    // 添加一些随机变化
    data[dateKey] = Math.max(0, avgDaily + Math.floor(Math.random() * 10) - 5);
  }

  return data;
}

/**
 * 计算增长率
 *
 * @param current - 当前值
 * @param previous - 之前值
 * @returns 增长率（百分比）
 */
export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * 确定趋势方向
 *
 * @param current - 当前值
 * @param previous - 之前值
 * @returns 趋势方向
 */
export function determineTrend(current: number, previous: number): TrendDirection {
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'stable';
}

/**
 * 计算百分比
 *
 * @param part - 部分值
 * @param total - 总值
 * @returns 百分比
 */
export function calculatePercentage(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/**
 * 生成模拟访客统计数据
 *
 * @param userCount - 用户数量
 * @param config - 计算配置
 * @returns 访客统计数据
 */
export function generateVisitorStats(
  userCount: number,
  config: CalculationConfig = DEFAULT_CALCULATION_CONFIG
) {
  return {
    totalVisitors: Math.floor(userCount * config.visitorMultiplier),
    uniqueVisitors: Math.floor(userCount * config.visitorMultiplier * 0.8),
    pageViews: Math.floor(userCount * config.pageViewMultiplier),
    sessions: Math.floor(userCount * config.sessionMultiplier),
    avgSessionDuration: 180 + Math.floor(Math.random() * 120), // 3-5分钟
    bounceRate: 25 + Math.floor(Math.random() * 20), // 25-45%
    conversionRate: Math.round(config.conversionRates.visitorToUser * 100),
  };
}

/**
 * 生成热门页面数据
 *
 * @param totalViews - 总浏览量
 * @returns 热门页面数组
 */
export function generateTopPages(totalViews: number) {
  const pages = [
    { page: '/', title: '首页', ratio: 0.25 },
    { page: '/explore', title: '探索', ratio: 0.18 },
    { page: '/posts', title: '作品', ratio: 0.15 },
    { page: '/creators', title: '创作者', ratio: 0.12 },
    { page: '/trending', title: '热门', ratio: 0.08 },
  ];

  return pages.map(({ page, title, ratio }) => ({
    page,
    title,
    views: Math.floor(totalViews * ratio),
  }));
}

/**
 * 生成流量来源数据
 *
 * @param totalVisitors - 总访客数
 * @returns 流量来源数组
 */
export function generateTrafficSources(totalVisitors: number) {
  const sources = [
    { source: 'Direct', ratio: 0.45 },
    { source: 'Search', ratio: 0.28 },
    { source: 'Social', ratio: 0.18 },
    { source: 'Referral', ratio: 0.09 },
  ];

  return sources.map(({ source, ratio }) => ({
    source,
    visitors: Math.floor(totalVisitors * ratio),
    percentage: Math.round(ratio * 100),
  }));
}

/**
 * 生成设备统计数据
 *
 * @param totalVisitors - 总访客数
 * @returns 设备统计数组
 */
export function generateDeviceStats(totalVisitors: number) {
  const devices = [
    { device: 'Desktop', ratio: 0.58 },
    { device: 'Mobile', ratio: 0.38 },
    { device: 'Tablet', ratio: 0.04 },
  ];

  return devices.map(({ device, ratio }) => ({
    device,
    visitors: Math.floor(totalVisitors * ratio),
    percentage: Math.round(ratio * 100),
  }));
}

/**
 * 生成地理位置统计数据
 *
 * @param totalVisitors - 总访客数
 * @returns 地理位置统计数组
 */
export function generateGeoStats(totalVisitors: number) {
  const countries = [
    { country: 'China', ratio: 0.65 },
    { country: 'Japan', ratio: 0.12 },
    { country: 'United States', ratio: 0.08 },
    { country: 'South Korea', ratio: 0.06 },
    { country: 'Others', ratio: 0.09 },
  ];

  return countries.map(({ country, ratio }) => ({
    country,
    visitors: Math.floor(totalVisitors * ratio),
    percentage: Math.round(ratio * 100),
  }));
}

/**
 * 生成实时数据
 *
 * @returns 实时访客数据
 */
export function generateRealTimeData() {
  return {
    currentVisitors: Math.floor(Math.random() * 50) + 20,
    activePages: Math.floor(Math.random() * 10) + 5,
    topActivePages: [
      { page: '/', activeUsers: Math.floor(Math.random() * 15) + 5 },
      { page: '/explore', activeUsers: Math.floor(Math.random() * 10) + 3 },
      { page: '/posts', activeUsers: Math.floor(Math.random() * 8) + 2 },
    ],
  };
}

/**
 * 验证查询选项
 *
 * @param options - 查询选项
 * @returns 验证后的选项
 */
export function validateQueryOptions(options: QueryOptions): QueryOptions {
  const validated: QueryOptions = { ...options };

  // 验证时间范围
  if (validated.timeRange && !['day', 'week', 'month'].includes(validated.timeRange)) {
    validated.timeRange = 'week';
  }

  // 验证分页参数
  if (validated.limit && (validated.limit < 1 || validated.limit > 1000)) {
    validated.limit = 50;
  }

  if (validated.offset && validated.offset < 0) {
    validated.offset = 0;
  }

  // 验证日期范围
  if (validated.startDate && validated.endDate && validated.startDate > validated.endDate) {
    const temp = validated.startDate;
    validated.startDate = validated.endDate;
    validated.endDate = temp;
  }

  return validated;
}

/**
 * 格式化数字为可读格式
 *
 * @param num - 数字
 * @returns 格式化的字符串
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
 * 格式化百分比
 *
 * @param value - 值
 * @param total - 总值
 * @param decimals - 小数位数
 * @returns 格式化的百分比字符串
 */
export function formatPercentage(value: number, total: number, decimals: number = 1): string {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return percentage.toFixed(decimals) + '%';
}

/**
 * 生成缓存键
 *
 * @param prefix - 前缀
 * @param params - 参数
 * @returns 缓存键
 */
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');

  return `${prefix}:${sortedParams}`;
}
