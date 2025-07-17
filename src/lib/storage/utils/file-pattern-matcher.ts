/**
 * @fileoverview 文件模式匹配工具
 * @description 处理文件路径模式匹配和过滤
 * @author Augment AI
 * @date 2025-06-27
 * @version 1.0.0
 * @since 1.0.0
 */

import type { FileInfo } from '../object-storage/base-storage-provider';
import type { CleanupRule, FileMatchResult } from './lifecycle-types';

/**
 * 文件模式匹配器
 */
export class FilePatternMatcher {
  /**
   * 检查文件是否匹配模式
   */
  public matchesPattern(filePath: string, pattern: string): boolean {
    // 简单的通配符匹配实现
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath);
  }

  /**
   * 检查文件是否匹配排除模式
   */
  public matchesExcludePatterns(filePath: string, excludePatterns: string[]): boolean {
    return excludePatterns.some(pattern => this.matchesPattern(filePath, pattern));
  }

  /**
   * 从模式中提取前缀
   */
  public extractPrefixFromPattern(pattern: string): string {
    const wildcardIndex = pattern.indexOf('*');
    if (wildcardIndex === -1) {
      return pattern;
    }
    
    return pattern.substring(0, wildcardIndex);
  }

  /**
   * 按规则过滤文件
   */
  public filterFilesByRule(files: FileInfo[], rule: CleanupRule): FileInfo[] {
    let filteredFiles = [...files];

    // 按年龄过滤
    if (rule.maxAge) {
      const cutoffDate = new Date(Date.now() - rule.maxAge);
      filteredFiles = filteredFiles.filter(file => 
        file.lastModified && file.lastModified < cutoffDate
      );
    }

    // 按大小过滤
    if (rule.maxSize) {
      filteredFiles = filteredFiles.filter(file => file.size > rule.maxSize!);
    }

    // 按数量限制
    if (rule.maxCount && filteredFiles.length > rule.maxCount) {
      // 按最后修改时间排序，保留最新的文件
      filteredFiles.sort((a, b) => {
        const dateA = a.lastModified || new Date(0);
        const dateB = b.lastModified || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      filteredFiles = filteredFiles.slice(rule.maxCount);
    }

    return filteredFiles;
  }

  /**
   * 检查单个文件是否匹配规则
   */
  public checkFileMatch(file: FileInfo, rule: CleanupRule): FileMatchResult {
    const result: FileMatchResult = {
      filePath: file.key,
      matches: false
    };

    // 检查基本模式匹配
    if (!this.matchesPattern(file.key, rule.pattern)) {
      result.excludeReason = 'Pattern does not match';
      return result;
    }

    // 检查排除模式
    if (rule.excludePatterns && this.matchesExcludePatterns(file.key, rule.excludePatterns)) {
      result.excludeReason = 'Matches exclude pattern';
      return result;
    }

    // 检查年龄限制
    if (rule.maxAge && file.lastModified) {
      const cutoffDate = new Date(Date.now() - rule.maxAge);
      if (file.lastModified >= cutoffDate) {
        result.excludeReason = 'File is too new';
        return result;
      }
    }

    // 检查大小限制
    if (rule.maxSize && file.size <= rule.maxSize) {
      result.excludeReason = 'File is too small';
      return result;
    }

    result.matches = true;
    result.matchedRule = rule.name;
    return result;
  }

  /**
   * 批量检查文件匹配
   */
  public batchCheckFiles(files: FileInfo[], rules: CleanupRule[]): Map<string, FileMatchResult[]> {
    const results = new Map<string, FileMatchResult[]>();

    for (const rule of rules) {
      if (!rule.enabled) continue;

      const ruleResults: FileMatchResult[] = [];
      for (const file of files) {
        const matchResult = this.checkFileMatch(file, rule);
        ruleResults.push(matchResult);
      }
      results.set(rule.name, ruleResults);
    }

    return results;
  }

  /**
   * 获取匹配文件的统计信息
   */
  public getMatchStats(files: FileInfo[], rule: CleanupRule): {
    totalFiles: number;
    matchedFiles: number;
    totalSize: number;
    matchedSize: number;
    oldestFile?: FileInfo;
    newestFile?: FileInfo;
    largestFile?: FileInfo;
  } {
    const matchedFiles = files.filter(file => 
      this.checkFileMatch(file, rule).matches
    );

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const matchedSize = matchedFiles.reduce((sum, file) => sum + file.size, 0);

    let oldestFile: FileInfo | undefined;
    let newestFile: FileInfo | undefined;
    let largestFile: FileInfo | undefined;

    if (matchedFiles.length > 0) {
      // 找到最旧的文件
      oldestFile = matchedFiles.reduce((oldest, file) => {
        if (!file.lastModified) return oldest;
        if (!oldest?.lastModified) return file;
        return file.lastModified < oldest.lastModified ? file : oldest;
      });

      // 找到最新的文件
      newestFile = matchedFiles.reduce((newest, file) => {
        if (!file.lastModified) return newest;
        if (!newest?.lastModified) return file;
        return file.lastModified > newest.lastModified ? file : newest;
      });

      // 找到最大的文件
      largestFile = matchedFiles.reduce((largest, file) => 
        file.size > largest.size ? file : largest
      );
    }

    return {
      totalFiles: files.length,
      matchedFiles: matchedFiles.length,
      totalSize,
      matchedSize,
      oldestFile,
      newestFile,
      largestFile
    };
  }

  /**
   * 验证模式语法
   */
  public validatePattern(pattern: string): { isValid: boolean; error?: string } {
    try {
      // 检查基本语法
      if (!pattern || pattern.trim() === '') {
        return { isValid: false, error: 'Pattern cannot be empty' };
      }

      // 检查是否包含无效字符
      const invalidChars = /[<>:"|]/;
      if (invalidChars.test(pattern)) {
        return { isValid: false, error: 'Pattern contains invalid characters' };
      }

      // 尝试转换为正则表达式
      const regexPattern = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '[^/]');
      
      new RegExp(`^${regexPattern}$`);
      
      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: `Invalid pattern syntax: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * 生成模式建议
   */
  public generatePatternSuggestions(samplePaths: string[]): string[] {
    const suggestions: string[] = [];
    
    // 分析路径结构
    const pathSegments = samplePaths.map(path => path.split('/'));
    
    // 生成通用模式
    if (pathSegments.length > 0) {
      const maxDepth = Math.max(...pathSegments.map(segments => segments.length));
      
      for (let depth = 1; depth <= maxDepth; depth++) {
        const commonPrefixes = new Set<string>();
        
        pathSegments.forEach(segments => {
          if (segments.length >= depth) {
            const prefix = segments.slice(0, depth).join('/');
            commonPrefixes.add(prefix);
          }
        });

        // 为常见前缀生成模式
        commonPrefixes.forEach(prefix => {
          suggestions.push(`${prefix}/*`);
          suggestions.push(`${prefix}/**`);
        });
      }
    }

    // 按文件扩展名生成模式
    const extensions = new Set<string>();
    samplePaths.forEach(path => {
      const ext = path.split('.').pop();
      if (ext && ext !== path) {
        extensions.add(ext);
      }
    });

    extensions.forEach(ext => {
      suggestions.push(`**/*.${ext}`);
    });

    // 去重并排序
    return Array.from(new Set(suggestions)).sort();
  }

  /**
   * 测试模式匹配
   */
  public testPattern(pattern: string, testPaths: string[]): {
    pattern: string;
    matches: string[];
    nonMatches: string[];
    isValid: boolean;
    error?: string;
  } {
    const validation = this.validatePattern(pattern);
    if (!validation.isValid) {
      return {
        pattern,
        matches: [],
        nonMatches: testPaths,
        isValid: false,
        error: validation.error
      };
    }

    const matches: string[] = [];
    const nonMatches: string[] = [];

    testPaths.forEach(path => {
      if (this.matchesPattern(path, pattern)) {
        matches.push(path);
      } else {
        nonMatches.push(path);
      }
    });

    return {
      pattern,
      matches,
      nonMatches,
      isValid: true
    };
  }
}

/**
 * 导出单例实例
 */
export const filePatternMatcher = new FilePatternMatcher();
