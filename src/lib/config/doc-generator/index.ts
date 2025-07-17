/**
 * @fileoverview 配置文档生成器统一导出
 * @description 统一导出所有配置文档生成相关的类型、函数和类，保持向后兼容性
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

// 导出所有类型和接口
export * from './doc-types';

// 导出核心生成器类
export { ConfigDocGenerator } from './doc-generator-core';

// 导出子模块类
export { TemplateGenerator } from './template-generator';
export { SecurityGuideGenerator } from './security-guide-generator';
export { ValidationReportGenerator } from './validation-report-generator';
export { ChangeHistoryManager } from './change-history-manager';

// 导入核心生成器类用于默认导出
import { ConfigDocGenerator } from './doc-generator-core';

// 为了保持完全的向后兼容性，创建默认导出
export default ConfigDocGenerator;
