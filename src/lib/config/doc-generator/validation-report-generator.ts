/**
 * @fileoverview 验证报告生成器
 * @description 生成配置验证报告和分析
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

import { ConfigValidator } from '../config-validator';
import type { DocGenerationConfig, ValidationReportItem } from './doc-types';

/**
 * 验证报告生成器
 */
export class ValidationReportGenerator {
  private validator: ConfigValidator;

  constructor() {
    this.validator = ConfigValidator.getInstance();
  }

  /**
   * 生成验证报告
   */
  async generateValidationReport(config: DocGenerationConfig): Promise<string[]> {
    const content: string[] = [];

    content.push('# CoserEden 配置验证报告');
    content.push('');
    content.push(`> 生成时间: ${new Date().toISOString()}`);
    content.push('');

    try {
      // 获取验证结果
      const validationResults = await this.validator.validateAllConfigs();
      const report = await this.validator.generateValidationReport();

      // 生成摘要
      const summary = this.generateValidationSummary(validationResults);
      content.push('## 验证摘要');
      content.push('');
      content.push(`**总体状态**: ${summary.isValid ? '✅ 通过' : '❌ 失败'}`);
      content.push(`**验证类别**: ${summary.totalCategories}`);
      content.push(`**通过类别**: ${summary.validCategories}`);
      content.push(`**失败类别**: ${summary.invalidCategories}`);
      content.push(`**总错误数**: ${summary.totalErrors}`);
      content.push(`**总警告数**: ${summary.totalWarnings}`);
      content.push('');

      // 按优先级分组显示结果
      const priorityGroups = this.groupResultsByPriority(validationResults);

      for (const priority of ['P0', 'P1', 'P2', 'P3']) {
        const group = priorityGroups[priority];
        if (!group || group.length === 0) continue;

        content.push(`## ${priority}级配置验证`);
        content.push('');

        for (const [category, result] of group) {
          content.push(`### ${category}`);
          content.push('');
          content.push(`**状态**: ${result.isValid ? '✅ 有效' : '❌ 无效'}`);
          content.push(`**优先级**: ${result.priority}`);
          content.push('');

          if (result.errors && result.errors.length > 0) {
            content.push('**错误**:');
            for (const error of result.errors) {
              const errorMessage = typeof error === 'string' ? error : error.message || '未知错误';
              const errorField = typeof error === 'object' && error.field ? ` (${error.field})` : '';
              content.push(`- ❌ ${errorMessage}${errorField}`);
            }
            content.push('');
          }

          if (result.warnings && result.warnings.length > 0) {
            content.push('**警告**:');
            for (const warning of result.warnings) {
              const warningMessage = typeof warning === 'string' ? warning : warning.message || '未知警告';
              const warningField = typeof warning === 'object' && warning.field ? ` (${warning.field})` : '';
              content.push(`- ⚠️ ${warningMessage}${warningField}`);
            }
            content.push('');
          }

          if (result.suggestions && result.suggestions.length > 0) {
            content.push('**建议**:');
            for (const suggestion of result.suggestions) {
              const suggestionMessage = typeof suggestion === 'string' ? suggestion : suggestion.message || '未知建议';
              const suggestionField = typeof suggestion === 'object' && suggestion.field ? ` (${suggestion.field})` : '';
              content.push(`- 💡 ${suggestionMessage}${suggestionField}`);
            }
            content.push('');
          }
        }
      }

      // 添加推荐操作
      if (report.recommendations && report.recommendations.length > 0) {
        content.push('## 推荐操作');
        content.push('');
        for (const recommendation of report.recommendations) {
          content.push(`- ${recommendation}`);
        }
        content.push('');
      }

      // 添加修复指南
      content.push(...this.generateFixGuide(validationResults));

    } catch (error) {
      content.push('## 验证失败');
      content.push('');
      content.push(`验证过程中发生错误: ${error instanceof Error ? error.message : '未知错误'}`);
      content.push('');
      content.push('请检查配置文件和验证器设置。');
    }

    return content;
  }

  /**
   * 生成验证摘要
   */
  private generateValidationSummary(validationResults: Map<string, any>): {
    isValid: boolean;
    totalCategories: number;
    validCategories: number;
    invalidCategories: number;
    totalErrors: number;
    totalWarnings: number;
  } {
    const results = Array.from(validationResults.values());
    
    return {
      isValid: results.every(r => r.isValid),
      totalCategories: results.length,
      validCategories: results.filter(r => r.isValid).length,
      invalidCategories: results.filter(r => !r.isValid).length,
      totalErrors: results.reduce((sum, r) => sum + (r.errors?.length || 0), 0),
      totalWarnings: results.reduce((sum, r) => sum + (r.warnings?.length || 0), 0),
    };
  }

  /**
   * 按优先级分组验证结果
   */
  private groupResultsByPriority(validationResults: Map<string, any>): Record<string, Array<[string, any]>> {
    const groups: Record<string, Array<[string, any]>> = {
      P0: [],
      P1: [],
      P2: [],
      P3: []
    };

    for (const [category, result] of validationResults) {
      const priority = result.priority || 'P3';
      if (groups[priority]) {
        groups[priority].push([category, result]);
      }
    }

    return groups;
  }

  /**
   * 生成修复指南
   */
  private generateFixGuide(validationResults: Map<string, any>): string[] {
    const content: string[] = [];
    const hasErrors = Array.from(validationResults.values()).some(r => r.errors && r.errors.length > 0);

    if (!hasErrors) {
      return content;
    }

    content.push('## 修复指南');
    content.push('');
    content.push('以下是针对发现问题的修复建议：');
    content.push('');

    // P0级错误修复指南
    const p0Errors = Array.from(validationResults.entries())
      .filter(([_, result]) => result.priority === 'P0' && result.errors && result.errors.length > 0);

    if (p0Errors.length > 0) {
      content.push('### 🔴 P0级错误修复（优先处理）');
      content.push('');
      content.push('这些错误会导致系统无法正常运行，必须立即修复：');
      content.push('');

      for (const [category, result] of p0Errors) {
        content.push(`#### ${category}`);
        content.push('');
        
        if (category.toLowerCase().includes('redis')) {
          content.push('**Redis配置修复**:');
          content.push('```bash');
          content.push('# 设置Redis配置');
          content.push('export COSEREEDEN_REDIS_HOST=localhost');
          content.push('export COSEREEDEN_REDIS_PORT=6379');
          content.push('export COSEREEDEN_REDIS_PASSWORD=your-redis-password');
          content.push('```');
        } else if (category.toLowerCase().includes('database')) {
          content.push('**数据库配置修复**:');
          content.push('```bash');
          content.push('# 设置数据库配置');
          content.push('export COSEREEDEN_DATABASE_URL="postgresql://user:password@localhost:5432/cosereeden"');
          content.push('```');
        } else if (category.toLowerCase().includes('storage')) {
          content.push('**存储配置修复**:');
          content.push('```bash');
          content.push('# 设置Cloudflare R2配置');
          content.push('export COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key');
          content.push('export COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-key');
          content.push('```');
        }
        
        content.push('');
      }
    }

    // P1级错误修复指南
    const p1Errors = Array.from(validationResults.entries())
      .filter(([_, result]) => result.priority === 'P1' && result.errors && result.errors.length > 0);

    if (p1Errors.length > 0) {
      content.push('### 🟠 P1级错误修复');
      content.push('');
      content.push('这些错误影响核心功能，建议尽快修复：');
      content.push('');

      for (const [category, result] of p1Errors) {
        content.push(`#### ${category}`);
        content.push('');
        
        if (category.toLowerCase().includes('email')) {
          content.push('**邮件配置修复**:');
          content.push('```bash');
          content.push('# 设置邮件配置');
          content.push('export COSEREEDEN_EMAIL_FROM=noreply@yourdomain.com');
          content.push('export COSEREEDEN_EMAIL_SMTP_HOST=smtp.gmail.com');
          content.push('export COSEREEDEN_EMAIL_SMTP_USER=your-email@gmail.com');
          content.push('export COSEREEDEN_EMAIL_SMTP_PASS=your-app-password');
          content.push('```');
        } else if (category.toLowerCase().includes('auth')) {
          content.push('**认证配置修复**:');
          content.push('```bash');
          content.push('# 生成NextAuth密钥');
          content.push('export COSEREEDEN_NEXTAUTH_SECRET=$(openssl rand -hex 32)');
          content.push('export COSEREEDEN_NEXTAUTH_URL=https://yourdomain.com');
          content.push('```');
        }
        
        content.push('');
      }
    }

    // 通用修复步骤
    content.push('### 通用修复步骤');
    content.push('');
    content.push('1. **检查环境变量文件**:');
    content.push('   ```bash');
    content.push('   # 检查.env文件是否存在');
    content.push('   ls -la .env*');
    content.push('   ```');
    content.push('');
    content.push('2. **验证配置**:');
    content.push('   ```bash');
    content.push('   # 运行配置验证');
    content.push('   npm run config:validate');
    content.push('   ```');
    content.push('');
    content.push('3. **重启应用**:');
    content.push('   ```bash');
    content.push('   # 重启应用以加载新配置');
    content.push('   npm run dev  # 开发环境');
    content.push('   # 或');
    content.push('   npm run start  # 生产环境');
    content.push('   ```');

    return content;
  }
}
