/**
 * @fileoverview 文件哈希计算器
 * @description 负责计算文件的哈希值，用于去重检测
 */

import crypto from 'crypto';
import { promises as fs } from 'fs';

/**
 * 文件哈希计算器类
 */
export class HashCalculator {
  /**
   * 计算文件的SHA-256哈希值
   */
  public static async calculateFileHash(filePath: string): Promise<string> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      return this.calculateBufferHash(fileBuffer);
    } catch (error) {
      console.error('计算文件哈希失败:', error);
      throw new Error(`计算文件哈希失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 计算Buffer的SHA-256哈希值
   */
  public static calculateBufferHash(buffer: Buffer): string {
    try {
      const hash = crypto.createHash('sha256');
      hash.update(buffer);
      return hash.digest('hex');
    } catch (error) {
      console.error('计算Buffer哈希失败:', error);
      throw new Error(`计算Buffer哈希失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 计算字符串的SHA-256哈希值
   */
  public static calculateStringHash(content: string): string {
    try {
      const hash = crypto.createHash('sha256');
      hash.update(content, 'utf8');
      return hash.digest('hex');
    } catch (error) {
      console.error('计算字符串哈希失败:', error);
      throw new Error(`计算字符串哈希失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 计算文件的MD5哈希值（用于快速比较）
   */
  public static calculateMD5Hash(buffer: Buffer): string {
    try {
      const hash = crypto.createHash('md5');
      hash.update(buffer);
      return hash.digest('hex');
    } catch (error) {
      console.error('计算MD5哈希失败:', error);
      throw new Error(`计算MD5哈希失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 验证哈希值格式是否正确
   */
  public static isValidHash(hash: string, algorithm: 'sha256' | 'md5' = 'sha256'): boolean {
    if (!hash || typeof hash !== 'string') {
      return false;
    }

    const expectedLength = algorithm === 'sha256' ? 64 : 32;
    const hexPattern = /^[a-f0-9]+$/i;

    return hash.length === expectedLength && hexPattern.test(hash);
  }

  /**
   * 比较两个哈希值是否相等
   */
  public static compareHashes(hash1: string, hash2: string): boolean {
    if (!hash1 || !hash2) {
      return false;
    }

    // 使用时间安全的比较方法，防止时序攻击
    return crypto.timingSafeEqual(
      Buffer.from(hash1, 'hex'),
      Buffer.from(hash2, 'hex')
    );
  }

  /**
   * 生成文件的多重哈希（SHA-256 + MD5）
   */
  public static calculateMultipleHashes(buffer: Buffer): {
    sha256: string;
    md5: string;
  } {
    return {
      sha256: this.calculateBufferHash(buffer),
      md5: this.calculateMD5Hash(buffer),
    };
  }

  /**
   * 计算文件的部分哈希（用于大文件的快速预检）
   */
  public static async calculatePartialHash(
    filePath: string, 
    options: {
      startBytes?: number;
      endBytes?: number;
      chunkSize?: number;
    } = {}
  ): Promise<string> {
    const {
      startBytes = 1024,      // 开头1KB
      endBytes = 1024,        // 结尾1KB
      chunkSize = 1024 * 1024 // 中间1MB
    } = options;

    try {
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      if (fileSize <= startBytes + endBytes) {
        // 文件太小，直接计算完整哈希
        return await this.calculateFileHash(filePath);
      }

      const hash = crypto.createHash('sha256');
      const fileHandle = await fs.open(filePath, 'r');

      try {
        // 读取开头部分
        const startBuffer = Buffer.alloc(startBytes);
        await fileHandle.read(startBuffer, 0, startBytes, 0);
        hash.update(startBuffer);

        // 读取中间部分（如果文件足够大）
        if (fileSize > startBytes + endBytes + chunkSize) {
          const middlePosition = Math.floor((fileSize - chunkSize) / 2);
          const middleBuffer = Buffer.alloc(chunkSize);
          await fileHandle.read(middleBuffer, 0, chunkSize, middlePosition);
          hash.update(middleBuffer);
        }

        // 读取结尾部分
        const endBuffer = Buffer.alloc(endBytes);
        await fileHandle.read(endBuffer, 0, endBytes, fileSize - endBytes);
        hash.update(endBuffer);

        return hash.digest('hex');

      } finally {
        await fileHandle.close();
      }

    } catch (error) {
      console.error('计算部分哈希失败:', error);
      throw new Error(`计算部分哈希失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 验证文件完整性
   */
  public static async verifyFileIntegrity(
    filePath: string, 
    expectedHash: string,
    algorithm: 'sha256' | 'md5' = 'sha256'
  ): Promise<boolean> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const actualHash = algorithm === 'sha256' 
        ? this.calculateBufferHash(fileBuffer)
        : this.calculateMD5Hash(fileBuffer);

      return this.compareHashes(actualHash, expectedHash);
    } catch (error) {
      console.error('验证文件完整性失败:', error);
      return false;
    }
  }
}
