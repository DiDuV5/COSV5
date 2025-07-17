/**
 * @fileoverview 增强数据库查询优化器（重构后的统一导出）
 * @description 提供向后兼容的查询优化器接口
 * @author Augment AI
 * @date 2025-07-08
 * @version 3.0.0
 *
 * @performance-target
 * - 90%查询 <100ms 响应时间
 * - 缓存命中率 >80%
 * - 慢查询检测和优化建议
 *
 * @refactored 2025-07-08
 * - 拆分为模块化结构
 * - 保持100%向后兼容性
 * - 文件大小从561行减少到<50行
 */

// 重新导出所有功能以保持向后兼容性
export * from './enhanced-query-optimizer/index';
