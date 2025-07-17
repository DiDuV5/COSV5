/**
 * @fileoverview 罐头交易监控模拟数据
 * @description 提供测试用的模拟数据
 */

import type { 
  Transaction, 
  TransactionTrendData, 
  TransactionTypeDistribution,
  FrequentUser,
  SuspiciousPattern,
  UserBehaviorAnalysis,
  TransactionStats
} from '../types';

/**
 * 模拟交易记录数据
 */
export const mockTransactions: Transaction[] = [
  {
    id: "tx_001",
    userId: "user_001",
    username: "cosplayer_01",
    transactionType: "EARN",
    amount: 15,
    source: "DAILY_SIGNIN",
    description: "每日签到奖励",
    createdAt: new Date(),
    status: "completed",
    user: {
      username: "cosplayer_01",
      id: "user_001"
    }
  },
  {
    id: "tx_002",
    userId: "user_002",
    username: "photographer_02",
    transactionType: "EARN",
    amount: 30,
    source: "PUBLISH_POST",
    description: "发布作品奖励",
    createdAt: new Date(Date.now() - 60000),
    status: "completed",
    user: {
      username: "photographer_02",
      id: "user_002"
    }
  },
  {
    id: "tx_003",
    userId: "user_003",
    username: "fan_03",
    transactionType: "SPEND",
    amount: -50,
    source: "DOWNLOAD",
    description: "下载高清图片",
    createdAt: new Date(Date.now() - 120000),
    status: "completed",
    user: {
      username: "fan_03",
      id: "user_003"
    }
  },
  {
    id: "tx_004",
    userId: "user_004",
    username: "admin_user",
    transactionType: "ADMIN",
    amount: 1000,
    source: "ADMIN_GRANT",
    description: "管理员发放奖励",
    createdAt: new Date(Date.now() - 180000),
    status: "pending",
    user: {
      username: "admin_user",
      id: "user_004"
    }
  },
  {
    id: "tx_005",
    userId: "user_005",
    username: "suspicious_user",
    transactionType: "EARN",
    amount: 500,
    source: "TASK",
    description: "异常任务完成",
    createdAt: new Date(Date.now() - 240000),
    status: "flagged",
    user: {
      username: "suspicious_user",
      id: "user_005"
    }
  },
  {
    id: "tx_006",
    userId: "user_006",
    username: "creator_06",
    transactionType: "TRANSFER",
    amount: -200,
    source: "TRANSFER",
    description: "转账给其他用户",
    createdAt: new Date(Date.now() - 300000),
    status: "completed",
    user: {
      username: "creator_06",
      id: "user_006"
    }
  },
  {
    id: "tx_007",
    userId: "user_007",
    username: "gifter_07",
    transactionType: "GIFT",
    amount: -100,
    source: "GIFT",
    description: "赠送礼物",
    createdAt: new Date(Date.now() - 360000),
    status: "completed",
    user: {
      username: "gifter_07",
      id: "user_007"
    }
  },
];

/**
 * 模拟交易趋势数据
 */
export const mockTrendData: TransactionTrendData[] = [
  { date: "12-01", earn: 1200, spend: 800, net: 400 },
  { date: "12-02", earn: 1350, spend: 950, net: 400 },
  { date: "12-03", earn: 1180, spend: 720, net: 460 },
  { date: "12-04", earn: 1420, spend: 1100, net: 320 },
  { date: "12-05", earn: 1380, spend: 890, net: 490 },
  { date: "12-06", earn: 1560, spend: 1200, net: 360 },
  { date: "12-07", earn: 1450, spend: 980, net: 470 },
];

/**
 * 模拟交易类型分布数据
 */
export const mockTypeDistribution: TransactionTypeDistribution[] = [
  { type: "签到奖励", count: 35, percentage: 35 },
  { type: "任务完成", count: 28, percentage: 28 },
  { type: "内容发布", count: 20, percentage: 20 },
  { type: "下载消费", count: 12, percentage: 12 },
  { type: "其他", count: 5, percentage: 5 },
];

/**
 * 模拟频繁交易用户数据
 */
export const mockFrequentUsers: FrequentUser[] = [
  {
    userId: "user_frequent_01",
    username: "power_user_01",
    transactionCount: 156,
    totalAmount: 2340,
    avgAmount: 15,
    riskScore: 25
  },
  {
    userId: "user_frequent_02",
    username: "active_trader_02",
    transactionCount: 89,
    totalAmount: 4560,
    avgAmount: 51.2,
    riskScore: 45
  },
  {
    userId: "user_frequent_03",
    username: "suspicious_03",
    transactionCount: 234,
    totalAmount: 12000,
    avgAmount: 51.3,
    riskScore: 85
  },
];

/**
 * 模拟可疑模式数据
 */
export const mockSuspiciousPatterns: SuspiciousPattern[] = [
  {
    id: "pattern_001",
    type: "RAPID_TRANSACTIONS",
    description: "用户在短时间内进行大量交易",
    riskLevel: "HIGH",
    affectedUsers: ["user_005", "user_frequent_03"],
    detectedAt: new Date(Date.now() - 3600000)
  },
  {
    id: "pattern_002",
    type: "UNUSUAL_AMOUNT",
    description: "交易金额异常偏高",
    riskLevel: "MEDIUM",
    affectedUsers: ["user_004"],
    detectedAt: new Date(Date.now() - 7200000)
  },
  {
    id: "pattern_003",
    type: "SUSPICIOUS_SOURCE",
    description: "来源不明的大额交易",
    riskLevel: "HIGH",
    affectedUsers: ["user_005"],
    detectedAt: new Date(Date.now() - 1800000)
  },
];

/**
 * 模拟交易统计数据
 */
export const mockTransactionStats: TransactionStats = {
  todayTransactions: 1247,
  todayVolume: 45680,
  avgTransactionValue: 36.7,
  flaggedTransactions: 12,
  totalUsers: 8934,
  activeUsers: 2156,
  growthRate: 12.5,
};

/**
 * 模拟用户行为分析数据
 */
export const mockUserBehaviorAnalysis: UserBehaviorAnalysis = {
  activeTransactionUsers: 68,
  avgDailyTransactions: 42.3,
  avgTransactionAmount: 156,
  userGrowthRate: 5.2,
  retentionRate: 78.5,
  topUsers: [
    {
      userId: "user_top_01",
      username: "top_creator_01",
      transactionCount: 456,
      totalAmount: 12340
    },
    {
      userId: "user_top_02",
      username: "top_spender_02",
      transactionCount: 389,
      totalAmount: 9876
    },
    {
      userId: "user_top_03",
      username: "top_earner_03",
      transactionCount: 234,
      totalAmount: 8765
    },
  ],
};

/**
 * 生成随机交易数据
 */
export function generateRandomTransaction(): Transaction {
  const types: Array<Transaction['transactionType']> = ['EARN', 'SPEND', 'TRANSFER', 'GIFT', 'ADMIN'];
  const sources: Array<Transaction['source']> = ['DAILY_SIGNIN', 'PUBLISH_POST', 'DOWNLOAD', 'TASK', 'TRANSFER'];
  const statuses: Array<Transaction['status']> = ['completed', 'pending', 'flagged'];
  
  const randomType = types[Math.floor(Math.random() * types.length)];
  const randomSource = sources[Math.floor(Math.random() * sources.length)];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
  
  const isEarn = randomType === 'EARN' || randomType === 'ADMIN';
  const amount = isEarn 
    ? Math.floor(Math.random() * 500) + 10
    : -(Math.floor(Math.random() * 200) + 5);

  return {
    id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: `user_${Math.floor(Math.random() * 1000)}`,
    username: `user_${Math.floor(Math.random() * 1000)}`,
    transactionType: randomType,
    amount,
    source: randomSource,
    description: `随机生成的${randomType}交易`,
    createdAt: new Date(),
    status: randomStatus,
    user: {
      username: `user_${Math.floor(Math.random() * 1000)}`,
      id: `user_${Math.floor(Math.random() * 1000)}`
    }
  };
}

/**
 * 生成指定数量的随机交易数据
 */
export function generateRandomTransactions(count: number): Transaction[] {
  return Array.from({ length: count }, () => generateRandomTransaction());
}

/**
 * 生成模拟趋势数据
 */
export function generateTrendData(days: number): TransactionTrendData[] {
  const data: TransactionTrendData[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const earn = Math.floor(Math.random() * 500) + 800;
    const spend = Math.floor(Math.random() * 400) + 400;
    
    data.push({
      date: date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
      earn,
      spend,
      net: earn - spend
    });
  }
  
  return data;
}

/**
 * 获取模拟异常数据
 */
export function getMockAnomalyData() {
  return {
    largeTransactions: mockTransactions.filter(t => Math.abs(t.amount) > 100),
    frequentUsers: mockFrequentUsers,
    suspiciousPatterns: mockSuspiciousPatterns,
  };
}
