/**
 * @fileoverview 输入清理和验证工具
 * @description 防止 XSS 攻击和恶意输入的安全工具
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

/**
 * HTML 内容清理配置
 */
const PURIFY_CONFIG = {
  // 允许的标签
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 's', 'blockquote',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'img',
    'code', 'pre',
  ],
  
  // 允许的属性
  ALLOWED_ATTR: [
    'href', 'title', 'alt', 'src', 'width', 'height',
    'class', 'id',
  ],
  
  // 允许的协议
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

/**
 * 清理 HTML 内容
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: PURIFY_CONFIG.ALLOWED_TAGS,
    ALLOWED_ATTR: PURIFY_CONFIG.ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: PURIFY_CONFIG.ALLOWED_URI_REGEXP,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}

/**
 * 清理纯文本内容
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/[<>]/g, '') // 移除尖括号
    .replace(/javascript:/gi, '') // 移除 javascript: 协议
    .replace(/data:/gi, '') // 移除 data: 协议
    .trim();
}

/**
 * 验证和清理用户名
 */
export function sanitizeUsername(username: string): string {
  if (!username) return '';
  
  return username
    .toLowerCase()
    .replace(/[^a-z0-9_\u4e00-\u9fa5]/g, '') // 只保留字母、数字、下划线、中文
    .slice(0, 20); // 限制长度
}

/**
 * 验证和清理邮箱
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';
  
  return email
    .toLowerCase()
    .trim()
    .slice(0, 254); // RFC 5321 限制
}

/**
 * 验证和清理 URL
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  try {
    const parsed = new URL(url);
    
    // 只允许 http 和 https 协议
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * 增强的 Zod 验证模式
 */
export const secureValidationSchemas = {
  // 用户名验证
  username: z
    .string()
    .min(5, '用户名至少5个字符')
    .max(20, '用户名最多20个字符')
    .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, '用户名只能包含字母、数字、下划线和中文字符')
    .refine(val => !val.match(/^\d/), '用户名不能以数字开头')
    .transform(sanitizeUsername),
  
  // 邮箱验证
  email: z
    .string()
    .email('请输入有效的邮箱地址')
    .max(254, '邮箱地址过长')
    .transform(sanitizeEmail),
  
  // 密码验证
  password: z
    .string()
    .min(8, '密码至少8个字符')
    .max(128, '密码最多128个字符')
    .regex(/[a-z]/, '密码必须包含小写字母')
    .regex(/[A-Z]/, '密码必须包含大写字母')
    .regex(/\d/, '密码必须包含数字')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, '密码必须包含特殊字符'),
  
  // 显示名称验证
  displayName: z
    .string()
    .min(1, '显示名称不能为空')
    .max(50, '显示名称最多50个字符')
    .transform(sanitizeText),
  
  // 个人简介验证
  bio: z
    .string()
    .max(500, '个人简介最多500个字符')
    .transform(sanitizeText),
  
  // URL 验证
  url: z
    .string()
    .url('请输入有效的URL')
    .transform(sanitizeUrl),
  
  // 内容验证
  content: z
    .string()
    .min(1, '内容不能为空')
    .max(10000, '内容过长')
    .transform(sanitizeHtml),
  
  // 标题验证
  title: z
    .string()
    .min(1, '标题不能为空')
    .max(200, '标题最多200个字符')
    .transform(sanitizeText),
};

/**
 * 检测恶意内容
 */
export function detectMaliciousContent(content: string): {
  isMalicious: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const lowerContent = content.toLowerCase();
  
  // 检测脚本注入
  const scriptPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
    /onclick=/i,
    /onmouseover=/i,
  ];
  
  scriptPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      reasons.push('检测到潜在的脚本注入');
    }
  });
  
  // 检测 SQL 注入 (增强版)
  const sqlPatterns = [
    /union\s+select/i,
    /drop\s+table/i,
    /delete\s+from/i,
    /insert\s+into/i,
    /update\s+set/i,
    // 增加更多SQL检测模式
    /\bSELECT\s+.*\s+FROM\s+\w+/i,
    /\bWHERE\s+\w+\s*=\s*\d+/i,
    /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b/i,
    /'\s*(OR|AND)\s*'?\d+/i,
    /'\s*OR\s*'\w+'\s*=\s*'\w+/i,
    /(;|\-\-|\#|\/\*|\*\/)/,
  ];
  
  sqlPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      reasons.push('检测到潜在的SQL注入');
    }
  });
  
  // 检测路径遍历
  if (content.includes('../') || content.includes('..\\')) {
    reasons.push('检测到路径遍历尝试');
  }
  
  // 检测命令注入
  const commandPatterns = [
    /\|\s*cat/i,
    /\|\s*ls/i,
    /\|\s*dir/i,
    /\|\s*rm/i,
    /\|\s*del/i,
  ];
  
  commandPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      reasons.push('检测到潜在的命令注入');
    }
  });
  
  return {
    isMalicious: reasons.length > 0,
    reasons,
  };
}

/**
 * 内容安全策略 (CSP) 头部
 */
export const CSP_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "media-src 'self' https: blob:",
    "connect-src 'self' https: wss:",
    "frame-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; '),
};

/**
 * 安全头部集合
 */
export const SECURITY_HEADERS = {
  ...CSP_HEADERS,
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
};

/**
 * 验证文件上传
 */
export function validateFileUpload(file: File): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // 检查文件大小 (10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push('文件大小不能超过10MB');
  }
  
  // 检查文件类型
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
  ];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('不支持的文件类型');
  }
  
  // 检查文件名
  const fileName = file.name;
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    errors.push('文件名包含非法字符');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 生成安全的文件名
 */
export function generateSecureFileName(originalName: string): string {
  const ext = originalName.split('.').pop()?.toLowerCase() || '';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  return `${timestamp}_${random}.${ext}`;
}
