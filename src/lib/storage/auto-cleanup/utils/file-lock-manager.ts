/**
 * @fileoverview 文件锁管理器
 * @description 管理文件锁定状态，防止并发删除
 */

import type { FileLock, IFileLockManager } from '../types';

/**
 * 文件锁管理器
 */
export class FileLockManager implements IFileLockManager {
  private static instance: FileLockManager;
  private locks: Map<string, FileLock> = new Map();
  private readonly lockTimeout = 5 * 60 * 1000; // 5分钟锁超时

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): FileLockManager {
    if (!FileLockManager.instance) {
      FileLockManager.instance = new FileLockManager();
    }
    return FileLockManager.instance;
  }

  /**
   * 锁定文件
   */
  public lockFile(filePath: string): void {
    const normalizedPath = this.normalizePath(filePath);
    
    const lock: FileLock = {
      filePath: normalizedPath,
      lockTime: new Date(),
      processId: process.pid,
    };

    this.locks.set(normalizedPath, lock);
    console.log(`🔒 文件已锁定: ${this.getFileName(normalizedPath)}`);
  }

  /**
   * 解锁文件
   */
  public unlockFile(filePath: string): void {
    const normalizedPath = this.normalizePath(filePath);
    
    if (this.locks.delete(normalizedPath)) {
      console.log(`🔓 文件已解锁: ${this.getFileName(normalizedPath)}`);
    }
  }

  /**
   * 检查文件是否被锁定
   */
  public isFileLocked(filePath: string): boolean {
    const normalizedPath = this.normalizePath(filePath);
    const lock = this.locks.get(normalizedPath);
    
    if (!lock) return false;

    // 检查锁是否过期
    const lockAge = Date.now() - lock.lockTime.getTime();
    if (lockAge > this.lockTimeout) {
      this.locks.delete(normalizedPath);
      console.log(`⏰ 文件锁已过期并清理: ${this.getFileName(normalizedPath)}`);
      return false;
    }

    return true;
  }

  /**
   * 获取所有锁定的文件
   */
  public getLockedFiles(): string[] {
    // 先清理过期的锁
    this.cleanupExpiredLocks();
    return Array.from(this.locks.keys());
  }

  /**
   * 清理过期的锁
   */
  public cleanupExpiredLocks(): void {
    const now = Date.now();
    const expiredLocks: string[] = [];

    const entries = Array.from(this.locks.entries());
    for (const [filePath, lock] of entries) {
      const lockAge = now - lock.lockTime.getTime();
      if (lockAge > this.lockTimeout) {
        expiredLocks.push(filePath);
      }
    }

    expiredLocks.forEach(filePath => {
      this.locks.delete(filePath);
      console.log(`🧹 清理过期锁: ${this.getFileName(filePath)}`);
    });

    if (expiredLocks.length > 0) {
      console.log(`✅ 清理了 ${expiredLocks.length} 个过期文件锁`);
    }
  }

  /**
   * 批量锁定文件
   */
  public lockFiles(filePaths: string[]): void {
    filePaths.forEach(filePath => this.lockFile(filePath));
    console.log(`🔒 批量锁定了 ${filePaths.length} 个文件`);
  }

  /**
   * 批量解锁文件
   */
  public unlockFiles(filePaths: string[]): void {
    let unlockedCount = 0;
    filePaths.forEach(filePath => {
      const normalizedPath = this.normalizePath(filePath);
      if (this.locks.delete(normalizedPath)) {
        unlockedCount++;
      }
    });
    console.log(`🔓 批量解锁了 ${unlockedCount} 个文件`);
  }

  /**
   * 获取锁信息
   */
  public getLockInfo(filePath: string): FileLock | null {
    const normalizedPath = this.normalizePath(filePath);
    return this.locks.get(normalizedPath) || null;
  }

  /**
   * 检查锁是否属于当前进程
   */
  public isOwnLock(filePath: string): boolean {
    const lock = this.getLockInfo(filePath);
    return lock ? lock.processId === process.pid : false;
  }

  /**
   * 强制解锁文件（仅限当前进程的锁）
   */
  public forceUnlock(filePath: string): boolean {
    const normalizedPath = this.normalizePath(filePath);
    const lock = this.locks.get(normalizedPath);
    
    if (!lock) return false;

    // 只能强制解锁自己进程的锁
    if (lock.processId === process.pid) {
      this.locks.delete(normalizedPath);
      console.log(`💥 强制解锁文件: ${this.getFileName(normalizedPath)}`);
      return true;
    }

    console.warn(`⚠️ 无法强制解锁其他进程的文件锁: ${this.getFileName(normalizedPath)}`);
    return false;
  }

  /**
   * 获取锁统计信息
   */
  public getLockStatistics(): {
    totalLocks: number;
    ownLocks: number;
    expiredLocks: number;
    oldestLock?: Date;
    newestLock?: Date;
  } {
    this.cleanupExpiredLocks();

    const locks = Array.from(this.locks.values());
    const ownLocks = locks.filter(lock => lock.processId === process.pid);
    
    let oldestLock: Date | undefined;
    let newestLock: Date | undefined;

    if (locks.length > 0) {
      const lockTimes = locks.map(lock => lock.lockTime);
      oldestLock = new Date(Math.min(...lockTimes.map(t => t.getTime())));
      newestLock = new Date(Math.max(...lockTimes.map(t => t.getTime())));
    }

    return {
      totalLocks: locks.length,
      ownLocks: ownLocks.length,
      expiredLocks: 0, // 已经清理了
      oldestLock,
      newestLock,
    };
  }

  /**
   * 清理所有锁（仅限当前进程）
   */
  public clearAllLocks(): void {
    const ownLocks = Array.from(this.locks.entries())
      .filter(([, lock]) => lock.processId === process.pid);

    ownLocks.forEach(([filePath]) => {
      this.locks.delete(filePath);
    });

    console.log(`🧹 清理了当前进程的 ${ownLocks.length} 个文件锁`);
  }

  /**
   * 设置锁超时时间
   */
  public setLockTimeout(timeoutMs: number): void {
    if (timeoutMs < 1000) {
      throw new Error('锁超时时间不能少于1秒');
    }
    if (timeoutMs > 60 * 60 * 1000) {
      throw new Error('锁超时时间不能超过1小时');
    }
    
    (this as any).lockTimeout = timeoutMs;
    console.log(`⚙️ 文件锁超时时间已设置为: ${timeoutMs / 1000}秒`);
  }

  /**
   * 获取锁超时时间
   */
  public getLockTimeout(): number {
    return this.lockTimeout;
  }

  /**
   * 检查是否可以安全删除文件
   */
  public canSafelyDelete(filePath: string): boolean {
    return !this.isFileLocked(filePath);
  }

  /**
   * 等待文件解锁
   */
  public async waitForUnlock(filePath: string, maxWaitMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 100; // 100ms检查一次

    while (this.isFileLocked(filePath)) {
      if (Date.now() - startTime > maxWaitMs) {
        return false; // 超时
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    return true;
  }

  /**
   * 标准化文件路径
   */
  private normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, '/').toLowerCase();
  }

  /**
   * 获取文件名
   */
  private getFileName(filePath: string): string {
    return filePath.split('/').pop() || filePath;
  }

  /**
   * 格式化锁信息为字符串
   */
  public formatLockInfo(filePath: string): string {
    const lock = this.getLockInfo(filePath);
    if (!lock) return '文件未锁定';

    const lockAge = Date.now() - lock.lockTime.getTime();
    const ageStr = this.formatDuration(lockAge);
    const isOwn = lock.processId === process.pid ? '(当前进程)' : `(进程 ${lock.processId})`;

    return `锁定时间: ${ageStr} ${isOwn}`;
  }

  /**
   * 格式化时长
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }
}
