/**
 * @fileoverview 测试常量配置
 * @description 统一管理测试中使用的常量，避免硬编码
 * @author Augment AI
 * @date 2025-07-14
 */

/**
 * 测试环境CDN配置
 */
export const TEST_CDN_CONFIG = {
  // 使用环境变量或默认的测试CDN域名
  CDN_DOMAIN: process.env.COSEREEDEN_CDN_PRIMARY_DOMAIN || 'https://cdn.cosv5.com',
  UPLOAD_DOMAIN: process.env.COSEREEDEN_NEXT_PUBLIC_UPLOAD_DOMAIN || 'http://localhost:3000',
  
  // 测试用的媒体URL
  getTestImageUrl: (filename: string) => 
    `${process.env.COSEREEDEN_CDN_PRIMARY_DOMAIN || 'https://cdn.cosv5.com'}/uploads/2025/07/${filename}`,
  
  getTestThumbnailUrl: (filename: string) => 
    `${process.env.COSEREEDEN_CDN_PRIMARY_DOMAIN || 'https://cdn.cosv5.com'}/uploads/2025/07/thumb-${filename}`,
} as const;

/**
 * 测试环境网络配置
 */
export const TEST_NETWORK_CONFIG = {
  // 测试用的IP地址
  TEST_IP: process.env.COSEREEDEN_TEST_IP || '127.0.0.1',
  
  // 测试用的本地URL
  LOCAL_URL: process.env.COSEREEDEN_NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  
  // 测试用的NextAuth URL
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
} as const;

/**
 * 测试环境数据库配置
 */
export const TEST_DB_CONFIG = {
  // 测试数据库端口
  DB_PORT: process.env.COSEREEDEN_TEST_DB_PORT || '5432',
  
  // 测试数据库主机
  DB_HOST: process.env.COSEREEDEN_TEST_DB_HOST || 'localhost',
} as const;

/**
 * 生成测试用的媒体文件URL
 */
export function generateTestMediaUrl(filename: string, type: 'image' | 'video' = 'image'): string {
  const baseUrl = TEST_CDN_CONFIG.CDN_DOMAIN;
  return `${baseUrl}/uploads/2025/07/${filename}`;
}

/**
 * 生成测试用的缩略图URL
 */
export function generateTestThumbnailUrl(filename: string): string {
  const baseUrl = TEST_CDN_CONFIG.CDN_DOMAIN;
  return `${baseUrl}/uploads/2025/07/thumb-${filename}`;
}
