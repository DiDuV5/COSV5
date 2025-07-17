/**
 * @fileoverview 内容安全验证器
 * @description 扫描文件内容，检测恶意代码和可执行文件特征
 */

import path from 'path';
import type { FileValidationResult, ContentSecurityScanResult } from '../types/validation-types';

/**
 * 内容安全验证器类
 */
export class ContentSecurityValidator {
  /**
   * 扫描文件内容安全性
   */
  public scanContentSecurity(
    buffer: Buffer, 
    fileName: string, 
    mimeType: string, 
    result: FileValidationResult
  ): void {
    const scanStartTime = Date.now();
    const scanResult = this.performContentScan(buffer, fileName, mimeType);
    const scanDuration = Date.now() - scanStartTime;

    // 处理扫描结果
    if (!scanResult.isSafe) {
      result.errors.push(...scanResult.threats.map(threat => `检测到安全威胁: ${threat}`));
      this.updateRiskLevel(result, 'critical');
    }

    if (scanResult.suspiciousContent.length > 0) {
      result.warnings.push(...scanResult.suspiciousContent.map(content => `可疑内容: ${content}`));
      this.updateRiskLevel(result, 'medium');
    }

    // 记录扫描信息
    console.log(`内容安全扫描完成: ${fileName}, 耗时: ${scanDuration}ms, 扫描字节: ${scanResult.scanDetails.scannedBytes}`);
  }

  /**
   * 执行内容安全扫描
   */
  private performContentScan(buffer: Buffer, fileName: string, mimeType: string): ContentSecurityScanResult {
    const result: ContentSecurityScanResult = {
      isSafe: true,
      threats: [],
      suspiciousContent: [],
      scanDetails: {
        scannedBytes: buffer.length,
        scanDuration: 0,
        scanMethod: 'PATTERN_MATCHING'
      }
    };

    // 检查可执行文件特征
    this.checkExecutableSignatures(buffer, fileName, result);

    // 检查脚本内容
    this.checkScriptContent(buffer, fileName, result);

    // 检查恶意模式
    this.checkMaliciousPatterns(buffer, result);

    // 检查文件结构异常
    this.checkFileStructureAnomalies(buffer, mimeType, result);

    return result;
  }

  /**
   * 检查可执行文件特征
   */
  private checkExecutableSignatures(buffer: Buffer, fileName: string, result: ContentSecurityScanResult): void {
    const extension = path.extname(fileName).toLowerCase();
    
    // 对于媒体文件，使用更宽松的检测策略
    const safeMediaExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi', '.pdf'];
    const isSafeMediaFile = safeMediaExtensions.includes(extension);

    if (!isSafeMediaFile) {
      // 只对非媒体文件进行可执行文件特征检测
      const executableSignatures = [
        { signature: Buffer.from('MZ'), name: 'PE可执行文件' },
        { signature: Buffer.from([0x7F, 0x45, 0x4C, 0x46]), name: 'ELF可执行文件' },
        { signature: Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]), name: 'Mach-O可执行文件' },
        { signature: Buffer.from('#!/bin/'), name: 'Shell脚本' },
        { signature: Buffer.from('<?php'), name: 'PHP脚本' },
      ];

      for (const { signature, name } of executableSignatures) {
        // 只检查文件开头的前512字节，避免在媒体文件中误检测
        const searchLength = Math.min(buffer.length, 512);
        const searchBuffer = buffer.subarray(0, searchLength);

        if (searchBuffer.includes(signature)) {
          result.threats.push(`${name}特征: ${fileName}`);
          result.isSafe = false;
        }
      }
    }
  }

  /**
   * 检查脚本内容
   */
  private checkScriptContent(buffer: Buffer, fileName: string, result: ContentSecurityScanResult): void {
    // 对于所有文件类型，检查明显的脚本内容（但更宽松）
    if (buffer.length > 0) {
      try {
        // 只检查文件开头的一小部分，避免在二进制文件中误检测
        const content = buffer.toString('utf8', 0, Math.min(buffer.length, 256));

        // 更严格的脚本模式检测，减少误报
        const scriptPatterns = [
          { pattern: /^<\?php\s/i, name: 'PHP脚本开头' },
          { pattern: /^#!/i, name: 'Shebang开头' },
          { pattern: /<script[^>]*>[\s\S]*<\/script>/gi, name: '完整的script标签' },
          { pattern: /eval\s*\(/gi, name: 'eval函数调用' },
          { pattern: /exec\s*\(/gi, name: 'exec函数调用' },
          { pattern: /system\s*\(/gi, name: 'system函数调用' },
        ];

        for (const { pattern, name } of scriptPatterns) {
          if (pattern.test(content)) {
            result.suspiciousContent.push(`检测到${name}`);
            break; // 只报告一次
          }
        }
      } catch (error) {
        // 如果无法解析为UTF-8，说明是二进制文件，跳过脚本检测
      }
    }
  }

  /**
   * 检查恶意模式
   */
  private checkMaliciousPatterns(buffer: Buffer, result: ContentSecurityScanResult): void {
    // 检查常见的恶意软件特征
    const maliciousPatterns = [
      // 网络相关
      { pattern: /curl\s+.*\|\s*sh/gi, name: '危险的curl管道执行' },
      { pattern: /wget\s+.*\|\s*sh/gi, name: '危险的wget管道执行' },
      { pattern: /nc\s+-l\s+-p/gi, name: 'netcat监听端口' },
      
      // 系统命令
      { pattern: /rm\s+-rf\s+\//gi, name: '危险的删除命令' },
      { pattern: /chmod\s+\+x/gi, name: '添加执行权限' },
      { pattern: /\/etc\/passwd/gi, name: '访问密码文件' },
      { pattern: /\/etc\/shadow/gi, name: '访问影子密码文件' },
      
      // 编码内容
      { pattern: /base64\s+-d/gi, name: 'base64解码' },
      { pattern: /echo\s+.*\|\s*base64/gi, name: 'base64编码输出' },
    ];

    try {
      // 只检查前4KB内容，避免性能问题
      const content = buffer.toString('utf8', 0, Math.min(buffer.length, 4096));
      
      for (const { pattern, name } of maliciousPatterns) {
        if (pattern.test(content)) {
          result.threats.push(name);
          result.isSafe = false;
        }
      }
    } catch (error) {
      // 无法解析为文本，跳过模式检测
    }
  }

  /**
   * 检查文件结构异常
   */
  private checkFileStructureAnomalies(buffer: Buffer, mimeType: string, result: ContentSecurityScanResult): void {
    // 检查文件大小异常
    if (buffer.length === 0) {
      result.suspiciousContent.push('文件为空');
      return;
    }

    // 检查是否包含多个文件头（可能是嵌套文件）
    const fileHeaders = [
      Buffer.from([0xFF, 0xD8, 0xFF]), // JPEG
      Buffer.from([0x89, 0x50, 0x4E, 0x47]), // PNG
      Buffer.from([0x50, 0x4B, 0x03, 0x04]), // ZIP
      Buffer.from([0x25, 0x50, 0x44, 0x46]), // PDF
    ];

    let headerCount = 0;
    for (const header of fileHeaders) {
      let offset = 0;
      while (offset < buffer.length - header.length) {
        const index = buffer.indexOf(header, offset);
        if (index === -1) break;
        headerCount++;
        offset = index + header.length;
        
        // 如果发现多个文件头，可能是嵌套文件
        if (headerCount > 1) {
          result.suspiciousContent.push('检测到多个文件头，可能包含嵌套文件');
          break;
        }
      }
    }

    // 检查文件末尾是否有异常数据
    if (mimeType.startsWith('image/') && buffer.length > 1024) {
      const lastKB = buffer.subarray(-1024);
      // 检查图片文件末尾是否包含可疑的文本内容
      try {
        const endContent = lastKB.toString('utf8');
        if (/[a-zA-Z]{50,}/.test(endContent)) {
          result.suspiciousContent.push('图片文件末尾包含大量文本数据');
        }
      } catch (error) {
        // 无法解析为文本，正常情况
      }
    }
  }

  /**
   * 检查文件是否包含隐藏的可执行代码
   */
  public checkHiddenExecutableCode(buffer: Buffer): boolean {
    // 检查常见的隐藏执行模式
    const hiddenPatterns = [
      /\x00+[a-zA-Z0-9+\/]{20,}={0,2}/g, // Base64编码前有空字节
      /<!--[\s\S]*?-->/g, // HTML注释中的内容
      /\/\*[\s\S]*?\*\//g, // CSS/JS注释中的内容
    ];

    try {
      const content = buffer.toString('utf8');
      return hiddenPatterns.some(pattern => pattern.test(content));
    } catch (error) {
      return false;
    }
  }

  /**
   * 更新风险等级
   */
  private updateRiskLevel(
    result: FileValidationResult, 
    newLevel: 'low' | 'medium' | 'high' | 'critical'
  ): void {
    const levels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(result.riskLevel);
    const newIndex = levels.indexOf(newLevel);
    
    if (newIndex > currentIndex) {
      result.riskLevel = newLevel;
    }
  }
}
