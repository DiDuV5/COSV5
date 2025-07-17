/**
 * @fileoverview 优化的上传配置
 * @description 解决上传性能瓶颈的配置参数
 * @author Augment AI
 * @date 2025-06-15
 * @version 1.0.0
 */

export const UPLOAD_OPTIMIZATION_CONFIG = {
  // 上传策略配置
  strategy: {
    // 优先使用直接R2上传，避免双重上传
    preferDirectR2Upload: true,
    // 本地存储仅作为故障转移
    localStorageAsFallback: true,
    // 跳过不必要的中间步骤
    skipIntermediateStorage: true
  },

  // 性能优化配置
  performance: {
    // 并发上传限制
    maxConcurrentUploads: 2, // 减少并发数，提高稳定性
    // 分片上传阈值（大于20MB使用分片）
    chunkUploadThreshold: 20 * 1024 * 1024,
    // 分片大小（2MB，减小分片提高成功率）
    chunkSize: 2 * 1024 * 1024,
    // 上传超时时间（5分钟）
    uploadTimeout: 300000,
    // 重试配置
    retryConfig: {
      maxRetries: 5, // 增加重试次数
      retryDelay: 2000, // 增加重试延迟
      exponentialBackoff: true
    }
  },

  // R2连接优化
  r2Optimization: {
    // 连接池配置
    connectionPool: {
      maxConnections: 10,
      keepAlive: true,
      keepAliveMsecs: 30000
    },
    // 请求优化
    requestOptimization: {
      timeout: 300000,      // 增加到5分钟
      connectionTimeout: 60000, // 增加到1分钟
      maxAttempts: 3
    },
    // 上传优化
    uploadOptimization: {
      // 使用预签名URL减少服务器负载
      usePresignedUrls: true,
      // 启用多部分上传
      enableMultipartUpload: true,
      // 多部分上传阈值（10MB）
      multipartThreshold: 10 * 1024 * 1024
    }
  },

  // 本地存储优化
  localOptimization: {
    // 临时文件管理
    tempFileManagement: {
      // 立即清理临时文件
      immediateCleanup: true,
      // 临时文件保留时间（1小时）
      retentionTime: 3600000,
      // 使用内存缓冲区
      useMemoryBuffer: true
    },
    // I/O优化
    ioOptimization: {
      // 使用流式写入
      useStreaming: true,
      // 缓冲区大小（1MB）
      bufferSize: 1024 * 1024,
      // 异步I/O
      asyncIO: true
    }
  },

  // 监控和日志
  monitoring: {
    // 性能监控
    performanceMonitoring: {
      enabled: true,
      logSlowUploads: true,
      slowUploadThreshold: 30000, // 30秒
      trackUploadSpeed: true
    },
    // 错误监控
    errorMonitoring: {
      enabled: true,
      logRetries: true,
      logFailures: true,
      alertOnHighFailureRate: true
    }
  }
};

export default UPLOAD_OPTIMIZATION_CONFIG;