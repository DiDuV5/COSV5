import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 格式化数字显示
 * @param num 要格式化的数字
 * @returns 格式化后的字符串
 * @example
 * formatNumber(1234) => "1.2K"
 * formatNumber(1234567) => "1.2M"
 */
export function formatNumber(num: number): string {
  if (num < 1000) {
    return num.toString();
  } else if (num < 1000000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  } else if (num < 1000000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
}

/**
 * 获取今日开始时间 (00:00:00)
 * @param date 可选的日期，默认为当前日期
 * @returns 今日开始时间
 */
export function getTodayStart(date?: Date): Date {
  const today = date ? new Date(date) : new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * 获取明日开始时间 (00:00:00)
 * @param date 可选的日期，默认为当前日期
 * @returns 明日开始时间
 */
export function getTomorrowStart(date?: Date): Date {
  const tomorrow = date ? new Date(date) : new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

/**
 * 检查是否需要重置每日经验值
 * @param lastResetTime 上次重置时间
 * @param currentTime 当前时间，默认为现在
 * @returns 是否需要重置
 */
export function shouldResetDailyExperience(lastResetTime: Date, currentTime?: Date): boolean {
  const now = currentTime || new Date();
  const lastReset = new Date(lastResetTime);
  const todayStart = getTodayStart(now);

  // 如果上次重置时间早于今日开始时间，则需要重置
  return lastReset < todayStart;
}

/**
 * 计算距离下次重置的时间
 * @param currentTime 当前时间，默认为现在
 * @returns 距离重置的小时数
 */
export function getHoursUntilReset(currentTime?: Date): number {
  const now = currentTime || new Date();
  const tomorrowStart = getTomorrowStart(now);
  const diffInMs = tomorrowStart.getTime() - now.getTime();
  return Math.ceil(diffInMs / (1000 * 60 * 60));
}

/**
 * 格式化时间显示
 * @param date 日期对象
 * @param options 格式化选项
 * @returns 格式化后的时间字符串
 */
export function formatDateTime(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  return new Intl.DateTimeFormat('zh-CN', { ...defaultOptions, ...options }).format(new Date(date));
}
