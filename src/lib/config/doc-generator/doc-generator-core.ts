/**
 * @fileoverview 配置文档生成器核心
 * @description 核心配置文档生成器类和主要功能
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/lib/logging/log-deduplicator';
import { EnvManager } from '../env-manager';
import { ConfigValidator } from '../config-validator';
import { TemplateGenerator } from './template-generator';
import { SecurityGuideGenerator } from './security-guide-generator';
import { ValidationReportGenerator } from './validation-report-generator';
import { ChangeHistoryManager } from './change-history-manager';
import type { 
  DocGenerationConfig, 
  ConfigChangeRecord, 
  DocGenerationResult,
  DocGenerationContext 
} from './doc-types';

/**
 * 配置文档生成器
 */
export class ConfigDocGenerator {
  private static instance: ConfigDocGenerator;
  private envManager: EnvManager;
  private validator: ConfigValidator;
  private templateGenerator: TemplateGenerator;
  private securityGuideGenerator: SecurityGuideGenerator;
  private validationReportGenerator: ValidationReportGenerator;
  private changeHistoryManager: ChangeHistoryManager;

  private constructor() {
    this.envManager = EnvManager.getInstance();
    this.validator = ConfigValidator.getInstance();
    this.templateGenerator = new TemplateGenerator();
    this.securityGuideGenerator = new SecurityGuideGenerator();
    this.validationReportGenerator = new ValidationReportGenerator();
    this.changeHistoryManager = new ChangeHistoryManager();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): ConfigDocGenerator {
    if (!ConfigDocGenerator.instance) {
      ConfigDocGenerator.instance = new ConfigDocGenerator();
    }
    return ConfigDocGenerator.instance;
  }

  /**
   * 生成完整的配置文档
   */
  async generateCompleteDocumentation(config: DocGenerationConfig): Promise<DocGenerationResult> {
    const result: DocGenerationResult = {
      success: true,
      generatedFiles: [],
      errors: [],
      warnings: [],
      stats: {
        totalVariables: 0,
        categoriesCount: 0,
        examplesCount: 0,
        securityItemsCount: 0,
      }
    };

    try {
      logger.info('开始生成配置文档', { outputDir: config.outputDir });

      // 确保输出目录存在
      await fs.mkdir(config.outputDir, { recursive: true });

      // 生成主要文档
      await this.generateEnvironmentVariablesDoc(config, result);
      await this.generateBestPracticesGuide(config, result);
      await this.generateDeploymentChecklist(config, result);
      
      if (config.includeValidation) {
        await this.generateValidationReport(config, result);
      }
      
      if (config.includeSecurity) {
        await this.generateSecurityGuide(config, result);
      }
      
      // 生成变更历史
      await this.generateChangeHistory(config, result);

      // 生成索引文件
      await this.generateIndexDoc(config, result);

      logger.info('配置文档生成完成', { 
        generatedFiles: result.generatedFiles.length,
        errors: result.errors.length,
        warnings: result.warnings.length
      });

    } catch (error) {
      result.success = false;
      result.errors.push(`文档生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
      logger.error('配置文档生成失败', { error });
    }

    return result;
  }

  /**
   * 生成环境变量文档
   */
  private async generateEnvironmentVariablesDoc(
    config: DocGenerationConfig, 
    result: DocGenerationResult
  ): Promise<void> {
    try {
      const content = this.templateGenerator.generateEnvVarTemplate(config);
      const filename = 'environment-variables.md';
      const filepath = path.join(config.outputDir, filename);
      
      await this.writeDocumentFile(filepath, content);
      result.generatedFiles.push(filename);
      
      // 更新统计信息
      result.stats.totalVariables = this.countVariablesInContent(content);
      result.stats.categoriesCount = this.countCategoriesInContent(content);
      
    } catch (error) {
      result.errors.push(`环境变量文档生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 生成最佳实践指南
   */
  private async generateBestPracticesGuide(
    config: DocGenerationConfig, 
    result: DocGenerationResult
  ): Promise<void> {
    try {
      const content = this.templateGenerator.generateBestPracticesTemplate();
      const filename = 'best-practices.md';
      const filepath = path.join(config.outputDir, filename);
      
      await this.writeDocumentFile(filepath, content);
      result.generatedFiles.push(filename);
      
    } catch (error) {
      result.errors.push(`最佳实践指南生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 生成部署检查清单
   */
  private async generateDeploymentChecklist(
    config: DocGenerationConfig, 
    result: DocGenerationResult
  ): Promise<void> {
    try {
      const content = this.templateGenerator.generateDeploymentChecklistTemplate();
      const filename = 'deployment-checklist.md';
      const filepath = path.join(config.outputDir, filename);
      
      await this.writeDocumentFile(filepath, content);
      result.generatedFiles.push(filename);
      
    } catch (error) {
      result.errors.push(`部署检查清单生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 生成安全指南
   */
  private async generateSecurityGuide(
    config: DocGenerationConfig, 
    result: DocGenerationResult
  ): Promise<void> {
    try {
      const content = this.securityGuideGenerator.generateSecurityGuide(config);
      const filename = 'security-guide.md';
      const filepath = path.join(config.outputDir, filename);
      
      await this.writeDocumentFile(filepath, content);
      result.generatedFiles.push(filename);
      
      result.stats.securityItemsCount = this.countSecurityItemsInContent(content);
      
    } catch (error) {
      result.errors.push(`安全指南生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 生成验证报告
   */
  private async generateValidationReport(
    config: DocGenerationConfig, 
    result: DocGenerationResult
  ): Promise<void> {
    try {
      const content = await this.validationReportGenerator.generateValidationReport(config);
      const filename = 'validation-report.md';
      const filepath = path.join(config.outputDir, filename);
      
      await this.writeDocumentFile(filepath, content);
      result.generatedFiles.push(filename);
      
    } catch (error) {
      result.errors.push(`验证报告生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 生成变更历史
   */
  private async generateChangeHistory(
    config: DocGenerationConfig, 
    result: DocGenerationResult
  ): Promise<void> {
    try {
      const content = this.changeHistoryManager.generateChangeHistoryDoc(config);
      const filename = 'change-history.md';
      const filepath = path.join(config.outputDir, filename);
      
      await this.writeDocumentFile(filepath, content);
      result.generatedFiles.push(filename);
      
    } catch (error) {
      result.errors.push(`变更历史生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 生成索引文档
   */
  private async generateIndexDoc(
    config: DocGenerationConfig, 
    result: DocGenerationResult
  ): Promise<void> {
    try {
      const content: string[] = [];
      
      content.push('# CoserEden 配置文档');
      content.push('');
      content.push(`> 生成时间: ${new Date().toISOString()}`);
      content.push('');
      content.push('本文档集合包含了CoserEden项目的完整配置指南。');
      content.push('');
      
      content.push('## 文档列表');
      content.push('');
      
      const docLinks = [
        { file: 'environment-variables.md', title: '环境变量配置', description: '详细的环境变量说明和配置指南' },
        { file: 'best-practices.md', title: '最佳实践指南', description: '配置管理的最佳实践和建议' },
        { file: 'deployment-checklist.md', title: '部署检查清单', description: '部署前的配置检查清单' },
        { file: 'security-guide.md', title: '安全指南', description: '配置安全的指南和建议' },
        { file: 'validation-report.md', title: '验证报告', description: '当前配置的验证结果' },
        { file: 'change-history.md', title: '变更历史', description: '配置变更的历史记录' },
      ];
      
      for (const doc of docLinks) {
        if (result.generatedFiles.includes(doc.file)) {
          content.push(`- [${doc.title}](./${doc.file}) - ${doc.description}`);
        }
      }
      
      content.push('');
      content.push('## 统计信息');
      content.push('');
      content.push(`- 环境变量总数: ${result.stats.totalVariables}`);
      content.push(`- 配置类别数: ${result.stats.categoriesCount}`);
      content.push(`- 安全项目数: ${result.stats.securityItemsCount}`);
      content.push(`- 生成文件数: ${result.generatedFiles.length}`);
      
      const filename = 'README.md';
      const filepath = path.join(config.outputDir, filename);
      
      await this.writeDocumentFile(filepath, content);
      result.generatedFiles.push(filename);
      
    } catch (error) {
      result.errors.push(`索引文档生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 写入文档文件
   */
  private async writeDocumentFile(filepath: string, content: string[]): Promise<void> {
    await fs.writeFile(filepath, content.join('\n'), 'utf-8');
  }

  /**
   * 统计内容中的变量数量
   */
  private countVariablesInContent(content: string[]): number {
    const text = content.join('\n');
    const matches = text.match(/COSEREEDEN_[A-Z_]+/g);
    return matches ? new Set(matches).size : 0;
  }

  /**
   * 统计内容中的类别数量
   */
  private countCategoriesInContent(content: string[]): number {
    const text = content.join('\n');
    const matches = text.match(/## [^#\n]+/g);
    return matches ? matches.length : 0;
  }

  /**
   * 统计内容中的安全项目数量
   */
  private countSecurityItemsInContent(content: string[]): number {
    const text = content.join('\n');
    const matches = text.match(/### [^#\n]+/g);
    return matches ? matches.length : 0;
  }

  /**
   * 记录配置变更
   */
  recordConfigChange(change: Omit<ConfigChangeRecord, 'timestamp'>): void {
    this.changeHistoryManager.recordConfigChange(change);
  }

  /**
   * 清除变更历史
   */
  clearChangeHistory(): void {
    this.changeHistoryManager.clearChangeHistory();
  }

  /**
   * 获取变更历史
   */
  getChangeHistory(): ConfigChangeRecord[] {
    return this.changeHistoryManager.getChangeHistory();
  }
}
