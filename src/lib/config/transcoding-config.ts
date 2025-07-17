/**
 * @fileoverview 优化的视频转码配置
 * @description 降低比特率和文件大小的转码参数
 * @author Augment AI
 * @date 2025-06-15
 * @version 2.0.0
 */

export const TRANSCODING_CONFIG = {
  // 质量设置 - 提高CRF值降低文件大小
  quality: {
    high: { crf: 20, preset: 'slow', maxBitrate: 2000 },    // 高质量，最大2Mbps
    medium: { crf: 25, preset: 'medium', maxBitrate: 1500 }, // 中等质量，最大1.5Mbps
    low: { crf: 28, preset: 'fast', maxBitrate: 1000 }      // 低质量，最大1Mbps
  },
  
  // 默认设置
  default: {
    crf: 25,           // 提高CRF值从23到25
    preset: 'medium',
    maxBitrate: 1500,  // 设置最大比特率限制
    bufsize: 3000,     // 缓冲区大小
    profile: 'main',
    level: '3.1'
  },
  
  // 分辨率限制
  resolution: {
    maxWidth: 1920,
    maxHeight: 1080
  },
  
  // 音频设置
  audio: {
    codec: 'aac',
    bitrate: 128,
    sampleRate: 44100,
    channels: 2
  }
};

export default TRANSCODING_CONFIG;