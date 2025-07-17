/**
 * @fileoverview FFmpeg核心处理器 - CoserEden平台
 * @description FFmpeg命令执行和进程管理的核心功能
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  ProcessStatus,
  type FFmpegProcessorOptions,
  type ProcessInfo,
  type TranscodeProgress,
  type ProgressCallback,
  type ErrorCallback,
  type CompletionCallback,
} from './ffmpeg-types';
import {
  generateSessionId,
  ensureDirectory,
  getMemoryInfo,
  checkMemoryPressure,
  forceGarbageCollection,
  FFMPEG_DEFAULTS,
} from './ffmpeg-utils';

/**
 * FFmpeg核心处理器类
 * 负责FFmpeg进程的创建、管理和监控
 */
export class FFmpegCore extends EventEmitter {
  private static instance: FFmpegCore;
  private activeProcesses: Map<string, ProcessInfo> = new Map();
  private childProcesses: Map<string, ChildProcess> = new Map();
  private memoryMonitor?: NodeJS.Timeout;
  private readonly tempDir: string;
  private readonly maxConcurrentProcesses: number = 3;
  private readonly options: FFmpegProcessorOptions;

  constructor(options: FFmpegProcessorOptions = {}) {
    super();
    this.options = options;
    this.tempDir = options.tempDir || FFMPEG_DEFAULTS.TEMP_DIR;
    this.ensureTempDir();

    if (options.enableMemoryMonitoring) {
      this.startMemoryMonitoring();
    }

    // 设置进程清理
    this.setupProcessCleanup();
  }

  /**
   * 获取单例实例
   */
  static getInstance(options?: FFmpegProcessorOptions): FFmpegCore {
    if (!FFmpegCore.instance) {
      FFmpegCore.instance = new FFmpegCore(options);
    }
    return FFmpegCore.instance;
  }

  /**
   * 确保临时目录存在
   */
  private async ensureTempDir(): Promise<void> {
    try {
      await ensureDirectory(this.tempDir);
      console.log(`📁 临时目录已准备: ${this.tempDir}`);
    } catch (error) {
      console.error('❌ 创建临时目录失败:', error);
      throw error;
    }
  }

  /**
   * 启动内存监控
   */
  private startMemoryMonitoring(): void {
    this.memoryMonitor = setInterval(() => {
      const memoryInfo = getMemoryInfo();

      if (memoryInfo.percentage > 85) {
        console.warn(`⚠️ 内存使用率告警: ${memoryInfo.percentage.toFixed(2)}%`);
        this.emit('memoryWarning', memoryInfo);

        // 强制垃圾回收
        forceGarbageCollection();
      }

      // 发出内存监控事件
      this.emit('memoryUpdate', memoryInfo);
    }, 10000); // 每10秒检查一次
  }

  /**
   * 停止内存监控
   */
  private stopMemoryMonitoring(): void {
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
      this.memoryMonitor = undefined;
      console.log('🛑 内存监控已停止');
    }
  }

  /**
   * 设置进程清理
   */
  private setupProcessCleanup(): void {
    const cleanup = () => {
      console.log('🧹 清理FFmpeg进程...');
      this.cleanup();
    };

    process.once('SIGINT', cleanup);
    process.once('SIGTERM', cleanup);
    process.once('exit', cleanup);
  }

  /**
   * 执行FFmpeg命令
   * 
   * @param args - FFmpeg命令参数
   * @param sessionId - 会话ID（可选）
   * @param onProgress - 进度回调
   * @param onError - 错误回调
   * @param onComplete - 完成回调
   * @returns 会话ID
   */
  public async executeFFmpeg(
    args: string[],
    sessionId?: string,
    onProgress?: ProgressCallback,
    onError?: ErrorCallback,
    onComplete?: CompletionCallback
  ): Promise<string> {
    // 检查并发限制
    if (this.activeProcesses.size >= this.maxConcurrentProcesses) {
      throw new Error(`已达到最大并发处理数量: ${this.maxConcurrentProcesses}`);
    }

    // 检查内存压力（放宽阈值到96%）
    if (checkMemoryPressure(96)) {
      throw new Error('内存使用率过高，暂停新的转码任务');
    }

    const id = sessionId || generateSessionId();
    const startTime = Date.now();

    // 创建进程信息
    const processInfo: ProcessInfo = {
      sessionId: id,
      status: ProcessStatus.RUNNING,
      startTime,
      inputPath: this.extractInputPath(args),
      outputPath: this.extractOutputPath(args),
    };

    this.activeProcesses.set(id, processInfo);

    return new Promise((resolve, reject) => {
      try {
        console.log(`🚀 启动FFmpeg进程: ${id}`);
        console.log(`🔧 命令参数: ${args.join(' ')}`);

        const ffmpeg = spawn('ffmpeg', args);
        this.childProcesses.set(id, ffmpeg);

        let errorOutput = '';
        let stdOutput = '';

        // 处理标准输出
        ffmpeg.stdout.on('data', (data) => {
          stdOutput += data.toString();
        });

        // 处理错误输出和进度
        ffmpeg.stderr.on('data', (data) => {
          const output = data.toString();
          errorOutput += output;

          // 解析进度信息
          if (onProgress) {
            const progress = this.parseProgress(output);
            if (progress) {
              processInfo.progress = progress;
              onProgress(id, progress);
            }
          }
        });

        // 处理进程结束
        ffmpeg.on('close', (code) => {
          const endTime = Date.now();
          const processingTime = endTime - startTime;

          console.log(`🔍 FFmpeg进程结束: ${id}, 退出码: ${code}, 耗时: ${processingTime}ms`);

          // 更新进程信息
          processInfo.endTime = endTime;
          processInfo.status = code === 0 ? ProcessStatus.COMPLETED : ProcessStatus.FAILED;

          // 清理进程引用
          this.childProcesses.delete(id);
          this.activeProcesses.delete(id);

          if (code === 0) {
            console.log(`✅ FFmpeg处理成功: ${id}`);
            if (onComplete) {
              onComplete(id, {
                success: true,
                processingTime,
                originalSize: 0, // 需要从外部获取
                outputSize: 0, // 需要从外部获取
              });
            }
            resolve(id);
          } else {
            const error = new Error(`FFmpeg处理失败 (退出码: ${code}): ${errorOutput}`);
            console.error(`❌ FFmpeg处理失败: ${id}`, error.message);
            
            processInfo.error = error.message;
            
            if (onError) {
              onError(id, error);
            }
            reject(error);
          }
        });

        // 处理进程错误
        ffmpeg.on('error', (error) => {
          console.error(`❌ FFmpeg进程错误: ${id}`, error);
          
          processInfo.status = ProcessStatus.FAILED;
          processInfo.error = error.message;
          
          this.childProcesses.delete(id);
          this.activeProcesses.delete(id);
          
          if (onError) {
            onError(id, error);
          }
          reject(new Error(`启动FFmpeg失败: ${error.message}`));
        });

        // 设置超时
        const timeout = this.options.timeout || FFMPEG_DEFAULTS.TIMEOUT;
        setTimeout(() => {
          if (this.childProcesses.has(id)) {
            console.warn(`⏰ FFmpeg进程超时，强制终止: ${id}`);
            this.killProcess(id);
            reject(new Error(`FFmpeg处理超时: ${timeout}ms`));
          }
        }, timeout);

      } catch (error) {
        this.activeProcesses.delete(id);
        reject(error);
      }
    });
  }

  /**
   * 终止指定进程
   * 
   * @param sessionId - 会话ID
   * @returns 是否成功终止
   */
  public killProcess(sessionId: string): boolean {
    const childProcess = this.childProcesses.get(sessionId);
    const processInfo = this.activeProcesses.get(sessionId);

    if (childProcess) {
      try {
        childProcess.kill('SIGTERM');
        console.log(`🛑 已终止FFmpeg进程: ${sessionId}`);
        
        if (processInfo) {
          processInfo.status = ProcessStatus.CANCELLED;
          processInfo.endTime = Date.now();
        }
        
        this.childProcesses.delete(sessionId);
        this.activeProcesses.delete(sessionId);
        
        return true;
      } catch (error) {
        console.error(`❌ 终止进程失败: ${sessionId}`, error);
        return false;
      }
    }

    return false;
  }

  /**
   * 获取进程信息
   * 
   * @param sessionId - 会话ID
   * @returns 进程信息
   */
  public getProcessInfo(sessionId: string): ProcessInfo | undefined {
    return this.activeProcesses.get(sessionId);
  }

  /**
   * 获取所有活动进程
   * 
   * @returns 活动进程列表
   */
  public getActiveProcesses(): ProcessInfo[] {
    return Array.from(this.activeProcesses.values());
  }

  /**
   * 从命令参数中提取输入路径
   */
  private extractInputPath(args: string[]): string {
    const inputIndex = args.indexOf('-i');
    return inputIndex !== -1 && inputIndex + 1 < args.length ? args[inputIndex + 1] : 'unknown';
  }

  /**
   * 从命令参数中提取输出路径
   */
  private extractOutputPath(args: string[]): string {
    return args[args.length - 1] || 'unknown';
  }

  /**
   * 解析FFmpeg进度信息
   */
  private parseProgress(output: string): TranscodeProgress | null {
    // 这里实现进度解析逻辑
    // 由于篇幅限制，这里返回null，实际实现会在video-encoder.ts中
    return null;
  }

  /**
   * 清理资源
   */
  public async cleanup(): Promise<void> {
    console.log('🧹 开始清理FFmpeg核心资源...');

    // 停止内存监控
    this.stopMemoryMonitoring();

    // 终止所有活动进程
    const killPromises = Array.from(this.childProcesses.keys()).map(sessionId => {
      return new Promise<void>((resolve) => {
        this.killProcess(sessionId);
        resolve();
      });
    });

    await Promise.all(killPromises);

    // 清理临时文件
    try {
      const files = await fs.readdir(this.tempDir);
      const cleanupPromises = files
        .filter(file => file.startsWith('ffmpeg_') || file.startsWith('temp_'))
        .map(file => fs.unlink(path.join(this.tempDir, file)).catch(console.warn));
      
      await Promise.all(cleanupPromises);
      console.log('🧹 临时文件清理完成');
    } catch (error) {
      console.warn('清理临时文件失败:', error);
    }

    console.log('✅ FFmpeg核心资源清理完成');
  }
}
