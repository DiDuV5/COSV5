/**
 * @fileoverview 环境变量工具函数
 * @description 提供文件操作和环境变量处理的工具函数
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

import fs from 'fs/promises';
import { logger } from '@/lib/logging/log-deduplicator';
import type { ComparisonResult } from './env-types';

/**
 * 读取环境变量文件
 */
export async function readEnvFile(filePath: string): Promise<Record<string, string>> {
  const envVars: Record<string, string> = {};

  try {
    const content = await fs.readFile(filePath, 'utf-8');

    for (const line of content.split('\n')) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    }

    logger.debug(`读取环境变量文件: ${filePath}`, { count: Object.keys(envVars).length });
  } catch (error) {
    logger.error(`读取环境变量文件失败: ${filePath}`, { error });
    throw error;
  }

  return envVars;
}

/**
 * 更新环境变量文件
 */
export async function updateEnvFile(filePath: string, key: string, value: string): Promise<void> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    // 查找是否已存在该键
    let found = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith(`${key}=`)) {
        lines[i] = `${key}=${value}`;
        found = true;
        break;
      }
    }

    // 如果不存在，添加到文件末尾
    if (!found) {
      lines.push(`${key}=${value}`);
    }

    await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
    logger.debug(`更新环境变量: ${key}`, { filePath });
  } catch (error) {
    logger.error(`更新环境变量文件失败: ${filePath}`, { error, key });
    throw error;
  }
}

/**
 * 比较两个环境配置
 */
export async function compareEnvironments(
  env1Path: string,
  env2Path: string
): Promise<ComparisonResult> {
  try {
    const env1Vars = await readEnvFile(env1Path);
    const env2Vars = await readEnvFile(env2Path);

    return compareEnvVars(env1Vars, env2Vars, env1Path, env2Path);
  } catch (error) {
    logger.error('环境配置比较失败', { error, env1Path, env2Path });
    throw error;
  }
}

/**
 * 比较两个环境变量对象
 */
export function compareEnvVars(
  env1Vars: Record<string, string>,
  env2Vars: Record<string, string>,
  env1Name: string = 'Environment 1',
  env2Name: string = 'Environment 2'
): ComparisonResult {
  const env1Keys = new Set(Object.keys(env1Vars));
  const env2Keys = new Set(Object.keys(env2Vars));
  const allKeys = new Set([...env1Keys, ...env2Keys]);

  const onlyInEnv1: string[] = [];
  const onlyInEnv2: string[] = [];
  const differentValues: { variable: string; env1Value: string; env2Value: string }[] = [];

  for (const key of allKeys) {
    if (env1Keys.has(key) && !env2Keys.has(key)) {
      onlyInEnv1.push(key);
    } else if (!env1Keys.has(key) && env2Keys.has(key)) {
      onlyInEnv2.push(key);
    } else if (env1Keys.has(key) && env2Keys.has(key)) {
      const value1 = env1Vars[key];
      const value2 = env2Vars[key];
      if (value1 !== value2) {
        differentValues.push({
          variable: key,
          env1Value: maskSensitiveValue(key, value1),
          env2Value: maskSensitiveValue(key, value2),
        });
      }
    }
  }

  return {
    environment1: env1Name,
    environment2: env2Name,
    differences: {
      onlyInEnv1,
      onlyInEnv2,
      differentValues,
    },
    summary: {
      totalVariables1: env1Keys.size,
      totalVariables2: env2Keys.size,
      commonVariables: allKeys.size - onlyInEnv1.length - onlyInEnv2.length,
      differenceCount: onlyInEnv1.length + onlyInEnv2.length + differentValues.length,
    },
  };
}

/**
 * 掩码敏感值
 */
export function maskSensitiveValue(key: string, value: string): string {
  const sensitivePatterns = [
    /password/i, /secret/i, /key/i, /token/i, /auth/i,
    /credential/i, /private/i, /database_url/i
  ];

  const isSensitive = sensitivePatterns.some(pattern => pattern.test(key));

  if (isSensitive) {
    if (value.length <= 4) {
      return '***';
    }
    return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
  }

  return value;
}

/**
 * 验证环境变量文件格式
 */
export async function validateEnvFile(filePath: string): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const lineNumber = i + 1;
      const line = lines[i];
      const trimmedLine = line.trim();

      // 跳过空行和注释
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // 检查格式
      if (!trimmedLine.includes('=')) {
        errors.push(`第${lineNumber}行: 缺少等号分隔符`);
        continue;
      }

      const [key, ...valueParts] = trimmedLine.split('=');
      const keyTrimmed = key.trim();
      const value = valueParts.join('=').trim();

      // 检查键名格式
      if (!keyTrimmed) {
        errors.push(`第${lineNumber}行: 环境变量名不能为空`);
        continue;
      }

      if (!/^[A-Z][A-Z0-9_]*$/.test(keyTrimmed)) {
        warnings.push(`第${lineNumber}行: 环境变量名建议使用大写字母、数字和下划线`);
      }

      // 检查值
      if (!value && !keyTrimmed.includes('OPTIONAL')) {
        warnings.push(`第${lineNumber}行: 环境变量值为空`);
      }

      // 检查重复定义
      const duplicateIndex = lines.findIndex((l, idx) => 
        idx !== i && l.trim().startsWith(`${keyTrimmed}=`)
      );
      if (duplicateIndex !== -1) {
        errors.push(`第${lineNumber}行: 环境变量 ${keyTrimmed} 重复定义（首次定义在第${duplicateIndex + 1}行）`);
      }
    }
  } catch (error) {
    errors.push(`读取文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 格式化环境变量内容
 */
export function formatEnvContent(envVars: Record<string, string>, comments?: Record<string, string>): string {
  const lines: string[] = [];

  // 按字母顺序排序
  const sortedKeys = Object.keys(envVars).sort();

  for (const key of sortedKeys) {
    const value = envVars[key];
    
    // 添加注释（如果有）
    if (comments?.[key]) {
      lines.push(`# ${comments[key]}`);
    }
    
    lines.push(`${key}=${value}`);
    lines.push(''); // 空行分隔
  }

  return lines.join('\n');
}

/**
 * 检查文件是否存在
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 创建备份文件
 */
export async function createBackup(filePath: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${filePath}.backup.${timestamp}`;
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    await fs.writeFile(backupPath, content, 'utf-8');
    logger.info(`创建备份文件: ${backupPath}`);
    return backupPath;
  } catch (error) {
    logger.error(`创建备份文件失败: ${filePath}`, { error });
    throw error;
  }
}
