/**
 * @fileoverview 用户审批API路由测试套件入口
 * @description 统一导入所有用户审批API相关测试
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 模块化重构版本
 */

// 导入所有拆分后的测试模块
import './config-management.test';
import './approval-history-stats.test';
import './timeout-management.test';

// 这个文件现在作为测试入口，所有具体的测试都已经拆分到专门的文件中
// 这样可以保持测试组织结构清晰，同时每个文件都小于500行
