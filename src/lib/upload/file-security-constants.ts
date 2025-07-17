/**
 * @fileoverview 文件安全配置常量 - CoserEden平台
 * @description 定义严格的文件上传安全策略，禁止可执行文件类型
 * @author Augment AI
 * @date 2025-06-21
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * import { FORBIDDEN_FILE_TYPES, ALLOWED_FILE_TYPES } from '@/lib/upload/file-security-constants';
 * 
 * // 检查文件是否被禁止
 * const isForbidden = FORBIDDEN_FILE_TYPES.EXECUTABLES.includes('.exe');
 * 
 * // 检查文件是否在白名单中
 * const isAllowed = ALLOWED_FILE_TYPES.IMAGES.includes('image/jpeg');
 * ```
 *
 * @dependencies
 * - 无外部依赖
 *
 * @changelog
 * - 2025-06-21: 初始版本创建，实现严格文件安全策略
 */

/**
 * 禁止的文件类型 - 完全禁止上传的文件扩展名
 * 基于CoserEden 4600+专业cosplay创作者平台安全需求
 */
export const FORBIDDEN_FILE_TYPES = {
  /** 服务器脚本文件（完全禁止） */
  SERVER_SCRIPTS: [
    // Web脚本
    '.php', '.php3', '.php4', '.php5', '.phtml',
    '.jsp', '.jspx', '.jsw', '.jsv',
    '.asp', '.aspx', '.asa', '.asax',
    '.cfm', '.cfml', '.cfc',
    
    // 脚本语言
    '.py', '.pyc', '.pyo', '.pyw',
    '.rb', '.rbw',
    '.pl', '.pm', '.t',
    '.cgi', '.fcgi', '.wsgi',
    
    // 模板文件
    '.erb', '.ejs', '.hbs', '.twig',
    '.mustache', '.handlebars',
  ],

  /** 可执行程序文件（完全禁止） */
  EXECUTABLES: [
    // Windows可执行
    '.exe', '.bat', '.cmd', '.com', '.scr', '.pif',
    '.msi', '.msp', '.mst',
    '.dll', '.sys', '.drv',
    '.cpl', '.ocx', '.ax',
    
    // Unix/Linux可执行
    '.sh', '.bash', '.zsh', '.fish', '.csh', '.tcsh',
    '.run', '.bin', '.out',
    '.app', '.deb', '.rpm',
    
    // 脚本文件
    '.ps1', '.ps2', '.psc1', '.psc2',
    '.vbs', '.vbe', '.vb',
    '.js', '.jse', '.wsf', '.wsh',
  ],

  /** 配置和系统文件（完全禁止） */
  SYSTEM_CONFIG: [
    // 服务器配置
    '.htaccess', '.htpasswd', '.htgroups',
    '.nginx', '.apache', '.conf',
    '.config', '.ini', '.cfg', '.properties',
    
    // 应用配置
    '.env', '.environment',
    '.yaml', '.yml', '.toml',
    '.json', '.xml', '.plist',
    
    // 数据库文件
    '.sql', '.db', '.sqlite', '.sqlite3',
    '.mdb', '.accdb', '.dbf',
  ],

  /** 压缩包中的危险文件 */
  DANGEROUS_IN_ARCHIVES: [
    // 自解压文件
    '.exe', '.bat', '.cmd', '.scr',
    '.jar', '.war', '.ear',
    
    // 宏文件
    '.docm', '.xlsm', '.pptm',
    '.dotm', '.xltm', '.potm',
  ],
} as const;

/**
 * 允许的文件类型白名单 - 仅允许这些类型上传
 * 基于CoserEden专业cosplay创作者需求
 */
export const ALLOWED_FILE_TYPES = {
  /** 图片文件 - 支持的MIME类型 */
  IMAGES: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
  ],

  /** 图片文件 - 支持的扩展名 */
  IMAGE_EXTENSIONS: [
    '.jpg', '.jpeg', '.png', '.gif', 
    '.webp', '.svg', '.bmp', '.tiff', '.tif',
  ],

  /** 视频文件 - 支持的MIME类型（需H.264编码验证） */
  VIDEOS: [
    'video/mp4',
    'video/webm',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/flv',
    'video/mkv',
  ],

  /** 视频文件 - 支持的扩展名 */
  VIDEO_EXTENSIONS: [
    '.mp4', '.webm', '.avi', '.mov',
    '.wmv', '.flv', '.mkv', '.m4v',
  ],

  /** 文档文件 - 支持的MIME类型 */
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/rtf',
  ],

  /** 文档文件 - 支持的扩展名 */
  DOCUMENT_EXTENSIONS: [
    '.pdf', '.doc', '.docx', '.txt', '.rtf',
  ],

  /** 压缩文件 - 支持的MIME类型（需内容扫描） */
  ARCHIVES: [
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
    'application/x-tar',
  ],

  /** 压缩文件 - 支持的扩展名 */
  ARCHIVE_EXTENSIONS: [
    '.zip', '.rar', '.7z', '.gz', '.tar',
  ],
} as const;

/**
 * 文件大小限制配置
 */
export const FILE_SIZE_LIMITS = {
  /** 图片文件大小限制 */
  IMAGES: {
    USER: 10 * 1024 * 1024,      // 10MB - 普通用户
    VIP: 25 * 1024 * 1024,       // 25MB - VIP用户
    CREATOR: 50 * 1024 * 1024,   // 50MB - 创作者
    ADMIN: 100 * 1024 * 1024,    // 100MB - 管理员
  },

  /** 视频文件大小限制 */
  VIDEOS: {
    USER: 0,                      // 0MB - 普通用户不允许上传视频
    VIP: 100 * 1024 * 1024,      // 100MB - VIP用户
    CREATOR: 1024 * 1024 * 1024, // 1GB - 创作者
    ADMIN: 2 * 1024 * 1024 * 1024, // 2GB - 管理员
  },

  /** 文档文件大小限制 */
  DOCUMENTS: {
    USER: 5 * 1024 * 1024,       // 5MB - 普通用户
    VIP: 10 * 1024 * 1024,       // 10MB - VIP用户
    CREATOR: 25 * 1024 * 1024,   // 25MB - 创作者
    ADMIN: 50 * 1024 * 1024,     // 50MB - 管理员
  },

  /** 压缩文件大小限制 */
  ARCHIVES: {
    USER: 0,                      // 0MB - 普通用户不允许上传压缩包
    VIP: 50 * 1024 * 1024,       // 50MB - VIP用户
    CREATOR: 100 * 1024 * 1024,  // 100MB - 创作者
    ADMIN: 200 * 1024 * 1024,    // 200MB - 管理员
  },
} as const;

/**
 * 安全验证配置
 */
export const SECURITY_VALIDATION_CONFIG = {
  /** 是否启用严格模式（生产环境建议启用） */
  STRICT_MODE: process.env.NODE_ENV === 'production',

  /** 是否验证文件头魔数 */
  VALIDATE_FILE_HEADERS: true,

  /** 是否扫描压缩包内容 */
  SCAN_ARCHIVE_CONTENTS: true,

  /** 最大文件名长度 */
  MAX_FILENAME_LENGTH: 255,

  /** 禁止的文件名模式 */
  FORBIDDEN_FILENAME_PATTERNS: [
    /\.(exe|bat|cmd|scr|pif)$/i,
    /\.(php|jsp|asp|cgi)$/i,
    /\.(js|vbs|ps1)$/i,
    /\.\./, // 路径遍历
    /[<>:"|?*]/, // Windows禁止字符
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows保留名
  ],

  /** 双扩展名检测模式 */
  DOUBLE_EXTENSION_PATTERNS: [
    /\.(jpg|png|gif|mp4)\.exe$/i,
    /\.(pdf|doc|txt)\.bat$/i,
    /\.(zip|rar)\.scr$/i,
  ],
} as const;

/**
 * 获取所有禁止的文件扩展名
 */
export function getAllForbiddenExtensions(): string[] {
  return [
    ...FORBIDDEN_FILE_TYPES.SERVER_SCRIPTS,
    ...FORBIDDEN_FILE_TYPES.EXECUTABLES,
    ...FORBIDDEN_FILE_TYPES.SYSTEM_CONFIG,
    ...FORBIDDEN_FILE_TYPES.DANGEROUS_IN_ARCHIVES,
  ];
}

/**
 * 获取所有允许的文件扩展名
 */
export function getAllAllowedExtensions(): string[] {
  return [
    ...ALLOWED_FILE_TYPES.IMAGE_EXTENSIONS,
    ...ALLOWED_FILE_TYPES.VIDEO_EXTENSIONS,
    ...ALLOWED_FILE_TYPES.DOCUMENT_EXTENSIONS,
    ...ALLOWED_FILE_TYPES.ARCHIVE_EXTENSIONS,
  ];
}

/**
 * 获取所有允许的MIME类型
 */
export function getAllAllowedMimeTypes(): string[] {
  return [
    ...ALLOWED_FILE_TYPES.IMAGES,
    ...ALLOWED_FILE_TYPES.VIDEOS,
    ...ALLOWED_FILE_TYPES.DOCUMENTS,
    ...ALLOWED_FILE_TYPES.ARCHIVES,
  ];
}

/**
 * 根据用户级别获取文件大小限制
 */
export function getFileSizeLimit(
  fileType: 'IMAGES' | 'VIDEOS' | 'DOCUMENTS' | 'ARCHIVES',
  userLevel: 'USER' | 'VIP' | 'CREATOR' | 'ADMIN'
): number {
  return FILE_SIZE_LIMITS[fileType][userLevel];
}
