/**
 * @fileoverview 文件名处理器 - CoserEden平台第二阶段稳定性增强
 * @description 处理中文文件名、特殊字符、极长文件名等边缘情况，确保100%兼容性
 * @author Augment AI
 * @date 2024-12-15
 * @version 2.0.0
 * @since 2.0.0
 *
 * @example
 * // 使用文件名处理器
 * const safeFilename = FilenameProcessor.processSafely('🎈Coser展馆🔗TG@coserdh (17).mp4');
 *
 * @dependencies
 * - crypto: 用于生成唯一标识符
 *
 * @changelog
 * - 2024-12-15: 初始版本创建，实现中文文件名处理
 */

import * as crypto from 'crypto';

/**
 * 文件名处理配置
 */
export interface FilenameConfig {
  maxLength: number;              // 最大文件名长度
  preserveOriginal: boolean;      // 是否保留原始文件名
  enableUnicodeSupport: boolean;  // 是否启用Unicode支持
  conflictResolution: 'increment' | 'timestamp' | 'hash'; // 冲突解决策略
  allowedCharacters: string;      // 允许的字符集
  replacementChar: string;        // 替换字符
}

/**
 * 文件名处理结果
 */
export interface FilenameResult {
  originalName: string;
  processedName: string;
  safeName: string;
  extension: string;
  hasChanges: boolean;
  warnings: string[];
  metadata: {
    originalLength: number;
    processedLength: number;
    unicodeCharCount: number;
    specialCharCount: number;
    truncated: boolean;
  };
}

/**
 * 平台兼容性信息
 */
export interface PlatformCompatibility {
  windows: boolean;
  linux: boolean;
  macos: boolean;
  web: boolean;
  issues: string[];
}

/**
 * 文件名处理器
 * 专门处理CoserEden平台的中文文件名和特殊字符
 */
export class FilenameProcessor {
  private static readonly DEFAULT_CONFIG: FilenameConfig = {
    maxLength: 255,
    preserveOriginal: true,
    enableUnicodeSupport: true,
    conflictResolution: 'timestamp',
    allowedCharacters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-()[]{}',
    replacementChar: '_'
  };

  // Windows保留文件名
  private static readonly WINDOWS_RESERVED_NAMES = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ];

  // 不安全字符映射
  private static readonly UNSAFE_CHAR_MAP: Record<string, string> = {
    '<': '＜',
    '>': '＞',
    ':': '：',
    '"': '＂',
    '|': '｜',
    '?': '？',
    '*': '＊',
    '/': '／',
    '\\': '＼',
    '\0': '',
    '\x01': '', '\x02': '', '\x03': '', '\x04': '', '\x05': '', '\x06': '', '\x07': '',
    '\x08': '', '\x09': '', '\x0A': '', '\x0B': '', '\x0C': '', '\x0D': '', '\x0E': '',
    '\x0F': '', '\x10': '', '\x11': '', '\x12': '', '\x13': '', '\x14': '', '\x15': '',
    '\x16': '', '\x17': '', '\x18': '', '\x19': '', '\x1A': '', '\x1B': '', '\x1C': '',
    '\x1D': '', '\x1E': '', '\x1F': ''
  };

  /**
   * 安全处理文件名
   */
  static processSafely(
    filename: string,
    config: Partial<FilenameConfig> = {}
  ): FilenameResult {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const warnings: string[] = [];
    
    console.log(`🔍 处理文件名: ${filename}`);
    
    // 分离文件名和扩展名
    const { name, extension } = this.separateNameAndExtension(filename);
    
    // 初始化结果
    const result: FilenameResult = {
      originalName: filename,
      processedName: filename,
      safeName: filename,
      extension,
      hasChanges: false,
      warnings,
      metadata: {
        originalLength: filename.length,
        processedLength: filename.length,
        unicodeCharCount: this.countUnicodeChars(filename),
        specialCharCount: this.countSpecialChars(filename),
        truncated: false
      }
    };

    let processedName = name;

    // 1. 处理空文件名
    if (!processedName.trim()) {
      processedName = `unnamed_${Date.now()}`;
      warnings.push('文件名为空，已生成默认名称');
      result.hasChanges = true;
    }

    // 2. 处理Unicode字符（如果不支持）
    if (!finalConfig.enableUnicodeSupport) {
      const asciiName = this.convertToAscii(processedName);
      if (asciiName !== processedName) {
        processedName = asciiName;
        warnings.push('Unicode字符已转换为ASCII');
        result.hasChanges = true;
      }
    }

    // 3. 替换不安全字符
    const safeCharsName = this.replaceUnsafeChars(processedName);
    if (safeCharsName !== processedName) {
      processedName = safeCharsName;
      warnings.push('不安全字符已替换');
      result.hasChanges = true;
    }

    // 4. 检查Windows保留名称
    if (this.isWindowsReservedName(processedName)) {
      processedName = `${processedName}_file`;
      warnings.push('Windows保留名称已修改');
      result.hasChanges = true;
    }

    // 5. 处理长度限制
    const fullProcessedName = extension ? `${processedName}${extension}` : processedName;
    if (fullProcessedName.length > finalConfig.maxLength) {
      const maxNameLength = finalConfig.maxLength - extension.length;
      processedName = this.truncateFilename(processedName, maxNameLength);
      warnings.push(`文件名过长，已截断至${finalConfig.maxLength}字符`);
      result.hasChanges = true;
      result.metadata.truncated = true;
    }

    // 6. 清理首尾空格和点
    const cleanedName = processedName.trim().replace(/^\.+|\.+$/g, '');
    if (cleanedName !== processedName) {
      processedName = cleanedName;
      warnings.push('已清理首尾空格和点');
      result.hasChanges = true;
    }

    // 7. 确保文件名不为空
    if (!processedName) {
      processedName = `file_${Date.now()}`;
      warnings.push('处理后文件名为空，已生成默认名称');
      result.hasChanges = true;
    }

    // 更新结果
    result.processedName = extension ? `${processedName}${extension}` : processedName;
    result.safeName = result.processedName;
    result.metadata.processedLength = result.processedName.length;

    console.log(`✅ 文件名处理完成: ${result.originalName} -> ${result.processedName}`);
    
    return result;
  }

  /**
   * 生成唯一文件名（解决冲突）
   */
  static generateUniqueFilename(
    baseFilename: string,
    existingFilenames: string[],
    strategy: 'increment' | 'timestamp' | 'hash' = 'timestamp'
  ): string {
    const { name, extension } = this.separateNameAndExtension(baseFilename);
    
    // 检查是否存在冲突
    if (!existingFilenames.includes(baseFilename)) {
      return baseFilename;
    }

    let uniqueName: string;
    let counter = 1;

    switch (strategy) {
      case 'increment':
        do {
          uniqueName = `${name}(${counter})${extension}`;
          counter++;
        } while (existingFilenames.includes(uniqueName));
        break;

      case 'timestamp':
        const timestamp = Date.now();
        uniqueName = `${name}_${timestamp}${extension}`;
        break;

      case 'hash':
        const hash = crypto.createHash('md5').update(baseFilename + Date.now()).digest('hex').substring(0, 8);
        uniqueName = `${name}_${hash}${extension}`;
        break;

      default:
        uniqueName = `${name}_${Date.now()}${extension}`;
    }

    console.log(`🔄 生成唯一文件名: ${baseFilename} -> ${uniqueName}`);
    return uniqueName;
  }

  /**
   * 检查平台兼容性
   */
  static checkPlatformCompatibility(filename: string): PlatformCompatibility {
    const issues: string[] = [];
    let windows = true;
    let linux = true;
    let macos = true;
    let web = true;

    // Windows兼容性检查
    if (this.isWindowsReservedName(filename)) {
      windows = false;
      issues.push('Windows保留文件名');
    }

    if (/[<>:"|?*]/.test(filename)) {
      windows = false;
      issues.push('包含Windows不允许的字符');
    }

    if (filename.length > 260) {
      windows = false;
      issues.push('超过Windows路径长度限制');
    }

    // Linux兼容性检查
    if (filename.includes('\0')) {
      linux = false;
      issues.push('包含null字符');
    }

    if (filename.length > 255) {
      linux = false;
      issues.push('超过Linux文件名长度限制');
    }

    // macOS兼容性检查
    if (filename.includes(':')) {
      macos = false;
      issues.push('包含macOS不推荐的冒号字符');
    }

    // Web兼容性检查
    if (/[#%&{}\\<>*?/$!'":@+`|=]/.test(filename)) {
      web = false;
      issues.push('包含URL不安全字符');
    }

    return { windows, linux, macos, web, issues };
  }

  /**
   * 批量处理文件名
   */
  static processBatch(
    filenames: string[],
    config: Partial<FilenameConfig> = {}
  ): FilenameResult[] {
    console.log(`📦 批量处理 ${filenames.length} 个文件名`);
    
    const results: FilenameResult[] = [];
    const processedNames: string[] = [];

    for (const filename of filenames) {
      const result = this.processSafely(filename, config);
      
      // 检查重复并生成唯一名称
      if (processedNames.includes(result.processedName)) {
        const uniqueName = this.generateUniqueFilename(
          result.processedName,
          processedNames,
          config.conflictResolution || 'timestamp'
        );
        result.processedName = uniqueName;
        result.safeName = uniqueName;
        result.hasChanges = true;
        result.warnings.push('文件名重复，已生成唯一名称');
      }

      processedNames.push(result.processedName);
      results.push(result);
    }

    console.log(`✅ 批量处理完成，${results.filter(r => r.hasChanges).length} 个文件名被修改`);
    
    return results;
  }

  // 私有辅助方法

  private static separateNameAndExtension(filename: string): { name: string; extension: string } {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === 0) {
      return { name: filename, extension: '' };
    }
    
    return {
      name: filename.substring(0, lastDotIndex),
      extension: filename.substring(lastDotIndex)
    };
  }

  private static countUnicodeChars(text: string): number {
    return Array.from(text).filter(char => char.charCodeAt(0) > 127).length;
  }

  private static countSpecialChars(text: string): number {
    return Array.from(text).filter(char => 
      /[^\w\s.-]/.test(char) && char.charCodeAt(0) <= 127
    ).length;
  }

  private static convertToAscii(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // 移除变音符号
      .replace(/[^\x00-\x7F]/g, '_'); // 替换非ASCII字符
  }

  private static replaceUnsafeChars(text: string): string {
    let result = text;
    
    for (const [unsafe, safe] of Object.entries(this.UNSAFE_CHAR_MAP)) {
      result = result.replace(new RegExp(this.escapeRegExp(unsafe), 'g'), safe);
    }
    
    return result;
  }

  private static isWindowsReservedName(name: string): boolean {
    const nameUpper = name.toUpperCase();
    return this.WINDOWS_RESERVED_NAMES.includes(nameUpper) ||
           this.WINDOWS_RESERVED_NAMES.some(reserved => nameUpper.startsWith(reserved + '.'));
  }

  private static truncateFilename(name: string, maxLength: number): string {
    if (name.length <= maxLength) {
      return name;
    }
    
    // 智能截断：尽量保留有意义的部分
    const truncated = name.substring(0, maxLength - 3) + '...';
    return truncated;
  }

  private static escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
