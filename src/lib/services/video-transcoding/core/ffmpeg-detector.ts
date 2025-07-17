/**
 * @fileoverview FFmpeg检测器 - CoserEden平台
 * @description 负责检测和配置FFmpeg和FFprobe路径
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { spawn } from 'child_process';
import type {
  IFFmpegDetector,
  FFmpegPaths,
} from './transcoding-types';

/**
 * FFmpeg检测器类
 * 负责检测和配置FFmpeg和FFprobe路径
 */
export class FFmpegDetector extends EventEmitter implements IFFmpegDetector {
  private ffmpegPath: string | null = null;
  private ffprobePath: string | null = null;
  private initialized = false;

  constructor() {
    super();
  }

  /**
   * 检测FFmpeg路径
   */
  public detectFFmpegPath(): string | null {
    console.log('🔍 开始检测FFmpeg路径...');

    const possiblePaths = this.getFFmpegPossiblePaths();

    for (const possiblePath of possiblePaths) {
      if (possiblePath === 'ffmpeg') {
        // 系统路径，不检查文件存在性
        console.log('🔧 使用系统FFmpeg路径:', possiblePath);
        this.ffmpegPath = possiblePath;
        return possiblePath;
      }

      try {
        if (fs.existsSync(possiblePath)) {
          console.log('✅ 找到FFmpeg路径:', possiblePath);
          this.ffmpegPath = possiblePath;
          return possiblePath;
        }
      } catch (error) {
        // 忽略检查错误，继续下一个路径
        console.debug(`路径检查失败: ${possiblePath}`, error);
      }
    }

    console.warn('⚠️ 未找到FFmpeg，将使用系统FFmpeg');
    this.ffmpegPath = 'ffmpeg';
    return 'ffmpeg';
  }

  /**
   * 检测FFprobe路径
   */
  public detectFFprobePath(): string | null {
    console.log('🔍 开始检测FFprobe路径...');

    const possiblePaths = this.getFFprobePossiblePaths();

    for (const possiblePath of possiblePaths) {
      if (possiblePath === 'ffprobe') {
        // 系统路径，不检查文件存在性
        console.log('🔧 使用系统FFprobe路径:', possiblePath);
        this.ffprobePath = possiblePath;
        return possiblePath;
      }

      try {
        if (fs.existsSync(possiblePath)) {
          console.log('✅ 找到FFprobe路径:', possiblePath);
          this.ffprobePath = possiblePath;
          return possiblePath;
        }
      } catch (error) {
        // 忽略检查错误，继续下一个路径
        console.debug(`路径检查失败: ${possiblePath}`, error);
      }
    }

    console.warn('⚠️ 未找到FFprobe，将使用系统FFprobe');
    this.ffprobePath = 'ffprobe';
    return 'ffprobe';
  }

  /**
   * 验证路径是否有效
   */
  public validatePaths(): boolean {
    if (!this.initialized) {
      this.detectFFmpegPath();
      this.detectFFprobePath();
      this.initialized = true;
    }

    try {
      // 设置FFmpeg路径
      if (this.ffmpegPath) {
        ffmpeg.setFfmpegPath(this.ffmpegPath);
        console.log('🔧 FFmpeg路径已设置:', this.ffmpegPath);
      }

      if (this.ffprobePath) {
        ffmpeg.setFfprobePath(this.ffprobePath);
        console.log('🔧 FFprobe路径已设置:', this.ffprobePath);
      }

      console.log('✅ FFmpeg和FFprobe路径验证完成');
      return true;

    } catch (error) {
      console.error('❌ FFmpeg路径验证失败:', error);
      return false;
    }
  }

  /**
   * 获取当前路径配置
   */
  public getPaths(): FFmpegPaths {
    return {
      ffmpegPath: this.ffmpegPath,
      ffprobePath: this.ffprobePath,
    };
  }

  /**
   * 重新检测路径
   */
  public redetect(): FFmpegPaths {
    this.initialized = false;
    this.ffmpegPath = null;
    this.ffprobePath = null;

    this.detectFFmpegPath();
    this.detectFFprobePath();
    this.validatePaths();

    return this.getPaths();
  }

  /**
   * 手动设置路径
   */
  public setPaths(ffmpegPath: string, ffprobePath: string): void {
    this.ffmpegPath = ffmpegPath;
    this.ffprobePath = ffprobePath;
    this.initialized = true;
    this.validatePaths();
  }

  // 私有方法

  private getFFmpegPossiblePaths(): string[] {
    return [
      // 直接构建node_modules路径
      path.join(process.cwd(), 'node_modules/ffmpeg-static/ffmpeg'),

      // 尝试require但捕获错误
      this.tryRequireFFmpegStatic(),

      // 其他可能的路径
      path.join(__dirname, '../../../node_modules/ffmpeg-static/ffmpeg'),
      path.join(__dirname, '../../../../node_modules/ffmpeg-static/ffmpeg'),
      path.join(__dirname, '../../../../../node_modules/ffmpeg-static/ffmpeg'),

      // 系统路径（最后尝试）
      'ffmpeg',
    ].filter(Boolean) as string[];
  }

  private getFFprobePossiblePaths(): string[] {
    const platform = os.platform();
    const arch = os.arch();
    const extension = platform === 'win32' ? '.exe' : '';

    const basePaths = [
      // 开发环境路径（最优先）
      path.join(process.cwd(), 'node_modules', 'ffprobe-static', 'bin', platform, arch, `ffprobe${extension}`),

      // 尝试require但捕获错误
      this.tryRequireFFprobeStatic(),

      // 其他可能的路径
      path.join(__dirname, '../../../node_modules/ffprobe-static/bin', platform, arch, `ffprobe${extension}`),
      path.join(__dirname, '../../../../node_modules/ffprobe-static/bin', platform, arch, `ffprobe${extension}`),
      path.join(__dirname, '../../../../../node_modules/ffprobe-static/bin', platform, arch, `ffprobe${extension}`),

      // 通用Linux路径（兼容性）
      path.join(process.cwd(), 'node_modules/ffprobe-static/bin/linux/x64/ffprobe'),

      // 系统路径（最后尝试）
      'ffprobe',
    ].filter(Boolean) as string[];

    return basePaths;
  }

  private tryRequireFFmpegStatic(): string | null {
    try {
      return ffmpegStatic || null;
    } catch (error) {
      console.debug('ffmpeg-static包未找到或加载失败');
      return null;
    }
  }

  private tryRequireFFprobeStatic(): string | null {
    try {

      // 检查路径是否在.next目录中（避免Next.js构建问题）
      if (ffprobeStatic?.path && !ffprobeStatic.path.includes('.next')) {
        return ffprobeStatic.path;
      }

      return null;
    } catch (error) {
      console.debug('ffprobe-static包未找到或加载失败');
      return null;
    }
  }

  /**
   * 获取系统信息用于调试
   */
  public getSystemInfo(): {
    platform: string;
    arch: string;
    nodeVersion: string;
    cwd: string;
  } {
    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      cwd: process.cwd(),
    };
  }

  /**
   * 测试FFmpeg是否可用
   */
  public async testFFmpeg(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.ffmpegPath) {
        resolve(false);
        return;
      }

      try {
        // 简单的FFmpeg版本检查
        const ffmpegProcess = spawn(this.ffmpegPath, ['-version']);

        ffmpegProcess.on('close', (code: number) => {
          resolve(code === 0);
        });

        ffmpegProcess.on('error', () => {
          resolve(false);
        });

        // 超时处理
        setTimeout(() => {
          ffmpegProcess.kill();
          resolve(false);
        }, 5000);

      } catch (error) {
        resolve(false);
      }
    });
  }

  /**
   * 测试FFprobe是否可用
   */
  public async testFFprobe(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.ffprobePath) {
        resolve(false);
        return;
      }

      try {
        // 简单的FFprobe版本检查
        const ffprobeProcess = spawn(this.ffprobePath, ['-version']);

        ffprobeProcess.on('close', (code: number) => {
          resolve(code === 0);
        });

        ffprobeProcess.on('error', () => {
          resolve(false);
        });

        // 超时处理
        setTimeout(() => {
          ffprobeProcess.kill();
          resolve(false);
        }, 5000);

      } catch (error) {
        resolve(false);
      }
    });
  }
}
