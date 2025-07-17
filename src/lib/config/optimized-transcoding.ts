/**
 * @fileoverview 优化的视频转码配置
 * @description 控制文件大小的转码参数配置
 * @author Augment AI
 * @date 2025-06-15
 * @version 2.0.0
 */

export const OPTIMIZED_TRANSCODING_CONFIG = {
  // 质量与文件大小平衡配置
  qualityProfiles: {
    // 高质量配置（用于重要内容）
    high: {
      crf: 22,
      preset: 'slow',
      maxBitrate: 2000,  // 1080p最大2Mbps
      bufsize: 4000,
      profile: 'main',
      level: '3.1'
    },
    
    // 标准质量配置（默认）
    standard: {
      crf: 26,           // 提高CRF值降低文件大小
      preset: 'medium',
      maxBitrate: 1800,  // 1080p最大1.8Mbps
      bufsize: 3600,
      profile: 'main',
      level: '3.1'
    },
    
    // 压缩优先配置（文件大小优先）
    compressed: {
      crf: 28,
      preset: 'fast',
      maxBitrate: 1500,  // 1080p最大1.5Mbps
      bufsize: 3000,
      profile: 'main',
      level: '3.1'
    }
  },

  // 分辨率自适应配置
  resolutionAdaptive: {
    '4K': {
      maxWidth: 3840,
      maxHeight: 2160,
      targetBitrate: 4000,
      maxBitrate: 6000,
      crf: 24
    },
    '1080p': {
      maxWidth: 1920,
      maxHeight: 1080,
      targetBitrate: 1500,
      maxBitrate: 2000,
      crf: 26
    },
    '720p': {
      maxWidth: 1280,
      maxHeight: 720,
      targetBitrate: 1000,
      maxBitrate: 1500,
      crf: 25
    },
    '480p': {
      maxWidth: 854,
      maxHeight: 480,
      targetBitrate: 600,
      maxBitrate: 1000,
      crf: 24
    }
  },

  // 音频优化配置
  audioOptimization: {
    codec: 'aac',
    bitrate: 128,      // 固定128kbps
    sampleRate: 44100,
    channels: 2,
    profile: 'aac_low'
  },

  // 编码器优化选项
  encoderOptions: {
    // x264编码器选项
    x264: {
      tune: 'film',      // 适合真人视频
      fastFirstPass: true,
      lookAhead: 40,
      bFrames: 3,
      refs: 3,
      subme: 7,
      trellis: 1
    },
    
    // 像素格式
    pixelFormat: 'yuv420p',
    
    // 颜色空间
    colorSpace: 'bt709',
    colorPrimaries: 'bt709',
    colorTransfer: 'bt709'
  },

  // 文件大小控制策略
  fileSizeControl: {
    // 目标文件大小增长限制
    maxSizeIncreasePercent: 50,  // 最大增长50%
    
    // 基于原始文件大小的策略
    sizeBasedStrategy: {
      // 小文件（<10MB）：保持质量
      small: {
        threshold: 10 * 1024 * 1024,
        crf: 24,
        maxBitrate: 2000
      },
      // 中等文件（10-50MB）：平衡质量和大小
      medium: {
        threshold: 50 * 1024 * 1024,
        crf: 26,
        maxBitrate: 1800
      },
      // 大文件（>50MB）：优先压缩
      large: {
        threshold: Infinity,
        crf: 28,
        maxBitrate: 1500
      }
    }
  },

  // 特殊处理规则
  specialHandling: {
    // HEVC到H.264转换优化
    hevcToH264: {
      // 补偿HEVC的高压缩效率
      crfAdjustment: +2,  // CRF值增加2
      bitrateReduction: 0.8,  // 比特率降低20%
      useConstrained: true    // 使用约束质量模式
    },
    
    // 高帧率视频处理
    highFrameRate: {
      fpsThreshold: 30,
      crfAdjustment: +1,
      maxBitrate: 2500
    },
    
    // 长视频处理
    longVideo: {
      durationThreshold: 300,  // 5分钟
      crfAdjustment: +1,
      enableTwoPass: true
    }
  }
};

/**
 * 根据输入参数选择最佳转码配置
 */
export function selectOptimalTranscodingConfig(
  width: number,
  height: number,
  duration: number,
  originalSize: number,
  originalCodec?: string
): any {
  const config = OPTIMIZED_TRANSCODING_CONFIG;
  
  // 确定分辨率类别
  const resolution = width * height;
  let resolutionConfig;
  
  if (resolution >= 3840 * 2160) {
    resolutionConfig = config.resolutionAdaptive['4K'];
  } else if (resolution >= 1920 * 1080) {
    resolutionConfig = config.resolutionAdaptive['1080p'];
  } else if (resolution >= 1280 * 720) {
    resolutionConfig = config.resolutionAdaptive['720p'];
  } else {
    resolutionConfig = config.resolutionAdaptive['480p'];
  }
  
  // 确定文件大小策略
  let sizeConfig;
  if (originalSize < config.fileSizeControl.sizeBasedStrategy.small.threshold) {
    sizeConfig = config.fileSizeControl.sizeBasedStrategy.small;
  } else if (originalSize < config.fileSizeControl.sizeBasedStrategy.medium.threshold) {
    sizeConfig = config.fileSizeControl.sizeBasedStrategy.medium;
  } else {
    sizeConfig = config.fileSizeControl.sizeBasedStrategy.large;
  }
  
  // 基础配置
  const finalConfig = {
    crf: Math.max(resolutionConfig.crf, sizeConfig.crf),
    maxBitrate: Math.min(resolutionConfig.maxBitrate, sizeConfig.maxBitrate),
    preset: 'medium',
    profile: 'main',
    level: '3.1'
  };
  
  // HEVC特殊处理
  if (originalCodec === 'hevc' || originalCodec === 'h265') {
    finalConfig.crf += config.specialHandling.hevcToH264.crfAdjustment;
    finalConfig.maxBitrate = Math.round(finalConfig.maxBitrate * config.specialHandling.hevcToH264.bitrateReduction);
  }
  
  // 长视频特殊处理
  if (duration > config.specialHandling.longVideo.durationThreshold) {
    finalConfig.crf += config.specialHandling.longVideo.crfAdjustment;
  }
  
  return finalConfig;
}

export default OPTIMIZED_TRANSCODING_CONFIG;