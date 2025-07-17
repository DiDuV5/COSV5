/**
 * @fileoverview 统一路径配置管理
 * @description 管理所有文件路径配置，支持开发和生产环境
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - path: 路径处理
 * - process: 环境变量
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import path from 'path';

export interface PathConfig {
  // 基础路径
  projectRoot: string;
  publicDir: string;

  // 上传相关路径
  uploadsDir: string;
  mediaDir: string;
  tempDir: string;
  chunksDir: string;

  // 备份路径
  backupDir: string;

  // 日志路径
  logsDir: string;
}

/**
 * 路径配置管理器
 */
export class PathManager {
  private static instance: PathManager;
  private config: PathConfig;

  private constructor() {
    this.config = this.initializeConfig();
  }

  public static getInstance(): PathManager {
    if (!PathManager.instance) {
      PathManager.instance = new PathManager();
    }
    return PathManager.instance;
  }

  /**
   * 初始化路径配置
   */
  private initializeConfig(): PathConfig {
    const projectRoot = process.cwd();
    const isProduction = process.env.NODE_ENV === 'production';

    // 基础路径配置
    const publicDir = path.join(projectRoot, 'public');

    // 上传路径配置 - 支持环境变量覆盖
    const uploadsBaseDir = process.env.COSEREEDEN_UPLOAD_DIR ||
      (isProduction
        ? '/www/wwwroot/tutu360.cc/public/uploads'
        : path.join(publicDir, 'uploads')
      );

    // 临时文件路径配置
    const tempBaseDir = process.env.COSEREEDEN_TEMP_DIR ||
      (isProduction
        ? '/tmp/cosereeden'
        : path.join(projectRoot, 'temp')
      );

    return {
      projectRoot,
      publicDir,
      uploadsDir: uploadsBaseDir,
      mediaDir: path.join(uploadsBaseDir, 'media'),
      tempDir: tempBaseDir,
      chunksDir: path.join(tempBaseDir, 'chunks'),
      backupDir: process.env.COSEREEDEN_BACKUP_DIR || path.join(projectRoot, 'backups'),
      logsDir: process.env.COSEREEDEN_LOGS_DIR || path.join(projectRoot, 'logs'),
    };
  }

  /**
   * 获取配置
   */
  public getConfig(): PathConfig {
    return { ...this.config };
  }

  /**
   * 获取上传目录路径
   */
  public getUploadsDir(): string {
    return this.config.uploadsDir;
  }

  /**
   * 获取媒体文件目录路径
   */
  public getMediaDir(): string {
    return this.config.mediaDir;
  }

  /**
   * 获取临时文件目录路径
   */
  public getTempDir(): string {
    return this.config.tempDir;
  }

  /**
   * 获取分片文件目录路径
   */
  public getChunksDir(sessionId?: string): string {
    return sessionId
      ? path.join(this.config.chunksDir, sessionId)
      : this.config.chunksDir;
  }

  /**
   * 获取相对于public目录的URL路径
   */
  public getPublicUrl(filePath: string): string {
    const relativePath = path.relative(this.config.publicDir, filePath);
    return '/' + relativePath.replace(/\\/g, '/');
  }

  /**
   * 获取相对于项目根目录的路径
   */
  public getRelativePath(filePath: string): string {
    return path.relative(this.config.projectRoot, filePath);
  }

  /**
   * 确保目录存在
   */
  public async ensureDir(dirPath: string): Promise<void> {
    const fs = await import('fs/promises');
    await fs.mkdir(dirPath, { recursive: true });
  }

  /**
   * 确保所有必要目录存在
   */
  public async ensureAllDirs(): Promise<void> {
    await Promise.all([
      this.ensureDir(this.config.uploadsDir),
      this.ensureDir(this.config.mediaDir),
      this.ensureDir(this.config.tempDir),
      this.ensureDir(this.config.chunksDir),
      this.ensureDir(this.config.backupDir),
      this.ensureDir(this.config.logsDir),
    ]);
  }

  /**
   * 获取所有需要监控的目录
   */
  public getMonitoredDirectories(): string[] {
    return [
      this.config.uploadsDir,
      this.config.mediaDir,
      this.config.tempDir,
      this.config.chunksDir,
      this.config.backupDir,
      this.config.logsDir,
    ];
  }

  /**
   * 获取数据库文件路径
   */
  public getDatabasePath(): string {
    return path.join(this.config.projectRoot, 'prisma', 'dev.db');
  }

  /**
   * 重新加载配置（用于运行时配置更新）
   */
  public reloadConfig(): void {
    this.config = this.initializeConfig();
  }
}

// 导出单例实例
export const pathManager = PathManager.getInstance();

// 导出便捷方法
export const getPaths = () => pathManager.getConfig();
export const getUploadsDir = () => pathManager.getUploadsDir();
export const getMediaDir = () => pathManager.getMediaDir();
export const getTempDir = () => pathManager.getTempDir();
export const getChunksDir = (sessionId?: string) => pathManager.getChunksDir(sessionId);
export const getPublicUrl = (filePath: string) => pathManager.getPublicUrl(filePath);
export const ensureDir = (dirPath: string) => pathManager.ensureDir(dirPath);
export const ensureAllDirs = () => pathManager.ensureAllDirs();
