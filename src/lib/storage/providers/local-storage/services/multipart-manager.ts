/**
 * @fileoverview 分片上传管理器
 * @description 处理本地存储的分片上传功能
 */

import { promises as fs } from 'fs';
import path from 'path';
import type {
  InitiateMultipartParams,
  InitiateMultipartResult,
  UploadPartParams,
  UploadPartResult,
  CompleteMultipartParams,
} from '@/lib/storage/object-storage/base-storage-provider';
import {
  type MultipartSession,
  type PartInfo,
  type LocalStorageConfig,
  generateUniqueId,
  generateETag,
  sanitizePath,
  isPathSafe,
  ensureDirectoryExists,
} from '../types/local-storage-types';

/**
 * 分片上传管理器
 */
export class MultipartManager {
  private sessions = new Map<string, MultipartSession>();
  private tempDir: string;

  constructor(
    private config: LocalStorageConfig,
    private basePath: string
  ) {
    this.tempDir = path.join(this.basePath, '.temp');
  }

  /**
   * 初始化分片上传
   */
  async initiateMultipartUpload(params: InitiateMultipartParams): Promise<InitiateMultipartResult> {
    try {
      const sanitizedKey = sanitizePath(params.key);

      // 安全检查
      if (!isPathSafe(sanitizedKey, this.basePath)) {
        throw new Error('不安全的文件路径');
      }

      const uploadId = generateUniqueId();

      // 创建临时目录
      await ensureDirectoryExists(this.tempDir);

      // 创建会话
      const session: MultipartSession = {
        uploadId,
        key: sanitizedKey,
        parts: new Map(),
        createdAt: new Date(),
        lastAccessed: new Date(),
        metadata: params.metadata,
      };

      this.sessions.set(uploadId, session);

      // 清理过期会话
      this.cleanupExpiredSessions();

      return {
        uploadId,
        key: sanitizedKey,
      };
    } catch (error) {
      console.error('❌ 初始化分片上传失败:', error);
      throw new Error(`初始化分片上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 上传分片
   */
  async uploadPart(params: UploadPartParams): Promise<UploadPartResult> {
    try {
      const session = this.sessions.get(params.uploadId);
      if (!session) {
        throw new Error('分片上传会话不存在');
      }

      // 更新访问时间
      session.lastAccessed = new Date();

      // 处理分片数据
      let buffer: Buffer;
      if (params.buffer instanceof Buffer) {
        buffer = params.buffer;
      } else if (typeof params.buffer === 'string') {
        buffer = Buffer.from(params.buffer);
      } else {
        buffer = Buffer.from(params.buffer as any);
      }

      // 生成分片文件路径
      const partFileName = `${params.uploadId}_part_${params.partNumber}`;
      const partPath = path.join(this.tempDir, partFileName);

      // 写入分片文件
      await fs.writeFile(partPath, buffer);

      // 生成ETag
      const etag = generateETag(buffer);

      // 保存分片信息
      const partInfo: PartInfo = {
        etag,
        path: partPath,
        size: buffer.length,
        partNumber: params.partNumber,
        uploadedAt: new Date(),
      };

      session.parts.set(params.partNumber, partInfo);

      return {
        etag,
        partNumber: params.partNumber,
      };
    } catch (error) {
      console.error('❌ 上传分片失败:', error);
      throw new Error(`上传分片失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 完成分片上传
   */
  async completeMultipartUpload(params: CompleteMultipartParams): Promise<{ key: string; etag: string; size: number }> {
    try {
      const session = this.sessions.get(params.uploadId);
      if (!session) {
        throw new Error('分片上传会话不存在');
      }

      // 验证所有分片都已上传
      const expectedParts = params.parts.map((p: any) => p.partNumber).sort((a: any, b: any) => a - b);
      const uploadedParts = Array.from(session.parts.keys()).sort((a, b) => a - b);

      if (expectedParts.length !== uploadedParts.length) {
        throw new Error('分片数量不匹配');
      }

      for (let i = 0; i < expectedParts.length; i++) {
        if (expectedParts[i] !== uploadedParts[i]) {
          throw new Error(`分片 ${expectedParts[i]} 缺失`);
        }

        const expectedETag = params.parts.find((p: any) => p.partNumber === expectedParts[i])?.etag;
        const uploadedETag = session.parts.get(expectedParts[i])?.etag;

        if (expectedETag !== uploadedETag) {
          throw new Error(`分片 ${expectedParts[i]} ETag 不匹配`);
        }
      }

      // 合并分片
      const finalPath = path.join(this.basePath, session.key);
      await ensureDirectoryExists(path.dirname(finalPath));

      const writeStream = await fs.open(finalPath, 'w');
      let totalSize = 0;

      try {
        for (const partNumber of expectedParts) {
          const partInfo = session.parts.get(partNumber)!;
          const partData = await fs.readFile(partInfo.path);

          await writeStream.write(partData);
          totalSize += partData.length;
        }
      } finally {
        await writeStream.close();
      }

      // 生成最终文件的ETag
      const finalBuffer = await fs.readFile(finalPath);
      const finalETag = generateETag(finalBuffer);

      // 清理临时文件
      await this.cleanupSession(params.uploadId);

      return {
        key: session.key,
        etag: finalETag,
        size: totalSize,
      };
    } catch (error) {
      console.error('❌ 完成分片上传失败:', error);

      // 清理失败的会话
      await this.abortMultipartUpload(params.uploadId);

      throw new Error(`完成分片上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 中止分片上传
   */
  async abortMultipartUpload(uploadId: string): Promise<void> {
    try {
      await this.cleanupSession(uploadId);
    } catch (error) {
      console.error('❌ 中止分片上传失败:', error);
      throw new Error(`中止分片上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 列出分片
   */
  async listParts(uploadId: string): Promise<{
    parts: Array<{
      partNumber: number;
      etag: string;
      size: number;
      lastModified: Date;
    }>;
  }> {
    const session = this.sessions.get(uploadId);
    if (!session) {
      throw new Error('分片上传会话不存在');
    }

    const parts = Array.from(session.parts.values()).map(part => ({
      partNumber: part.partNumber,
      etag: part.etag,
      size: part.size,
      lastModified: part.uploadedAt,
    }));

    return { parts };
  }

  /**
   * 获取会话信息
   */
  getSession(uploadId: string): MultipartSession | undefined {
    return this.sessions.get(uploadId);
  }

  /**
   * 列出所有活跃会话
   */
  listActiveSessions(): MultipartSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * 清理会话
   */
  private async cleanupSession(uploadId: string): Promise<void> {
    const session = this.sessions.get(uploadId);
    if (!session) {
      return;
    }

    // 删除临时分片文件
    for (const partInfo of session.parts.values()) {
      try {
        await fs.unlink(partInfo.path);
      } catch (error) {
        console.warn('删除临时分片文件失败:', partInfo.path, error);
      }
    }

    // 移除会话
    this.sessions.delete(uploadId);
  }

  /**
   * 清理过期会话
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24小时

    for (const [uploadId, session] of this.sessions.entries()) {
      const age = now.getTime() - session.lastAccessed.getTime();

      if (age > maxAge) {
        this.cleanupSession(uploadId).catch(error => {
          console.warn('清理过期会话失败:', uploadId, error);
        });
      }
    }
  }

  /**
   * 获取分片上传统计信息
   */
  getStats(): {
    activeSessions: number;
    totalParts: number;
    totalSize: number;
  } {
    let totalParts = 0;
    let totalSize = 0;

    for (const session of this.sessions.values()) {
      totalParts += session.parts.size;

      for (const part of session.parts.values()) {
        totalSize += part.size;
      }
    }

    return {
      activeSessions: this.sessions.size,
      totalParts,
      totalSize,
    };
  }

  /**
   * 强制清理所有会话
   */
  async forceCleanupAllSessions(): Promise<void> {
    const uploadIds = Array.from(this.sessions.keys());

    for (const uploadId of uploadIds) {
      await this.cleanupSession(uploadId);
    }
  }
}
