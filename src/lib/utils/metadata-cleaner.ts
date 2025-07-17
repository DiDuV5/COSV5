/**
 * @fileoverview 元数据清理工具函数
 * @description 处理文件上传元数据，确保符合HTTP头部规范，特别是中文字符处理
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * // 清理包含中文的元数据
 * const cleanMeta = cleanMetadataForUpload({
 *   originalName: '无水印1.mp4',
 *   mediaType: 'VIDEO'
 * });
 *
 * @dependencies
 * - 无外部依赖
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，解决中文文件名上传问题
 */

/**
 * 元数据清理选项
 */
export interface MetadataCleanOptions {
  /** 是否对原始文件名进行URL编码 */
  encodeOriginalName?: boolean;
  /** 是否保留Unicode字符 */
  preserveUnicode?: boolean;
  /** 自定义键名映射 */
  keyMapping?: Record<string, string>;
}

/**
 * 清理结果
 */
export interface CleanMetadataResult {
  /** 清理后的元数据 */
  cleanMetadata: Record<string, string>;
  /** 是否有修改 */
  hasChanges: boolean;
  /** 警告信息 */
  warnings: string[];
  /** 原始键值对数量 */
  originalCount: number;
  /** 清理后键值对数量 */
  cleanCount: number;
}

/**
 * 清理元数据，确保符合HTTP头部规范
 * 
 * @param metadata 原始元数据
 * @param options 清理选项
 * @returns 清理结果
 */
export function cleanMetadataForUpload(
  metadata: Record<string, any>,
  options: MetadataCleanOptions = {}
): CleanMetadataResult {
  const {
    encodeOriginalName = true,
    preserveUnicode = false,
    keyMapping = {}
  } = options;

  const cleanMetadata: Record<string, string> = {};
  const warnings: string[] = [];
  let hasChanges = false;
  const originalCount = Object.keys(metadata).length;

  Object.entries(metadata).forEach(([key, value]) => {
    // 应用键名映射
    const mappedKey = keyMapping[key] || key;
    
    // 清理键名：转换为小写，只保留字母、数字和连字符
    const cleanKey = mappedKey.toLowerCase().replace(/[^a-z0-9-]/g, '');
    
    if (!cleanKey) {
      warnings.push(`键名 "${key}" 无效，已跳过`);
      hasChanges = true;
      return;
    }

    if (cleanKey !== mappedKey.toLowerCase()) {
      warnings.push(`键名 "${key}" 已清理为 "${cleanKey}"`);
      hasChanges = true;
    }

    // 清理值
    let cleanValue: string;
    const stringValue = String(value);

    // 特殊处理原始文件名
    if (cleanKey === 'originalname' || cleanKey === 'original-name') {
      if (encodeOriginalName) {
        cleanValue = encodeURIComponent(stringValue);
        if (cleanValue !== stringValue) {
          warnings.push(`原始文件名已URL编码: "${stringValue}" -> "${cleanValue}"`);
          hasChanges = true;
        }
      } else {
        cleanValue = preserveUnicode ? stringValue : stringValue.replace(/[^\x00-\x7F]/g, '');
        if (cleanValue !== stringValue) {
          warnings.push(`原始文件名中的非ASCII字符已移除`);
          hasChanges = true;
        }
      }
    } else {
      // 其他元数据处理
      if (preserveUnicode) {
        cleanValue = stringValue;
      } else {
        cleanValue = stringValue.replace(/[^\x00-\x7F]/g, '');
        if (cleanValue !== stringValue) {
          warnings.push(`元数据 "${key}" 中的非ASCII字符已移除`);
          hasChanges = true;
        }
      }
    }

    // 只添加有效的键值对
    if (cleanValue) {
      cleanMetadata[cleanKey] = cleanValue;
    } else {
      warnings.push(`元数据 "${key}" 的值为空，已跳过`);
      hasChanges = true;
    }
  });

  return {
    cleanMetadata,
    hasChanges,
    warnings,
    originalCount,
    cleanCount: Object.keys(cleanMetadata).length
  };
}

/**
 * 解码元数据中的原始文件名
 * 
 * @param encodedName URL编码的文件名
 * @returns 解码后的文件名
 */
export function decodeOriginalName(encodedName: string): string {
  try {
    return decodeURIComponent(encodedName);
  } catch (error) {
    console.warn('解码原始文件名失败:', error);
    return encodedName;
  }
}

/**
 * 验证元数据是否符合HTTP头部规范
 * 
 * @param metadata 元数据
 * @returns 验证结果
 */
export function validateMetadataForHTTP(metadata: Record<string, string>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  Object.entries(metadata).forEach(([key, value]) => {
    // 检查键名
    if (!/^[a-z0-9-]+$/.test(key)) {
      errors.push(`键名 "${key}" 包含无效字符`);
    }

    // 检查值
    if (!/^[\x00-\x7F]*$/.test(value)) {
      errors.push(`键 "${key}" 的值包含非ASCII字符`);
    }

    // 检查长度限制
    if (key.length > 100) {
      errors.push(`键名 "${key}" 过长 (>${100}字符)`);
    }

    if (value.length > 2048) {
      errors.push(`键 "${key}" 的值过长 (>${2048}字符)`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 批量清理元数据
 * 
 * @param metadataList 元数据列表
 * @param options 清理选项
 * @returns 清理结果列表
 */
export function batchCleanMetadata(
  metadataList: Record<string, any>[],
  options: MetadataCleanOptions = {}
): CleanMetadataResult[] {
  return metadataList.map(metadata => cleanMetadataForUpload(metadata, options));
}

/**
 * 创建标准化的文件元数据
 * 
 * @param originalName 原始文件名
 * @param mediaType 媒体类型
 * @param additionalMeta 额外元数据
 * @returns 标准化元数据
 */
export function createStandardFileMetadata(
  originalName: string,
  mediaType: string,
  additionalMeta: Record<string, any> = {}
): Record<string, string> {
  const metadata = {
    originalName,
    mediaType,
    uploadedAt: new Date().toISOString(),
    ...additionalMeta
  };

  const result = cleanMetadataForUpload(metadata);
  
  if (result.warnings.length > 0) {
    console.warn('元数据清理警告:', result.warnings);
  }

  return result.cleanMetadata;
}
