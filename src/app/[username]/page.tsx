/**
 * @fileoverview 用户名直接访问页面
 * @description 支持通过域名+用户名直接访问用户主页，如 localhost:3000/admin
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * // 访问用户主页的几种方式：
 * // localhost:3000/admin → admin用户主页
 * // localhost:3000/douyu → douyu用户主页
 * // localhost:3000/users/admin → 标准路径（保持兼容）
 *
 * @dependencies
 * - next: ^14.0.0
 * - @trpc/server: ^10.0.0
 * - react: ^18.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，支持用户名直接访问
 */

import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";

import { api } from "@/trpc/server";
import { getServerAuthSession } from "@/lib/auth";

interface UsernamePageProps {
  params: {
    username: string;
  };
}

// 系统保留路径，这些路径不能作为用户名使用
const RESERVED_PATHS = [
  'api',
  'auth',
  'admin',
  'settings',
  'create',
  'publish',
  'explore',
  'search',
  'interact',
  'posts',
  'tags',
  'trending',
  'welcome',
  'moments',
  'users',
  'profile',
  'test',
  'test-upload',
  'test-floating-button',
  'test-navigation',
  'test-converted-videos',
  'test-new-video',
  'test-tags',
  'test-firefox-video',
  'test-checkbox',
  'test-profile',
  'test-fixed-video',
  'diagnose-video',
  'system-status',
  'uploads',
  '_next',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml'
];

/**
 * 用户名验证结果缓存
 * 避免在generateMetadata和页面组件中重复验证
 */
interface ValidationResult {
  isValid: boolean;
  isReserved: boolean;
  timestamp: number;
  reason?: string;
}

const validationCache = new Map<string, ValidationResult>();

/**
 * 获取缓存的验证结果，避免重复计算
 */
function getCachedValidation(username: string): ValidationResult {
  const cached = validationCache.get(username);

  // 缓存5秒内有效，避免重复计算
  if (cached && Date.now() - cached.timestamp < 5000) {
    return cached;
  }

  // 执行验证并缓存结果
  const isReserved = RESERVED_PATHS.includes(username.toLowerCase());
  const isValid = isValidUsername(username);

  const result: ValidationResult = {
    isValid,
    isReserved,
    timestamp: Date.now(),
    reason: !isValid ? 'invalid_format' : isReserved ? 'reserved_path' : undefined
  };

  validationCache.set(username, result);

  // 清理过期缓存（保持缓存大小合理）
  if (validationCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of validationCache.entries()) {
      if (now - value.timestamp > 10000) { // 10秒后清理
        validationCache.delete(key);
      }
    }
  }

  return result;
}

/**
 * 验证用户名格式是否有效
 */
function isValidUsername(username: string): boolean {
  // 用户名基本格式验证
  if (!username || username.length < 2 || username.length > 30) {
    return false;
  }

  // 检查是否为文件模式（修复版本）
  const filePatterns = [
    // 图片/媒体文件模式（修复：支持连字符和十六进制）
    /^photo-[\da-f-]+$/i,              // photo-数字/十六进制/连字符组合
    /^image-[\da-f-]+$/i,              // image-数字/十六进制/连字符组合
    /^img-[\da-f-]+$/i,                // img-数字/十六进制/连字符组合
    /^file-[\da-f-]+$/i,               // file-数字/十六进制/连字符组合
    /^asset-[\da-f-]+$/i,              // asset-数字/十六进制/连字符组合
    /^media-[\da-f-]+$/i,              // media-数字/十六进制/连字符组合

    // 长字符串模式
    /^[a-f0-9]{8,}$/i,                 // 长十六进制字符串（无连字符）
    /^[a-f0-9-]{20,}$/i,               // 带连字符的长字符串（20+字符）

    // 文件扩展名
    /\.(jpg|jpeg|png|gif|webp|svg|mp4|avi|mov|pdf|doc|docx|zip|rar)$/i,

    // 特殊模式：长度超过20且主要由数字和连字符组成
    /^[\d-]{15,}$/,                    // 15+字符的数字连字符组合

    // UUID模式
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i, // UUID格式
  ];

  // 如果匹配任何文件模式，则不是有效用户名
  if (filePatterns.some(pattern => pattern.test(username))) {
    return false;
  }

  // 额外检查：如果以常见文件前缀开头且长度较长，很可能是文件名
  const suspiciousPrefixes = ['photo-', 'image-', 'img-', 'file-', 'asset-', 'media-'];
  if (suspiciousPrefixes.some(prefix => username.toLowerCase().startsWith(prefix)) && username.length > 15) {
    return false;
  }

  // 用户名只能包含字母、数字、下划线和连字符
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  return usernameRegex.test(username);
}

export async function generateMetadata({ params }: UsernamePageProps): Promise<Metadata> {
  const { username } = params;

  // 🔍 统一用户名验证（使用缓存避免重复计算）
  const validation = getCachedValidation(username);

  // 只在开发环境输出详细日志
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 用户名验证 [metadata]:', {
      username,
      length: username.length,
      isReserved: validation.isReserved,
      isValidFormat: validation.isValid,
      reason: validation.reason,
      cached: Date.now() - validation.timestamp < 1000,
      url: `/${username}`
    });
  }

  // 早期验证：检查是否为保留路径
  if (validation.isReserved) {
    if (process.env.NODE_ENV === 'development') {
      console.log('❌ 访问保留路径:', { username, type: 'reserved' });
    }
    return {
      title: '页面不存在',
    };
  }

  // 早期验证：检查用户名格式
  if (!validation.isValid) {
    if (process.env.NODE_ENV === 'development') {
      console.log('❌ 无效用户名格式:', { username, type: validation.reason });
    }
    return {
      title: '页面不存在',
      description: '请求的页面不存在',
    };
  }

  try {
    // 🚀 开始用户查询
    console.log('🚀 查询用户信息:', { username });
    const user = await api.user.getByUsername({ username });

    if (!user) {
      console.log('❌ 用户不存在:', { username, type: 'user_not_found' });
      return {
        title: '用户不存在',
        description: '请求的用户不存在',
      };
    }

    // ✅ 用户查询成功
    console.log('✅ 用户查询成功:', {
      username,
      displayName: user.displayName,
      hasAvatar: !!user.avatarUrl
    });

    return {
      title: `${user.displayName || user.username} - 兔图`,
      description: user.bio || `查看 ${user.displayName || user.username} 的 cosplay 作品和动态`,
      openGraph: {
        title: `${user.displayName || user.username} - 兔图`,
        description: user.bio || `查看 ${user.displayName || user.username} 的 cosplay 作品和动态`,
        images: user.avatarUrl ? [{ url: user.avatarUrl }] : [],
      },
    };
  } catch (error) {
    // 🔍 详细错误日志
    console.error('❌ 用户元数据生成失败:', {
      username,
      error: error instanceof Error ? error.message : String(error),
      type: 'metadata_generation_error'
    });

    return {
      title: '用户不存在',
      description: '请求的用户不存在',
    };
  }
}

export default async function UsernamePage({ params }: UsernamePageProps) {
  const { username } = params;

  // 🔍 复用缓存的验证结果（避免重复计算）
  const validation = getCachedValidation(username);

  // 简化日志输出（仅在开发环境且验证结果未缓存时输出）
  if (process.env.NODE_ENV === 'development' && Date.now() - validation.timestamp > 1000) {
    console.log('🔍 用户名验证 [component]:', {
      username,
      isReserved: validation.isReserved,
      isValidFormat: validation.isValid,
      reason: validation.reason
    });
  }

  // 早期验证：检查是否为保留路径
  if (validation.isReserved) {
    // 如果是 admin 且用户有管理员权限，重定向到管理后台
    if (username.toLowerCase() === 'admin') {
      const session = await getServerAuthSession();
      if (session?.user?.userLevel === 'ADMIN') {
        redirect('/admin');
      }
    }

    // 其他保留路径返回404
    notFound();
  }

  // 早期验证：检查用户名格式
  if (!validation.isValid) {
    notFound();
  }

  // 检查用户是否存在
  let userExists = false;
  try {
    const user = await api.user.getByUsername({ username });
    userExists = !!user;
    console.log(`找到用户 ${username}，准备重定向到用户主页`);
  } catch (error: any) {
    // 如果是 tRPC 错误，检查是否为用户不存在
    if (error?.code === 'NOT_FOUND') {
      console.log(`用户 ${username} 不存在 (tRPC NOT_FOUND)`);
      userExists = false;
    } else {
      console.error('获取用户信息失败:', error);
      userExists = false;
    }
  }

  // 如果用户不存在，返回404
  if (!userExists) {
    notFound();
  }

  // 重定向到标准的用户主页路径
  redirect(`/users/${username}`);
}
