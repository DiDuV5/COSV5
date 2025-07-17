/**
 * @fileoverview 转码处理器
 * @description 执行视频转码的核心处理器
 */

import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import {
  type TranscodingTask,
  type TranscodingConfig,
  type TranscodingResult,
  type TranscodingProgress,
  type VideoMetadata,
  validateFilePath,
  formatDuration,
  calculateCompressionRatio,
} from '../types/transcoding-types';

/**
 * 转码处理器
 */
export class TranscodingProcessor extends EventEmitter {
  private activeProcesses = new Map<string, ChildProcess>();

  /**
   * 转码视频
   */
  async transcodeVideo(task: TranscodingTask): Promise<TranscodingResult> {
    const startTime = Date.now();

    try {
      // 验证输入文件
      await this.validateInputFile(task.inputPath);

      // 确保输出目录存在
      await this.ensureOutputDirectory(task.outputPath);

      // 构建FFmpeg命令
      const ffmpegArgs = this.buildFFmpegArgs(task);

      // 执行转码
      const result = await this.executeTranscoding(task, ffmpegArgs);

      // 验证输出文件
      await this.validateOutputFile(task.outputPath);

      // 计算处理时间和压缩比
      const processingTime = Date.now() - startTime;
      const originalStats = await fs.stat(task.inputPath);
      const compressedStats = await fs.stat(task.outputPath);
      const compressionRatio = calculateCompressionRatio(originalStats.size, compressedStats.size);

      return {
        success: true,
        outputPath: task.outputPath,
        originalSize: originalStats.size,
        compressedSize: compressedStats.size,
        compressionRatio,
        processingTime,
        metadata: result.metadata,
      };

    } catch (error) {
      // 清理失败的输出文件
      await this.cleanupFailedOutput(task.outputPath);

      return {
        success: false,
        error: error instanceof Error ? error.message : '转码失败',
        processingTime: Date.now() - startTime,
      };
    } finally {
      // 清理活跃进程记录
      this.activeProcesses.delete(task.id);
    }
  }

  /**
   * 构建FFmpeg参数
   */
  private buildFFmpegArgs(task: TranscodingTask): string[] {
    const { inputPath, outputPath, config } = task;
    const args: string[] = [];

    // 输入文件
    args.push('-i', inputPath);

    // 硬件加速
    if (config.enableHardwareAcceleration) {
      args.push('-hwaccel', 'auto');
    }

    // 视频编码器
    switch (config.videoCodec) {
      case 'h264':
        args.push('-c:v', config.enableHardwareAcceleration ? 'h264_nvenc' : 'libx264');
        break;
      case 'h265':
        args.push('-c:v', config.enableHardwareAcceleration ? 'hevc_nvenc' : 'libx265');
        break;
      case 'vp9':
        args.push('-c:v', 'libvpx-vp9');
        break;
    }

    // 音频编码器
    switch (config.audioCodec) {
      case 'aac':
        args.push('-c:a', 'aac');
        break;
      case 'mp3':
        args.push('-c:a', 'libmp3lame');
        break;
      case 'opus':
        args.push('-c:a', 'libopus');
        break;
    }

    // 分辨率
    if (config.resolution) {
      args.push('-s', `${config.resolution.width}x${config.resolution.height}`);
    }

    // 比特率
    if (config.bitrate) {
      args.push('-b:v', `${config.bitrate}`);
    }

    // 帧率
    if (config.frameRate) {
      args.push('-r', config.frameRate.toString());
    }

    // 质量设置
    this.addQualitySettings(args, config);

    // 自定义选项
    if (config.customOptions) {
      args.push(...config.customOptions);
    }

    // 输出格式
    args.push('-f', config.outputFormat);

    // 覆盖输出文件
    args.push('-y');

    // 输出文件
    args.push(outputPath);

    return args;
  }

  /**
   * 添加质量设置
   */
  private addQualitySettings(args: string[], config: TranscodingConfig): void {
    switch (config.quality) {
      case 'low':
        args.push('-preset', 'ultrafast', '-crf', '28');
        break;
      case 'medium':
        args.push('-preset', 'medium', '-crf', '23');
        break;
      case 'high':
        args.push('-preset', 'slow', '-crf', '18');
        break;
      case 'ultra':
        args.push('-preset', 'veryslow', '-crf', '15');
        break;
    }
  }

  /**
   * 执行转码
   */
  private async executeTranscoding(
    task: TranscodingTask,
    ffmpegArgs: string[]
  ): Promise<{ metadata?: VideoMetadata }> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', ffmpegArgs);

      // 记录活跃进程
      this.activeProcesses.set(task.id, ffmpeg);

      let stderr = '';
      let duration = 0;

      ffmpeg.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;

        // 解析进度信息
        const progress = this.parseProgress(output, duration);
        if (progress) {
          this.emit('progress', {
            taskId: task.id,
            ...progress,
          } as TranscodingProgress);
        }

        // 提取总时长
        const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        if (durationMatch) {
          const [, hours, minutes, seconds] = durationMatch;
          duration = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
        }
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve({});
        } else {
          reject(new Error(`FFmpeg 进程失败，退出码: ${code}\n错误信息: ${stderr}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`启动 FFmpeg 失败: ${error.message}`));
      });
    });
  }

  /**
   * 解析进度信息
   */
  private parseProgress(output: string, totalDuration: number): Partial<TranscodingProgress> | null {
    const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    const fpsMatch = output.match(/fps=\s*(\d+\.?\d*)/);
    const bitrateMatch = output.match(/bitrate=\s*(\S+)/);
    const speedMatch = output.match(/speed=\s*(\S+)/);

    if (!timeMatch) return null;

    const [, hours, minutes, seconds] = timeMatch;
    const currentTime = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);

    const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
    const fps = fpsMatch ? parseFloat(fpsMatch[1]) : 0;
    const bitrate = bitrateMatch ? bitrateMatch[1] : '';
    const speed = speedMatch ? speedMatch[1] : '';

    // 计算预计剩余时间
    const eta = totalDuration > 0 && currentTime > 0
      ? formatDuration((totalDuration - currentTime) * (totalDuration / currentTime))
      : '';

    return {
      progress: Math.min(100, Math.max(0, progress)),
      currentTime,
      totalTime: totalDuration,
      fps,
      bitrate,
      speed,
      eta,
    };
  }

  /**
   * 取消转码任务
   */
  async cancelTask(taskId: string): Promise<void> {
    const process = this.activeProcesses.get(taskId);
    if (process) {
      process.kill('SIGTERM');

      // 等待进程结束
      await new Promise<void>((resolve) => {
        process.on('close', () => resolve());

        // 强制终止超时
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL');
          }
          resolve();
        }, 5000);
      });

      this.activeProcesses.delete(taskId);
    }
  }

  /**
   * 暂停转码任务
   */
  pauseTask(taskId: string): void {
    const process = this.activeProcesses.get(taskId);
    if (process) {
      process.kill('SIGSTOP');
    }
  }

  /**
   * 恢复转码任务
   */
  resumeTask(taskId: string): void {
    const process = this.activeProcesses.get(taskId);
    if (process) {
      process.kill('SIGCONT');
    }
  }

  /**
   * 验证输入文件
   */
  private async validateInputFile(filePath: string): Promise<void> {
    validateFilePath(filePath);

    try {
      const stats = await fs.stat(filePath);

      if (!stats.isFile()) {
        throw new Error('输入路径不是文件');
      }

      if (stats.size === 0) {
        throw new Error('输入文件为空');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new Error('输入文件不存在');
      }
      throw error;
    }
  }

  /**
   * 确保输出目录存在
   */
  private async ensureOutputDirectory(outputPath: string): Promise<void> {
    const outputDir = path.dirname(outputPath);

    try {
      await fs.access(outputDir);
    } catch {
      await fs.mkdir(outputDir, { recursive: true });
    }
  }

  /**
   * 验证输出文件
   */
  private async validateOutputFile(outputPath: string): Promise<void> {
    try {
      const stats = await fs.stat(outputPath);

      if (stats.size === 0) {
        throw new Error('转码后的文件为空');
      }

      console.log('✅ 转码验证通过:', {
        size: `${(stats.size / 1024 / 1024).toFixed(2)}MB`,
        path: outputPath,
      });
    } catch (error) {
      throw new Error(`转码验证失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 清理失败的输出文件
   */
  private async cleanupFailedOutput(outputPath: string): Promise<void> {
    try {
      await fs.unlink(outputPath);
    } catch {
      // 忽略清理错误
    }
  }

  /**
   * 获取活跃任务数量
   */
  getActiveTaskCount(): number {
    return this.activeProcesses.size;
  }

  /**
   * 获取活跃任务列表
   */
  getActiveTasks(): string[] {
    return Array.from(this.activeProcesses.keys());
  }

  /**
   * 强制终止所有任务
   */
  async terminateAllTasks(): Promise<void> {
    const promises = Array.from(this.activeProcesses.keys()).map(taskId =>
      this.cancelTask(taskId)
    );

    await Promise.all(promises);
  }
}
