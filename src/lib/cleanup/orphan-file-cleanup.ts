/**
 * @fileoverview 孤立文件清理服务
 * @description 检测和清理文件系统中的孤立文件，确保数据一致性
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - fs/promises: 文件系统操作
 * - path: 路径处理
 * - prisma: 数据库操作
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { promises as fs } from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface OrphanFile {
  filename: string;
  fullPath: string;
  size: number;
  lastModified: Date;
}

export interface CleanupReport {
  totalFsFiles: number;
  totalDbFiles: number;
  orphanFiles: OrphanFile[];
  orphanCount: number;
  totalOrphanSize: number;
  cleanedFiles: string[];
  cleanedCount: number;
  cleanedSize: number;
  errors: string[];
  timestamp: Date;
}

export class OrphanFileCleanupService {
  private readonly mediaDir: string;
  private readonly backupDir: string;

  constructor(
    mediaDir: string = './public/uploads/media',
    backupDir: string = './backup/orphan-files'
  ) {
    this.mediaDir = path.resolve(mediaDir);
    this.backupDir = path.resolve(backupDir);
  }

  /**
   * 获取文件系统中的所有文件
   */
  async getFileSystemFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.mediaDir);
      return files.filter(file => {
        // 过滤掉目录和隐藏文件
        return !file.startsWith('.') && file.includes('.');
      });
    } catch (error) {
      console.error('读取文件系统失败:', error);
      throw new Error(`无法读取媒体目录: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取数据库中的所有文件记录
   */
  async getDatabaseFiles(): Promise<string[]> {
    try {
      const mediaRecords = await prisma.postMedia.findMany({
        select: { filename: true }
      });
      return mediaRecords.map(record => record.filename);
    } catch (error) {
      console.error('读取数据库记录失败:', error);
      throw new Error(`无法读取数据库记录: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 查找孤立文件
   */
  async findOrphanFiles(): Promise<OrphanFile[]> {
    console.log('🔍 开始查找孤立文件...');
    
    const [fsFiles, dbFiles] = await Promise.all([
      this.getFileSystemFiles(),
      this.getDatabaseFiles()
    ]);

    console.log(`📊 文件系统文件数量: ${fsFiles.length}`);
    console.log(`📊 数据库记录数量: ${dbFiles.length}`);

    const dbFileSet = new Set(dbFiles);
    const orphanFilenames = fsFiles.filter(file => !dbFileSet.has(file));

    console.log(`🔍 发现孤立文件数量: ${orphanFilenames.length}`);

    // 获取孤立文件的详细信息
    const orphanFiles: OrphanFile[] = [];
    for (const filename of orphanFilenames) {
      try {
        const fullPath = path.join(this.mediaDir, filename);
        const stats = await fs.stat(fullPath);
        
        orphanFiles.push({
          filename,
          fullPath,
          size: stats.size,
          lastModified: stats.mtime
        });
      } catch (error) {
        console.warn(`⚠️ 无法获取文件信息: ${filename}`, error);
      }
    }

    return orphanFiles;
  }

  /**
   * 创建备份目录
   */
  async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`📁 备份目录已准备: ${this.backupDir}`);
    } catch (error) {
      throw new Error(`无法创建备份目录: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 备份文件
   */
  async backupFile(orphanFile: OrphanFile): Promise<void> {
    const backupPath = path.join(this.backupDir, orphanFile.filename);
    await fs.copyFile(orphanFile.fullPath, backupPath);
    console.log(`💾 文件已备份: ${orphanFile.filename}`);
  }

  /**
   * 删除孤立文件
   */
  async deleteOrphanFile(orphanFile: OrphanFile): Promise<void> {
    await fs.unlink(orphanFile.fullPath);
    console.log(`🗑️ 文件已删除: ${orphanFile.filename}`);
  }

  /**
   * 清理孤立文件
   */
  async cleanupOrphanFiles(options: {
    backup?: boolean;
    dryRun?: boolean;
  } = {}): Promise<CleanupReport> {
    const { backup = true, dryRun = false } = options;
    
    console.log('🧹 开始清理孤立文件...');
    console.log(`📋 选项: 备份=${backup}, 试运行=${dryRun}`);

    const orphanFiles = await this.findOrphanFiles();
    const totalOrphanSize = orphanFiles.reduce((sum, file) => sum + file.size, 0);

    const report: CleanupReport = {
      totalFsFiles: (await this.getFileSystemFiles()).length,
      totalDbFiles: (await this.getDatabaseFiles()).length,
      orphanFiles,
      orphanCount: orphanFiles.length,
      totalOrphanSize,
      cleanedFiles: [],
      cleanedCount: 0,
      cleanedSize: 0,
      errors: [],
      timestamp: new Date()
    };

    if (orphanFiles.length === 0) {
      console.log('✅ 没有发现孤立文件');
      return report;
    }

    if (dryRun) {
      console.log('🔍 试运行模式 - 不会实际删除文件');
      console.log(`📊 将要清理的文件数量: ${orphanFiles.length}`);
      console.log(`📊 将要释放的空间: ${this.formatFileSize(totalOrphanSize)}`);
      return report;
    }

    // 创建备份目录
    if (backup) {
      await this.ensureBackupDirectory();
    }

    // 清理文件
    for (const orphanFile of orphanFiles) {
      try {
        // 备份文件
        if (backup) {
          await this.backupFile(orphanFile);
        }

        // 删除文件
        await this.deleteOrphanFile(orphanFile);

        report.cleanedFiles.push(orphanFile.filename);
        report.cleanedCount++;
        report.cleanedSize += orphanFile.size;

      } catch (error) {
        const errorMsg = `清理文件失败 ${orphanFile.filename}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`❌ ${errorMsg}`);
        report.errors.push(errorMsg);
      }
    }

    console.log(`✅ 清理完成: ${report.cleanedCount}/${orphanFiles.length} 个文件`);
    console.log(`💾 释放空间: ${this.formatFileSize(report.cleanedSize)}`);

    return report;
  }

  /**
   * 生成清理报告
   */
  generateReport(report: CleanupReport): string {
    const lines = [
      '# 孤立文件清理报告',
      `**时间**: ${report.timestamp.toLocaleString()}`,
      '',
      '## 统计信息',
      `- 文件系统文件总数: ${report.totalFsFiles}`,
      `- 数据库记录总数: ${report.totalDbFiles}`,
      `- 孤立文件数量: ${report.orphanCount}`,
      `- 孤立文件总大小: ${this.formatFileSize(report.totalOrphanSize)}`,
      '',
      '## 清理结果',
      `- 已清理文件数量: ${report.cleanedCount}`,
      `- 释放存储空间: ${this.formatFileSize(report.cleanedSize)}`,
      `- 清理成功率: ${report.orphanCount > 0 ? ((report.cleanedCount / report.orphanCount) * 100).toFixed(1) : 0}%`,
      ''
    ];

    if (report.errors.length > 0) {
      lines.push('## 错误信息');
      report.errors.forEach(error => lines.push(`- ${error}`));
      lines.push('');
    }

    if (report.cleanedFiles.length > 0) {
      lines.push('## 已清理文件列表');
      report.cleanedFiles.forEach(file => lines.push(`- ${file}`));
    }

    return lines.join('\n');
  }

  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    await prisma.$disconnect();
  }
}
