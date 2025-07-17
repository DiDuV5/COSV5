/**
 * @fileoverview URL编码工具函数
 * @description 处理文件名URL编码，特别是中文字符
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 */

/**
 * 编码文件名用于URL
 */
export function encodeFilename(filename: string): string {
  return encodeURIComponent(filename);
}

/**
 * 编码文件路径用于URL
 */
export function encodeFilePath(path: string): string {
  return path.split('/').map(part => encodeURIComponent(part)).join('/');
}

/**
 * 生成CDN URL
 */
export function generateCdnUrl(key: string): string {
  const cdnDomain = process.env.COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN || process.env.COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN;

  if (!cdnDomain) {
    throw new Error('CDN domain not configured. Please set COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN environment variable.');
  }

  const encodedKey = encodeFilePath(key);
  return `${cdnDomain}/${encodedKey}`;
}

/**
 * 验证URL是否可访问
 */
export async function validateUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}
