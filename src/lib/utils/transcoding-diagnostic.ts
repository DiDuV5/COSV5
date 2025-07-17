/**
 * @fileoverview 转码失败诊断工具
 * @description 诊断和分析视频转码失败的原因
 * @author Augment AI
 * @date 2025-06-15
 * @version 1.0.0
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DiagnosticResult {
  canTranscode: boolean;
  issues: string[];
  recommendations: string[];
  suggestedCommand?: string;
}

/**
 * 诊断视频转码问题
 */
export async function diagnoseTranscodingIssues(
  videoPath: string,
  targetWidth?: number,
  targetHeight?: number
): Promise<DiagnosticResult> {
  const result: DiagnosticResult = {
    canTranscode: true,
    issues: [],
    recommendations: []
  };
  
  try {
    // 获取视频信息
    const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`);
    const info = JSON.parse(stdout);
    
    const videoStream = info.streams.find((s: any) => s.codec_type === 'video');
    if (!videoStream) {
      result.canTranscode = false;
      result.issues.push('无法找到视频流');
      return result;
    }
    
    const width = parseInt(videoStream.width);
    const height = parseInt(videoStream.height);
    const codec = videoStream.codec_name;
    
    console.log(`📹 视频信息: ${codec} ${width}x${height}`);
    
    // 检查分辨率问题
    if (width % 2 !== 0) {
      result.issues.push(`宽度不是偶数: ${width}`);
      result.recommendations.push('使用force_divisible_by=2确保偶数分辨率');
    }
    
    if (height % 2 !== 0) {
      result.issues.push(`高度不是偶数: ${height}`);
      result.recommendations.push('使用force_divisible_by=2确保偶数分辨率');
    }
    
    // 检查编码格式
    if (codec === 'hevc' || codec === 'h265') {
      result.recommendations.push('HEVC视频需要转码为H.264以确保浏览器兼容性');
    }
    
    // 检查分辨率是否过大
    if (width > 3840 || height > 2160) {
      result.issues.push(`分辨率过高: ${width}x${height}`);
      result.recommendations.push('建议缩放到合理分辨率');
    }
    
    // 生成建议的转码命令
    if (result.issues.length > 0 || codec === 'hevc') {
      const maxW = targetWidth || 1920;
      const maxH = targetHeight || 1080;
      
      result.suggestedCommand = [
        'ffmpeg',
        `-i "${videoPath}"`,
        '-c:v libx264',
        '-crf 26',
        '-preset medium',
        '-profile:v main',
        '-level:v 3.1',
        `-vf "scale='min(${maxW},iw)':'min(${maxH},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,format=yuv420p"`,
        '-c:a aac',
        '-b:a 128k',
        '-movflags +faststart',
        '-y output.mp4'
      ].join(' ');
    }
    
    return result;
    
  } catch (error) {
    result.canTranscode = false;
    result.issues.push(`诊断失败: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
}

export default { diagnoseTranscodingIssues };