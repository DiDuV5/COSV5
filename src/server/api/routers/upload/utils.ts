/**
 * @fileoverview 上传路由工具函数
 * @description 提供上传相关的工具函数
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

/**
 * 从文件缓冲区和文件名检测MIME类型
 */
export function detectMimeTypeFromBuffer(buffer: Buffer, filename: string): string {
  // 基于文件扩展名的基本检测
  const ext = filename.toLowerCase().split('.').pop() || '';

  // 视频文件类型映射
  const videoTypes: Record<string, string> = {
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'avi': 'video/avi',
    'mov': 'video/mov',
    'mkv': 'video/mkv',
    'flv': 'video/flv',
    'wmv': 'video/wmv',
    'm4v': 'video/m4v',
  };

  // 图片文件类型映射
  const imageTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'bmp': 'image/bmp',
    'tiff': 'image/tiff',
    'svg': 'image/svg+xml',
  };

  // 检查视频类型
  if (videoTypes[ext]) {
    return videoTypes[ext];
  }

  // 检查图片类型
  if (imageTypes[ext]) {
    return imageTypes[ext];
  }

  // 基于文件头的检测（魔数）
  if (buffer.length >= 4) {
    const header = buffer.slice(0, 4);

    // MP4文件魔数
    if (buffer.slice(4, 8).toString() === 'ftyp') {
      return 'video/mp4';
    }

    // PNG文件魔数
    if (header.equals(Buffer.from([0x89, 0x50, 0x4E, 0x47]))) {
      return 'image/png';
    }

    // JPEG文件魔数
    if (header.slice(0, 2).equals(Buffer.from([0xFF, 0xD8]))) {
      return 'image/jpeg';
    }

    // GIF文件魔数
    if (header.slice(0, 3).toString() === 'GIF') {
      return 'image/gif';
    }
  }

  // 默认返回二进制类型
  return 'application/octet-stream';
}

/**
 * 检查是否为TRPCError
 */
export function isTRPCError(error: unknown): error is { code: string } {
  return error !== null && typeof error === 'object' && 'code' in error;
}

/**
 * 获取错误消息
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * 检查用户是否为管理员
 */
export function isAdmin(userLevel: string): boolean {
  return ['ADMIN', 'SUPER_ADMIN'].includes(userLevel);
}

/**
 * 检查用户是否为文件所有者
 */
export function isFileOwner(userId: string, authorId: string): boolean {
  return userId === authorId;
}
