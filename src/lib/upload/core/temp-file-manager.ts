/**
 * @fileoverview 临时文件管理器
 * @description 统一管理所有临时文件，确保资源清理，防止文件泄漏
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import { existsSync } from 'fs';
import { mkdir, unlink, writeFile, readdir, stat } from 'fs/promises';
import path from 'path';
import { StructuredLogger } from './structured-logger';

/**
 * 临时文件信息
 */
export interface TempFileInfo {
  /** 文件路径 */
  filepath: string;
  /** 创建时间 */
  createdAt: number;
  /** 文件大小 */
  size: number;
  /** 文件用途 */
  purpose: string;
  /** 关联的会话ID */
  sessionId?: string;
  /** 是否已清理 */
  cleaned: boolean;
}

/**
 * 临时文件管理器配置
 */
export interface TempFileManagerConfig {
  /** 临时文件根目录 */
  tempDir: string;
  /** 文件最大保留时间（毫秒） */
  maxAge: number;
  /** 清理间隔（毫秒） */
  cleanupInterval: number;
  /** 最大临时文件数量 */
  maxFiles: number;
  /** 最大总大小（字节） */
  maxTotalSize: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: TempFileManagerConfig = {
  tempDir: path.join(process.cwd(), 'temp', 'upload-processing'),
  maxAge: 2 * 60 * 60 * 1000,    // 2小时
  cleanupInterval: 10 * 60 * 1000, // 10分钟
  maxFiles: 1000,
  maxTotalSize: 10 * 1024 * 1024 * 1024, // 10GB
};

/**
 * 临时文件管理器
 */
export class TempFileManager {
  private files = new Map<string, TempFileInfo>();
  private cleanupInterval: NodeJS.Timeout;
  private logger: StructuredLogger;
  private config: TempFileManagerConfig;

  constructor(config: Partial<TempFileManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = new StructuredLogger({ service: 'temp-file-manager' });

    // 初始化清理定时器
    this.cleanupInterval = setInterval(() => {
      this.performCleanup().catch((error: any) => {
        this.logger.error('定时清理失败', error instanceof Error ? error : new Error(String(error)));
      });
    }, this.config.cleanupInterval);

    this.initializeDirectory();
    this.startCleanupScheduler();
  }

  /**
   * 初始化临时目录
   */
  private async initializeDirectory(): Promise<void> {
    try {
      if (!existsSync(this.config.tempDir)) {
        await mkdir(this.config.tempDir, { recursive: true });
        this.logger.info('创建临时目录', { tempDir: this.config.tempDir });
      }

      // 扫描现有文件
      await this.scanExistingFiles();
    } catch (error) {
      this.logger.error('初始化临时目录失败', error as Error, {
        tempDir: this.config.tempDir
      });
      throw error;
    }
  }

  /**
   * 扫描现有临时文件
   */
  private async scanExistingFiles(): Promise<void> {
    try {
      const files = await readdir(this.config.tempDir);
      let scannedCount = 0;

      for (const filename of files) {
        const filepath = path.join(this.config.tempDir, filename);
        try {
          const stats = await stat(filepath);
          if (stats.isFile()) {
            this.files.set(filepath, {
              filepath,
              createdAt: stats.birthtime.getTime(),
              size: stats.size,
              purpose: 'existing',
              cleaned: false
            });
            scannedCount++;
          }
        } catch (error) {
          this.logger.warn('扫描文件失败', { filepath, error });
        }
      }

      this.logger.info('扫描现有临时文件完成', {
        scannedCount,
        totalFiles: this.files.size
      });
    } catch (error) {
      this.logger.error('扫描临时目录失败', error as Error);
    }
  }

  /**
   * 启动清理调度器
   */
  private startCleanupScheduler(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);

    this.logger.info('临时文件清理调度器已启动', {
      cleanupInterval: this.config.cleanupInterval
    });
  }

  /**
   * 创建临时文件
   */
  async createTempFile(
    prefix: string,
    extension: string = '',
    purpose: string = 'general',
    sessionId?: string
  ): Promise<string> {
    // 检查文件数量限制
    await this.checkLimits();

    // 生成唯一文件名
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const filename = `${prefix}_${timestamp}_${random}${extension}`;
    const filepath = path.join(this.config.tempDir, filename);

    // 记录文件信息
    const fileInfo: TempFileInfo = {
      filepath,
      createdAt: timestamp,
      size: 0, // 初始大小为0，写入后更新
      purpose,
      sessionId,
      cleaned: false
    };

    this.files.set(filepath, fileInfo);

    this.logger.debug('创建临时文件', {
      filepath,
      purpose,
      sessionId,
      totalFiles: this.files.size
    });

    return filepath;
  }

  /**
   * 写入临时文件
   */
  async writeTempFile(
    filepath: string,
    data: Buffer | string,
    purpose: string = 'write',
    sessionId?: string
  ): Promise<void> {
    try {
      await writeFile(filepath, data);

      // 更新文件信息
      const fileInfo = this.files.get(filepath);
      if (fileInfo) {
        fileInfo.size = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);
      } else {
        // 如果文件信息不存在，创建新的
        this.files.set(filepath, {
          filepath,
          createdAt: Date.now(),
          size: Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data),
          purpose,
          sessionId,
          cleaned: false
        });
      }

      this.logger.debug('写入临时文件', {
        filepath,
        size: Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data),
        purpose,
        sessionId
      });
    } catch (error) {
      this.logger.error('写入临时文件失败', error as Error, {
        filepath,
        purpose,
        sessionId
      });
      throw error;
    }
  }

  /**
   * 清理单个临时文件
   */
  async cleanupFile(filepath: string): Promise<boolean> {
    const fileInfo = this.files.get(filepath);
    if (!fileInfo || fileInfo.cleaned) {
      return true; // 已清理或不存在
    }

    try {
      if (existsSync(filepath)) {
        await unlink(filepath);
      }

      fileInfo.cleaned = true;
      this.files.delete(filepath);

      this.logger.debug('清理临时文件', {
        filepath,
        purpose: fileInfo.purpose,
        sessionId: fileInfo.sessionId,
        age: Date.now() - fileInfo.createdAt
      });

      return true;
    } catch (error) {
      this.logger.error('清理临时文件失败', error as Error, {
        filepath,
        purpose: fileInfo.purpose,
        sessionId: fileInfo.sessionId
      });
      return false;
    }
  }

  /**
   * 清理会话相关的所有临时文件
   */
  async cleanupSessionFiles(sessionId: string): Promise<number> {
    const sessionFiles = Array.from(this.files.values())
      .filter(file => file.sessionId === sessionId && !file.cleaned);

    let cleanedCount = 0;
    for (const fileInfo of sessionFiles) {
      if (await this.cleanupFile(fileInfo.filepath)) {
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.info('清理会话临时文件', {
        sessionId,
        cleanedCount,
        totalSessionFiles: sessionFiles.length
      });
    }

    return cleanedCount;
  }

  /**
   * 检查文件数量和大小限制
   */
  private async checkLimits(): Promise<void> {
    const activeFiles = Array.from(this.files.values()).filter(f => !f.cleaned);

    // 检查文件数量
    if (activeFiles.length >= this.config.maxFiles) {
      this.logger.warn('临时文件数量达到限制', {
        currentCount: activeFiles.length,
        maxFiles: this.config.maxFiles
      });

      // 清理最老的文件
      await this.cleanupOldestFiles(Math.floor(this.config.maxFiles * 0.1));
    }

    // 检查总大小
    const totalSize = activeFiles.reduce((sum, file) => sum + file.size, 0);
    if (totalSize >= this.config.maxTotalSize) {
      this.logger.warn('临时文件总大小达到限制', {
        currentSize: totalSize,
        maxTotalSize: this.config.maxTotalSize
      });

      // 清理最大的文件
      await this.cleanupLargestFiles(Math.floor(activeFiles.length * 0.1));
    }
  }

  /**
   * 清理最老的文件
   */
  private async cleanupOldestFiles(count: number): Promise<void> {
    const activeFiles = Array.from(this.files.values())
      .filter(f => !f.cleaned)
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, count);

    for (const fileInfo of activeFiles) {
      await this.cleanupFile(fileInfo.filepath);
    }

    this.logger.info('清理最老的临时文件', { cleanedCount: count });
  }

  /**
   * 清理最大的文件
   */
  private async cleanupLargestFiles(count: number): Promise<void> {
    const activeFiles = Array.from(this.files.values())
      .filter(f => !f.cleaned)
      .sort((a, b) => b.size - a.size)
      .slice(0, count);

    for (const fileInfo of activeFiles) {
      await this.cleanupFile(fileInfo.filepath);
    }

    this.logger.info('清理最大的临时文件', { cleanedCount: count });
  }

  /**
   * 执行定期清理
   */
  private async performCleanup(): Promise<void> {
    const now = Date.now();
    const expiredFiles: string[] = [];

    // 查找过期文件
    for (const [filepath, fileInfo] of this.files) {
      if (!fileInfo.cleaned && (now - fileInfo.createdAt) > this.config.maxAge) {
        expiredFiles.push(filepath);
      }
    }

    // 清理过期文件
    let cleanedCount = 0;
    for (const filepath of expiredFiles) {
      if (await this.cleanupFile(filepath)) {
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.info('定期清理过期临时文件', {
        cleanedCount,
        totalExpired: expiredFiles.length,
        remainingFiles: this.files.size
      });
    }

    // 清理孤儿文件（磁盘上存在但未在管理器中记录的文件）
    await this.cleanupOrphanFiles();
  }

  /**
   * 清理孤儿文件
   */
  private async cleanupOrphanFiles(): Promise<void> {
    try {
      const diskFiles = await readdir(this.config.tempDir);
      const managedFiles = new Set(
        Array.from(this.files.keys()).map(fp => path.basename(fp))
      );

      let orphanCount = 0;
      for (const filename of diskFiles) {
        if (!managedFiles.has(filename)) {
          const filepath = path.join(this.config.tempDir, filename);
          try {
            await unlink(filepath);
            orphanCount++;
          } catch (error) {
            this.logger.warn('清理孤儿文件失败', { filepath, error });
          }
        }
      }

      if (orphanCount > 0) {
        this.logger.info('清理孤儿临时文件', { orphanCount });
      }
    } catch (error) {
      this.logger.error('清理孤儿文件失败', error as Error);
    }
  }

  /**
   * 获取临时文件统计信息
   */
  getStats(): {
    totalFiles: number;
    activeFiles: number;
    totalSize: number;
    oldestFile: number | null;
    newestFile: number | null;
  } {
    const activeFiles = Array.from(this.files.values()).filter(f => !f.cleaned);
    const totalSize = activeFiles.reduce((sum, file) => sum + file.size, 0);

    const creationTimes = activeFiles.map(f => f.createdAt);
    const oldestFile = creationTimes.length > 0 ? Math.min(...creationTimes) : null;
    const newestFile = creationTimes.length > 0 ? Math.max(...creationTimes) : null;

    return {
      totalFiles: this.files.size,
      activeFiles: activeFiles.length,
      totalSize,
      oldestFile,
      newestFile
    };
  }

  /**
   * 强制清理所有临时文件
   */
  async cleanupAll(): Promise<number> {
    const allFiles = Array.from(this.files.keys());
    let cleanedCount = 0;

    for (const filepath of allFiles) {
      if (await this.cleanupFile(filepath)) {
        cleanedCount++;
      }
    }

    this.logger.info('强制清理所有临时文件', { cleanedCount });
    return cleanedCount;
  }

  /**
   * 销毁临时文件管理器
   */
  async destroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // 清理所有临时文件
    const cleanedCount = await this.cleanupAll();

    this.logger.info('临时文件管理器已销毁', {
      cleanedCount,
      tempDir: this.config.tempDir
    });
  }
}

/**
 * 导出单例实例
 */
export const tempFileManager = new TempFileManager();
