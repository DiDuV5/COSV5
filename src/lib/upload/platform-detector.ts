/**
 * @fileoverview 平台检测和兼容性处理
 * @description 检测客户端平台特性，提供针对性的优化和错误处理
 * @author Augment AI
 * @date 2025-01-06
 * @version 1.0.0
 * @since 1.0.0
 *
 * @features
 * - 客户端平台检测 (桌面/移动/微信等)
 * - 浏览器能力检测
 * - 平台特定的文件大小限制
 * - 错误消息本地化
 * - 上传策略优化
 */

export interface PlatformInfo {
  type: 'desktop' | 'mobile' | 'tablet';
  os: 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'unknown';
  browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'wechat' | 'unknown';
  version: string;
  isWeChat: boolean;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  capabilities: {
    fileAPI: boolean;
    dragDrop: boolean;
    webWorkers: boolean;
    webAssembly: boolean;
    videoPlayback: boolean;
    h264Support: boolean;
  };
  limitations: {
    maxFileSize: number;
    maxConcurrentUploads: number;
    supportedFormats: string[];
    memoryLimit: number;
  };
}

export interface UploadStrategy {
  chunkSize: number;
  maxRetries: number;
  timeout: number;
  compressionLevel: number;
  useWebWorkers: boolean;
  showProgress: boolean;
  errorMessages: {
    fileTooLarge: string;
    unsupportedFormat: string;
    networkError: string;
    memoryError: string;
    genericError: string;
  };
}

export class PlatformDetector {
  private static platformInfo: PlatformInfo | null = null;
  
  /**
   * 检测当前平台信息
   */
  public static detect(): PlatformInfo {
    if (this.platformInfo) {
      return this.platformInfo;
    }
    
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    
    // 基础平台检测
    const isWeChat = /MicroMessenger/i.test(userAgent);
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
    
    // 操作系统检测
    let os: PlatformInfo['os'] = 'unknown';
    if (isIOS) os = 'ios';
    else if (isAndroid) os = 'android';
    else if (/Windows/i.test(userAgent)) os = 'windows';
    else if (/Mac/i.test(userAgent)) os = 'macos';
    else if (/Linux/i.test(userAgent)) os = 'linux';
    
    // 浏览器检测
    let browser: PlatformInfo['browser'] = 'unknown';
    let version = '';
    
    if (isWeChat) {
      browser = 'wechat';
      const match = userAgent.match(/MicroMessenger\/([0-9.]+)/);
      version = match ? match[1] : '';
    } else if (/Chrome/i.test(userAgent) && !/Edge/i.test(userAgent)) {
      browser = 'chrome';
      const match = userAgent.match(/Chrome\/([0-9.]+)/);
      version = match ? match[1] : '';
    } else if (/Firefox/i.test(userAgent)) {
      browser = 'firefox';
      const match = userAgent.match(/Firefox\/([0-9.]+)/);
      version = match ? match[1] : '';
    } else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
      browser = 'safari';
      const match = userAgent.match(/Version\/([0-9.]+)/);
      version = match ? match[1] : '';
    } else if (/Edge/i.test(userAgent)) {
      browser = 'edge';
      const match = userAgent.match(/Edge\/([0-9.]+)/);
      version = match ? match[1] : '';
    }
    
    // 能力检测
    const capabilities = this.detectCapabilities();
    
    // 平台限制
    const limitations = this.getPlatformLimitations(browser, isMobile, isWeChat, isIOS);
    
    this.platformInfo = {
      type: isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop',
      os,
      browser,
      version,
      isWeChat,
      isMobile,
      isIOS,
      isAndroid,
      capabilities,
      limitations,
    };
    
    console.log('🔍 平台检测完成:', this.platformInfo);
    
    return this.platformInfo;
  }
  
  /**
   * 检测浏览器能力
   */
  private static detectCapabilities(): PlatformInfo['capabilities'] {
    if (typeof window === 'undefined') {
      return {
        fileAPI: false,
        dragDrop: false,
        webWorkers: false,
        webAssembly: false,
        videoPlayback: false,
        h264Support: false,
      };
    }
    
    // File API 支持
    const fileAPI = !!(window.File && window.FileReader && window.FileList && window.Blob);
    
    // 拖拽支持
    const dragDrop = 'draggable' in document.createElement('div');
    
    // Web Workers 支持
    const webWorkers = typeof Worker !== 'undefined';
    
    // WebAssembly 支持
    const webAssembly = typeof WebAssembly !== 'undefined';
    
    // 视频播放支持
    const video = document.createElement('video');
    const videoPlayback = !!(video.canPlayType);
    
    // H.264 支持检测
    const h264Support = videoPlayback && 
      (video.canPlayType('video/mp4; codecs="avc1.42E01E"') !== '' ||
       video.canPlayType('video/mp4; codecs="avc1.4D401E"') !== '');
    
    return {
      fileAPI,
      dragDrop,
      webWorkers,
      webAssembly,
      videoPlayback,
      h264Support,
    };
  }
  
  /**
   * 获取平台特定限制
   */
  private static getPlatformLimitations(
    browser: string,
    isMobile: boolean,
    isWeChat: boolean,
    isIOS: boolean
  ): PlatformInfo['limitations'] {
    // 专业cosplay平台默认限制 - 大幅提高以支持高质量内容
    let maxFileSize = 5 * 1024 * 1024 * 1024; // 默认5GB - 支持4K视频和RAW图片
    let maxConcurrentUploads = 3;
    let memoryLimit = 1024 * 1024 * 1024; // 默认1GB内存

    // 移动端限制 - 仍然适当限制但提高上限
    if (isMobile) {
      maxFileSize = 1 * 1024 * 1024 * 1024; // 1GB (移动端支持高质量图片)
      maxConcurrentUploads = 1;
      memoryLimit = 512 * 1024 * 1024; // 512MB
    }

    // iOS 特殊限制 - 提高限制支持专业用户
    if (isIOS) {
      maxFileSize = 500 * 1024 * 1024; // 500MB (iOS内存管理严格，但支持专业图片)
      memoryLimit = 256 * 1024 * 1024; // 256MB
    }

    // 微信浏览器限制 - 适度提高
    if (isWeChat) {
      maxFileSize = 200 * 1024 * 1024; // 200MB (微信环境限制，但支持高质量图片)
      maxConcurrentUploads = 1;
      memoryLimit = 128 * 1024 * 1024; // 128MB
    }
    
    // 支持的格式
    const supportedFormats = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
    ];
    
    // 微信浏览器格式限制
    if (isWeChat) {
      supportedFormats.splice(supportedFormats.indexOf('image/webp'), 1); // 移除WebP
    }
    
    return {
      maxFileSize,
      maxConcurrentUploads,
      supportedFormats,
      memoryLimit,
    };
  }
  
  /**
   * 获取针对当前平台的上传策略
   */
  public static getUploadStrategy(): UploadStrategy {
    const platform = this.detect();
    
    let chunkSize = 1024 * 1024; // 1MB
    let maxRetries = 3;
    let timeout = 30000; // 30秒
    let compressionLevel = 0.8;
    let useWebWorkers = platform.capabilities.webWorkers;
    const showProgress = true;
    
    // 移动端优化
    if (platform.isMobile) {
      chunkSize = 512 * 1024; // 512KB
      maxRetries = 5; // 移动网络不稳定，增加重试
      timeout = 60000; // 60秒
      compressionLevel = 0.7; // 更高压缩
    }
    
    // 微信浏览器优化
    if (platform.isWeChat) {
      chunkSize = 256 * 1024; // 256KB
      maxRetries = 2; // 减少重试避免卡顿
      timeout = 45000; // 45秒
      useWebWorkers = false; // 微信可能不支持
    }
    
    // iOS 特殊处理
    if (platform.isIOS) {
      compressionLevel = 0.6; // 更高压缩节省内存
      useWebWorkers = false; // iOS Safari Web Workers 有限制
    }
    
    // 错误消息
    const errorMessages = {
      fileTooLarge: this.getLocalizedMessage('fileTooLarge', platform),
      unsupportedFormat: this.getLocalizedMessage('unsupportedFormat', platform),
      networkError: this.getLocalizedMessage('networkError', platform),
      memoryError: this.getLocalizedMessage('memoryError', platform),
      genericError: this.getLocalizedMessage('genericError', platform),
    };
    
    return {
      chunkSize,
      maxRetries,
      timeout,
      compressionLevel,
      useWebWorkers,
      showProgress,
      errorMessages,
    };
  }
  
  /**
   * 获取本地化错误消息
   */
  private static getLocalizedMessage(type: string, platform: PlatformInfo): string {
    const messages: Record<string, Record<string, string>> = {
      fileTooLarge: {
        desktop: `文件过大，请选择小于 ${Math.round(platform.limitations.maxFileSize / 1024 / 1024)}MB 的文件`,
        mobile: `文件过大，移动端建议上传小于 ${Math.round(platform.limitations.maxFileSize / 1024 / 1024)}MB 的文件`,
        wechat: `文件过大，微信浏览器限制为 ${Math.round(platform.limitations.maxFileSize / 1024 / 1024)}MB`,
      },
      unsupportedFormat: {
        desktop: '不支持的文件格式，请选择 JPG、PNG、WebP 或 MP4 文件',
        mobile: '不支持的文件格式，请选择 JPG、PNG 或 MP4 文件',
        wechat: '不支持的文件格式，请选择 JPG、PNG 或 MP4 文件',
      },
      networkError: {
        desktop: '网络连接失败，请检查网络后重试',
        mobile: '网络不稳定，请切换到稳定的WiFi网络后重试',
        wechat: '网络连接失败，请检查微信网络设置后重试',
      },
      memoryError: {
        desktop: '内存不足，请关闭其他程序后重试',
        mobile: '设备内存不足，请关闭其他应用后重试',
        wechat: '微信内存不足，请重启微信后重试',
      },
      genericError: {
        desktop: '上传失败，请重试',
        mobile: '上传失败，请检查网络和文件后重试',
        wechat: '上传失败，请在微信中重试或使用其他浏览器',
      },
    };
    
    const platformKey = platform.isWeChat ? 'wechat' : platform.isMobile ? 'mobile' : 'desktop';
    return messages[type]?.[platformKey] || messages[type]?.desktop || '操作失败，请重试';
  }
  
  /**
   * 检查文件是否符合平台限制
   */
  public static validateFile(file: File): { valid: boolean; error?: string } {
    const platform = this.detect();
    
    // 检查文件大小
    if (file.size > platform.limitations.maxFileSize) {
      return {
        valid: false,
        error: this.getLocalizedMessage('fileTooLarge', platform),
      };
    }
    
    // 检查文件格式
    if (!platform.limitations.supportedFormats.includes(file.type)) {
      return {
        valid: false,
        error: this.getLocalizedMessage('unsupportedFormat', platform),
      };
    }
    
    return { valid: true };
  }
  
  /**
   * 获取推荐的文件处理建议
   */
  public static getFileProcessingAdvice(): string[] {
    const platform = this.detect();
    const advice: string[] = [];
    
    if (platform.isMobile) {
      advice.push('📱 移动端建议：选择较小的文件以获得更好的上传体验');
      advice.push('📶 网络建议：使用稳定的WiFi网络上传大文件');
    }
    
    if (platform.isWeChat) {
      advice.push('💬 微信提示：如遇问题可尝试在其他浏览器中打开');
      advice.push('📁 文件建议：微信中建议上传10MB以下的文件');
    }
    
    if (platform.isIOS) {
      advice.push('🍎 iOS提示：如遇内存不足，请关闭其他应用后重试');
    }
    
    if (!platform.capabilities.h264Support) {
      advice.push('🎬 视频提示：您的浏览器可能不支持某些视频格式的播放');
    }
    
    return advice;
  }
  
  /**
   * 重置平台检测缓存（用于测试）
   */
  public static reset(): void {
    this.platformInfo = null;
  }
}
