/**
 * @fileoverview Cloudflare Turnstile 类型定义
 * @description 定义Turnstile相关的TypeScript类型和接口
 * @author Augment AI
 * @date 2025-07-09
 * @version 1.0.0
 */

/**
 * Turnstile 主题类型
 */
export type TurnstileTheme = 'light' | 'dark' | 'auto';

/**
 * Turnstile 大小类型
 */
export type TurnstileSize = 'normal' | 'compact';

/**
 * Turnstile 语言类型
 * 使用Cloudflare Turnstile官方支持的语言代码
 */
export type TurnstileLanguage = 'zh-cn' | 'zh-tw' | 'en' | 'ja' | 'ko' | 'fr' | 'de' | 'es' | 'pt' | 'ru' | 'auto';

/**
 * Turnstile 配置接口
 */
export interface TurnstileConfig {
  /** 站点密钥 */
  sitekey: string;
  /** 主题 */
  theme?: TurnstileTheme;
  /** 大小 */
  size?: TurnstileSize;
  /** 语言 */
  language?: TurnstileLanguage;
  /** 是否自动重试 */
  retry?: 'auto' | 'never';
  /** 重试间隔（毫秒） */
  'retry-interval'?: number;
  /** 刷新过期时间（毫秒） */
  'refresh-expired'?: 'auto' | 'manual' | 'never';
  /** 成功回调 */
  callback?: (token: string) => void;
  /** 错误回调 */
  'error-callback'?: (error: string) => void;
  /** 过期回调 */
  'expired-callback'?: () => void;
  /** 超时回调 */
  'timeout-callback'?: () => void;
}

/**
 * Turnstile 验证响应接口
 */
export interface TurnstileVerifyResponse {
  /** 验证是否成功 */
  success: boolean;
  /** 错误代码 */
  'error-codes'?: string[];
  /** 挑战时间戳 */
  challenge_ts?: string;
  /** 主机名 */
  hostname?: string;
  /** 操作 */
  action?: string;
  /** 客户端数据 */
  cdata?: string;
}

/**
 * Turnstile 验证请求接口
 */
export interface TurnstileVerifyRequest {
  /** 客户端响应token */
  response: string;
  /** 服务端密钥 */
  secret: string;
  /** 远程IP地址（可选） */
  remoteip?: string;
  /** 期望的操作（可选） */
  idempotency_key?: string;
}

/**
 * Turnstile 验证结果接口
 */
export interface TurnstileValidationResult {
  /** 验证是否成功 */
  success: boolean;
  /** 错误消息（如果验证失败） */
  errorMessage?: string;
  /** 错误代码（如果验证失败） */
  errorCode?: TurnstileErrorCode;
  /** 验证时间戳 */
  timestamp: Date;
  /** 响应时间（毫秒） */
  responseTime: number;
  /** 主机名（如果验证成功） */
  hostname?: string;
  /** 挑战时间戳（如果验证成功） */
  challengeTs?: string;
}

/**
 * Turnstile 组件属性接口
 */
export interface TurnstileWidgetProps {
  /** 站点密钥 */
  sitekey: string;
  /** 主题 */
  theme?: TurnstileTheme;
  /** 大小 */
  size?: TurnstileSize;
  /** 语言 */
  language?: TurnstileLanguage;
  /** 成功回调 */
  onSuccess?: (token: string) => void;
  /** 错误回调 */
  onError?: (error: string) => void;
  /** 过期回调 */
  onExpired?: () => void;
  /** 超时回调 */
  onTimeout?: () => void;
  /** 自定义CSS类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否自动重置 */
  autoReset?: boolean;
}

/**
 * Turnstile Widget Ref接口
 */
export interface TurnstileWidgetRef {
  /** 重置验证 */
  reset: () => void;
  /** 获取响应token */
  getResponse: () => string | null;
  /** 检查是否过期 */
  isExpired: () => boolean;
}

/**
 * Turnstile 管理配置接口
 */
export interface TurnstileAdminConfig {
  /** 功能ID */
  id: string;
  /** 功能名称 */
  name: string;
  /** 功能描述 */
  description: string;
  /** 是否启用 */
  enabled: boolean;
  /** 页面路径 */
  path: string;
  /** API端点 */
  apiEndpoint?: string;
  /** 优先级 */
  priority: 'P0' | 'P1' | 'P2';
  /** 最后更新时间 */
  updatedAt: Date;
  /** 更新者ID */
  updatedBy: string;
}

/**
 * Turnstile 统计数据接口
 */
export interface TurnstileStats {
  /** 功能ID */
  featureId: string;
  /** 总验证次数 */
  totalVerifications: number;
  /** 成功验证次数 */
  successfulVerifications: number;
  /** 失败验证次数 */
  failedVerifications: number;
  /** 成功率 */
  successRate: number;
  /** 今日验证次数 */
  todayVerifications: number;
  /** 本周验证次数 */
  weekVerifications: number;
  /** 本月验证次数 */
  monthVerifications: number;
  /** 最后验证时间 */
  lastVerification?: Date;
}

/**
 * Turnstile 日志接口
 */
export interface TurnstileLog {
  /** 日志ID */
  id: string;
  /** 功能ID */
  featureId: string;
  /** 用户ID（可选） */
  userId?: string;
  /** IP地址 */
  ipAddress: string;
  /** 用户代理 */
  userAgent: string;
  /** 验证结果 */
  success: boolean;
  /** 错误信息（如果有） */
  errorMessage?: string;
  /** 验证时间 */
  timestamp: Date;
  /** 响应时间（毫秒） */
  responseTime: number;
}

/**
 * Turnstile 错误类型
 */
export type TurnstileErrorCode =
  | 'missing-input-secret'
  | 'invalid-input-secret'
  | 'missing-input-response'
  | 'invalid-input-response'
  | 'bad-request'
  | 'timeout-or-duplicate'
  | 'internal-error';

/**
 * Turnstile 错误信息映射
 */
export const TURNSTILE_ERROR_MESSAGES: Record<TurnstileErrorCode, string> = {
  'missing-input-secret': '缺少服务端密钥',
  'invalid-input-secret': '无效的服务端密钥',
  'missing-input-response': '缺少客户端响应token',
  'invalid-input-response': '无效的客户端响应token',
  'bad-request': '请求格式错误',
  'timeout-or-duplicate': '验证超时或重复提交',
  'internal-error': '服务器内部错误'
};

/**
 * Turnstile 功能配置常量
 */
export const TURNSTILE_FEATURES = {
  USER_REGISTER: {
    id: 'USER_REGISTER',
    name: '用户注册',
    description: '用户注册页面的人机验证',
    path: '/auth/signup',
    apiEndpoint: 'api.auth.register',
    priority: 'P0' as const
  },
  USER_LOGIN: {
    id: 'USER_LOGIN',
    name: '用户登录',
    description: '用户登录页面的人机验证',
    path: '/auth/signin',
    apiEndpoint: 'NextAuth.js',
    priority: 'P0' as const
  },
  PASSWORD_RESET: {
    id: 'PASSWORD_RESET',
    name: '密码重置',
    description: '密码重置功能的人机验证',
    path: '/auth/forgot-password',
    apiEndpoint: 'api.auth.resetPassword',
    priority: 'P0' as const
  },
  GUEST_COMMENT: {
    id: 'GUEST_COMMENT',
    name: '游客评论',
    description: '游客用户发表评论的人机验证',
    path: '/posts/[id]',
    apiEndpoint: 'api.comment.create',
    priority: 'P2' as const
  },
  CONTENT_PUBLISH: {
    id: 'CONTENT_PUBLISH',
    name: '内容发布',
    description: '用户发布内容时的人机验证',
    path: '/create',
    apiEndpoint: 'api.post.create',
    priority: 'P1' as const
  },
  FILE_UPLOAD: {
    id: 'FILE_UPLOAD',
    name: '文件上传',
    description: '文件上传功能的人机验证',
    path: '/upload',
    apiEndpoint: 'api.file.upload',
    priority: 'P1' as const
  },
  PAYMENT_PROCESS: {
    id: 'PAYMENT_PROCESS',
    name: '支付处理',
    description: '支付流程中的人机验证',
    path: '/payment',
    apiEndpoint: 'api.payment.process',
    priority: 'P0' as const
  },
  ADMIN_OPERATIONS: {
    id: 'ADMIN_OPERATIONS',
    name: '管理员操作',
    description: '管理员敏感操作的人机验证',
    path: '/admin',
    apiEndpoint: 'api.admin.operations',
    priority: 'P0' as const
  }
} as const;

/**
 * Turnstile 功能类型
 */
export type TurnstileFeatureId = keyof typeof TURNSTILE_FEATURES;
