/**
 * @fileoverview 建议生成器 - CoserEden平台
 * @description 生成重构建议和优化方案
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import type {
  RefactoringRecommendation,
  CodeDuplicationPattern,
  UnusedCodeItem,
  CodeComplexityAnalysis,
  ISuggestionGenerator,
} from './refactoring-types';

/**
 * 建议生成器类
 * 负责生成重构建议和优化方案
 */
export class SuggestionGenerator extends EventEmitter implements ISuggestionGenerator {
  /**
   * 生成综合重构建议
   */
  public generateRecommendations(
    duplications: CodeDuplicationPattern[],
    unusedCode: UnusedCodeItem[],
    complexity: CodeComplexityAnalysis[]
  ): RefactoringRecommendation[] {
    console.log('💡 开始生成重构建议...');

    const recommendations: RefactoringRecommendation[] = [];

    // 生成重复代码建议
    const duplicationRecs = this.generateDuplicationRecommendations(duplications);
    recommendations.push(...duplicationRecs);

    // 生成未使用代码建议
    const unusedCodeRecs = this.generateUnusedCodeRecommendations(unusedCode);
    recommendations.push(...unusedCodeRecs);

    // 生成复杂度建议
    const complexityRecs = this.generateComplexityRecommendations(complexity);
    recommendations.push(...complexityRecs);

    // 按优先级排序
    const prioritizedRecs = this.prioritizeRecommendations(recommendations);

    console.log(`✅ 重构建议生成完成: 生成了 ${prioritizedRecs.length} 条建议`);
    return prioritizedRecs;
  }

  /**
   * 生成重复代码建议
   */
  public generateDuplicationRecommendations(duplications: CodeDuplicationPattern[]): RefactoringRecommendation[] {
    const recommendations: RefactoringRecommendation[] = [];

    for (const duplication of duplications) {
      const priority = this.mapSeverityToPriority(duplication.severity);
      const effort = this.estimateEffortForDuplication(duplication);

      recommendations.push({
        id: `rec_dup_${duplication.id}`,
        type: 'merge_similar',
        priority,
        title: `消除重复代码: ${duplication.pattern}`,
        description: `发现 ${duplication.locations.length} 处相似代码（相似度: ${(duplication.similarity * 100).toFixed(1)}%），建议提取为公共函数或模块。`,
        files: duplication.locations.map(loc => loc.file),
        estimatedEffort: effort,
        benefits: [
          '减少代码重复，提高可维护性',
          '降低bug修复成本',
          '提高代码一致性',
          `预计减少 ${this.estimateLinesSaved(duplication)} 行重复代码`,
        ],
        risks: [
          '可能需要调整现有调用方式',
          '需要充分测试以确保功能一致性',
        ],
        autoApplicable: duplication.similarity > 0.9 && duplication.type === 'function',
      });
    }

    return recommendations;
  }

  /**
   * 生成未使用代码建议
   */
  public generateUnusedCodeRecommendations(unusedCode: UnusedCodeItem[]): RefactoringRecommendation[] {
    const recommendations: RefactoringRecommendation[] = [];

    // 按类型分组
    const groupedUnused = this.groupUnusedCodeByType(unusedCode);

    for (const [type, items] of groupedUnused) {
      if (items.length === 0) continue;

      const autoRemovableCount = items.filter(item => item.canAutoRemove).length;
      const priority = items.length > 10 ? 'high' : items.length > 5 ? 'medium' : 'low';

      recommendations.push({
        id: `rec_unused_${type}_${Date.now()}`,
        type: 'remove_unused',
        priority,
        title: `清理未使用的${this.getTypeDisplayName(type)}`,
        description: `发现 ${items.length} 个未使用的${this.getTypeDisplayName(type)}，其中 ${autoRemovableCount} 个可以安全自动删除。`,
        files: [...new Set(items.map(item => item.file))],
        estimatedEffort: items.length > 20 ? 'medium' : 'small',
        benefits: [
          '减少代码体积，提高加载速度',
          '简化代码结构，提高可读性',
          '减少维护负担',
          `预计减少 ${items.length} 个未使用项`,
        ],
        risks: [
          '需要确认代码确实未被使用',
          '可能影响动态引用或反射调用',
        ],
        autoApplicable: autoRemovableCount === items.length && items.length < 10,
      });
    }

    return recommendations;
  }

  /**
   * 生成复杂度建议
   */
  public generateComplexityRecommendations(complexity: CodeComplexityAnalysis[]): RefactoringRecommendation[] {
    const recommendations: RefactoringRecommendation[] = [];

    // 找出高复杂度的函数和文件
    const highComplexityItems = complexity.filter(item => 
      item.cyclomaticComplexity > 10 || 
      item.cognitiveComplexity > 15 || 
      item.maintainabilityIndex < 60
    );

    // 按文件分组
    const groupedByFile = this.groupComplexityByFile(highComplexityItems);

    for (const [file, items] of groupedByFile) {
      const functions = items.filter(item => item.function);
      const fileLevel = items.find(item => !item.function);

      if (functions.length > 0) {
        const avgComplexity = functions.reduce((sum, item) => sum + item.cyclomaticComplexity, 0) / functions.length;
        const priority = avgComplexity > 20 ? 'critical' : avgComplexity > 15 ? 'high' : 'medium';

        recommendations.push({
          id: `rec_complexity_${file.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
          type: 'simplify_logic',
          priority,
          title: `简化复杂逻辑: ${file}`,
          description: `文件中有 ${functions.length} 个高复杂度函数，平均圈复杂度为 ${avgComplexity.toFixed(1)}。`,
          files: [file],
          estimatedEffort: functions.length > 5 ? 'large' : functions.length > 2 ? 'medium' : 'small',
          benefits: [
            '提高代码可读性和可维护性',
            '降低bug出现概率',
            '便于单元测试',
            '提高开发效率',
          ],
          risks: [
            '重构可能引入新的bug',
            '需要大量测试验证',
            '可能影响性能',
          ],
          autoApplicable: false,
        });
      }

      if (fileLevel && fileLevel.linesOfCode > 500) {
        recommendations.push({
          id: `rec_file_size_${file.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
          type: 'extract_function',
          priority: fileLevel.linesOfCode > 1000 ? 'high' : 'medium',
          title: `拆分大文件: ${file}`,
          description: `文件过大（${fileLevel.linesOfCode} 行），建议拆分为多个较小的模块。`,
          files: [file],
          estimatedEffort: 'large',
          benefits: [
            '提高代码组织性',
            '便于团队协作',
            '减少合并冲突',
            '提高模块复用性',
          ],
          risks: [
            '需要重新组织导入导出',
            '可能影响现有引用',
            '需要更新构建配置',
          ],
          autoApplicable: false,
        });
      }
    }

    return recommendations;
  }

  /**
   * 按优先级排序建议
   */
  public prioritizeRecommendations(recommendations: RefactoringRecommendation[]): RefactoringRecommendation[] {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    
    return recommendations.sort((a, b) => {
      // 首先按优先级排序
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // 然后按是否可自动应用排序
      if (a.autoApplicable && !b.autoApplicable) return -1;
      if (!a.autoApplicable && b.autoApplicable) return 1;

      // 最后按工作量排序（小的在前）
      const effortOrder = { small: 1, medium: 2, large: 3 };
      return effortOrder[a.estimatedEffort] - effortOrder[b.estimatedEffort];
    });
  }

  // 私有方法

  private mapSeverityToPriority(severity: 'low' | 'medium' | 'high' | 'critical'): 'low' | 'medium' | 'high' | 'critical' {
    return severity;
  }

  private estimateEffortForDuplication(duplication: CodeDuplicationPattern): 'small' | 'medium' | 'large' {
    const locations = duplication.locations.length;
    const avgLines = duplication.locations.reduce((sum, loc) => 
      sum + (loc.endLine - loc.startLine + 1), 0
    ) / locations;

    if (locations <= 2 && avgLines <= 10) return 'small';
    if (locations <= 4 && avgLines <= 30) return 'medium';
    return 'large';
  }

  private estimateLinesSaved(duplication: CodeDuplicationPattern): number {
    const totalLines = duplication.locations.reduce((sum, loc) => 
      sum + (loc.endLine - loc.startLine + 1), 0
    );
    
    // 假设可以节省除了一个实现之外的所有重复代码
    const avgLines = totalLines / duplication.locations.length;
    return Math.round(totalLines - avgLines);
  }

  private groupUnusedCodeByType(unusedCode: UnusedCodeItem[]): Map<string, UnusedCodeItem[]> {
    const groups = new Map<string, UnusedCodeItem[]>();
    
    for (const item of unusedCode) {
      if (!groups.has(item.type)) {
        groups.set(item.type, []);
      }
      groups.get(item.type)!.push(item);
    }

    return groups;
  }

  private getTypeDisplayName(type: string): string {
    const displayNames: Record<string, string> = {
      import: '导入',
      function: '函数',
      variable: '变量',
      class: '类',
      interface: '接口',
      type: '类型',
    };
    
    return displayNames[type] || type;
  }

  private groupComplexityByFile(complexity: CodeComplexityAnalysis[]): Map<string, CodeComplexityAnalysis[]> {
    const groups = new Map<string, CodeComplexityAnalysis[]>();
    
    for (const item of complexity) {
      if (!groups.has(item.file)) {
        groups.set(item.file, []);
      }
      groups.get(item.file)!.push(item);
    }

    return groups;
  }
}
