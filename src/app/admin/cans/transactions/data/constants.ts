/**
 * @fileoverview 罐头交易监控常量配置
 * @description 包含图表颜色、交易类型等配置常量
 */

import type { ChartConfig, TransactionTypeConfig } from '../types';

/**
 * 图表颜色配置
 */
export const CHART_COLORS: ChartConfig['colors'] = {
  primary: "#3b82f6",
  secondary: "#10b981",
  accent: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
};

/**
 * 交易类型配置
 */
export const TRANSACTION_TYPES: Record<string, TransactionTypeConfig> = {
  EARN: { 
    label: "获得", 
    color: "text-green-600", 
    bgColor: "bg-green-50",
    icon: "trending-up"
  },
  SPEND: { 
    label: "消费", 
    color: "text-red-600", 
    bgColor: "bg-red-50",
    icon: "trending-down"
  },
  TRANSFER: { 
    label: "转账", 
    color: "text-blue-600", 
    bgColor: "bg-blue-50",
    icon: "activity"
  },
  GIFT: { 
    label: "赠送", 
    color: "text-purple-600", 
    bgColor: "bg-purple-50",
    icon: "target"
  },
  ADMIN: { 
    label: "管理", 
    color: "text-orange-600", 
    bgColor: "bg-orange-50",
    icon: "users"
  },
};

/**
 * 交易状态配置
 */
export const TRANSACTION_STATUS_CONFIG = {
  completed: {
    label: "已完成",
    color: "text-green-800",
    bgColor: "bg-green-100",
    icon: "check-circle"
  },
  pending: {
    label: "处理中",
    color: "text-yellow-800",
    bgColor: "bg-yellow-100",
    icon: "clock"
  },
  flagged: {
    label: "异常",
    color: "text-red-800",
    bgColor: "bg-red-100",
    icon: "alert-triangle"
  },
  failed: {
    label: "失败",
    color: "text-gray-800",
    bgColor: "bg-gray-100",
    icon: "x-circle"
  },
};

/**
 * 交易来源配置
 */
export const TRANSACTION_SOURCE_CONFIG = {
  DAILY_SIGNIN: {
    label: "每日签到",
    description: "用户每日签到获得的奖励",
    category: "reward"
  },
  PUBLISH_POST: {
    label: "发布作品",
    description: "发布内容获得的奖励",
    category: "reward"
  },
  DOWNLOAD: {
    label: "下载消费",
    description: "下载内容产生的消费",
    category: "consumption"
  },
  ADMIN_GRANT: {
    label: "管理员发放",
    description: "管理员手动发放的奖励",
    category: "admin"
  },
  TASK: {
    label: "任务完成",
    description: "完成任务获得的奖励",
    category: "reward"
  },
  TRANSFER: {
    label: "用户转账",
    description: "用户之间的转账",
    category: "transfer"
  },
  GIFT: {
    label: "礼物赠送",
    description: "用户赠送礼物",
    category: "gift"
  },
  OTHER: {
    label: "其他",
    description: "其他类型的交易",
    category: "other"
  },
};

/**
 * 时间范围选项
 */
export const TIME_RANGE_OPTIONS = [
  { value: "7d", label: "近7天" },
  { value: "30d", label: "近30天" },
  { value: "90d", label: "近90天" },
  { value: "custom", label: "自定义" },
];

/**
 * 刷新间隔选项
 */
export const REFRESH_INTERVAL_OPTIONS = [
  { value: 5000, label: "5秒" },
  { value: 10000, label: "10秒" },
  { value: 30000, label: "30秒" },
  { value: 60000, label: "1分钟" },
];

/**
 * 异常检测阈值配置
 */
export const ANOMALY_DETECTION_THRESHOLDS = {
  LARGE_TRANSACTION: 1000,
  FREQUENT_TRANSACTIONS_PER_HOUR: 50,
  SUSPICIOUS_AMOUNT_MULTIPLIER: 10,
  MAX_DAILY_TRANSACTIONS: 200,
  UNUSUAL_TIME_WINDOW: {
    start: 2, // 凌晨2点
    end: 6,   // 早上6点
  },
};

/**
 * 图表默认配置
 */
export const DEFAULT_CHART_CONFIG: ChartConfig = {
  colors: CHART_COLORS,
  animation: true,
  responsive: true,
};

/**
 * 分页默认配置
 */
export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 10,
  maxLimit: 100,
};

/**
 * 导出格式选项
 */
export const EXPORT_FORMAT_OPTIONS = [
  { value: "csv", label: "CSV文件", extension: ".csv" },
  { value: "excel", label: "Excel文件", extension: ".xlsx" },
  { value: "pdf", label: "PDF文件", extension: ".pdf" },
];

/**
 * 报告类型选项
 */
export const REPORT_TYPE_OPTIONS = [
  { value: "daily", label: "日报" },
  { value: "weekly", label: "周报" },
  { value: "monthly", label: "月报" },
  { value: "custom", label: "自定义" },
];

/**
 * 风险等级配置
 */
export const RISK_LEVEL_CONFIG = {
  LOW: {
    label: "低风险",
    color: "text-green-600",
    bgColor: "bg-green-50",
    score: { min: 0, max: 30 }
  },
  MEDIUM: {
    label: "中风险",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    score: { min: 31, max: 70 }
  },
  HIGH: {
    label: "高风险",
    color: "text-red-600",
    bgColor: "bg-red-50",
    score: { min: 71, max: 100 }
  },
};

/**
 * 通知类型配置
 */
export const NOTIFICATION_TYPES = {
  LARGE_TRANSACTION: {
    label: "大额交易",
    description: "检测到大额交易时发送通知",
    defaultThreshold: 1000
  },
  SUSPICIOUS_ACTIVITY: {
    label: "可疑活动",
    description: "检测到可疑交易模式时发送通知",
    defaultThreshold: 5
  },
  SYSTEM_ALERT: {
    label: "系统警报",
    description: "系统异常或错误时发送通知",
    defaultThreshold: 1
  },
};

/**
 * 表格列配置
 */
export const TABLE_COLUMNS = {
  TRANSACTIONS: [
    { key: "createdAt", label: "时间", sortable: true },
    { key: "user", label: "用户", sortable: true },
    { key: "transactionType", label: "类型", sortable: true },
    { key: "amount", label: "金额", sortable: true },
    { key: "description", label: "描述", sortable: false },
    { key: "status", label: "状态", sortable: true },
    { key: "actions", label: "操作", sortable: false },
  ],
  ANOMALIES: [
    { key: "detectedAt", label: "检测时间", sortable: true },
    { key: "type", label: "异常类型", sortable: true },
    { key: "riskLevel", label: "风险等级", sortable: true },
    { key: "description", label: "描述", sortable: false },
    { key: "affectedUsers", label: "影响用户", sortable: false },
    { key: "actions", label: "操作", sortable: false },
  ],
};

/**
 * 默认搜索筛选配置
 */
export const DEFAULT_SEARCH_FILTERS = {
  searchTerm: "",
  filterType: "all" as const,
  dateRange: "today" as const,
  status: "all" as const,
};

/**
 * 实时监控默认配置
 */
export const DEFAULT_REALTIME_CONFIG = {
  refreshInterval: 5000,
  autoRefresh: true,
  maxDisplayItems: 10,
  enableNotifications: true,
};

/**
 * 异常检测默认配置
 */
export const DEFAULT_ANOMALY_CONFIG = {
  threshold: 1000,
  days: 7,
  enableLargeTransactionDetection: true,
  enableFrequentUserDetection: true,
  enablePatternDetection: true,
  maxTransactionsPerHour: 50,
  suspiciousAmountMultiplier: 10,
};

/**
 * 图表类型选项
 */
export const CHART_TYPE_OPTIONS = [
  { value: "line", label: "折线图" },
  { value: "bar", label: "柱状图" },
  { value: "pie", label: "饼图" },
  { value: "area", label: "面积图" },
];

/**
 * 数据更新频率选项
 */
export const UPDATE_FREQUENCY_OPTIONS = [
  { value: "realtime", label: "实时" },
  { value: "1min", label: "1分钟" },
  { value: "5min", label: "5分钟" },
  { value: "15min", label: "15分钟" },
  { value: "1hour", label: "1小时" },
];

/**
 * 系统限制配置
 */
export const SYSTEM_LIMITS = {
  MAX_EXPORT_RECORDS: 10000,
  MAX_SEARCH_RESULTS: 1000,
  MAX_CHART_DATA_POINTS: 100,
  MAX_CONCURRENT_REQUESTS: 5,
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30分钟
};
