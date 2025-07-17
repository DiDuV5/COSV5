/**
 * @fileoverview 配置整合管理器统一导出
 * @description 统一导出所有配置整合相关的类型、函数和类，保持向后兼容性
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

// 导出所有类型和接口
export * from './integration-types';

// 导出核心管理器类
export { ConfigIntegrationManager } from './integration-manager-core';

// 导出子模块类
export { HardcodedDetector } from './hardcoded-detector';
export { P0Migrator } from './p0-migrator';
export { P1Migrator } from './p1-migrator';
export { ReportGenerator } from './report-generator';

// 导入核心管理器类用于默认导出
import { ConfigIntegrationManager } from './integration-manager-core';

// 为了保持完全的向后兼容性，创建默认导出
export default ConfigIntegrationManager;
