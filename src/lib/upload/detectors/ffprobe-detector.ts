/**
 * @fileoverview FFprobe视频编码检测器
 * @description 使用FFprobe进行高精度视频编码检测
 * @author Augment AI
 * @date 2025-07-03
 */

import { VideoCodecInfo, FFprobeOutput, DetectorConfig } from '../types/video-codec-types';
import { 
  parseFramerate, 
  normalizeCodecName, 
  isH264Codec,
  isValidResolution,
  isValidBitrate,
  isValidFramerate
} from '../utils/video-codec-utils';

/**
 * FFprobe检测器类
 */
export class FFprobeDetector {
  private config: DetectorConfig;

  constructor(config: Partial<DetectorConfig> = {}) {
    this.config = {
      maxRetries: 2,
      timeoutMs: 10000,
      enableLogging: true,
      ...config
    };
  }

  /**
   * 使用FFprobe检测视频编码
   */
  async detectVideoCodec(videoBuffer: Buffer, filename: string): Promise<VideoCodecInfo> {
    if (this.config.enableLogging) {
      console.log(`🔍 FFprobe检测开始: ${filename}`);
    }

    const { spawn } = await import('child_process');
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');

    // 创建临时文件
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `temp_video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

    try {
      // 写入临时文件
      await fs.promises.writeFile(tempFilePath, videoBuffer);

      // 执行FFprobe
      const ffprobeOutput = await this.runFFprobe(tempFilePath);
      
      // 解析输出
      const codecInfo = this.parseFFprobeOutput(ffprobeOutput, filename);
      
      if (this.config.enableLogging) {
        console.log(`✅ FFprobe检测完成: ${filename}`, codecInfo);
      }
      
      return codecInfo;

    } catch (error) {
      if (this.config.enableLogging) {
        console.error(`❌ FFprobe检测失败: ${filename}`, error);
      }
      throw error;
    } finally {
      // 清理临时文件
      try {
        await fs.promises.unlink(tempFilePath);
      } catch (cleanupError) {
        if (this.config.enableLogging) {
          console.warn(`⚠️ 临时文件清理失败: ${tempFilePath}`, cleanupError);
        }
      }
    }
  }

  /**
   * 运行FFprobe命令
   */
  private async runFFprobe(filePath: string): Promise<FFprobeOutput> {
    const { spawn } = await import('child_process');

    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        '-select_streams', 'v:0', // 只选择第一个视频流
        filePath
      ]);

      let stdout = '';
      let stderr = '';

      ffprobe.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // 设置超时
      const timeout = setTimeout(() => {
        ffprobe.kill('SIGKILL');
        reject(new Error(`FFprobe超时 (${this.config.timeoutMs}ms)`));
      }, this.config.timeoutMs);

      ffprobe.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          try {
            const output = JSON.parse(stdout) as FFprobeOutput;
            resolve(output);
          } catch (parseError) {
            reject(new Error(`FFprobe输出解析失败: ${parseError}`));
          }
        } else {
          reject(new Error(`FFprobe执行失败 (退出码: ${code}): ${stderr}`));
        }
      });

      ffprobe.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`FFprobe启动失败: ${error.message}`));
      });
    });
  }

  /**
   * 解析FFprobe输出
   */
  private parseFFprobeOutput(output: FFprobeOutput, filename: string): VideoCodecInfo {
    if (!output.streams || output.streams.length === 0) {
      throw new Error('未找到视频流');
    }

    const videoStream = output.streams[0];
    if (!videoStream) {
      throw new Error('视频流信息无效');
    }

    // 提取基本信息
    const codec = videoStream.codec_name || 'unknown';
    const profile = videoStream.profile;
    const level = videoStream.level?.toString();
    const width = videoStream.width || 0;
    const height = videoStream.height || 0;
    
    // 解析时长
    let duration = 0;
    if (videoStream.duration) {
      duration = parseFloat(videoStream.duration);
    } else if (output.format?.duration) {
      duration = parseFloat(output.format.duration);
    }

    // 解析比特率
    let bitrate = 0;
    if (videoStream.bit_rate) {
      bitrate = parseInt(videoStream.bit_rate);
    } else if (output.format?.bit_rate) {
      bitrate = parseInt(output.format.bit_rate);
    }

    // 解析帧率
    let framerate = 0;
    if (videoStream.r_frame_rate) {
      framerate = parseFramerate(videoStream.r_frame_rate);
    } else if (videoStream.avg_frame_rate) {
      framerate = parseFramerate(videoStream.avg_frame_rate);
    }

    // 验证数据有效性
    const validatedWidth = isValidResolution(width, height) ? width : 0;
    const validatedHeight = isValidResolution(width, height) ? height : 0;
    const validatedBitrate = isValidBitrate(bitrate) ? bitrate : 0;
    const validatedFramerate = isValidFramerate(framerate) ? framerate : 0;

    // 判断编码类型
    const normalizedCodec = normalizeCodecName(codec);
    const isH264 = isH264Codec(codec);
    const isCompatible = isH264;

    if (this.config.enableLogging) {
      console.log(`📊 FFprobe解析结果:`, {
        codec: normalizedCodec,
        profile,
        level,
        resolution: `${validatedWidth}x${validatedHeight}`,
        duration: `${duration}s`,
        bitrate: `${validatedBitrate} bps`,
        framerate: `${validatedFramerate} fps`,
        isH264,
        isCompatible
      });
    }

    return {
      codec: normalizedCodec,
      profile,
      level,
      width: validatedWidth,
      height: validatedHeight,
      duration,
      bitrate: validatedBitrate,
      framerate: validatedFramerate,
      isH264,
      isCompatible
    };
  }

  /**
   * 检查FFprobe是否可用
   */
  async isFFprobeAvailable(): Promise<boolean> {
    try {
      const { spawn } = await import('child_process');
      
      return new Promise((resolve) => {
        const ffprobe = spawn('ffprobe', ['-version']);
        
        ffprobe.on('close', (code) => {
          resolve(code === 0);
        });
        
        ffprobe.on('error', () => {
          resolve(false);
        });
        
        // 超时检查
        setTimeout(() => {
          ffprobe.kill();
          resolve(false);
        }, 5000);
      });
    } catch (error) {
      return false;
    }
  }
}
