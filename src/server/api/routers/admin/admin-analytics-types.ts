/**
 * @fileoverview 访客分析类型定义 - CoserEden平台
 * @description 访客分析系统的所有类型定义和接口
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

/**
 * 时间范围类型
 */
export type TimeRange = 'day' | 'week' | 'month';

/**
 * 趋势方向类型
 */
export type TrendDirection = 'up' | 'down' | 'stable';

/**
 * 用户访客统计
 */
export interface UserVisitorStats {
  totalVisitors: number;
  uniqueVisitors: number;
  pageViews: number;
  avgSessionDuration: number;
  bounceRate: number;
  topPages: Array<{
    page: string;
    views: number;
  }>;
  referrers: Array<{
    source: string;
    visitors: number;
  }>;
  dailyVisitors: Record<string, number>;
  conversionRate?: number;
}

/**
 * 用户信息（用于访客统计）
 */
export interface UserInfo {
  id: string;
  username: string;
  displayName: string | null;
  userLevel: string;
  postsCount: number;
  followersCount: number;
  followingCount?: number;
  createdAt: Date;
  lastLoginAt: Date | null;
  isVerified?: boolean;
}

/**
 * 用户访客统计结果
 */
export interface UserVisitorStatsResult {
  user: UserInfo | null;
  visitorStats: UserVisitorStats | null;
}

/**
 * 用户列表访客统计结果
 */
export interface UsersVisitorStatsResult {
  users: Array<UserInfo & { visitorStats: UserVisitorStats }>;
  total: number;
}

/**
 * 网站整体访客统计
 */
export interface SiteVisitorStats {
  totalVisitors: number;
  uniqueVisitors: number;
  pageViews: number;
  sessions: number;
  avgSessionDuration: number;
  bounceRate: number;
  conversionRate: number;
}

/**
 * 时间段访客统计
 */
export interface PeriodVisitorStats {
  visitors: number;
  pageViews: number;
  newUsers: number;
  sessions?: number;
}

/**
 * 网站访客统计结果
 */
export interface SiteVisitorStatsResult {
  overview: SiteVisitorStats;
  recent: {
    last30Days: PeriodVisitorStats;
    last7Days: PeriodVisitorStats;
    last24Hours: PeriodVisitorStats;
  };
  dailyVisitors: Record<string, number>;
  dailyRegistrations: Record<string, number>;
  topPages: Array<{
    page: string;
    views: number;
    title?: string;
  }>;
  trafficSources: Array<{
    source: string;
    visitors: number;
    percentage: number;
  }>;
  deviceStats: Array<{
    device: string;
    visitors: number;
    percentage: number;
  }>;
  conversionFunnel: {
    visitors: number;
    sessions: number;
    signups: number;
    activeUsers: number;
  };
}

/**
 * 注册转化分析结果
 */
export interface RegistrationConversionResult {
  summary: {
    totalRegistrations: number;
    verifiedUsers: number;
    activeUsers: number;
    contentCreators: number;
    conversionRates: {
      registrationToVerification: number;
      registrationToActive: number;
      registrationToCreator: number;
    };
  };
  dailyData: {
    registrations: Record<string, number>;
    verifications: Record<string, number>;
  };
  levelDistribution: Record<string, number>;
  trends: {
    avgDailyRegistrations: number;
    peakRegistrationDay: {
      date: string;
      count: number;
    };
  };
}

/**
 * 访客统计查询结果
 */
export interface VisitorStatsResult {
  timeRange: TimeRange;
  period: {
    start: Date;
    end: Date;
  };
  overview: SiteVisitorStats;
  dailyData: Record<string, PeriodVisitorStats>;
  topPages: Array<{
    page: string;
    views: number;
    title: string;
  }>;
  trafficSources: Array<{
    source: string;
    visitors: number;
    percentage: number;
  }>;
  deviceStats: Array<{
    device: string;
    visitors: number;
    percentage: number;
  }>;
  geoStats: Array<{
    country: string;
    visitors: number;
    percentage: number;
  }>;
  realTimeData: {
    currentVisitors: number;
    activePages: number;
    topActivePages: Array<{
      page: string;
      activeUsers: number;
    }>;
  };
}

/**
 * 注册统计结果
 */
export interface RegistrationStatsResult {
  timeRange: TimeRange;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalRegistrations: number;
    verifiedUsers: number;
    activeUsers: number;
    conversionRates: {
      registrationToVerification: number;
      registrationToActivation: number;
      verificationToActivation: number;
    };
    growthRate: number;
  };
  dailyData: Record<string, {
    registrations: number;
    verifications: number;
    activations: number;
  }>;
  registrationsByLevel: Array<{
    level: string;
    count: number;
    percentage: number;
  }>;
  registrationsBySource: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
  trends: {
    avgDailyRegistrations: number;
    peakDay: {
      date: string;
      count: number;
    };
    growthRate: number;
  };
  cohortAnalysis: {
    retention: {
      day1: number;
      day7: number;
      day30: number;
    };
  };
}

/**
 * 页面统计结果
 */
export interface PageStatsResult {
  timeRange: TimeRange;
  summary: {
    totalPages: number;
    totalViews: number;
    totalUniqueViews: number;
    avgTimeOnSite: number;
    overallBounceRate: number;
  };
  pageStats: Array<{
    page: string;
    title: string;
    views: number;
    uniqueViews: number;
    avgTimeOnPage: number;
    bounceRate: number;
  }>;
  popularContent: Array<{
    id: string;
    title: string;
    author: string;
    likes: number;
    estimatedViews: number;
  }>;
  exitPages: Array<{
    page: string;
    exits: number;
    exitRate: number;
  }>;
}

/**
 * 趋势数据
 */
export interface TrendData {
  current: number;
  previous: number;
  growthRate: number;
  trend: TrendDirection;
}

/**
 * 趋势分析结果
 */
export interface TrendAnalysisResult {
  timeRange: TimeRange;
  period: {
    start: Date;
    end: Date;
  };
  trends: {
    users: TrendData;
    posts: TrendData;
    comments: TrendData;
    engagement: TrendData;
  };
  summary: {
    totalGrowthRate: number;
    strongestGrowth: {
      metric: string;
      rate: number;
    };
  };
}

/**
 * 数据库查询选项
 */
export interface QueryOptions {
  timeRange?: TimeRange;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  userId?: string;
}

/**
 * 统计计算配置
 */
export interface CalculationConfig {
  visitorMultiplier: number;
  pageViewMultiplier: number;
  sessionMultiplier: number;
  conversionRates: {
    visitorToUser: number;
    userToVerified: number;
    userToActive: number;
  };
}

/**
 * 报告生成选项
 */
export interface ReportOptions {
  includeCharts: boolean;
  includeDetails: boolean;
  format: 'json' | 'csv' | 'pdf';
  timeZone?: string;
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  enabled: boolean;
  ttl: number; // 缓存时间（秒）
  keyPrefix: string;
}
