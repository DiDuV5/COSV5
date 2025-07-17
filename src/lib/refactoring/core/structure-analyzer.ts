/**
 * @fileoverview 结构分析器 - CoserEden平台
 * @description 代码结构分析和重复检测
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import type {
  CodeDuplicationPattern,
  UnusedCodeItem,
  FunctionInfo,
  ImportInfo,
  ExportInfo,
  UsageInfo,
  IStructureAnalyzer,
} from './refactoring-types';
import { SyntaxAnalyzer } from './syntax-analyzer';

/**
 * 结构分析器类
 * 负责分析代码结构和检测重复模式
 */
export class StructureAnalyzer extends EventEmitter implements IStructureAnalyzer {
  private syntaxAnalyzer: SyntaxAnalyzer;

  constructor() {
    super();
    this.syntaxAnalyzer = new SyntaxAnalyzer();
  }

  /**
   * 分析代码重复
   */
  public async analyzeDuplications(files: string[]): Promise<CodeDuplicationPattern[]> {
    console.log('🔍 开始分析代码重复...');
    const duplications: CodeDuplicationPattern[] = [];

    try {
      // 收集所有函数
      const allFunctions: FunctionInfo[] = [];
      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        const functions = this.syntaxAnalyzer.extractFunctions(content, file);
        allFunctions.push(...functions);
      }

      // 按函数名分组
      const functionGroups = this.groupFunctionsByName(allFunctions);

      // 检测每组中的重复
      for (const [functionName, functions] of functionGroups) {
        if (functions.length > 1) {
          const duplication = await this.analyzeFunctionDuplication(functionName, functions);
          if (duplication) {
            duplications.push(duplication);
          }
        }
      }

      // 检测结构相似的函数
      const structuralDuplications = await this.analyzeStructuralDuplications(allFunctions);
      duplications.push(...structuralDuplications);

      console.log(`✅ 代码重复分析完成: 发现 ${duplications.length} 个重复模式`);
      return duplications;

    } catch (error) {
      console.error('❌ 代码重复分析失败:', error);
      throw error;
    }
  }

  /**
   * 分析未使用代码
   */
  public async analyzeUnusedCode(files: string[]): Promise<UnusedCodeItem[]> {
    console.log('🔍 开始分析未使用代码...');
    const unusedItems: UnusedCodeItem[] = [];

    try {
      // 收集所有导入、导出和使用信息
      const allImports: ImportInfo[] = [];
      const allExports: ExportInfo[] = [];
      const allUsages: UsageInfo[] = [];
      const allFunctions: FunctionInfo[] = [];

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');

        const imports = this.syntaxAnalyzer.extractImports(content);
        const exports = this.syntaxAnalyzer.extractExports(content);
        const usages = this.syntaxAnalyzer.extractUsages(content);
        const functions = this.syntaxAnalyzer.extractFunctions(content, file);

        allImports.push(...imports.map(imp => ({ ...imp, file })));
        allExports.push(...exports.map(exp => ({ ...exp, file })));
        allUsages.push(...usages.map(usage => ({ ...usage, file })));
        allFunctions.push(...functions);
      }

      // 分析未使用的导入
      const unusedImports = this.findUnusedImports(allImports as any, allUsages as any);
      unusedItems.push(...unusedImports);

      // 分析未使用的函数
      const unusedFunctions = this.findUnusedFunctions(allFunctions, allUsages as any, allExports as any);
      unusedItems.push(...unusedFunctions);

      // 分析未使用的导出
      const unusedExports = this.findUnusedExports(allExports as any, allUsages as any);
      unusedItems.push(...unusedExports);

      console.log(`✅ 未使用代码分析完成: 发现 ${unusedItems.length} 个未使用项`);
      return unusedItems;

    } catch (error) {
      console.error('❌ 未使用代码分析失败:', error);
      throw error;
    }
  }

  /**
   * 分析文件结构
   */
  public async analyzeFileStructure(file: string): Promise<any> {
    try {
      const content = await fs.readFile(file, 'utf-8');

      const structure = {
        file,
        imports: this.syntaxAnalyzer.extractImports(content),
        exports: this.syntaxAnalyzer.extractExports(content),
        functions: this.syntaxAnalyzer.extractFunctions(content, file),
        usages: this.syntaxAnalyzer.extractUsages(content),
        linesOfCode: content.split('\n').length,
        size: content.length,
      };

      return structure;
    } catch (error) {
      console.error(`分析文件结构失败: ${file}`, error);
      throw error;
    }
  }

  /**
   * 计算相似度
   */
  public calculateSimilarity(content1: string, content2: string): number {
    const normalized1 = this.normalizeContent(content1);
    const normalized2 = this.normalizeContent(content2);

    return this.stringSimilarity(normalized1, normalized2);
  }

  // 私有方法

  private groupFunctionsByName(functions: FunctionInfo[]): Map<string, FunctionInfo[]> {
    const groups = new Map<string, FunctionInfo[]>();

    for (const func of functions) {
      if (!groups.has(func.name)) {
        groups.set(func.name, []);
      }
      groups.get(func.name)!.push(func);
    }

    return groups;
  }

  private async analyzeFunctionDuplication(
    functionName: string,
    functions: FunctionInfo[]
  ): Promise<CodeDuplicationPattern | null> {
    if (functions.length < 2) return null;

    // 计算函数间的相似度
    const similarities: number[] = [];
    for (let i = 0; i < functions.length - 1; i++) {
      for (let j = i + 1; j < functions.length; j++) {
        const similarity = this.calculateSimilarity(functions[i].content, functions[j].content);
        similarities.push(similarity);
      }
    }

    const avgSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;

    // 只有相似度超过阈值才认为是重复
    if (avgSimilarity < 0.7) return null;

    const severity = this.calculateSeverity(avgSimilarity, functions.length);

    return {
      id: `dup_func_${functionName}_${Date.now()}`,
      type: 'function',
      pattern: functionName,
      locations: functions.map(func => ({
        file: func.file,
        startLine: func.line,
        endLine: func.line + func.content.split('\n').length - 1,
        content: func.content,
      })),
      similarity: avgSimilarity,
      severity,
      suggestion: `考虑将重复的函数 ${functionName} 合并为一个通用实现`,
    };
  }

  private async analyzeStructuralDuplications(functions: FunctionInfo[]): Promise<CodeDuplicationPattern[]> {
    const duplications: CodeDuplicationPattern[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < functions.length - 1; i++) {
      const func1 = functions[i];
      const key1 = `${func1.file}:${func1.name}`;

      if (processed.has(key1)) continue;

      const similarFunctions = [func1];

      for (let j = i + 1; j < functions.length; j++) {
        const func2 = functions[j];
        const key2 = `${func2.file}:${func2.name}`;

        if (processed.has(key2)) continue;

        // 跳过同名函数（已在上面处理）
        if (func1.name === func2.name) continue;

        const similarity = this.calculateSimilarity(func1.content, func2.content);

        if (similarity > 0.8) {
          similarFunctions.push(func2);
          processed.add(key2);
        }
      }

      if (similarFunctions.length > 1) {
        processed.add(key1);

        const avgSimilarity = this.calculateAverageSimilarity(similarFunctions);
        const severity = this.calculateSeverity(avgSimilarity, similarFunctions.length);

        duplications.push({
          id: `dup_struct_${Date.now()}_${i}`,
          type: 'function',
          pattern: 'structural_similarity',
          locations: similarFunctions.map(func => ({
            file: func.file,
            startLine: func.line,
            endLine: func.line + func.content.split('\n').length - 1,
            content: func.content,
          })),
          similarity: avgSimilarity,
          severity,
          suggestion: `这些函数具有相似的结构，考虑提取公共逻辑`,
        });
      }
    }

    return duplications;
  }

  private findUnusedImports(imports: (ImportInfo & { file: string })[], usages: (UsageInfo & { file: string })[]): UnusedCodeItem[] {
    const unusedImports: UnusedCodeItem[] = [];

    for (const importItem of imports) {
      // 跳过副作用导入
      if (importItem.type === 'side-effect') continue;

      // 检查是否在同一文件中被使用
      const isUsed = usages.some(usage =>
        usage.file === importItem.file &&
        usage.name === importItem.name
      );

      if (!isUsed) {
        unusedImports.push({
          id: `unused_import_${importItem.file}_${importItem.line}`,
          type: 'import',
          name: importItem.name,
          file: importItem.file,
          line: importItem.line,
          reason: '导入后未使用',
          canAutoRemove: true,
          dependencies: [],
        });
      }
    }

    return unusedImports;
  }

  private findUnusedFunctions(
    functions: FunctionInfo[],
    usages: (UsageInfo & { file: string })[],
    exports: (ExportInfo & { file: string })[]
  ): UnusedCodeItem[] {
    const unusedFunctions: UnusedCodeItem[] = [];

    for (const func of functions) {
      // 检查函数是否被使用
      const isUsed = usages.some(usage =>
        usage.name === func.name &&
        usage.file !== func.file // 不在定义文件中的使用
      );

      // 检查函数是否被导出
      const isExported = exports.some(exp =>
        exp.name === func.name &&
        exp.file === func.file
      ) || func.isExported;

      if (!isUsed && !isExported) {
        unusedFunctions.push({
          id: `unused_function_${func.file}_${func.line}`,
          type: 'function',
          name: func.name,
          file: func.file,
          line: func.line,
          reason: '函数未被调用且未导出',
          canAutoRemove: true,
          dependencies: [],
        });
      }
    }

    return unusedFunctions;
  }

  private findUnusedExports(exports: (ExportInfo & { file: string })[], usages: (UsageInfo & { file: string })[]): UnusedCodeItem[] {
    const unusedExports: UnusedCodeItem[] = [];

    for (const exportItem of exports) {
      // 检查导出是否在其他文件中被使用
      const isUsed = usages.some(usage =>
        usage.name === exportItem.name &&
        usage.file !== exportItem.file
      );

      if (!isUsed) {
        unusedExports.push({
          id: `unused_export_${exportItem.file}_${exportItem.line}`,
          type: exportItem.type === 'default' ? 'function' : 'variable',
          name: exportItem.name,
          file: exportItem.file,
          line: exportItem.line,
          reason: '导出后未被其他文件使用',
          canAutoRemove: false, // 导出可能被外部使用，不建议自动删除
          dependencies: [],
        });
      }
    }

    return unusedExports;
  }

  private calculateAverageSimilarity(functions: FunctionInfo[]): number {
    if (functions.length < 2) return 0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < functions.length - 1; i++) {
      for (let j = i + 1; j < functions.length; j++) {
        totalSimilarity += this.calculateSimilarity(functions[i].content, functions[j].content);
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  private calculateSeverity(similarity: number, count: number): 'low' | 'medium' | 'high' | 'critical' {
    if (similarity > 0.9 && count > 3) return 'critical';
    if (similarity > 0.8 && count > 2) return 'high';
    if (similarity > 0.7) return 'medium';
    return 'low';
  }

  private normalizeContent(content: string): string {
    return content
      .replace(/\s+/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/['"`]/g, '"')
      .trim()
      .toLowerCase();
  }

  private stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,     // deletion
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }
}
