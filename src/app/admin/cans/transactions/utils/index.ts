/**
 * @fileoverview 交易监控工具函数
 * @description 提供交易监控相关的工具函数
 */

import type {
  Transaction,
  TransactionType,
  TransactionStatus,
  SearchFilters,
  FrequentUser,
  TransactionStats
} from '../types';

/**
 * 格式化金额显示
 */
export function formatAmount(amount: number, showSign: boolean = true): string {
  const absAmount = Math.abs(amount);
  const formattedAmount = absAmount.toLocaleString();

  if (!showSign) {
    return formattedAmount;
  }

  if (amount > 0) {
    return `+${formattedAmount}`;
  } else if (amount < 0) {
    return `-${formattedAmount}`;
  } else {
    return formattedAmount;
  }
}

/**
 * 格式化时间显示
 */
export function formatTime(date: Date | string, format: 'full' | 'time' | 'date' = 'full'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  switch (format) {
    case 'time':
      return dateObj.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    case 'date':
      return dateObj.toLocaleDateString('zh-CN');
    case 'full':
    default:
      return dateObj.toLocaleString('zh-CN');
  }
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return '刚刚';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    return formatTime(dateObj, 'date');
  }
}

/**
 * 获取交易类型显示名称
 */
export function getTransactionTypeName(type: TransactionType): string {
  const typeNames: Record<TransactionType, string> = {
    'EARN': '获得',
    'SPEND': '消费',
    'TRANSFER': '转账',
    'GIFT': '赠送',
    'ADMIN': '管理',
  };
  return typeNames[type] || type;
}

/**
 * 获取交易状态显示名称
 */
export function getTransactionStatusName(status: TransactionStatus): string {
  const statusNames: Record<TransactionStatus, string> = {
    'completed': '已完成',
    'pending': '处理中',
    'flagged': '异常',
    'failed': '失败',
  };
  return statusNames[status] || status;
}

/**
 * 计算交易统计信息
 */
export function calculateTransactionStats(transactions: Transaction[]): TransactionStats {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTransactions = transactions.filter(t =>
    new Date(t.createdAt) >= today
  );

  const totalVolume = todayTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const avgTransactionValue = todayTransactions.length > 0
    ? totalVolume / todayTransactions.length
    : 0;

  const flaggedTransactions = todayTransactions.filter(t => t.status === 'flagged').length;

  // 获取唯一用户数
  const uniqueUsers = new Set(transactions.map(t => t.userId));
  const todayActiveUsers = new Set(todayTransactions.map(t => t.userId));

  return {
    todayTransactions: todayTransactions.length,
    todayVolume: totalVolume,
    avgTransactionValue,
    flaggedTransactions,
    totalUsers: uniqueUsers.size,
    activeUsers: todayActiveUsers.size,
    growthRate: 0, // 需要历史数据计算
  };
}

/**
 * 过滤交易记录
 */
export function filterTransactions(
  transactions: Transaction[],
  filters: SearchFilters
): Transaction[] {
  return transactions.filter(transaction => {
    // 搜索词过滤
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const matchesSearch =
        transaction.description.toLowerCase().includes(searchLower) ||
        transaction.user?.username?.toLowerCase().includes(searchLower) ||
        transaction.userId.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // 交易类型过滤
    if (filters.filterType !== 'all' && transaction.transactionType !== filters.filterType) {
      return false;
    }

    // 状态过滤
    if (filters.status !== 'all' && transaction.status !== filters.status) {
      return false;
    }

    // 金额范围过滤
    if (filters.minAmount !== undefined && Math.abs(transaction.amount) < filters.minAmount) {
      return false;
    }
    if (filters.maxAmount !== undefined && Math.abs(transaction.amount) > filters.maxAmount) {
      return false;
    }

    // 日期范围过滤
    const transactionDate = new Date(transaction.createdAt);
    if (filters.startDate && transactionDate < filters.startDate) {
      return false;
    }
    if (filters.endDate && transactionDate > filters.endDate) {
      return false;
    }

    return true;
  });
}

/**
 * 排序交易记录
 */
export function sortTransactions(
  transactions: Transaction[],
  sortBy: keyof Transaction = 'createdAt',
  order: 'asc' | 'desc' = 'desc'
): Transaction[] {
  return [...transactions].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    // 处理日期类型
    if (sortBy === 'createdAt') {
      aValue = new Date(aValue as Date).getTime();
      bValue = new Date(bValue as Date).getTime();
    }

    // 处理数字类型
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return order === 'asc' ? aValue - bValue : bValue - aValue;
    }

    // 处理字符串类型
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue);
      return order === 'asc' ? comparison : -comparison;
    }

    return 0;
  });
}

/**
 * 检测异常交易
 */
export function detectAnomalousTransactions(
  transactions: Transaction[],
  threshold: number = 1000
): Transaction[] {
  return transactions.filter(transaction => {
    // 大额交易
    if (Math.abs(transaction.amount) > threshold) {
      return true;
    }

    // 异常状态
    if (transaction.status === 'flagged') {
      return true;
    }

    return false;
  });
}

/**
 * 分析频繁交易用户
 */
export function analyzeFrequentUsers(
  transactions: Transaction[],
  timeWindowHours: number = 24
): FrequentUser[] {
  const cutoffTime = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
  const recentTransactions = transactions.filter(t => new Date(t.createdAt) >= cutoffTime);

  const userStats = recentTransactions.reduce((acc, transaction) => {
    const userId = transaction.userId;
    if (!acc[userId]) {
      acc[userId] = {
        userId,
        username: transaction.user?.username,
        transactionCount: 0,
        totalAmount: 0,
        transactions: [],
      };
    }

    acc[userId].transactionCount++;
    acc[userId].totalAmount += Math.abs(transaction.amount);
    acc[userId].transactions.push(transaction);

    return acc;
  }, {} as Record<string, any>);

  return Object.values(userStats)
    .map(user => ({
      userId: user.userId,
      username: user.username,
      transactionCount: user.transactionCount,
      totalAmount: user.totalAmount,
      avgAmount: user.totalAmount / user.transactionCount,
      riskScore: calculateRiskScore(user.transactions),
    }))
    .filter(user => user.transactionCount > 10) // 只返回交易次数较多的用户
    .sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * 计算风险评分
 */
export function calculateRiskScore(transactions: Transaction[]): number {
  let score = 0;

  // 基于交易频率
  if (transactions.length > 50) score += 30;
  else if (transactions.length > 20) score += 15;

  // 基于大额交易
  const largeTransactions = transactions.filter(t => Math.abs(t.amount) > 500);
  score += largeTransactions.length * 5;

  // 基于异常状态
  const flaggedTransactions = transactions.filter(t => t.status === 'flagged');
  score += flaggedTransactions.length * 20;

  // 基于时间模式（深夜交易）
  const nightTransactions = transactions.filter(t => {
    const hour = new Date(t.createdAt).getHours();
    return hour >= 2 && hour <= 6;
  });
  score += nightTransactions.length * 10;

  return Math.min(score, 100); // 最高100分
}

/**
 * 生成交易报告数据
 */
export function generateTransactionReport(transactions: Transaction[]) {
  const stats = calculateTransactionStats(transactions);
  const anomalous = detectAnomalousTransactions(transactions);
  const frequentUsers = analyzeFrequentUsers(transactions);

  return {
    summary: stats,
    anomalousTransactions: anomalous,
    frequentUsers,
    totalTransactions: transactions.length,
    reportGeneratedAt: new Date(),
  };
}

/**
 * 导出为CSV格式
 */
export function exportToCSV(transactions: Transaction[]): string {
  const headers = ['时间', '用户ID', '用户名', '交易类型', '金额', '来源', '描述', '状态'];
  const rows = transactions.map(t => [
    formatTime(t.createdAt),
    t.userId,
    t.user?.username || '',
    getTransactionTypeName(t.transactionType),
    t.amount.toString(),
    t.source,
    t.description,
    getTransactionStatusName(t.status),
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csvContent;
}

/**
 * 验证搜索筛选参数
 */
export function validateSearchFilters(filters: SearchFilters): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 验证日期范围
  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
    errors.push('开始日期不能晚于结束日期');
  }

  // 验证金额范围
  if (filters.minAmount !== undefined && filters.minAmount < 0) {
    errors.push('最小金额不能为负数');
  }

  if (filters.maxAmount !== undefined && filters.maxAmount < 0) {
    errors.push('最大金额不能为负数');
  }

  if (
    filters.minAmount !== undefined &&
    filters.maxAmount !== undefined &&
    filters.minAmount > filters.maxAmount
  ) {
    errors.push('最小金额不能大于最大金额');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
