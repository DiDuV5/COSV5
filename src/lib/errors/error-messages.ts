/**
 * @fileoverview 错误消息映射表
 * @description 将技术性错误转换为用户友好的中文提示
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @/types/user-level: 用户等级类型
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { UserLevel } from '@/types/user-level';

/**
 * 错误上下文
 */
export interface ErrorContext {
  userLevel: UserLevel;
  environment: 'development' | 'production' | 'test';
  context: string;
}

/**
 * 错误消息配置
 */
interface ErrorMessageConfig {
  guest: string;      // 游客用户看到的消息
  user: string;       // 普通用户看到的消息
  creator: string;    // 创作者用户看到的消息
  admin: string;      // 管理员看到的消息
  technical?: string; // 技术详情（开发环境）
}

/**
 * 上传相关错误消息
 */
const UPLOAD_ERROR_MESSAGES: Record<string, ErrorMessageConfig> = {
  // 文件大小错误
  FILE_TOO_LARGE: {
    guest: '文件太大了，请选择较小的文件',
    user: '文件大小超出限制，请选择小于 50MB 的文件',
    creator: '文件大小超出您的上传限制，创作者可上传最大 500MB 的文件',
    admin: '文件大小超出系统限制，请检查系统设置中的文件大小配置',
    technical: 'File size exceeds the configured maximum upload limit',
  },

  // 文件格式错误
  UNSUPPORTED_FILE_TYPE: {
    guest: '不支持这种文件格式',
    user: '不支持的文件格式，请选择图片或视频文件',
    creator: '不支持的文件格式，支持的格式：JPG、PNG、WebP、GIF、MP4、WebM',
    admin: '文件格式不在允许列表中，请检查系统设置中的文件类型配置',
    technical: 'File type not in the allowed types list',
  },

  // 文件安全错误
  INVALID_FILE_TYPE: {
    guest: '文件类型不安全，禁止上传',
    user: '检测到不安全的文件类型，为了平台安全，禁止上传此类文件',
    creator: '文件类型存在安全风险，请上传安全的媒体文件（图片、视频、文档）',
    admin: '文件安全验证失败，检测到禁止的文件类型或可执行文件',
    technical: 'File type failed security validation - forbidden or executable file detected',
  },

  // 网络错误
  NETWORK_ERROR: {
    guest: '网络连接出现问题，请检查网络后重试',
    user: '网络连接不稳定，正在自动重试...',
    creator: '网络连接中断，系统将自动重试上传。您可以稍后继续',
    admin: '网络连接错误，请检查服务器网络配置',
    technical: 'Network connection failed or timed out',
  },

  // 上传超时
  UPLOAD_TIMEOUT: {
    guest: '上传超时，请重试',
    user: '上传时间过长，建议使用更稳定的网络环境',
    creator: '上传超时，大文件建议使用分片上传功能',
    admin: '上传超时，请检查服务器性能和网络配置',
    technical: 'Upload operation timed out',
  },

  // 分片上传错误
  CHUNK_UPLOAD_FAILED: {
    guest: '文件上传失败，请重试',
    user: '分片上传失败，正在自动重试...',
    creator: '分片上传出现问题，系统支持断点续传，请稍后继续',
    admin: '分片上传失败，请检查临时文件存储配置',
    technical: 'Chunk upload failed during multipart upload',
  },

  // 存储空间不足
  STORAGE_FULL: {
    guest: '存储空间不足，请联系管理员',
    user: '服务器存储空间不足，请稍后重试',
    creator: '存储空间不足，请清理一些旧文件或联系管理员',
    admin: '服务器存储空间不足，请扩展存储容量',
    technical: 'Server storage space is full',
  },

  // 文件处理错误
  FILE_PROCESSING_FAILED: {
    guest: '文件处理失败，请重试',
    user: '文件处理出现问题，请检查文件是否损坏',
    creator: '文件处理失败，可能是文件格式问题或文件损坏',
    admin: '文件处理失败，请检查图片/视频处理服务配置',
    technical: 'File processing (resize/transcode) failed',
  },

  // 缩略图生成失败
  THUMBNAIL_GENERATION_FAILED: {
    guest: '预览图生成失败，但文件已上传成功',
    user: '缩略图生成失败，不影响文件正常使用',
    creator: '缩略图生成失败，原文件已保存，可稍后重新生成',
    admin: '缩略图生成失败，请检查图片处理服务状态',
    technical: 'Thumbnail generation failed during image processing',
  },

  // 视频转码失败
  VIDEO_TRANSCODING_FAILED: {
    guest: '视频处理失败，请重试',
    user: '视频格式转换失败，请尝试其他格式的视频',
    creator: '视频转码失败，原视频已保存，建议使用 MP4 格式',
    admin: '视频转码失败，请检查 FFmpeg 服务配置',
    technical: 'Video transcoding failed during processing',
  },
};

/**
 * 权限相关错误消息
 */
const PERMISSION_ERROR_MESSAGES: Record<string, ErrorMessageConfig> = {
  // 未登录
  NOT_AUTHENTICATED: {
    guest: '请先登录后再进行此操作',
    user: '登录状态已过期，请重新登录',
    creator: '登录状态已过期，请重新登录',
    admin: '管理员登录状态已过期，请重新登录',
    technical: 'User not authenticated or session expired',
  },

  // 权限不足
  INSUFFICIENT_PERMISSIONS: {
    guest: '您没有权限进行此操作，请先注册登录',
    user: '您的账户权限不足，请联系管理员',
    creator: '您没有权限进行此操作',
    admin: '权限验证失败，请检查用户权限配置',
    technical: 'User does not have required permissions',
  },

  // 账户被禁用
  ACCOUNT_DISABLED: {
    guest: '账户已被禁用，请联系管理员',
    user: '您的账户已被暂停，请联系管理员了解详情',
    creator: '您的创作者账户已被暂停，请联系管理员',
    admin: '管理员账户被禁用，请联系超级管理员',
    technical: 'User account is disabled or suspended',
  },

  // 发布权限
  CANNOT_PUBLISH: {
    guest: '请先注册并完成认证后才能发布内容',
    user: '您的账户暂时无法发布内容，请完成身份认证',
    creator: '您的发布权限已被暂停，请联系管理员',
    admin: '发布权限检查失败，请检查用户权限配置',
    technical: 'User does not have publish permissions',
  },
};

/**
 * 系统相关错误消息
 */
const SYSTEM_ERROR_MESSAGES: Record<string, ErrorMessageConfig> = {
  // 服务器错误
  INTERNAL_SERVER_ERROR: {
    guest: '服务器出现问题，请稍后重试',
    user: '系统暂时不可用，我们正在修复中',
    creator: '服务器内部错误，请稍后重试或联系技术支持',
    admin: '服务器内部错误，请检查系统日志',
    technical: 'Internal server error occurred',
  },

  // 数据库错误
  DATABASE_ERROR: {
    guest: '数据保存失败，请重试',
    user: '数据库连接出现问题，请稍后重试',
    creator: '数据保存失败，请检查网络连接后重试',
    admin: '数据库操作失败，请检查数据库连接和配置',
    technical: 'Database operation failed',
  },

  // 速率限制
  RATE_LIMIT_EXCEEDED: {
    guest: '操作过于频繁，请稍后重试',
    user: '您的操作过于频繁，请等待 1 分钟后重试',
    creator: '上传频率超出限制，创作者每分钟最多上传 10 个文件',
    admin: 'API 调用频率超限，请检查速率限制配置',
    technical: 'Rate limit exceeded for this operation',
  },

  // 维护模式
  MAINTENANCE_MODE: {
    guest: '系统正在维护中，请稍后访问',
    user: '系统正在维护升级，预计 30 分钟后恢复',
    creator: '系统维护中，您的内容已保存，维护完成后可继续操作',
    admin: '系统处于维护模式，请在管理面板中关闭维护模式',
    technical: 'System is in maintenance mode',
  },
};

/**
 * 验证相关错误消息
 */
const VALIDATION_ERROR_MESSAGES: Record<string, ErrorMessageConfig> = {
  // 必填字段
  REQUIRED_FIELD: {
    guest: '请填写必要信息',
    user: '请填写所有必填字段',
    creator: '请完善内容信息，标题和描述为必填项',
    admin: '表单验证失败，请检查必填字段',
    technical: 'Required field validation failed',
  },

  // 格式错误
  INVALID_FORMAT: {
    guest: '输入格式不正确',
    user: '输入格式不正确，请检查后重新输入',
    creator: '内容格式不符合要求，请参考格式说明',
    admin: '数据格式验证失败，请检查输入格式',
    technical: 'Input format validation failed',
  },

  // 内容过长
  CONTENT_TOO_LONG: {
    guest: '内容太长了，请精简一下',
    user: '内容超出长度限制，请控制在规定字数内',
    creator: '内容超出长度限制，标题最多 100 字，描述最多 2000 字',
    admin: '内容长度超出系统限制，请检查字段长度配置',
    technical: 'Content length exceeds maximum allowed',
  },
};

/**
 * 获取用户友好的错误消息
 */
export function getErrorMessage(error: any, context: ErrorContext): string {
  const errorKey = extractErrorKey(error);
  const messageConfig = findErrorMessage(errorKey);

  if (!messageConfig) {
    return getDefaultErrorMessage(context);
  }

  // 根据用户等级返回相应消息
  let message = messageConfig.user; // 默认消息

  switch (context.userLevel) {
    case 'GUEST':
      message = messageConfig.guest;
      break;
    case 'USER':
      message = messageConfig.user;
      break;
    case 'CREATOR':
      message = messageConfig.creator;
      break;
    case 'ADMIN':
      message = messageConfig.admin;
      break;
  }

  // 开发环境显示技术详情
  if (context.environment === 'development' && messageConfig.technical) {
    message += ` (技术详情: ${messageConfig.technical})`;
  }

  return message;
}

/**
 * 提取错误关键字
 */
function extractErrorKey(error: any): string {
  if (!error) return 'UNKNOWN_ERROR';

  const message = error.message?.toLowerCase() || '';
  const code = error.code?.toLowerCase() || '';

  // 上传相关错误
  if (message.includes('file size') || message.includes('too large')) {
    return 'FILE_TOO_LARGE';
  }
  if (message.includes('file type') || message.includes('unsupported')) {
    return 'UNSUPPORTED_FILE_TYPE';
  }
  if (message.includes('network') || message.includes('timeout')) {
    return 'NETWORK_ERROR';
  }
  if (message.includes('chunk')) {
    return 'CHUNK_UPLOAD_FAILED';
  }
  if (message.includes('storage') || message.includes('space')) {
    return 'STORAGE_FULL';
  }
  if (message.includes('processing') || message.includes('transcode')) {
    return 'FILE_PROCESSING_FAILED';
  }
  if (message.includes('thumbnail')) {
    return 'THUMBNAIL_GENERATION_FAILED';
  }

  // 权限相关错误
  if (message.includes('unauthorized') || error.status === 401) {
    return 'NOT_AUTHENTICATED';
  }
  if (message.includes('forbidden') || error.status === 403) {
    return 'INSUFFICIENT_PERMISSIONS';
  }
  if (message.includes('disabled') || message.includes('suspended')) {
    return 'ACCOUNT_DISABLED';
  }
  if (message.includes('publish')) {
    return 'CANNOT_PUBLISH';
  }

  // 系统相关错误
  if (error.status >= 500 || message.includes('internal server')) {
    return 'INTERNAL_SERVER_ERROR';
  }
  if (message.includes('database')) {
    return 'DATABASE_ERROR';
  }
  if (message.includes('rate limit') || error.status === 429) {
    return 'RATE_LIMIT_EXCEEDED';
  }
  if (message.includes('maintenance')) {
    return 'MAINTENANCE_MODE';
  }

  // 验证相关错误
  if (message.includes('required')) {
    return 'REQUIRED_FIELD';
  }
  if (message.includes('invalid') || message.includes('format')) {
    return 'INVALID_FORMAT';
  }
  if (message.includes('too long') || message.includes('length')) {
    return 'CONTENT_TOO_LONG';
  }

  return 'UNKNOWN_ERROR';
}

/**
 * 查找错误消息配置
 */
function findErrorMessage(errorKey: string): ErrorMessageConfig | null {
  // 按优先级搜索错误消息
  const allMessages = {
    ...UPLOAD_ERROR_MESSAGES,
    ...PERMISSION_ERROR_MESSAGES,
    ...SYSTEM_ERROR_MESSAGES,
    ...VALIDATION_ERROR_MESSAGES,
  };

  return allMessages[errorKey] || null;
}

/**
 * 获取默认错误消息
 */
function getDefaultErrorMessage(context: ErrorContext): string {
  const defaultMessages = {
    GUEST: '操作失败，请重试',
    USER: '出现了一些问题，请稍后重试',
    VIP: '出现了一些问题，请稍后重试',
    CREATOR: '操作失败，请检查后重试或联系技术支持',
    ADMIN: '系统错误，请检查日志获取详细信息',
    SUPER_ADMIN: '系统错误，请检查日志获取详细信息',
  };

  return defaultMessages[context.userLevel as keyof typeof defaultMessages] || defaultMessages.USER;
}

/**
 * 获取上传相关的恢复建议
 */
export function getUploadRecoveryActions(error: any): string[] {
  const errorKey = extractErrorKey(error);

  const recoveryMap: Record<string, string[]> = {
    FILE_TOO_LARGE: [
      '压缩文件大小',
      '使用分片上传',
      '联系管理员提升限制',
    ],
    UNSUPPORTED_FILE_TYPE: [
      '转换文件格式',
      '检查支持的格式列表',
      '使用推荐的文件格式',
    ],
    NETWORK_ERROR: [
      '检查网络连接',
      '切换到更稳定的网络',
      '稍后重试',
    ],
    CHUNK_UPLOAD_FAILED: [
      '使用断点续传',
      '检查网络稳定性',
      '减小分片大小',
    ],
  };

  return recoveryMap[errorKey] || [
    '刷新页面重试',
    '检查网络连接',
    '联系技术支持',
  ];
}
