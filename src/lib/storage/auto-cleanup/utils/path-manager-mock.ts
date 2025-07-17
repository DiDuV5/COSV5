/**
 * @fileoverview 路径管理器模拟（用于自动清理服务）
 * @description 提供基本的路径管理功能
 */

import * as path from 'path';
import { promises as fs } from 'fs';

/**
 * 路径配置
 */
interface PathConfig {
  baseDir: string;
  mediaDir: string;
  chunksDir: string;
  tempDir: string;
  logsDir: string;
  backupDir: string;
}

/**
 * 路径管理器模拟
 */
export class PathManagerMock {
  private static instance: PathManagerMock;
  private config: PathConfig;

  private constructor() {
    this.config = {
      baseDir: process.cwd(),
      mediaDir: path.join(process.cwd(), 'public', 'uploads'),
      chunksDir: path.join(process.cwd(), 'temp', 'chunks'),
      tempDir: path.join(process.cwd(), 'temp'),
      logsDir: path.join(process.cwd(), 'logs'),
      backupDir: path.join(process.cwd(), 'backups'),
    };
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): PathManagerMock {
    if (!PathManagerMock.instance) {
      PathManagerMock.instance = new PathManagerMock();
    }
    return PathManagerMock.instance;
  }

  /**
   * 获取配置
   */
  public getConfig(): PathConfig {
    return { ...this.config };
  }

  /**
   * 获取媒体目录
   */
  public getMediaDir(): string {
    return this.config.mediaDir;
  }

  /**
   * 获取分片目录
   */
  public getChunksDir(): string {
    return this.config.chunksDir;
  }

  /**
   * 获取临时目录
   */
  public getTempDir(): string {
    return this.config.tempDir;
  }

  /**
   * 确保目录存在
   */
  public async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // 目录可能已存在，忽略错误
    }
  }
}

// 导出默认实例
export const pathManager = PathManagerMock.getInstance();
