/**
 * @fileoverview 视频兼容性检测和处理工具
 * @description 检测视频编码格式，自动转码为H.264以确保浏览器兼容性
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @features
 * - 视频编码格式检测
 * - 自动H.264转码
 * - 浏览器兼容性检查
 * - 转码进度监控
 * - 批量处理支持
 *
 * @dependencies
 * - ffprobe (FFmpeg工具)
 * - ffmpeg (转码工具)
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

export interface VideoCodecInfo {
  codec: string;
  profile?: string;
  level?: string;
  isH264: boolean;
  isCompatible: boolean;
  needsTranscoding: boolean;
  width: number;
  height: number;
  duration: number;
  bitrate: number;
  fps: number;
}

export interface TranscodingProgress {
  percentage: number;
  currentTime: string;
  speed: string;
  eta: string;
}

/**
 * 检测视频编码信息
 */
export async function detectVideoCodec(videoPath: string): Promise<VideoCodecInfo> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      videoPath
    ]);

    let output = '';
    let error = '';

    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      error += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`FFprobe failed: ${error}`));
        return;
      }

      try {
        const info = JSON.parse(output);
        const videoStream = info.streams.find((stream: any) => stream.codec_type === 'video');
        
        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        const codec = videoStream.codec_name.toLowerCase();
        const profile = videoStream.profile?.toLowerCase();
        const level = videoStream.level;
        
        // 检查是否为H.264
        const isH264 = codec === 'h264';
        
        // 检查兼容性
        const isCompatible = isH264 && (
          !profile || 
          profile.includes('baseline') || 
          profile.includes('main') || 
          profile.includes('high')
        );

        const codecInfo: VideoCodecInfo = {
          codec,
          profile,
          level: level?.toString(),
          isH264,
          isCompatible,
          needsTranscoding: !isCompatible,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          duration: parseFloat(info.format.duration) || 0,
          bitrate: parseInt(info.format.bit_rate) || 0,
          fps: eval(videoStream.r_frame_rate) || 0
        };

        resolve(codecInfo);
      } catch (parseError) {
        reject(new Error(`Failed to parse FFprobe output: ${parseError}`));
      }
    });

    ffprobe.on('error', (err) => {
      reject(new Error(`FFprobe spawn failed: ${err.message}`));
    });
  });
}

/**
 * 转码视频为H.264格式
 */
export async function transcodeToH264(
  inputPath: string,
  outputPath: string,
  onProgress?: (progress: TranscodingProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    // 构建FFmpeg命令参数
    const args = [
      '-i', inputPath,
      '-c:v', 'libx264',           // 使用H.264编码器
      '-profile:v', 'baseline',     // 使用baseline profile确保最大兼容性
      '-level', '3.0',              // 设置level 3.0
      '-preset', 'medium',          // 平衡速度和质量
      '-crf', '23',                 // 恒定质量因子
      '-c:a', 'aac',                // 音频使用AAC编码
      '-b:a', '128k',               // 音频比特率
      '-movflags', '+faststart',    // 优化网络播放
      '-pix_fmt', 'yuv420p',        // 确保兼容性的像素格式
      '-y',                         // 覆盖输出文件
      outputPath
    ];

    console.log('开始H.264转码:', { inputPath, outputPath });
    
    const ffmpeg = spawn('ffmpeg', args);
    let error = '';

    ffmpeg.stderr.on('data', (data) => {
      const output = data.toString();
      error += output;

      // 解析转码进度
      if (onProgress) {
        const timeMatch = output.match(/time=(\d+:\d+:\d+\.\d+)/);
        const speedMatch = output.match(/speed=\s*(\d+\.?\d*)x/);
        
        if (timeMatch) {
          const currentTime = timeMatch[1];
          const speed = speedMatch ? speedMatch[1] + 'x' : 'N/A';
          
          // 这里可以计算百分比，需要知道总时长
          onProgress({
            percentage: 0, // 需要根据总时长计算
            currentTime,
            speed,
            eta: 'N/A'
          });
        }
      }
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('H.264转码完成:', outputPath);
        resolve();
      } else {
        console.error('H.264转码失败:', error);
        reject(new Error(`FFmpeg transcoding failed (exit code: ${code}): ${error}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`FFmpeg spawn failed: ${err.message}`));
    });
  });
}

/**
 * 生成转码后的文件名
 */
export function generateTranscodedFilename(originalPath: string): string {
  const ext = path.extname(originalPath);
  const basename = path.basename(originalPath, ext);
  const dirname = path.dirname(originalPath);
  
  return path.join(dirname, `${basename}_h264.mp4`);
}

/**
 * 检查文件是否已经转码
 */
export async function isAlreadyTranscoded(filePath: string): Promise<boolean> {
  try {
    const codecInfo = await detectVideoCodec(filePath);
    return codecInfo.isCompatible;
  } catch (error) {
    console.error('检查转码状态失败:', error);
    return false;
  }
}

/**
 * 批量检查和转码视频文件
 */
export async function batchTranscodeVideos(
  videoPaths: string[],
  outputDir: string,
  onProgress?: (current: number, total: number, currentFile: string) => void
): Promise<{ success: string[], failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];

  for (let i = 0; i < videoPaths.length; i++) {
    const videoPath = videoPaths[i];
    const filename = path.basename(videoPath);
    
    try {
      onProgress?.(i + 1, videoPaths.length, filename);
      
      // 检查是否需要转码
      const codecInfo = await detectVideoCodec(videoPath);
      
      if (codecInfo.needsTranscoding) {
        const outputPath = path.join(outputDir, generateTranscodedFilename(filename));
        await transcodeToH264(videoPath, outputPath);
        success.push(outputPath);
      } else {
        console.log(`视频已兼容，跳过转码: ${filename}`);
        success.push(videoPath);
      }
    } catch (error) {
      console.error(`转码失败: ${filename}`, error);
      failed.push(videoPath);
    }
  }

  return { success, failed };
}

/**
 * 获取推荐的转码设置
 */
export function getRecommendedTranscodeSettings(codecInfo: VideoCodecInfo) {
  const settings = {
    codec: 'libx264',
    profile: 'baseline',
    level: '3.0',
    preset: 'medium',
    crf: 23
  };

  // 根据原始视频调整设置
  if (codecInfo.width > 1920 || codecInfo.height > 1080) {
    settings.crf = 25; // 高分辨率使用稍高的CRF
    settings.preset = 'slow'; // 更好的压缩
  }

  if (codecInfo.bitrate > 10000000) { // 10Mbps
    settings.crf = 26; // 高比特率原视频使用更高CRF
  }

  return settings;
}

/**
 * 验证转码结果
 */
export async function validateTranscodedVideo(videoPath: string): Promise<boolean> {
  try {
    const codecInfo = await detectVideoCodec(videoPath);
    return codecInfo.isH264 && codecInfo.isCompatible;
  } catch (error) {
    console.error('验证转码结果失败:', error);
    return false;
  }
}
