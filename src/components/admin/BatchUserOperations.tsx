/**
 * @fileoverview 批量用户操作组件（重构版）
 * @description 采用模块化架构的批量用户操作管理界面
 * @author Augment AI
 * @date 2025-06-29
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 */

'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Users, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/trpc/react';

// 导入重构后的模块
import {
  BatchOperationsService,
  BatchOperationType,
  BatchOperationForm,
  OperationResults,
  OperationProgress,
  type User,
  type BatchOperationFormData,
  type OperationResult,
} from './batch-operations';

/**
 * 批量用户操作属性接口
 */
export interface BatchUserOperationsProps {
  selectedUsers: User[];
  currentUserLevel?: string;
  onOperationComplete?: (_result: OperationResult) => void;
  onUsersChange?: (_users: User[]) => void;
}

/**
 * 操作状态枚举
 */
enum OperationState {
  IDLE = 'idle',
  CONFIRMING = 'confirming',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
}

/**
 * 批量用户操作组件（重构版）
 */
export function BatchUserOperations({
  selectedUsers,
  currentUserLevel = 'USER',
  onOperationComplete,
  onUsersChange,
}: BatchUserOperationsProps) {
  const { data: session } = useSession();
  const { toast } = useToast();

  // 状态管理
  const [operationState, setOperationState] = useState<OperationState>(OperationState.IDLE);
  const [currentOperation, setCurrentOperation] = useState<BatchOperationType | null>(null);
  const [operationResult, setOperationResult] = useState<OperationResult | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentUser: '' });

  // API mutations
  const batchUpdateLevelMutation = api.admin.batchUpdateUserLevel.useMutation();
  const updateUserMutation = api.admin.updateUser.useMutation();
  const deleteUserMutation = api.admin.deleteUser.useMutation();
  const resetPasswordMutation = api.admin.resetUserPassword.useMutation();

  /**
   * 执行批量操作
   */
  const executeBatchOperation = async (
    operation: BatchOperationType,
    userIds: string[],
    formData: BatchOperationFormData
  ): Promise<OperationResult> => {
    const result: OperationResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    setProgress({ current: 0, total: userIds.length, currentUser: '' });

    try {
      switch (operation) {
        case BatchOperationType.UPDATE_LEVEL:
          try {
            const response = await batchUpdateLevelMutation.mutateAsync({
              userIds,
              userLevel: formData.userLevel! as any,
            });
            result.success = response.updatedCount || 0;
            result.failed = userIds.length - (response.updatedCount || 0);
            // 处理可能不存在的errors字段
            result.errors = [];
            if (result.failed > 0) {
              result.errors = userIds.slice(result.success).map(userId => {
                const user = selectedUsers.find(u => u.id === userId);
                return {
                  userId,
                  username: user?.username || userId,
                  error: '更新失败',
                };
              });
            }
          } catch (error: any) {
            result.failed = userIds.length;
            result.errors = userIds.map(userId => {
              const user = selectedUsers.find(u => u.id === userId);
              return {
                userId,
                username: user?.username || userId,
                error: error.message || '更新失败',
              };
            });
          }
          break;

        case BatchOperationType.ACTIVATE_USERS:
          // 逐个激活用户
          for (let i = 0; i < userIds.length; i++) {
            const userId = userIds[i];
            const user = selectedUsers.find(u => u.id === userId);

            setProgress(prev => ({
              ...prev,
              current: i + 1,
              currentUser: user?.username || userId
            }));

            try {
              await updateUserMutation.mutateAsync({
                userId,
                isActive: true,
              });
              result.success++;
            } catch (error: any) {
              result.failed++;
              result.errors.push({
                userId,
                username: user?.username || userId,
                error: error.message || '激活失败',
              });
            }
          }
          break;

        case BatchOperationType.DEACTIVATE_USERS:
          // 逐个禁用用户
          for (let i = 0; i < userIds.length; i++) {
            const userId = userIds[i];
            const user = selectedUsers.find(u => u.id === userId);

            setProgress(prev => ({
              ...prev,
              current: i + 1,
              currentUser: user?.username || userId
            }));

            try {
              await updateUserMutation.mutateAsync({
                userId,
                isActive: false,
              });
              result.success++;
            } catch (error: any) {
              result.failed++;
              result.errors.push({
                userId,
                username: user?.username || userId,
                error: error.message || '禁用失败',
              });
            }
          }
          break;

        case BatchOperationType.RESET_PASSWORDS:
          // 密码重置需要逐个处理
          for (let i = 0; i < userIds.length; i++) {
            const userId = userIds[i];
            const user = selectedUsers.find(u => u.id === userId);

            setProgress(prev => ({
              ...prev,
              current: i + 1,
              currentUser: user?.username || userId
            }));

            try {
              // 生成随机密码
              const newPassword = Math.random().toString(36).slice(-8);
              await resetPasswordMutation.mutateAsync({
                userId,
                newPassword
              });
              result.success++;
            } catch (error: any) {
              result.failed++;
              result.errors.push({
                userId,
                username: user?.username || userId,
                error: error.message || '重置失败',
              });
            }
          }
          break;

        case BatchOperationType.VERIFY_USERS:
          // 逐个验证用户
          for (let i = 0; i < userIds.length; i++) {
            const userId = userIds[i];
            const user = selectedUsers.find(u => u.id === userId);

            setProgress(prev => ({
              ...prev,
              current: i + 1,
              currentUser: user?.username || userId
            }));

            try {
              await updateUserMutation.mutateAsync({
                userId,
                isVerified: true,
              });
              result.success++;
            } catch (error: any) {
              result.failed++;
              result.errors.push({
                userId,
                username: user?.username || userId,
                error: error.message || '验证失败',
              });
            }
          }
          break;

        case BatchOperationType.DELETE_USERS:
          // 逐个删除用户
          for (let i = 0; i < userIds.length; i++) {
            const userId = userIds[i];
            const user = selectedUsers.find(u => u.id === userId);

            setProgress(prev => ({
              ...prev,
              current: i + 1,
              currentUser: user?.username || userId
            }));

            try {
              await deleteUserMutation.mutateAsync({ userId });
              result.success++;
            } catch (error: any) {
              result.failed++;
              result.errors.push({
                userId,
                username: user?.username || userId,
                error: error.message || '删除失败',
              });
            }
          }
          break;

        default:
          throw new Error(`不支持的操作类型: ${operation}`);
      }
    } catch (error: any) {
      console.error('批量操作执行失败:', error);
      result.failed = userIds.length;
      result.errors = userIds.map(userId => {
        const user = selectedUsers.find(u => u.id === userId);
        return {
          userId,
          username: user?.username || userId,
          error: error.message || '操作失败',
        };
      });
    }

    return result;
  };

  /**
   * 处理表单提交
   */
  const handleFormSubmit = async (formData: BatchOperationFormData) => {
    if (!session?.user) {
      toast({
        title: '未登录',
        description: '请先登录后再执行操作',
        variant: 'destructive',
      });
      return;
    }

    setCurrentOperation(formData.operation);
    setOperationState(OperationState.EXECUTING);

    try {
      // 过滤可操作的用户
      const { operableUsers } = BatchOperationsService.filterOperableUsers(
        selectedUsers,
        formData.operation
      );

      const userIds = operableUsers.map(user => user.id);

      if (userIds.length === 0) {
        toast({
          title: '无可操作用户',
          description: '所有选中的用户都不符合操作条件',
          variant: 'destructive',
        });
        setOperationState(OperationState.IDLE);
        return;
      }

      // 执行批量操作
      const result = await executeBatchOperation(formData.operation, userIds, formData);

      setOperationResult(result);
      setOperationState(OperationState.COMPLETED);

      // 显示结果通知
      const formattedResult = BatchOperationsService.formatOperationResult(result);
      toast({
        title: formattedResult.title,
        description: formattedResult.message,
        variant: formattedResult.type === 'error' ? 'destructive' : 'default',
      });

      // 调用回调
      onOperationComplete?.(result);

    } catch (error: any) {
      console.error('批量操作失败:', error);

      const errorResult: OperationResult = {
        success: 0,
        failed: selectedUsers.length,
        errors: selectedUsers.map(user => ({
          userId: user.id,
          username: user.username,
          error: error.message || '操作失败',
        })),
      };

      setOperationResult(errorResult);
      setOperationState(OperationState.COMPLETED);

      toast({
        title: '操作失败',
        description: error.message || '批量操作执行失败',
        variant: 'destructive',
      });
    }
  };

  /**
   * 重置状态
   */
  const handleReset = () => {
    setOperationState(OperationState.IDLE);
    setCurrentOperation(null);
    setOperationResult(null);
    setProgress({ current: 0, total: 0, currentUser: '' });
  };

  /**
   * 重试失败的操作
   */
  const handleRetry = () => {
    if (operationResult && currentOperation) {
      const failedUserIds = operationResult.errors.map(error => error.userId);
      const failedUsers = selectedUsers.filter(user => failedUserIds.includes(user.id));

      // 这里可以实现重试逻辑
      toast({
        title: '重试功能',
        description: '重试功能正在开发中',
      });
    }
  };

  // 检查是否有权限
  if (!session?.user || (currentUserLevel !== 'ADMIN' && currentUserLevel !== 'SUPER_ADMIN')) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          您没有执行批量用户操作的权限
        </AlertDescription>
      </Alert>
    );
  }

  // 检查是否选择了用户
  if (selectedUsers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>批量用户操作</span>
          </CardTitle>
          <CardDescription>
            请先选择要操作的用户
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              请在用户列表中选择一个或多个用户后再进行批量操作
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 选中用户信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>已选择用户</span>
            </div>
            <Badge variant="outline">
              {selectedUsers.length} 个用户
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {selectedUsers.slice(0, 10).map(user => (
              <Badge key={user.id} variant="secondary">
                {user.username}
              </Badge>
            ))}
            {selectedUsers.length > 10 && (
              <Badge variant="outline">
                +{selectedUsers.length - 10} 个用户
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 操作表单或结果 */}
      {operationState === OperationState.IDLE && (
        <BatchOperationForm
          selectedUsers={selectedUsers}
          currentUserLevel={currentUserLevel}
          onSubmit={handleFormSubmit}
        />
      )}

      {operationState === OperationState.EXECUTING && (
        <OperationProgress
          current={progress.current}
          total={progress.total}
          currentUser={progress.currentUser}
        />
      )}

      {operationState === OperationState.COMPLETED && operationResult && currentOperation && (
        <OperationResults
          result={operationResult}
          operation={currentOperation}
          totalUsers={selectedUsers.length}
          onRetry={handleRetry}
          onClose={handleReset}
        />
      )}
    </div>
  );
}

/**
 * 导出类型
 */
export type {
  User,
  BatchOperationFormData,
  OperationResult,
} from './batch-operations';
