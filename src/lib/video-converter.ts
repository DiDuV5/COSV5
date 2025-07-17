/**
 * @fileoverview 视频转码工具
 * @description 使用 FFmpeg 将 H.265/HEVC 视频转码为 H.264 以提高浏览器兼容性
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - ffmpeg (系统依赖)
 * - child_process (Node.js 内置)
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

export interface VideoInfo {
  codec: string;
  width: number;
  height: number;
  duration: number;
  bitrate: number;
  fps: number;
  isCompatible: boolean;
}

export interface ConversionOptions {
  outputCodec?: 'h264' | 'h265';
  quality?: 'high' | 'medium' | 'low';
  maxWidth?: number;
  maxHeight?: number;
  targetBitrate?: string;
  preserveAudio?: boolean;
}

/**
 * 获取视频信息
 */
export async function getVideoInfo(filePath: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
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
        reject(new Error(`FFprobe 执行失败: ${error}`));
        return;
      }

      try {
        const info = JSON.parse(output);
        const videoStream = info.streams.find((s: any) => s.codec_type === 'video');
        
        if (!videoStream) {
          reject(new Error('未找到视频流'));
          return;
        }

        const videoInfo: VideoInfo = {
          codec: videoStream.codec_name,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          duration: parseFloat(videoStream.duration || info.format.duration || '0'),
          bitrate: parseInt(videoStream.bit_rate || info.format.bit_rate || '0'),
          fps: eval(videoStream.r_frame_rate || '0/1'),
          isCompatible: ['h264', 'avc1'].includes(videoStream.codec_name.toLowerCase())
        };

        resolve(videoInfo);
      } catch (parseError) {
        reject(new Error(`解析视频信息失败: ${parseError}`));
      }
    });
  });
}

/**
 * 检查 FFmpeg 是否可用
 */
export async function checkFFmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', ['-version']);
    
    ffmpeg.on('close', (code) => {
      resolve(code === 0);
    });

    ffmpeg.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * 转码视频为浏览器兼容格式
 */
export async function convertVideoForWeb(
  inputPath: string,
  outputPath: string,
  options: ConversionOptions = {}
): Promise<void> {
  const {
    outputCodec = 'h264',
    quality = 'medium',
    maxWidth = 1920,
    maxHeight = 1080,
    targetBitrate,
    preserveAudio = true
  } = options;

  // 构建 FFmpeg 参数
  const args = [
    '-i', inputPath,
    '-c:v', 'libx264', // 使用 H.264 编码器
    '-preset', quality === 'high' ? 'slow' : quality === 'medium' ? 'medium' : 'fast',
    '-crf', quality === 'high' ? '18' : quality === 'medium' ? '23' : '28',
  ];

  // 添加分辨率限制
  if (maxWidth && maxHeight) {
    args.push('-vf', `scale='min(${maxWidth},iw)':'min(${maxHeight},ih)':force_original_aspect_ratio=decrease`);
  }

  // 添加比特率限制
  if (targetBitrate) {
    args.push('-b:v', targetBitrate);
    args.push('-maxrate', targetBitrate);
    args.push('-bufsize', `${parseInt(targetBitrate) * 2}k`);
  }

  // 音频处理
  if (preserveAudio) {
    args.push('-c:a', 'aac', '-b:a', '128k');
  } else {
    args.push('-an'); // 移除音频
  }

  // 输出设置
  args.push(
    '-movflags', '+faststart', // 优化网络播放
    '-pix_fmt', 'yuv420p', // 确保兼容性
    '-y', // 覆盖输出文件
    outputPath
  );

  return new Promise((resolve, reject) => {
    console.log('开始视频转码:', { inputPath, outputPath, args });
    
    const ffmpeg = spawn('ffmpeg', args);
    let error = '';

    ffmpeg.stderr.on('data', (data) => {
      error += data.toString();
      // 可以在这里解析进度信息
      const progressMatch = data.toString().match(/time=(\d+:\d+:\d+\.\d+)/);
      if (progressMatch) {
        console.log('转码进度:', progressMatch[1]);
      }
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('视频转码完成:', outputPath);
        resolve();
      } else {
        console.error('视频转码失败:', error);
        reject(new Error(`FFmpeg 转码失败 (退出码: ${code}): ${error}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`FFmpeg 启动失败: ${err.message}`));
    });
  });
}

/**
 * 生成兼容的视频文件名
 */
export function generateCompatibleFilename(originalPath: string): string {
  const ext = path.extname(originalPath);
  const basename = path.basename(originalPath, ext);
  const dirname = path.dirname(originalPath);
  
  return path.join(dirname, `${basename}_h264${ext}`);
}

/**
 * 批量转码目录中的不兼容视频
 */
export async function convertIncompatibleVideos(
  mediaDir: string,
  options: ConversionOptions = {}
): Promise<{ converted: string[], failed: string[] }> {
  const converted: string[] = [];
  const failed: string[] = [];

  try {
    const files = await fs.readdir(mediaDir);
    const videoFiles = files.filter(file => 
      /\.(mp4|mov|avi|mkv|webm)$/i.test(file)
    );

    for (const file of videoFiles) {
      const filePath = path.join(mediaDir, file);
      
      try {
        const videoInfo = await getVideoInfo(filePath);
        
        if (!videoInfo.isCompatible) {
          const outputPath = generateCompatibleFilename(filePath);
          await convertVideoForWeb(filePath, outputPath, options);
          converted.push(outputPath);
        }
      } catch (error) {
        console.error(`处理文件 ${file} 失败:`, error);
        failed.push(file);
      }
    }
  } catch (error) {
    console.error('读取媒体目录失败:', error);
  }

  return { converted, failed };
}

/**
 * 清理临时文件
 */
export async function cleanupTempFiles(files: string[]): Promise<void> {
  for (const file of files) {
    try {
      await fs.unlink(file);
      console.log('已删除临时文件:', file);
    } catch (error) {
      console.error('删除临时文件失败:', file, error);
    }
  }
}
