/**
 * @fileoverview 迁移报告生成器
 * @description 生成配置迁移的详细报告和建议
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

import type { 
  ConfigMigrationStatus, 
  MigrationReport, 
  MigrationSummary,
  ConfigValidationResult 
} from './integration-types';

/**
 * 迁移报告生成器
 */
export class ReportGenerator {
  /**
   * 生成迁移报告
   */
  generateMigrationReport(migrationStatuses: Map<string, ConfigMigrationStatus>): MigrationReport {
    const statuses = Array.from(migrationStatuses.values());
    
    // 计算摘要
    const summary: MigrationSummary = {
      totalCategories: statuses.length,
      completedCategories: statuses.filter(s => s.status === 'completed').length,
      failedCategories: statuses.filter(s => s.status === 'failed').length,
      totalConfigs: statuses.reduce((sum, s) => sum + s.totalCount, 0),
      migratedConfigs: statuses.reduce((sum, s) => sum + s.migratedCount, 0),
      errorCount: statuses.reduce((sum, s) => sum + s.errors.length, 0),
      warningCount: statuses.reduce((sum, s) => sum + s.warnings.length, 0),
    };

    const recommendations: string[] = [];
    
    // 生成建议
    if (summary.failedCategories > 0) {
      recommendations.push('请修复失败的配置类别，确保关键功能正常运行');
    }
    
    const hasWarnings = statuses.some(s => s.warnings.length > 0);
    if (hasWarnings) {
      recommendations.push('建议处理配置警告，提高系统稳定性');
    }
    
    if (summary.migratedConfigs < summary.totalConfigs) {
      recommendations.push('建议完成所有配置项的迁移，实现完全的环境变量驱动');
    }

    // 按优先级生成建议
    const p0Failed = statuses.filter(s => s.priority === 'P0' && s.status === 'failed');
    if (p0Failed.length > 0) {
      recommendations.unshift('⚠️ 发现P0级配置失败，请立即修复以确保系统正常运行');
    }

    const p1Failed = statuses.filter(s => s.priority === 'P1' && s.status === 'failed');
    if (p1Failed.length > 0) {
      recommendations.push('发现P1级配置失败，建议尽快修复以确保核心功能正常');
    }

    return {
      summary,
      details: statuses,
      recommendations,
    };
  }

  /**
   * 生成详细的配置状态报告
   */
  generateDetailedReport(migrationStatuses: Map<string, ConfigMigrationStatus>): string {
    const report: string[] = [];
    const statuses = Array.from(migrationStatuses.values());

    report.push('# CoserEden 配置迁移报告');
    report.push('');
    report.push(`生成时间: ${new Date().toISOString()}`);
    report.push('');

    // 摘要部分
    const summary = this.generateMigrationReport(migrationStatuses).summary;
    report.push('## 迁移摘要');
    report.push('');
    report.push(`- 总配置类别: ${summary.totalCategories}`);
    report.push(`- 已完成类别: ${summary.completedCategories}`);
    report.push(`- 失败类别: ${summary.failedCategories}`);
    report.push(`- 总配置项: ${summary.totalConfigs}`);
    report.push(`- 已迁移配置: ${summary.migratedConfigs}`);
    report.push(`- 错误数量: ${summary.errorCount}`);
    report.push(`- 警告数量: ${summary.warningCount}`);
    report.push('');

    // 按优先级分组
    const priorityGroups = this.groupByPriority(statuses);

    for (const priority of ['P0', 'P1', 'P2', 'P3']) {
      const group = priorityGroups[priority];
      if (!group || group.length === 0) continue;

      report.push(`## ${priority}级配置 (${this.getPriorityDescription(priority)})`);
      report.push('');

      for (const status of group) {
        report.push(`### ${status.category.toUpperCase()}`);
        report.push('');
        report.push(`- 状态: ${this.getStatusEmoji(status.status)} ${this.getStatusText(status.status)}`);
        report.push(`- 进度: ${status.migratedCount}/${status.totalCount}`);
        
        if (status.errors.length > 0) {
          report.push('- 错误:');
          status.errors.forEach(error => {
            report.push(`  - ❌ ${error}`);
          });
        }

        if (status.warnings.length > 0) {
          report.push('- 警告:');
          status.warnings.forEach(warning => {
            report.push(`  - ⚠️ ${warning}`);
          });
        }

        report.push('');
      }
    }

    // 建议部分
    const recommendations = this.generateMigrationReport(migrationStatuses).recommendations;
    if (recommendations.length > 0) {
      report.push('## 建议');
      report.push('');
      recommendations.forEach((rec, index) => {
        report.push(`${index + 1}. ${rec}`);
      });
      report.push('');
    }

    return report.join('\n');
  }

  /**
   * 生成配置验证报告
   */
  generateValidationReport(validationResult: ConfigValidationResult): string {
    const report: string[] = [];

    report.push('# 配置验证报告');
    report.push('');
    report.push(`验证时间: ${new Date().toISOString()}`);
    report.push(`验证结果: ${validationResult.isValid ? '✅ 通过' : '❌ 失败'}`);
    report.push('');

    if (validationResult.errors.length > 0) {
      report.push('## 错误');
      report.push('');
      validationResult.errors.forEach((error, index) => {
        report.push(`${index + 1}. ❌ ${error}`);
      });
      report.push('');
    }

    if (validationResult.warnings.length > 0) {
      report.push('## 警告');
      report.push('');
      validationResult.warnings.forEach((warning, index) => {
        report.push(`${index + 1}. ⚠️ ${warning}`);
      });
      report.push('');
    }

    if (validationResult.isValid) {
      report.push('## 结论');
      report.push('');
      report.push('所有配置验证通过，系统可以正常运行。');
    } else {
      report.push('## 结论');
      report.push('');
      report.push('配置验证失败，请修复上述错误后重新验证。');
    }

    return report.join('\n');
  }

  /**
   * 生成环境变量模板
   */
  generateEnvTemplate(priority: 'P0' | 'P1' | 'P2' | 'P3' | 'all' = 'all'): string {
    const template: string[] = [];

    template.push('# CoserEden 环境变量配置模板');
    template.push(`# 优先级: ${priority === 'all' ? '全部' : priority}`);
    template.push(`# 生成时间: ${new Date().toISOString()}`);
    template.push('');

    if (priority === 'all' || priority === 'P0') {
      template.push('# ========================================');
      template.push('# P0级配置 (关键基础设施)');
      template.push('# ========================================');
      template.push('');
      template.push('# Redis配置');
      template.push('COSEREEDEN_REDIS_HOST=localhost');
      template.push('COSEREEDEN_REDIS_PORT=6379');
      template.push('COSEREEDEN_REDIS_PASSWORD=');
      template.push('COSEREEDEN_REDIS_DB=0');
      template.push('');
      template.push('# 数据库配置');
      template.push('COSEREEDEN_DATABASE_URL=postgresql://user:password@localhost:5432/cosereeden');
      template.push('COSEREEDEN_DB_CONNECTION_LIMIT=10');
      template.push('COSEREEDEN_DB_CONNECT_TIMEOUT=30000');
      template.push('');
      template.push('# 存储配置');
      template.push('COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key-id');
      template.push('COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-access-key');
      template.push('COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME=cosereeden-storage');
      template.push('COSEREEDEN_CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com');
      template.push('');
    }

    if (priority === 'all' || priority === 'P1') {
      template.push('# ========================================');
      template.push('# P1级配置 (核心功能)');
      template.push('# ========================================');
      template.push('');
      template.push('# 邮件配置');
      template.push('COSEREEDEN_EMAIL_FROM=noreply@cosereeden.com');
      template.push('COSEREEDEN_EMAIL_SMTP_HOST=smtp.gmail.com');
      template.push('COSEREEDEN_EMAIL_SMTP_PORT=587');
      template.push('COSEREEDEN_EMAIL_SMTP_USER=your-email@gmail.com');
      template.push('COSEREEDEN_EMAIL_SMTP_PASS=your-app-password');
      template.push('');
      template.push('# 认证配置');
      template.push('COSEREEDEN_NEXTAUTH_SECRET=your-nextauth-secret-key');
      template.push('COSEREEDEN_NEXTAUTH_URL=http://localhost:3000');
      template.push('COSEREEDEN_AUTH_SESSION_MAX_AGE=2592000');
      template.push('COSEREEDEN_COOKIE_DOMAIN=.cosereeden.com');
      template.push('');
      template.push('# 业务配置');
      template.push('COSEREEDEN_BRAND_NAME=CoserEden');
      template.push('COSEREEDEN_BRAND_COLOR=#3b82f6');
      template.push('COSEREEDEN_SUPPORT_EMAIL=support@cosereeden.com');
      template.push('');
    }

    return template.join('\n');
  }

  /**
   * 按优先级分组
   */
  private groupByPriority(statuses: ConfigMigrationStatus[]): Record<string, ConfigMigrationStatus[]> {
    return statuses.reduce((groups, status) => {
      const priority = status.priority;
      if (!groups[priority]) {
        groups[priority] = [];
      }
      groups[priority].push(status);
      return groups;
    }, {} as Record<string, ConfigMigrationStatus[]>);
  }

  /**
   * 获取优先级描述
   */
  private getPriorityDescription(priority: string): string {
    const descriptions: Record<string, string> = {
      'P0': '关键基础设施',
      'P1': '核心功能',
      'P2': '重要功能',
      'P3': '可选功能',
    };
    return descriptions[priority] || '未知';
  }

  /**
   * 获取状态表情符号
   */
  private getStatusEmoji(status: string): string {
    const emojis: Record<string, string> = {
      'completed': '✅',
      'failed': '❌',
      'in_progress': '🔄',
      'pending': '⏳',
    };
    return emojis[status] || '❓';
  }

  /**
   * 获取状态文本
   */
  private getStatusText(status: string): string {
    const texts: Record<string, string> = {
      'completed': '已完成',
      'failed': '失败',
      'in_progress': '进行中',
      'pending': '待处理',
    };
    return texts[status] || '未知';
  }
}
