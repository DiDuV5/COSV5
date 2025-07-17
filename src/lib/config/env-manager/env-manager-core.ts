/**
 * @fileoverview 环境变量管理器核心
 * @description 核心环境变量管理器类和主要功能
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

import { logger } from '@/lib/logging/log-deduplicator';
import type { 
  EnvTemplate, 
  EnvVariable, 
  MigrationResult, 
  ComparisonResult, 
  SecurityScanResult 
} from './env-types';
import { getAllTemplates } from './env-templates';
import { migrateToCoserEdenPrefix } from './env-migration';
import { performSecurityScan } from './env-security';
import { 
  readEnvFile, 
  updateEnvFile, 
  compareEnvironments, 
  compareEnvVars 
} from './env-utils';

/**
 * 环境变量管理器
 */
export class EnvManager {
  private static instance: EnvManager;
  private templates: Map<string, EnvTemplate> = new Map();

  private constructor() {
    this.initializeTemplates();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): EnvManager {
    if (!EnvManager.instance) {
      EnvManager.instance = new EnvManager();
    }
    return EnvManager.instance;
  }

  /**
   * 初始化环境变量模板
   */
  private initializeTemplates(): void {
    this.templates = getAllTemplates();
    logger.debug('环境变量模板初始化完成', { 
      templateCount: this.templates.size 
    });
  }

  /**
   * 生成环境变量模板文件
   */
  async generateEnvTemplate(
    environment: 'production' | 'development' | 'test' = 'development',
    outputPath?: string
  ): Promise<string> {
    const envContent: string[] = [];

    // 添加文件头部注释
    envContent.push('# ========================================');
    envContent.push('# CoserEden 环境变量配置文件');
    envContent.push(`# 环境: ${environment}`);
    envContent.push(`# 生成时间: ${new Date().toISOString()}`);
    envContent.push('# ========================================');
    envContent.push('');

    // 按优先级排序
    const sortedTemplates = Array.from(this.templates.values())
      .sort((a, b) => a.priority.localeCompare(b.priority));

    for (const template of sortedTemplates) {
      envContent.push(`# ========================================`);
      envContent.push(`# ${template.category} (${template.priority}级)`);
      envContent.push(`# ========================================`);
      envContent.push('');

      for (const variable of template.variables) {
        // 添加注释
        envContent.push(`# ${variable.description}`);
        if (variable.type !== 'string') {
          envContent.push(`# 类型: ${variable.type}`);
        }
        if (variable.required) {
          envContent.push(`# 必需: 是`);
        }

        // 获取值
        let value = '';
        if (variable.environmentSpecific?.[environment]) {
          value = variable.environmentSpecific[environment];
        } else if (variable.defaultValue) {
          value = variable.defaultValue;
        } else if (variable.exampleValue) {
          value = variable.exampleValue;
        }

        // 安全敏感字段处理
        if (variable.securitySensitive && environment === 'production') {
          value = 'CHANGE_ME_' + variable.name.split('_').pop();
        }

        envContent.push(`${variable.name}=${value}`);
        envContent.push('');
      }
    }

    const content = envContent.join('\n');

    // 保存文件
    if (outputPath) {
      const fs = await import('fs/promises');
      await fs.writeFile(outputPath, content, 'utf-8');
      logger.info(`环境变量模板已生成: ${outputPath}`);
    }

    return content;
  }

  /**
   * 迁移配置到COSEREEDEN_前缀
   */
  async migrateToCoserEdenPrefix(envFilePath?: string): Promise<MigrationResult> {
    try {
      const envVars = envFilePath ? await readEnvFile(envFilePath) : process.env;
      
      const updateEnvFileFunc = envFilePath 
        ? (key: string, value: string) => updateEnvFile(envFilePath, key, value)
        : undefined;

      return await migrateToCoserEdenPrefix(envVars, updateEnvFileFunc);
    } catch (error) {
      logger.error('配置迁移失败', { error, envFilePath });
      throw error;
    }
  }

  /**
   * 比较两个环境配置
   */
  async compareEnvironments(env1Path: string, env2Path: string): Promise<ComparisonResult> {
    return await compareEnvironments(env1Path, env2Path);
  }

  /**
   * 比较环境变量对象
   */
  compareEnvVars(
    env1Vars: Record<string, string>,
    env2Vars: Record<string, string>,
    env1Name?: string,
    env2Name?: string
  ): ComparisonResult {
    return compareEnvVars(env1Vars, env2Vars, env1Name, env2Name);
  }

  /**
   * 安全扫描
   */
  async performSecurityScan(envFilePath?: string): Promise<SecurityScanResult> {
    try {
      const envVars = envFilePath ? await readEnvFile(envFilePath) : process.env;
      return await performSecurityScan(envVars);
    } catch (error) {
      logger.error('安全扫描失败', { error, envFilePath });
      throw error;
    }
  }

  /**
   * 获取模板
   */
  getTemplate(name: string): EnvTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * 获取所有模板
   */
  getAllTemplates(): Map<string, EnvTemplate> {
    return new Map(this.templates);
  }

  /**
   * 注册自定义模板
   */
  registerTemplate(name: string, template: EnvTemplate): void {
    this.templates.set(name, template);
    logger.debug(`注册环境变量模板: ${name}`, { 
      category: template.category,
      priority: template.priority,
      variableCount: template.variables.length
    });
  }

  /**
   * 验证环境变量配置
   */
  validateEnvironmentVariables(envVars?: Record<string, string | undefined>): {
    isValid: boolean;
    missing: string[];
    invalid: Array<{ variable: string; reason: string }>;
    suggestions: string[];
  } {
    const vars = envVars || process.env;
    const missing: string[] = [];
    const invalid: Array<{ variable: string; reason: string }> = [];
    const suggestions: string[] = [];

    for (const template of this.templates.values()) {
      for (const variable of template.variables) {
        const value = vars[variable.name];

        // 检查必需字段
        if (variable.required && !value) {
          missing.push(variable.name);
          continue;
        }

        if (!value) continue;

        // 类型验证
        const typeValidation = this.validateVariableType(variable, value);
        if (!typeValidation.isValid) {
          invalid.push({
            variable: variable.name,
            reason: typeValidation.reason || '类型不匹配',
          });
        }
      }
    }

    // 生成建议
    if (missing.length > 0) {
      suggestions.push(`设置缺失的必需环境变量: ${missing.join(', ')}`);
    }

    if (invalid.length > 0) {
      suggestions.push('修复类型不匹配的环境变量');
    }

    const hasCoserEdenPrefix = Object.keys(vars).some(key => 
      key.startsWith('COSEREEDEN_')
    );
    if (!hasCoserEdenPrefix) {
      suggestions.push('考虑迁移到COSEREEDEN_前缀以避免命名冲突');
    }

    return {
      isValid: missing.length === 0 && invalid.length === 0,
      missing,
      invalid,
      suggestions,
    };
  }

  /**
   * 验证变量类型
   */
  private validateVariableType(variable: EnvVariable, value: string): {
    isValid: boolean;
    reason?: string;
  } {
    switch (variable.type) {
      case 'number':
        const isNumber = !isNaN(Number(value));
        return {
          isValid: isNumber,
          reason: isNumber ? undefined : '必须是有效的数字',
        };

      case 'boolean':
        const validBooleans = ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'];
        const isBoolean = validBooleans.includes(value.toLowerCase());
        return {
          isValid: isBoolean,
          reason: isBoolean ? undefined : `必须是以下值之一: ${validBooleans.join(', ')}`,
        };

      case 'url':
        try {
          new URL(value);
          return { isValid: true };
        } catch {
          return {
            isValid: false,
            reason: '必须是有效的URL格式',
          };
        }

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isEmail = emailRegex.test(value);
        return {
          isValid: isEmail,
          reason: isEmail ? undefined : '必须是有效的邮箱地址格式',
        };

      case 'json':
        try {
          JSON.parse(value);
          return { isValid: true };
        } catch {
          return {
            isValid: false,
            reason: '必须是有效的JSON格式',
          };
        }

      case 'string':
      default:
        return { isValid: true };
    }
  }
}
