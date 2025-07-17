/**
 * @fileoverview 质量分析器 - CoserEden平台
 * @description 代码质量分析和复杂度计算
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import type {
  CodeComplexityAnalysis,
  AnalysisResult,
  IQualityAnalyzer,
} from './refactoring-types';
import { SyntaxAnalyzer } from './syntax-analyzer';

/**
 * 质量分析器类
 * 负责分析代码质量和复杂度
 */
export class QualityAnalyzer extends EventEmitter implements IQualityAnalyzer {
  private syntaxAnalyzer: SyntaxAnalyzer;

  constructor() {
    super();
    this.syntaxAnalyzer = new SyntaxAnalyzer();
  }

  /**
   * 分析代码复杂度
   */
  public async analyzeComplexity(files: string[]): Promise<CodeComplexityAnalysis[]> {
    console.log('🔍 开始分析代码复杂度...');
    const complexityAnalyses: CodeComplexityAnalysis[] = [];

    try {
      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        const functions = this.syntaxAnalyzer.extractFunctions(content, file);

        // 分析文件级别的复杂度
        const fileComplexity = this.analyzeFileComplexity(file, content);
        complexityAnalyses.push(fileComplexity);

        // 分析每个函数的复杂度
        for (const func of functions) {
          const functionComplexity = this.analyzeFunctionComplexity(file, func.name, func.content);
          complexityAnalyses.push(functionComplexity);
        }
      }

      console.log(`✅ 代码复杂度分析完成: 分析了 ${complexityAnalyses.length} 个项目`);
      return complexityAnalyses;

    } catch (error) {
      console.error('❌ 代码复杂度分析失败:', error);
      throw error;
    }
  }

  /**
   * 计算圈复杂度
   */
  public calculateCyclomaticComplexity(content: string): number {
    let complexity = 1; // 基础复杂度

    // 计算决策点
    const decisionPatterns = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\bwhile\b/g,
      /\bfor\b/g,
      /\bdo\b/g,
      /\bswitch\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\?\s*[^:]*:/g, // 三元操作符
      /&&/g,
      /\|\|/g,
    ];

    for (const pattern of decisionPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  /**
   * 计算认知复杂度
   */
  public calculateCognitiveComplexity(content: string): number {
    let complexity = 0;
    let nestingLevel = 0;

    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // 跳过注释和空行
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*')) {
        continue;
      }

      // 计算嵌套级别
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      nestingLevel += openBraces - closeBraces;

      // 计算认知复杂度
      if (this.isDecisionPoint(trimmed)) {
        complexity += 1 + Math.max(0, nestingLevel - 1);
      }

      if (this.isBreakingStatement(trimmed)) {
        complexity += 1;
      }
    }

    return complexity;
  }

  /**
   * 计算可维护性指数
   */
  public calculateMaintainabilityIndex(
    complexity: number, 
    linesOfCode: number, 
    content: string
  ): number {
    // Halstead 复杂度的简化计算
    const halsteadVolume = this.calculateHalsteadVolume(content);
    
    // 可维护性指数公式 (简化版)
    const maintainabilityIndex = Math.max(0, 
      171 - 5.2 * Math.log(halsteadVolume) - 0.23 * complexity - 16.2 * Math.log(linesOfCode)
    );

    return Math.round(maintainabilityIndex);
  }

  /**
   * 评估代码质量
   */
  public assessCodeQuality(analysis: AnalysisResult): number {
    let score = 100;

    // 根据重复代码扣分
    const duplications = analysis.duplications.length;
    score -= Math.min(duplications * 5, 30);

    // 根据未使用代码扣分
    const unusedItems = analysis.unusedCode.length;
    score -= Math.min(unusedItems * 2, 20);

    // 根据复杂函数扣分
    const complexFunctions = analysis.complexity.filter(c => 
      c.cyclomaticComplexity > 10 || c.cognitiveComplexity > 15
    ).length;
    score -= Math.min(complexFunctions * 3, 25);

    // 根据可维护性指数调整
    const avgMaintainability = analysis.complexity.reduce((sum, c) => 
      sum + c.maintainabilityIndex, 0
    ) / analysis.complexity.length;
    
    if (avgMaintainability < 50) {
      score -= 15;
    } else if (avgMaintainability < 70) {
      score -= 10;
    }

    return Math.max(score, 0);
  }

  // 私有方法

  private analyzeFileComplexity(file: string, content: string): CodeComplexityAnalysis {
    const linesOfCode = content.split('\n').filter(line => 
      line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('*')
    ).length;

    const cyclomaticComplexity = this.calculateCyclomaticComplexity(content);
    const cognitiveComplexity = this.calculateCognitiveComplexity(content);
    const maintainabilityIndex = this.calculateMaintainabilityIndex(
      cyclomaticComplexity, 
      linesOfCode, 
      content
    );

    const suggestions = this.generateFileSuggestions(
      cyclomaticComplexity, 
      cognitiveComplexity, 
      linesOfCode, 
      maintainabilityIndex
    );

    return {
      file,
      cyclomaticComplexity,
      cognitiveComplexity,
      linesOfCode,
      maintainabilityIndex,
      suggestions,
    };
  }

  private analyzeFunctionComplexity(file: string, functionName: string, content: string): CodeComplexityAnalysis {
    const linesOfCode = content.split('\n').length;
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(content);
    const cognitiveComplexity = this.calculateCognitiveComplexity(content);
    const maintainabilityIndex = this.calculateMaintainabilityIndex(
      cyclomaticComplexity, 
      linesOfCode, 
      content
    );

    const suggestions = this.generateFunctionSuggestions(
      functionName,
      cyclomaticComplexity, 
      cognitiveComplexity, 
      linesOfCode, 
      maintainabilityIndex
    );

    return {
      file,
      function: functionName,
      cyclomaticComplexity,
      cognitiveComplexity,
      linesOfCode,
      maintainabilityIndex,
      suggestions,
    };
  }

  private isDecisionPoint(line: string): boolean {
    const decisionKeywords = [
      'if', 'else if', 'while', 'for', 'do', 'switch', 'case', 'catch'
    ];
    
    return decisionKeywords.some(keyword => 
      new RegExp(`\\b${keyword}\\b`).test(line)
    ) || line.includes('?') || line.includes('&&') || line.includes('||');
  }

  private isBreakingStatement(line: string): boolean {
    const breakingKeywords = ['break', 'continue', 'return', 'throw'];
    return breakingKeywords.some(keyword => 
      new RegExp(`\\b${keyword}\\b`).test(line)
    );
  }

  private calculateHalsteadVolume(content: string): number {
    // 简化的 Halstead 体积计算
    const operators = content.match(/[+\-*/%=<>!&|^~?:;,(){}[\]]/g) || [];
    const operands = content.match(/\b\w+\b/g) || [];
    
    const uniqueOperators = new Set(operators).size;
    const uniqueOperands = new Set(operands).size;
    const totalOperators = operators.length;
    const totalOperands = operands.length;

    const vocabulary = uniqueOperators + uniqueOperands;
    const length = totalOperators + totalOperands;

    return length * Math.log2(vocabulary || 1);
  }

  private generateFileSuggestions(
    cyclomaticComplexity: number,
    cognitiveComplexity: number,
    linesOfCode: number,
    maintainabilityIndex: number
  ): string[] {
    const suggestions: string[] = [];

    if (linesOfCode > 500) {
      suggestions.push('文件过大，考虑拆分为多个较小的文件');
    }

    if (cyclomaticComplexity > 20) {
      suggestions.push('文件的圈复杂度过高，考虑重构复杂的逻辑');
    }

    if (cognitiveComplexity > 30) {
      suggestions.push('文件的认知复杂度过高，考虑简化嵌套结构');
    }

    if (maintainabilityIndex < 50) {
      suggestions.push('可维护性指数较低，建议进行重构以提高代码质量');
    }

    return suggestions;
  }

  private generateFunctionSuggestions(
    functionName: string,
    cyclomaticComplexity: number,
    cognitiveComplexity: number,
    linesOfCode: number,
    maintainabilityIndex: number
  ): string[] {
    const suggestions: string[] = [];

    if (linesOfCode > 50) {
      suggestions.push(`函数 ${functionName} 过长，考虑拆分为多个较小的函数`);
    }

    if (cyclomaticComplexity > 10) {
      suggestions.push(`函数 ${functionName} 的圈复杂度过高，考虑简化条件逻辑`);
    }

    if (cognitiveComplexity > 15) {
      suggestions.push(`函数 ${functionName} 的认知复杂度过高，考虑减少嵌套层级`);
    }

    if (maintainabilityIndex < 60) {
      suggestions.push(`函数 ${functionName} 的可维护性较低，建议重构`);
    }

    // 具体的重构建议
    if (cyclomaticComplexity > 15) {
      suggestions.push(`考虑使用策略模式或状态模式重构 ${functionName}`);
    }

    if (linesOfCode > 100) {
      suggestions.push(`考虑将 ${functionName} 拆分为多个职责单一的函数`);
    }

    return suggestions;
  }
}
