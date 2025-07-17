/**
 * @fileoverview 罐头交易监控类型定义
 * @description 包含交易监控相关的所有TypeScript类型定义
 */

/**
 * 交易类型枚举
 */
export type TransactionType = 'EARN' | 'SPEND' | 'TRANSFER' | 'GIFT' | 'ADMIN';

/**
 * 交易状态枚举
 */
export type TransactionStatus = 'completed' | 'pending' | 'flagged' | 'failed';

/**
 * 交易来源枚举
 */
export type TransactionSource = 
  | 'DAILY_SIGNIN' 
  | 'PUBLISH_POST' 
  | 'DOWNLOAD' 
  | 'ADMIN_GRANT' 
  | 'TASK' 
  | 'TRANSFER'
  | 'GIFT'
  | 'OTHER';

/**
 * 交易记录接口
 */
export interface Transaction {
  id: string;
  userId: string;
  username?: string;
  transactionType: TransactionType;
  amount: number;
  source: TransactionSource;
  description: string;
  createdAt: Date;
  status: TransactionStatus;
  user?: {
    username: string;
    id: string;
  };
}

/**
 * 交易趋势数据接口
 */
export interface TransactionTrendData {
  date: string;
  earn: number;
  spend: number;
  net: number;
}

/**
 * 交易类型分布数据接口
 */
export interface TransactionTypeDistribution {
  type: string;
  count: number;
  percentage?: number;
}

/**
 * 图表数据接口
 */
export interface ChartData {
  name: string;
  value: number;
  color: string;
}

/**
 * 异常交易数据接口
 */
export interface AnomalyData {
  largeTransactions: Transaction[];
  frequentUsers: FrequentUser[];
  suspiciousPatterns: SuspiciousPattern[];
}

/**
 * 频繁交易用户接口
 */
export interface FrequentUser {
  userId: string;
  username?: string;
  transactionCount: number;
  totalAmount: number;
  avgAmount: number;
  riskScore: number;
}

/**
 * 可疑模式接口
 */
export interface SuspiciousPattern {
  id: string;
  type: 'RAPID_TRANSACTIONS' | 'UNUSUAL_AMOUNT' | 'SUSPICIOUS_SOURCE';
  description: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  affectedUsers: string[];
  detectedAt: Date;
}

/**
 * 交易统计概览接口
 */
export interface TransactionStats {
  todayTransactions: number;
  todayVolume: number;
  avgTransactionValue: number;
  flaggedTransactions: number;
  totalUsers: number;
  activeUsers: number;
  growthRate: number;
}

/**
 * 统计卡片数据接口
 */
export interface StatCard {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  change: string;
  changeType: 'increase' | 'decrease';
}

/**
 * 搜索筛选参数接口
 */
export interface SearchFilters {
  searchTerm: string;
  filterType: TransactionType | 'all';
  dateRange: 'today' | 'week' | 'month' | 'custom';
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  status?: TransactionStatus | 'all';
}

/**
 * 异常检测配置接口
 */
export interface AnomalyDetectionConfig {
  threshold: number;
  days: number;
  enableLargeTransactionDetection: boolean;
  enableFrequentUserDetection: boolean;
  enablePatternDetection: boolean;
  maxTransactionsPerHour: number;
  suspiciousAmountMultiplier: number;
}

/**
 * 实时监控配置接口
 */
export interface RealTimeConfig {
  refreshInterval: number;
  autoRefresh: boolean;
  maxDisplayItems: number;
  enableNotifications: boolean;
}

/**
 * 图表配置接口
 */
export interface ChartConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    danger: string;
    purple: string;
  };
  animation: boolean;
  responsive: boolean;
}

/**
 * 交易类型配置接口
 */
export interface TransactionTypeConfig {
  label: string;
  color: string;
  bgColor: string;
  icon?: string;
}

/**
 * API查询参数接口
 */
export interface TransactionQueryParams {
  limit?: number;
  offset?: number;
  days?: number;
  threshold?: number;
  userId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  startDate?: Date;
  endDate?: Date;
}

/**
 * 分页信息接口
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * API响应接口
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: PaginationInfo;
  error?: string;
  timestamp: Date;
}

/**
 * 交易监控状态接口
 */
export interface MonitoringState {
  isPending: boolean;
  error: string | null;
  lastUpdate: Date;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

/**
 * 导出配置接口
 */
export interface ExportConfig {
  format: 'csv' | 'excel' | 'pdf';
  dateRange: {
    start: Date;
    end: Date;
  };
  includeFields: string[];
  filters: SearchFilters;
}

/**
 * 报告配置接口
 */
export interface ReportConfig {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  includeCharts: boolean;
  includeAnomalies: boolean;
  includeStatistics: boolean;
  recipients: string[];
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
  };
}

/**
 * 用户行为分析接口
 */
export interface UserBehaviorAnalysis {
  activeTransactionUsers: number;
  avgDailyTransactions: number;
  avgTransactionAmount: number;
  userGrowthRate: number;
  retentionRate: number;
  topUsers: {
    userId: string;
    username: string;
    transactionCount: number;
    totalAmount: number;
  }[];
}

/**
 * 时间范围类型
 */
export type TimeRange = '7d' | '30d' | '90d' | 'custom';

/**
 * 标签页类型
 */
export type TabType = 'realtime' | 'analytics' | 'anomaly' | 'reports';

/**
 * 排序配置接口
 */
export interface SortConfig {
  field: keyof Transaction;
  direction: 'asc' | 'desc';
}

/**
 * 通知配置接口
 */
export interface NotificationConfig {
  enabled: boolean;
  types: {
    largeTransaction: boolean;
    suspiciousActivity: boolean;
    systemAlert: boolean;
  };
  thresholds: {
    largeTransactionAmount: number;
    frequentTransactionCount: number;
  };
}
