/**
 * @fileoverview 语法分析器 - CoserEden平台
 * @description 代码语法解析和结构提取
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import type {
  FunctionInfo,
  ImportInfo,
  ExportInfo,
  UsageInfo,
  ISyntaxAnalyzer,
} from './refactoring-types';

/**
 * 语法分析器类
 * 负责解析代码语法结构和提取代码元素
 */
export class SyntaxAnalyzer extends EventEmitter implements ISyntaxAnalyzer {
  /**
   * 提取函数信息
   */
  public extractFunctions(content: string, file: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    const lines = content.split('\n');

    // 匹配各种函数定义模式
    const patterns = [
      // 函数声明: function name() {}
      /function\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*([^{]+))?\s*{/g,
      // 箭头函数: const name = () => {}
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*(?::\s*([^=]+))?\s*=>/g,
      // 方法定义: name() {}
      /(\w+)\s*\(([^)]*)\)\s*(?::\s*([^{]+))?\s*{/g,
      // 异步函数: async function name() {}
      /async\s+function\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*([^{]+))?\s*{/g,
    ];

    for (const pattern of patterns) {
      let match;
      pattern.lastIndex = 0; // 重置正则表达式

      while ((match = pattern.exec(content)) !== null) {
        const functionName = match[1];
        const parameters = this.parseParameters(match[2] || '');
        const returnType = match[3]?.trim();
        const startIndex = match.index;
        const lineNumber = content.substring(0, startIndex).split('\n').length;

        // 提取函数体
        const functionContent = this.extractFunctionBody(content, startIndex);
        
        if (functionContent && functionName) {
          const isAsync = content.substring(Math.max(0, startIndex - 10), startIndex).includes('async');
          const isExported = this.isExportedFunction(content, functionName, startIndex);

          functions.push({
            name: functionName,
            content: functionContent,
            line: lineNumber,
            file,
            parameters,
            returnType,
            isAsync,
            isExported,
          });
        }
      }
    }

    return this.deduplicateFunctions(functions);
  }

  /**
   * 提取导入信息
   */
  public extractImports(content: string): ImportInfo[] {
    const imports: ImportInfo[] = [];
    const lines = content.split('\n');

    // 匹配各种导入模式
    const patterns = [
      // import { name } from 'module'
      /import\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"]/g,
      // import name from 'module'
      /import\s+(\w+)\s+from\s*['"]([^'"]+)['"]/g,
      // import * as name from 'module'
      /import\s*\*\s*as\s+(\w+)\s+from\s*['"]([^'"]+)['"]/g,
      // import 'module'
      /import\s*['"]([^'"]+)['"]/g,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 命名导入
      const namedImportMatch = line.match(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"]/);
      if (namedImportMatch) {
        const importNames = namedImportMatch[1].split(',').map(name => name.trim());
        const source = namedImportMatch[2];
        
        for (const importName of importNames) {
          const cleanName = importName.replace(/\s+as\s+\w+/, '').trim();
          imports.push({
            name: cleanName,
            source,
            type: 'named',
            line: i + 1,
            isUsed: false, // 将在后续分析中确定
          });
        }
        continue;
      }

      // 默认导入
      const defaultImportMatch = line.match(/import\s+(\w+)\s+from\s*['"]([^'"]+)['"]/);
      if (defaultImportMatch) {
        imports.push({
          name: defaultImportMatch[1],
          source: defaultImportMatch[2],
          type: 'default',
          line: i + 1,
          isUsed: false,
        });
        continue;
      }

      // 命名空间导入
      const namespaceImportMatch = line.match(/import\s*\*\s*as\s+(\w+)\s+from\s*['"]([^'"]+)['"]/);
      if (namespaceImportMatch) {
        imports.push({
          name: namespaceImportMatch[1],
          source: namespaceImportMatch[2],
          type: 'namespace',
          line: i + 1,
          isUsed: false,
        });
        continue;
      }

      // 副作用导入
      const sideEffectImportMatch = line.match(/import\s*['"]([^'"]+)['"]/);
      if (sideEffectImportMatch) {
        imports.push({
          name: '',
          source: sideEffectImportMatch[1],
          type: 'side-effect',
          line: i + 1,
          isUsed: true, // 副作用导入总是被认为是使用的
        });
      }
    }

    return imports;
  }

  /**
   * 提取导出信息
   */
  public extractExports(content: string): ExportInfo[] {
    const exports: ExportInfo[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // export { name }
      const namedExportMatch = line.match(/export\s*{\s*([^}]+)\s*}/);
      if (namedExportMatch) {
        const exportNames = namedExportMatch[1].split(',').map(name => name.trim());
        for (const exportName of exportNames) {
          const cleanName = exportName.replace(/\s+as\s+\w+/, '').trim();
          exports.push({
            name: cleanName,
            type: 'named',
            line: i + 1,
            isUsed: false,
          });
        }
        continue;
      }

      // export default
      const defaultExportMatch = line.match(/export\s+default\s+(\w+)/);
      if (defaultExportMatch) {
        exports.push({
          name: defaultExportMatch[1],
          type: 'default',
          line: i + 1,
          isUsed: false,
        });
        continue;
      }

      // export function/class/const/let/var
      const directExportMatch = line.match(/export\s+(?:function|class|const|let|var)\s+(\w+)/);
      if (directExportMatch) {
        exports.push({
          name: directExportMatch[1],
          type: 'named',
          line: i + 1,
          isUsed: false,
        });
      }
    }

    return exports;
  }

  /**
   * 提取使用信息
   */
  public extractUsages(content: string): UsageInfo[] {
    const usages: UsageInfo[] = [];
    const lines = content.split('\n');

    // 简化的使用检测（实际实现需要更复杂的AST分析）
    const identifierRegex = /\b(\w+)\b/g;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 跳过注释和字符串
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
        continue;
      }

      let match;
      identifierRegex.lastIndex = 0;
      
      while ((match = identifierRegex.exec(line)) !== null) {
        const identifier = match[1];
        
        // 跳过关键字和常见词汇
        if (this.isKeyword(identifier) || this.isCommonWord(identifier)) {
          continue;
        }

        usages.push({
          name: identifier,
          type: this.inferUsageType(line, identifier),
          line: i + 1,
          context: line.trim(),
        });
      }
    }

    return this.deduplicateUsages(usages);
  }

  /**
   * 验证语法
   */
  public validateSyntax(content: string): boolean {
    try {
      // 简单的语法验证（实际实现可能需要TypeScript编译器API）
      
      // 检查括号匹配
      if (!this.validateBrackets(content)) {
        return false;
      }

      // 检查基本语法错误
      if (!this.validateBasicSyntax(content)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('语法验证失败:', error);
      return false;
    }
  }

  // 私有方法

  private parseParameters(paramString: string): string[] {
    if (!paramString.trim()) return [];
    
    return paramString
      .split(',')
      .map(param => param.trim())
      .filter(param => param.length > 0)
      .map(param => {
        // 移除类型注解
        const colonIndex = param.indexOf(':');
        return colonIndex > -1 ? param.substring(0, colonIndex).trim() : param;
      });
  }

  private extractFunctionBody(content: string, startIndex: number): string {
    let braceCount = 0;
    let inFunction = false;
    let functionStart = startIndex;

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];

      if (char === '{') {
        if (!inFunction) {
          inFunction = true;
          functionStart = i;
        }
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0 && inFunction) {
          return content.substring(functionStart, i + 1);
        }
      }
    }

    return '';
  }

  private isExportedFunction(content: string, functionName: string, startIndex: number): boolean {
    // 检查函数前是否有export关键字
    const beforeFunction = content.substring(Math.max(0, startIndex - 50), startIndex);
    return beforeFunction.includes('export');
  }

  private deduplicateFunctions(functions: FunctionInfo[]): FunctionInfo[] {
    const seen = new Set<string>();
    return functions.filter(func => {
      const key = `${func.file}:${func.name}:${func.line}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private deduplicateUsages(usages: UsageInfo[]): UsageInfo[] {
    const seen = new Set<string>();
    return usages.filter(usage => {
      const key = `${usage.name}:${usage.line}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private inferUsageType(line: string, identifier: string): 'function' | 'variable' | 'class' | 'interface' | 'type' {
    // 简单的类型推断
    if (line.includes(`${identifier}(`)) {
      return 'function';
    }
    if (line.includes(`new ${identifier}`)) {
      return 'class';
    }
    if (line.includes(`interface ${identifier}`) || line.includes(`type ${identifier}`)) {
      return line.includes('interface') ? 'interface' : 'type';
    }
    return 'variable';
  }

  private isKeyword(word: string): boolean {
    const keywords = [
      'const', 'let', 'var', 'function', 'class', 'interface', 'type', 'enum',
      'import', 'export', 'default', 'from', 'as', 'if', 'else', 'for', 'while',
      'do', 'switch', 'case', 'break', 'continue', 'return', 'try', 'catch',
      'finally', 'throw', 'async', 'await', 'true', 'false', 'null', 'undefined'
    ];
    return keywords.includes(word);
  }

  private isCommonWord(word: string): boolean {
    // 过滤掉常见的短词和数字
    return word.length < 2 || /^\d+$/.test(word);
  }

  private validateBrackets(content: string): boolean {
    const brackets = { '(': ')', '[': ']', '{': '}' };
    const stack: string[] = [];

    for (const char of content) {
      if (char in brackets) {
        stack.push(char);
      } else if (Object.values(brackets).includes(char)) {
        const last = stack.pop();
        if (!last || brackets[last as keyof typeof brackets] !== char) {
          return false;
        }
      }
    }

    return stack.length === 0;
  }

  private validateBasicSyntax(content: string): boolean {
    // 检查基本语法错误
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // 跳过空行和注释
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*')) {
        continue;
      }

      // 检查未闭合的字符串
      if (this.hasUnclosedStrings(trimmed)) {
        return false;
      }
    }

    return true;
  }

  private hasUnclosedStrings(line: string): boolean {
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inTemplate = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const prevChar = i > 0 ? line[i - 1] : '';

      if (char === "'" && prevChar !== '\\' && !inDoubleQuote && !inTemplate) {
        inSingleQuote = !inSingleQuote;
      } else if (char === '"' && prevChar !== '\\' && !inSingleQuote && !inTemplate) {
        inDoubleQuote = !inDoubleQuote;
      } else if (char === '`' && prevChar !== '\\' && !inSingleQuote && !inDoubleQuote) {
        inTemplate = !inTemplate;
      }
    }

    return inSingleQuote || inDoubleQuote || inTemplate;
  }
}
