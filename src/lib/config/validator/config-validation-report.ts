/**
 * @fileoverview 配置验证报告生成
 * @description 生成配置验证报告和推荐建议
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

import type { 
  ConfigValidationResult, 
  ValidationReport, 
  ValidationReportSummary 
} from './config-validation-types';

/**
 * 生成配置验证报告
 */
export function generateValidationReport(
  results: Map<string, ConfigValidationResult>,
  totalCategories: number
): ValidationReport {
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalSuggestions = 0;
  let validCategories = 0;

  for (const result of results.values()) {
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
    totalSuggestions += result.suggestions.length;
    if (result.isValid) validCategories++;
  }

  const recommendations: string[] = [];

  // 生成推荐建议
  if (totalErrors > 0) {
    recommendations.push('请优先修复配置错误，确保系统正常运行');
  }

  if (totalWarnings > 0) {
    recommendations.push('建议处理配置警告，提高系统安全性和稳定性');
  }

  // 检查是否使用了推荐的COSEREEDEN_前缀
  const hasCoserEdenPrefix = Object.keys(process.env).some(key => key.startsWith('COSEREEDEN_'));
  if (!hasCoserEdenPrefix) {
    recommendations.push('建议迁移到COSEREEDEN_前缀的环境变量以避免冲突');
  }

  const summary: ValidationReportSummary = {
    totalCategories,
    validCategories,
    totalErrors,
    totalWarnings,
    totalSuggestions,
  };

  return {
    summary,
    results,
    recommendations,
  };
}

/**
 * 格式化验证报告为可读文本
 */
export function formatValidationReport(report: ValidationReport): string {
  const lines: string[] = [];

  lines.push('# 配置验证报告');
  lines.push('');
  lines.push('## 验证摘要');
  lines.push('');
  lines.push(`- 总配置类别: ${report.summary.totalCategories}`);
  lines.push(`- 有效配置类别: ${report.summary.validCategories}`);
  lines.push(`- 配置错误: ${report.summary.totalErrors}`);
  lines.push(`- 配置警告: ${report.summary.totalWarnings}`);
  lines.push(`- 配置建议: ${report.summary.totalSuggestions}`);
  lines.push('');

  if (report.summary.totalErrors === 0 && report.summary.totalWarnings === 0) {
    lines.push('✅ 所有配置验证通过！');
  } else {
    lines.push('## 详细结果');
    lines.push('');

    for (const [category, result] of report.results) {
      lines.push(`### ${category} (${result.priority}级)`);
      lines.push('');
      lines.push(`**状态**: ${result.isValid ? '✅ 有效' : '❌ 无效'}`);
      lines.push('');

      if (result.errors.length > 0) {
        lines.push('**错误**:');
        for (const error of result.errors) {
          lines.push(`- ${error.message} (${error.field})`);
          if (error.fixSuggestion) {
            lines.push(`  💡 建议: ${error.fixSuggestion}`);
          }
        }
        lines.push('');
      }

      if (result.warnings.length > 0) {
        lines.push('**警告**:');
        for (const warning of result.warnings) {
          lines.push(`- ${warning.message} (${warning.field})`);
          if (warning.recommendation) {
            lines.push(`  💡 建议: ${warning.recommendation}`);
          }
        }
        lines.push('');
      }

      if (result.suggestions.length > 0) {
        lines.push('**建议**:');
        for (const suggestion of result.suggestions) {
          lines.push(`- ${suggestion.message} (${suggestion.field})`);
          if (suggestion.recommendedValue) {
            lines.push(`  💡 推荐值: ${suggestion.recommendedValue}`);
          }
        }
        lines.push('');
      }
    }
  }

  if (report.recommendations.length > 0) {
    lines.push('## 推荐操作');
    lines.push('');
    for (const recommendation of report.recommendations) {
      lines.push(`- ${recommendation}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push(`*报告生成时间: ${new Date().toISOString()}*`);

  return lines.join('\n');
}

/**
 * 生成简化的验证状态摘要
 */
export function generateValidationSummary(results: Map<string, ConfigValidationResult>): {
  status: 'success' | 'warning' | 'error';
  message: string;
  details: {
    totalCategories: number;
    validCategories: number;
    errorCategories: string[];
    warningCategories: string[];
  };
} {
  const totalCategories = results.size;
  let validCategories = 0;
  const errorCategories: string[] = [];
  const warningCategories: string[] = [];

  for (const [category, result] of results) {
    if (result.isValid) {
      validCategories++;
    } else {
      errorCategories.push(category);
    }

    if (result.warnings.length > 0) {
      warningCategories.push(category);
    }
  }

  let status: 'success' | 'warning' | 'error';
  let message: string;

  if (errorCategories.length > 0) {
    status = 'error';
    message = `配置验证失败：${errorCategories.length} 个类别存在错误`;
  } else if (warningCategories.length > 0) {
    status = 'warning';
    message = `配置验证通过但有警告：${warningCategories.length} 个类别存在警告`;
  } else {
    status = 'success';
    message = '所有配置验证通过';
  }

  return {
    status,
    message,
    details: {
      totalCategories,
      validCategories,
      errorCategories,
      warningCategories,
    },
  };
}
