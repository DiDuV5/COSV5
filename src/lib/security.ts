/**
 * @fileoverview 安全相关工具函数
 * @description 用户名黑名单、密码验证、安全检查等功能
 * @author Augment AI
 * @date 2024-06-08
 * @version 1.0.0
 */

// 禁止注册的用户名黑名单（防止恶意用户注册管理员相关账号）
const FORBIDDEN_USERNAMES = [
  // 管理员相关
  'admin', 'administrator', 'root', 'superuser', 'moderator', 'mod',
  'owner', 'master', 'manager', 'operator', 'staff', 'support',

  // 系统相关
  'system', 'api', 'bot', 'service', 'daemon', 'cron', 'backup',
  'test', 'demo', 'guest', 'anonymous', 'null', 'undefined',

  // 平台相关
  'tu', 'cosplay', 'platform', 'official', 'team', 'help',
  'info', 'contact', 'about', 'news', 'blog', 'forum',

  // 常见服务
  'www', 'mail', 'email', 'ftp', 'ssh', 'dns', 'cdn',
  'static', 'assets', 'media', 'upload', 'download',

  // 敏感词汇
  'security', 'password', 'login', 'register', 'auth',
  'config', 'settings', 'database', 'server', 'console',

  // 保留的特殊用户名（注意：douyu 作为预设管理员用户名，在注册逻辑中特殊处理）
];

// 敏感用户名模式（正则表达式）
const SENSITIVE_PATTERNS = [
  /^admin/i,           // 以 admin 开头
  /admin$/i,           // 以 admin 结尾
  /^root/i,            // 以 root 开头
  /^mod/i,             // 以 mod 开头
  /^super/i,           // 以 super 开头
  /^master/i,          // 以 master 开头
  /^owner/i,           // 以 owner 开头
  /^(?!^douyu$).*douyu/i, // 包含 douyu 但不是精确的 "douyu"（保护管理员账号）
];

/**
 * 检查用户名是否被禁止注册
 * @param username 要检查的用户名
 * @returns 如果被禁止返回 true，否则返回 false
 */
export function isForbiddenUsername(username: string): boolean {
  if (!username) return true;

  const normalizedUsername = username.toLowerCase().trim();

  // 特殊处理：允许精确的 "douyu" 用户名（预设管理员）
  if (normalizedUsername === 'douyu') {
    return false;
  }

  // 检查黑名单
  if (FORBIDDEN_USERNAMES.includes(normalizedUsername)) {
    return true;
  }

  // 检查敏感模式
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(normalizedUsername)) {
      return true;
    }
  }

  return false;
}

/**
 * 获取用户名禁止的原因
 * @param username 用户名
 * @returns 禁止原因的描述
 */
export function getForbiddenUsernameReason(username: string): string {
  if (!username) return '用户名不能为空';

  const normalizedUsername = username.toLowerCase().trim();

  // 特殊处理：允许精确的 "douyu" 用户名（预设管理员）
  if (normalizedUsername === 'douyu') {
    return ''; // 不禁止
  }

  if (FORBIDDEN_USERNAMES.includes(normalizedUsername)) {
    return '该用户名为系统保留用户名，无法注册';
  }

  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(normalizedUsername)) {
      return '该用户名包含敏感词汇，请选择其他用户名';
    }
  }

  return '用户名不符合规范';
}

/**
 * 验证用户名格式
 * @param username 用户名
 * @param minLength 最小长度（可选，默认为3）
 * @returns 验证结果
 */
export function validateUsername(username: string, minLength: number = 5): {
  isValid: boolean;
  error?: string;
} {
  if (!username) {
    return { isValid: false, error: '用户名不能为空' };
  }

  const trimmedUsername = username.trim();

  // 长度检查
  if (trimmedUsername.length < minLength) {
    return { isValid: false, error: `用户名至少需要${minLength}个字符` };
  }

  if (trimmedUsername.length > 20) {
    return { isValid: false, error: '用户名不能超过20个字符' };
  }

  // 格式检查（只允许字母、数字、下划线、中文）
  const usernameRegex = /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/;
  if (!usernameRegex.test(trimmedUsername)) {
    return { isValid: false, error: '用户名只能包含字母、数字、下划线和中文字符' };
  }

  // 不能以数字开头
  if (/^\d/.test(trimmedUsername)) {
    return { isValid: false, error: '用户名不能以数字开头' };
  }

  // 检查是否被禁止
  if (isForbiddenUsername(trimmedUsername)) {
    return { isValid: false, error: getForbiddenUsernameReason(trimmedUsername) };
  }

  return { isValid: true };
}

/**
 * 验证密码强度
 * @param password 密码
 * @param options 密码策略选项
 * @returns 验证结果
 */
export function validatePassword(password: string, options?: {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSymbols?: boolean;
}): {
  isValid: boolean;
  error?: string;
  strength: 'weak' | 'medium' | 'strong';
} {
  if (!password) {
    return { isValid: false, error: '密码不能为空', strength: 'weak' };
  }

  // 自动去除前导和尾随空格
  const trimmedPassword = password.trim();

  // 检查是否包含空格
  if (/\s/.test(trimmedPassword)) {
    return { isValid: false, error: '密码不能包含空格字符', strength: 'weak' };
  }

  // 使用传入的选项或默认值
  const minLength = options?.minLength ?? 8;
  const requireUppercase = options?.requireUppercase ?? false;
  const requireLowercase = options?.requireLowercase ?? false;
  const requireNumbers = options?.requireNumbers ?? true; // 默认要求数字
  const requireSymbols = options?.requireSymbols ?? false;

  // 长度检查（使用清理后的密码）
  if (trimmedPassword.length < minLength) {
    return { isValid: false, error: `密码至少需要${minLength}个字符`, strength: 'weak' };
  }

  if (trimmedPassword.length > 128) {
    return { isValid: false, error: '密码不能超过128个字符', strength: 'weak' };
  }

  // 强度检查（使用清理后的密码）
  let score = 0;
  const checks = {
    hasLower: /[a-z]/.test(trimmedPassword),
    hasUpper: /[A-Z]/.test(trimmedPassword),
    hasNumber: /\d/.test(trimmedPassword),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(trimmedPassword),
    hasLength: trimmedPassword.length >= 12,
  };

  Object.values(checks).forEach(check => {
    if (check) score++;
  });

  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (score >= 4) strength = 'strong';
  else if (score >= 3) strength = 'medium';

  // 根据系统设置检查密码要求
  if (requireUppercase && !checks.hasUpper) {
    return { isValid: false, error: '密码必须包含大写字母', strength };
  }

  if (requireLowercase && !checks.hasLower) {
    return { isValid: false, error: '密码必须包含小写字母', strength };
  }

  if (requireNumbers && !checks.hasNumber) {
    return { isValid: false, error: '密码必须包含数字', strength };
  }

  if (requireSymbols && !checks.hasSpecial) {
    return { isValid: false, error: '密码必须包含特殊字符', strength };
  }

  // 如果没有特定要求，至少要求字母和数字（向后兼容）
  if (!requireUppercase && !requireLowercase && !checks.hasLower && !checks.hasUpper) {
    return { isValid: false, error: '密码必须包含字母', strength };
  }

  return { isValid: true, strength };
}

/**
 * 检查邮箱是否为管理员邮箱
 * @param email 邮箱地址
 * @returns 是否为管理员邮箱
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = [
    process.env.COSEREEDEN_INITIAL_ADMIN_EMAIL,
    'kellisonyd@gmail.com', // 备用管理员邮箱
  ].filter(Boolean);

  return adminEmails.includes(email?.toLowerCase());
}

/**
 * 生成安全的随机字符串
 * @param length 长度
 * @returns 随机字符串
 */
export function generateSecureRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
