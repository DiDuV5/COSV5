/**
 * @fileoverview 统一R2存储类型定义
 * @description 定义R2存储相关的类型和接口
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

/**
 * 环境类型
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * CDN域名配置
 */
export interface CDNDomainConfig {
  url: string;
  name: string;
  priority: number;
  requiresSSL: boolean;
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  lastChecked?: Date;
  responseTime?: number;
}

/**
 * 环境配置接口
 */
export interface EnvironmentConfig {
  environment: Environment;
  primaryDomain: CDNDomainConfig;
  fallbackDomains: CDNDomainConfig[];
  enableFailover: boolean;
  healthCheckInterval: number;
}

/**
 * R2配置接口
 */
export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  region: string;
}

/**
 * 上传参数接口
 */
export interface UploadParams {
  buffer: Buffer;
  key: string;
  contentType: string;
  size: number;
  metadata?: Record<string, string>;
}

/**
 * 流式上传参数接口
 */
export interface StreamUploadParams {
  buffer: Buffer;
  key: string;
  contentType: string;
  size: number;
  metadata?: Record<string, string>;
  enableDirectUpload?: boolean;
  onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void;
}

/**
 * 上传结果接口
 */
export interface UploadResult {
  key: string;
  url: string;
  cdnUrl: string;
  size: number;
  etag?: string;
  uploadedAt: Date;
  environment: Environment;
  usedDomain: string;
  uploadMethod?: 'direct' | 'multipart' | 'stream';
}

/**
 * 健康状态报告接口
 */
export interface HealthReport {
  environment: Environment;
  domains: CDNDomainConfig[];
  bestDomain: string;
}

/**
 * 上传策略类型
 */
export type UploadStrategy = 'direct' | 'multipart' | 'stream';

/**
 * 上传策略配置
 */
export interface UploadStrategyConfig {
  smallFileThreshold: number;
  largeFileThreshold: number;
  directUploadMaxSize: number;
  multipartChunkSize: number;
  multipartConcurrency: number;
  requestTimeout: number;
}
