/**
 * @fileoverview 路径安全验证器 - CoserEden平台第二阶段稳定性增强
 * @description 防止路径遍历攻击，确保文件上传路径安全性和跨平台兼容性
 * @author Augment AI
 * @date 2024-12-15
 * @version 2.0.0
 * @since 2.0.0
 *
 * @example
 * // 使用路径安全验证器
 * const isValid = PathSecurityValidator.validatePath('/uploads/media/file.jpg');
 *
 * @dependencies
 * - path: Node.js路径处理模块
 *
 * @changelog
 * - 2024-12-15: 初始版本创建，实现路径安全验证
 */

import * as path from 'path';

/**
 * 路径验证配置
 */
export interface PathValidationConfig {
  allowedBasePaths: string[];      // 允许的基础路径
  maxPathLength: number;           // 最大路径长度
  maxDepth: number;               // 最大目录深度
  allowAbsolutePaths: boolean;    // 是否允许绝对路径
  allowSymlinks: boolean;         // 是否允许符号链接
  blockedPatterns: RegExp[];      // 阻止的路径模式
  allowedExtensions: string[];    // 允许的文件扩展名
}

/**
 * 路径验证结果
 */
export interface PathValidationResult {
  isValid: boolean;
  normalizedPath: string;
  securityIssues: string[];
  warnings: string[];
  metadata: {
    isAbsolute: boolean;
    depth: number;
    extension: string;
    containsTraversal: boolean;
    containsSpecialChars: boolean;
  };
}

/**
 * 安全路径信息
 */
export interface SecurePathInfo {
  originalPath: string;
  securePath: string;
  basePath: string;
  relativePath: string;
  filename: string;
  directory: string;
  isSecure: boolean;
}

/**
 * 路径安全验证器
 */
export class PathSecurityValidator {
  private static readonly DEFAULT_CONFIG: PathValidationConfig = {
    allowedBasePaths: ['/uploads', '/media', '/temp'],
    maxPathLength: 4096,
    maxDepth: 10,
    allowAbsolutePaths: false,
    allowSymlinks: false,
    blockedPatterns: [
      /\.\./,                    // 路径遍历
      /\/\.\./,                  // 路径遍历
      /\.\.\//,                  // 路径遍历
      /~\//,                     // 用户目录
      /\/etc\//,                 // 系统配置目录
      /\/proc\//,                // 进程目录
      /\/sys\//,                 // 系统目录
      /\/dev\//,                 // 设备目录
      /\/var\/log\//,            // 日志目录
      /\/tmp\//,                 // 临时目录（除非明确允许）
      /\0/,                      // null字节
      /[\x00-\x1f\x7f]/,        // 控制字符
    ],
    allowedExtensions: [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg',
      '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv',
      '.pdf', '.doc', '.docx', '.txt', '.zip', '.rar'
    ]
  };

  /**
   * 验证路径安全性
   */
  static validatePath(
    inputPath: string,
    config: Partial<PathValidationConfig> = {}
  ): PathValidationResult {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const securityIssues: string[] = [];
    const warnings: string[] = [];

    console.log(`🔒 验证路径安全性: ${inputPath}`);

    // 初始化结果
    const result: PathValidationResult = {
      isValid: true,
      normalizedPath: inputPath,
      securityIssues,
      warnings,
      metadata: {
        isAbsolute: path.isAbsolute(inputPath),
        depth: 0,
        extension: path.extname(inputPath).toLowerCase(),
        containsTraversal: false,
        containsSpecialChars: false
      }
    };

    // 1. 基本安全检查
    if (!inputPath || typeof inputPath !== 'string') {
      securityIssues.push('路径为空或类型无效');
      result.isValid = false;
      return result;
    }

    // 2. 长度检查
    if (inputPath.length > finalConfig.maxPathLength) {
      securityIssues.push(`路径长度超过限制 (${finalConfig.maxPathLength})`);
      result.isValid = false;
    }

    // 3. 路径遍历检查
    if (this.containsPathTraversal(inputPath)) {
      securityIssues.push('检测到路径遍历攻击');
      result.metadata.containsTraversal = true;
      result.isValid = false;
    }

    // 4. 特殊字符检查
    if (this.containsSpecialChars(inputPath)) {
      securityIssues.push('包含危险的特殊字符');
      result.metadata.containsSpecialChars = true;
      result.isValid = false;
    }

    // 5. 阻止模式检查
    for (const pattern of finalConfig.blockedPatterns) {
      if (pattern.test(inputPath)) {
        securityIssues.push(`匹配阻止模式: ${pattern.source}`);
        result.isValid = false;
      }
    }

    // 6. 绝对路径检查
    if (result.metadata.isAbsolute && !finalConfig.allowAbsolutePaths) {
      securityIssues.push('不允许绝对路径');
      result.isValid = false;
    }

    // 7. 规范化路径
    try {
      result.normalizedPath = path.normalize(inputPath);
      
      // 检查规范化后是否仍然安全
      if (result.normalizedPath !== inputPath) {
        warnings.push('路径已规范化');
      }
      
      // 再次检查规范化后的路径遍历
      if (this.containsPathTraversal(result.normalizedPath)) {
        securityIssues.push('规范化后仍包含路径遍历');
        result.isValid = false;
      }
    } catch (error) {
      securityIssues.push('路径规范化失败');
      result.isValid = false;
    }

    // 8. 计算目录深度
    result.metadata.depth = this.calculatePathDepth(result.normalizedPath);
    if (result.metadata.depth > finalConfig.maxDepth) {
      securityIssues.push(`目录深度超过限制 (${finalConfig.maxDepth})`);
      result.isValid = false;
    }

    // 9. 扩展名检查
    if (result.metadata.extension && finalConfig.allowedExtensions.length > 0) {
      if (!finalConfig.allowedExtensions.includes(result.metadata.extension)) {
        securityIssues.push(`不允许的文件扩展名: ${result.metadata.extension}`);
        result.isValid = false;
      }
    }

    // 10. 基础路径检查
    if (finalConfig.allowedBasePaths.length > 0) {
      const isAllowedBasePath = finalConfig.allowedBasePaths.some(basePath => 
        result.normalizedPath.startsWith(basePath)
      );
      
      if (!isAllowedBasePath) {
        securityIssues.push('路径不在允许的基础路径内');
        result.isValid = false;
      }
    }

    console.log(`${result.isValid ? '✅' : '❌'} 路径验证${result.isValid ? '通过' : '失败'}: ${inputPath}`);
    
    return result;
  }

  /**
   * 生成安全路径
   */
  static generateSecurePath(
    filename: string,
    basePath: string = '/uploads',
    subfolder: string = 'media'
  ): SecurePathInfo {
    // 清理文件名
    const cleanFilename = this.sanitizeFilename(filename);
    
    // 构建安全路径
    const relativePath = path.join(subfolder, cleanFilename);
    const securePath = path.join(basePath, relativePath);
    const normalizedPath = path.normalize(securePath);
    
    // 验证生成的路径
    const validation = this.validatePath(normalizedPath);
    
    return {
      originalPath: filename,
      securePath: normalizedPath,
      basePath,
      relativePath,
      filename: cleanFilename,
      directory: path.dirname(normalizedPath),
      isSecure: validation.isValid
    };
  }

  /**
   * 批量验证路径
   */
  static validatePaths(
    paths: string[],
    config: Partial<PathValidationConfig> = {}
  ): PathValidationResult[] {
    console.log(`📦 批量验证 ${paths.length} 个路径`);
    
    return paths.map(path => this.validatePath(path, config));
  }

  /**
   * 检查路径是否在允许的目录内
   */
  static isPathWithinAllowedDirectory(
    targetPath: string,
    allowedDirectory: string
  ): boolean {
    try {
      const normalizedTarget = path.resolve(targetPath);
      const normalizedAllowed = path.resolve(allowedDirectory);
      
      return normalizedTarget.startsWith(normalizedAllowed + path.sep) ||
             normalizedTarget === normalizedAllowed;
    } catch (error) {
      return false;
    }
  }

  /**
   * 创建安全的上传路径
   */
  static createSafeUploadPath(
    originalFilename: string,
    userId: string,
    uploadType: 'image' | 'video' | 'document' = 'image'
  ): SecurePathInfo {
    // 生成基于时间和用户的安全路径
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const userFolder = this.sanitizeFilename(userId);
    const typeFolder = uploadType;
    
    const subfolder = path.join(typeFolder, timestamp, userFolder);
    
    return this.generateSecurePath(originalFilename, '/uploads', subfolder);
  }

  // 私有辅助方法

  private static containsPathTraversal(inputPath: string): boolean {
    const traversalPatterns = [
      '../',
      '..\\',
      '/..',
      '\\..',
      '%2e%2e%2f',
      '%2e%2e%5c',
      '..%2f',
      '..%5c',
      '%252e%252e%252f',
      '%252e%252e%255c'
    ];

    const lowerPath = inputPath.toLowerCase();
    return traversalPatterns.some(pattern => lowerPath.includes(pattern));
  }

  private static containsSpecialChars(inputPath: string): boolean {
    // 检查危险的特殊字符
    const dangerousChars = /[\x00-\x1f\x7f<>:"|?*]/;
    return dangerousChars.test(inputPath);
  }

  private static calculatePathDepth(inputPath: string): number {
    const normalizedPath = path.normalize(inputPath);
    const parts = normalizedPath.split(path.sep).filter(part => part && part !== '.');
    return parts.length;
  }

  private static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"|?*\x00-\x1f\x7f]/g, '_') // 替换危险字符
      .replace(/^\.+/, '') // 移除开头的点
      .replace(/\.+$/, '') // 移除结尾的点
      .replace(/\s+/g, '_') // 替换空格
      .substring(0, 255); // 限制长度
  }

  /**
   * 获取路径安全统计信息
   */
  static getSecurityStats(results: PathValidationResult[]): {
    totalPaths: number;
    validPaths: number;
    invalidPaths: number;
    commonIssues: Record<string, number>;
    securityScore: number;
  } {
    const totalPaths = results.length;
    const validPaths = results.filter(r => r.isValid).length;
    const invalidPaths = totalPaths - validPaths;
    
    const commonIssues: Record<string, number> = {};
    
    results.forEach(result => {
      result.securityIssues.forEach(issue => {
        commonIssues[issue] = (commonIssues[issue] || 0) + 1;
      });
    });
    
    const securityScore = totalPaths > 0 ? (validPaths / totalPaths) * 100 : 100;
    
    return {
      totalPaths,
      validPaths,
      invalidPaths,
      commonIssues,
      securityScore
    };
  }
}
