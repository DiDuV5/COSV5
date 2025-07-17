/**
 * @fileoverview 分层缓存策略实现（重构后的统一导出）
 * @description 提供向后兼容的分层缓存系统接口
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0
 *
 * @performance-target
 * - L1 Cache: <1ms 响应时间
 * - L2 Cache: <10ms 响应时间
 * - L3 Cache: <100ms 响应时间
 * - 总体命中率: >85%
 *
 * @refactored 2025-07-08
 * - 拆分为模块化结构
 * - 保持100%向后兼容性
 * - 文件大小从574行减少到<50行
 */

// 重新导出所有功能以保持向后兼容性
export * from './layered-cache-index';
