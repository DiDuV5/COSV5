/**
 * @fileoverview 文件名兼容性处理工具
 * @description 处理不同文件名格式的兼容性问题，确保CDN访问正常
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 */

/**
 * 文件名兼容性问题类型
 */
export interface FilenameIssue {
  type: 'chinese_chars' | 'special_chars' | 'spaces' | 'long_name' | 'emoji' | 'encoding';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
}

/**
 * 文件名分析结果
 */
export interface FilenameAnalysis {
  original: string;
  safe: string;
  issues: FilenameIssue[];
  isCompatible: boolean;
  encoding: string;
}

/**
 * 检测文件名中的问题
 */
export function analyzeFilename(filename: string): FilenameAnalysis {
  const issues: FilenameIssue[] = [];
  let safe = filename;

  // 1. 检测中文字符
  if (/[\u4e00-\u9fff]/.test(filename)) {
    issues.push({
      type: 'chinese_chars',
      severity: 'high',
      description: '文件名包含中文字符',
      suggestion: '建议使用英文字符或进行URL编码'
    });
  }

  // 2. 检测特殊字符
  const specialChars = /[<>:"/\\|?*\x00-\x1f]/.test(filename);
  if (specialChars) {
    issues.push({
      type: 'special_chars',
      severity: 'high',
      description: '文件名包含特殊字符',
      suggestion: '移除或替换特殊字符'
    });
  }

  // 3. 检测空格
  if (/\s/.test(filename)) {
    issues.push({
      type: 'spaces',
      severity: 'medium',
      description: '文件名包含空格',
      suggestion: '使用下划线或连字符替换空格'
    });
  }

  // 4. 检测文件名长度
  if (filename.length > 100) {
    issues.push({
      type: 'long_name',
      severity: 'medium',
      description: '文件名过长',
      suggestion: '缩短文件名长度'
    });
  }

  // 5. 检测emoji和其他Unicode字符
  if (/[\uD83C-\uDBFF\uDC00-\uDFFF]/.test(filename)) {
    issues.push({
      type: 'emoji',
      severity: 'high',
      description: '文件名包含emoji表情',
      suggestion: '移除emoji字符'
    });
  }

  // 生成安全的文件名
  safe = generateSafeFilename(filename);

  return {
    original: filename,
    safe,
    issues,
    isCompatible: issues.filter(i => i.severity === 'high').length === 0,
    encoding: detectEncoding(filename)
  };
}

/**
 * 生成安全的文件名（增强版）
 */
export function generateSafeFilename(filename: string, options?: {
  preserveOriginal?: boolean;
  addTimestamp?: boolean;
  maxLength?: number;
}): string {
  const opts = {
    preserveOriginal: false,
    addTimestamp: true,
    maxLength: 50,
    ...options
  };

  // 获取文件扩展名
  const lastDotIndex = filename.lastIndexOf('.');
  const name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
  const ext = lastDotIndex > 0 ? filename.substring(lastDotIndex).toLowerCase() : '';

  let safeName = name;

  // 1. 移除或替换特殊字符（扩展版）
  safeName = safeName.replace(/[<>:"/\\|?*\x00-\x1f\[\]{}()@#$%^&+=`~]/g, '');

  // 2. 替换空格和其他空白字符为下划线
  safeName = safeName.replace(/\s+/g, '_');

  // 3. 处理中文字符 - 智能转换
  if (/[\u4e00-\u9fff]/.test(safeName)) {
    if (opts.preserveOriginal) {
      // 保留原始字符，但添加安全前缀
      safeName = `cn_${safeName}`;
    } else {
      // 转换为安全格式
      const timestamp = opts.addTimestamp ? Date.now() : '';
      safeName = `chinese_file_${timestamp}`;
    }
  }

  // 4. 移除emoji（扩展版）
  safeName = safeName.replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]|[\u2600-\u26FF]|[\u2700-\u27BF]/g, '');

  // 5. 处理其他Unicode字符
  safeName = safeName.replace(/[^\x00-\x7F]/g, '');

  // 6. 移除连续的下划线和连字符
  safeName = safeName.replace(/[_-]+/g, '_');

  // 7. 移除开头和结尾的下划线
  safeName = safeName.replace(/^[_-]+|[_-]+$/g, '');

  // 8. 确保文件名不为空
  if (!safeName) {
    const timestamp = opts.addTimestamp ? Date.now() : Math.random().toString(36).substring(2, 8);
    safeName = `file_${timestamp}`;
  }

  // 9. 限制长度（保留扩展名空间）
  const maxNameLength = opts.maxLength - ext.length;
  if (safeName.length > maxNameLength) {
    safeName = safeName.substring(0, maxNameLength);
  }

  // 10. 确保以字母或数字开头
  if (!/^[a-zA-Z0-9]/.test(safeName)) {
    safeName = `f_${safeName}`;
  }

  // 11. 确保以字母或数字结尾
  if (!/[a-zA-Z0-9]$/.test(safeName)) {
    safeName = safeName.replace(/_+$/, '') + '_f';
  }

  return safeName + ext;
}

/**
 * 生成唯一的安全文件名（避免冲突）
 */
export function generateUniqueFilename(filename: string, existingFilenames: string[] = []): string {
  let safeName = generateSafeFilename(filename);
  let counter = 1;
  const originalSafeName = safeName;

  // 获取文件扩展名
  const lastDotIndex = safeName.lastIndexOf('.');
  const name = lastDotIndex > 0 ? safeName.substring(0, lastDotIndex) : safeName;
  const ext = lastDotIndex > 0 ? safeName.substring(lastDotIndex) : '';

  // 检查是否存在冲突
  while (existingFilenames.includes(safeName)) {
    safeName = `${name}_${counter}${ext}`;
    counter++;
  }

  return safeName;
}

/**
 * 批量生成安全文件名（避免批量冲突）
 */
export function batchGenerateSafeFilenames(filenames: string[]): {
  original: string;
  safe: string;
  analysis: FilenameAnalysis;
}[] {
  const results: { original: string; safe: string; analysis: FilenameAnalysis; }[] = [];
  const usedNames: string[] = [];

  filenames.forEach(filename => {
    const analysis = analyzeFilename(filename);
    const safeName = generateUniqueFilename(filename, usedNames);

    usedNames.push(safeName);
    results.push({
      original: filename,
      safe: safeName,
      analysis
    });
  });

  return results;
}

/**
 * 检测文件名编码
 */
export function detectEncoding(filename: string): string {
  // 简单的编码检测
  if (/^[\x00-\x7F]*$/.test(filename)) {
    return 'ASCII';
  } else if (/[\u4e00-\u9fff]/.test(filename)) {
    return 'UTF-8 (Chinese)';
  } else if (/[\u0100-\u017F]/.test(filename)) {
    return 'UTF-8 (Latin Extended)';
  } else {
    return 'UTF-8';
  }
}

/**
 * URL编码文件名（用于CDN访问）
 */
export function encodeFilenameForURL(filename: string): string {
  return encodeURIComponent(filename);
}

/**
 * 验证文件名是否适合CDN访问
 */
export function validateFilenameForCDN(filename: string): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const analysis = analyzeFilename(filename);
  const issues: string[] = [];
  const suggestions: string[] = [];

  analysis.issues.forEach(issue => {
    if (issue.severity === 'high') {
      issues.push(issue.description);
      suggestions.push(issue.suggestion);
    }
  });

  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  };
}

/**
 * 批量处理文件名
 */
export function batchProcessFilenames(filenames: string[]): {
  original: string;
  safe: string;
  analysis: FilenameAnalysis;
}[] {
  return filenames.map(filename => ({
    original: filename,
    safe: generateSafeFilename(filename),
    analysis: analyzeFilename(filename)
  }));
}

/**
 * 测试文件名兼容性的示例数据
 */
export const testFilenames = [
  'beauty_1736508573677.mp4',           // 正常英文文件名
  '无水印1.mp4',                        // 中文文件名
  'test file with spaces.jpg',          // 包含空格
  'file<>with|special*chars.png',       // 特殊字符
  '😀emoji_file🎉.gif',                 // 包含emoji
  'very_long_filename_that_exceeds_normal_length_limits_and_might_cause_issues_with_some_systems.txt', // 超长文件名
  'файл.jpg',                           // 俄文文件名
  '测试文件_with_mixed_中英文.mp4',      // 混合中英文
];

/**
 * 文件名处理结果（用于数据库存储）
 */
export interface FilenameProcessingResult {
  originalName: string;      // 用户上传的原始文件名
  safeName: string;          // CDN兼容的安全文件名
  displayName: string;       // 用于显示的文件名
  storagePath: string;       // 存储路径
  cdnUrl: string;           // CDN访问URL
  fallbackUrl: string;      // 备用访问URL（本地存储）
  analysis: FilenameAnalysis; // 分析结果
  urlStrategy: 'cdn' | 'local' | 'hybrid'; // URL生成策略
  warnings: string[];       // 处理过程中的警告信息
}

/**
 * 处理上传文件名（完整流程，增强容错机制）
 */
export function processUploadFilename(
  originalFilename: string,
  options?: {
    cdnDomain?: string;
    storagePath?: string;
    existingFilenames?: string[];
    preserveOriginal?: boolean;
    fallbackDomain?: string;
    enableFallback?: boolean;
  }
): FilenameProcessingResult {
  const warnings: string[] = [];

  const opts = {
    cdnDomain: options?.cdnDomain || process.env.COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN,
    fallbackDomain: options?.fallbackDomain || process.env.COSEREEDEN_NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    storagePath: 'uploads',
    existingFilenames: [],
    preserveOriginal: false,
    enableFallback: true,
    ...options
  };

  // 检查CDN域名配置
  let urlStrategy: 'cdn' | 'local' | 'hybrid' = 'local';
  if (opts.cdnDomain && opts.cdnDomain !== 'undefined') {
    urlStrategy = opts.enableFallback ? 'hybrid' : 'cdn';
  } else {
    warnings.push('CDN域名未配置或无效，将使用本地存储URL');
  }

  // 分析原始文件名
  const analysis = analyzeFilename(originalFilename);

  // 生成安全文件名
  const safeName = generateUniqueFilename(originalFilename, opts.existingFilenames);

  // 生成显示名称（如果原始名称有问题，使用安全名称）
  const displayName = analysis.isCompatible ? originalFilename : safeName;

  // 生成存储路径
  const storagePath = `${opts.storagePath}/${safeName}`;

  // 生成URL（根据策略）
  let cdnUrl: string;
  let fallbackUrl: string;

  // 获取R2存储基础URL
  const r2BaseUrl = process.env.COSEREEDEN_CLOUDFLARE_R2_PUBLIC_URL || 'https://cc.tutu365.cc';
  const r2Url = `${r2BaseUrl}/media/${safeName}`;

  if (urlStrategy === 'cdn' && opts.cdnDomain) {
    cdnUrl = `${opts.cdnDomain}/${storagePath}`;
    fallbackUrl = r2Url;
  } else if (urlStrategy === 'hybrid' && opts.cdnDomain) {
    cdnUrl = `${opts.cdnDomain}/${storagePath}`;
    fallbackUrl = r2Url;
  } else {
    // 使用R2存储URL
    cdnUrl = r2Url;
    fallbackUrl = r2Url;
    urlStrategy = 'local';
  }

  // 记录文件名处理警告
  if (analysis.issues.length > 0) {
    const highSeverityIssues = analysis.issues.filter(issue => issue.severity === 'high');
    if (highSeverityIssues.length > 0) {
      warnings.push(`文件名包含${highSeverityIssues.length}个高风险问题，已自动修复`);
    }
  }

  return {
    originalName: originalFilename,
    safeName,
    displayName,
    storagePath,
    cdnUrl,
    fallbackUrl,
    analysis,
    urlStrategy,
    warnings
  };
}

/**
 * 验证文件名是否需要处理
 */
export function needsFilenameProcessing(filename: string): boolean {
  const analysis = analyzeFilename(filename);
  return !analysis.isCompatible || analysis.issues.some(issue => issue.severity === 'high');
}

/**
 * 运行兼容性测试
 */
export function runCompatibilityTest(): {
  filename: string;
  analysis: FilenameAnalysis;
  cdnCompatible: boolean;
}[] {
  return testFilenames.map(filename => {
    const analysis = analyzeFilename(filename);
    const cdnValidation = validateFilenameForCDN(filename);

    return {
      filename,
      analysis,
      cdnCompatible: cdnValidation.isValid
    };
  });
}

/**
 * 扩展测试文件名列表
 */
export const extendedTestFilenames = [
  ...testFilenames,
  '🐹仓鼠窝 @CoserW 👈 (3).mp4',        // 实际数据库中的问题文件名
  '5月16日 (4)(2).mp4',                  // 中文日期格式
  '2025-04-16 110416(6).jpg',           // 包含括号的日期
  'test@file#with$special%chars.png',    // 更多特殊字符
  'файл_с_русскими_символами.jpg',       // 俄文字符
  'ملف_عربي.pdf',                       // 阿拉伯文字符
  'file with multiple    spaces.txt',    // 多个空格
  'file-with-dashes_and_underscores.doc', // 连字符和下划线
  '.hidden_file.txt',                    // 隐藏文件
  'file..with..double..dots.txt',        // 多个点
];
