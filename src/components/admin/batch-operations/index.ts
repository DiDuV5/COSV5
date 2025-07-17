/**
 * @fileoverview 批量操作模块索引
 * @description 统一导出批量操作相关的组件、服务和类型
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

// 导出服务
export { 
  BatchOperationsService, 
  BatchOperationType,
  UserLevel,
  batchOperationSchema,
  createBatchOperationsService 
} from './services/batch-operations-service';

// 导出组件
export { 
  BatchOperationForm, 
  BatchOperationFormSkeleton 
} from './components/BatchOperationForm';

export { 
  OperationResults, 
  SimpleOperationResults, 
  OperationProgress,
  OperationResultsSkeleton 
} from './components/OperationResults';

// 导出类型
export type {
  User,
  BatchOperationConfig,
  OperationResult,
  BatchOperationFormData,
} from './services/batch-operations-service';

export type {
  BatchOperationFormProps,
} from './components/BatchOperationForm';

export type {
  OperationResultsProps,
} from './components/OperationResults';
