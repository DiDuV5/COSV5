/**
 * @fileoverview 批量操作表单组件
 * @description 专门处理批量操作的表单界面和验证
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Info, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BatchOperationsService,
  BatchOperationType,
  UserLevel,
  batchOperationSchema,
  type BatchOperationFormData,
  type User,
} from '../services/batch-operations-service';

/**
 * 批量操作表单属性接口
 */
export interface BatchOperationFormProps {
  selectedUsers: User[];
  currentUserLevel: string;
  isSubmitting?: boolean;
  className?: string;
  onSubmit: (data: BatchOperationFormData) => void;
  onCancel?: () => void;
}

/**
 * 批量操作表单组件
 */
export function BatchOperationForm({
  selectedUsers,
  currentUserLevel,
  isSubmitting = false,
  className,
  onSubmit,
  onCancel,
}: BatchOperationFormProps) {
  const form = useForm<BatchOperationFormData>({
    resolver: zodResolver(batchOperationSchema),
    defaultValues: {
      operation: BatchOperationType.UPDATE_LEVEL,
      userLevel: UserLevel.USER,
      reason: '',
      confirmText: '',
    },
  });

  const watchedOperation = form.watch('operation');
  const operationConfig = BatchOperationsService.getOperationConfig(watchedOperation);
  const operationConfigs = BatchOperationsService.getOperationConfigs();
  const userLevelOptions = BatchOperationsService.getUserLevelOptions();

  // 验证操作权限
  const permissionCheck = BatchOperationsService.validateOperationPermission(
    watchedOperation,
    currentUserLevel,
    selectedUsers
  );

  // 过滤可操作的用户
  const { operableUsers, skippedUsers } = BatchOperationsService.filterOperableUsers(
    selectedUsers,
    watchedOperation
  );

  /**
   * 处理表单提交
   */
  const handleSubmit = (data: BatchOperationFormData) => {
    const validation = BatchOperationsService.validateFormData(data, selectedUsers);

    if (!validation.isValid) {
      Object.entries(validation.errors).forEach(([field, message]) => {
        form.setError(field as any, { type: 'manual', message });
      });
      return;
    }

    if (!permissionCheck.canPerform) {
      form.setError('root', { type: 'manual', message: permissionCheck.reason });
      return;
    }

    onSubmit(data);
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>批量用户操作</span>
        </CardTitle>
        <CardDescription>
          对选中的 {selectedUsers.length} 个用户执行批量操作
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* 权限检查警告 */}
            {!permissionCheck.canPerform && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{permissionCheck.reason}</AlertDescription>
              </Alert>
            )}

            {/* 权限警告 */}
            {permissionCheck.warnings.length > 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {permissionCheck.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* 操作类型选择 */}
            <FormField
              control={form.control}
              name="operation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>操作类型</FormLabel>
                  <Select onValueChange={(value: string) => field.onChange(value)} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择操作类型" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {operationConfigs.map((config) => (
                        <SelectItem key={config.value} value={config.value}>
                          <div className="flex items-center space-x-2">
                            <span className={config.color}>{config.label}</span>
                            {config.dangerLevel === 'high' && (
                              <Badge variant="destructive" className="text-xs">
                                危险
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {operationConfig?.description}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 用户等级选择 */}
            {operationConfig?.requiresLevel && (
              <FormField
                control={form.control}
                name="userLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>目标用户等级</FormLabel>
                    <Select onValueChange={(value: string) => field.onChange(value)} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择用户等级" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {userLevelOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {option.description}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      选择要设置的用户等级
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* 操作原因 */}
            {operationConfig?.requiresReason && (
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>操作原因</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="请输入执行此操作的原因..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      此原因将记录在操作日志中
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* 确认输入 */}
            {operationConfig?.requiresConfirmation && watchedOperation === BatchOperationType.DELETE_USERS && (
              <FormField
                control={form.control}
                name="confirmText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>确认删除</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="请输入 DELETE 确认删除操作"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-red-600">
                      删除操作不可逆，请谨慎操作
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* 操作摘要 */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">操作摘要</h4>
              <div className="text-sm text-muted-foreground">
                {BatchOperationsService.generateOperationSummary(
                  watchedOperation,
                  selectedUsers,
                  form.getValues()
                )}
              </div>

              {/* 可操作用户统计 */}
              {skippedUsers.length > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div>
                        将操作 {operableUsers.length} 个用户，跳过 {skippedUsers.length} 个用户
                      </div>
                      <details className="text-xs">
                        <summary className="cursor-pointer">查看跳过的用户</summary>
                        <ul className="mt-2 space-y-1">
                          {skippedUsers.slice(0, 5).map(({ user, reason }) => (
                            <li key={user.id}>
                              {user.username}: {reason}
                            </li>
                          ))}
                          {skippedUsers.length > 5 && (
                            <li>还有 {skippedUsers.length - 5} 个用户...</li>
                          )}
                        </ul>
                      </details>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* 表单错误 */}
            {form.formState.errors.root && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {form.formState.errors.root.message}
                </AlertDescription>
              </Alert>
            )}

            {/* 操作按钮 */}
            <div className="flex justify-end space-x-3">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  取消
                </Button>
              )}
              <Button
                type="submit"
                disabled={isSubmitting || !permissionCheck.canPerform || operableUsers.length === 0}
                variant={operationConfig?.dangerLevel === 'high' ? 'destructive' : 'default'}
              >
                {isSubmitting ? '执行中...' : `执行操作 (${operableUsers.length})`}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/**
 * 批量操作表单骨架组件
 */
export function BatchOperationFormSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="h-4 bg-gray-200 rounded w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-20" />
          <div className="h-10 bg-gray-200 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-10 bg-gray-200 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-20 bg-gray-200 rounded" />
        </div>
        <div className="flex justify-end space-x-3">
          <div className="h-10 bg-gray-200 rounded w-16" />
          <div className="h-10 bg-gray-200 rounded w-24" />
        </div>
      </CardContent>
    </Card>
  );
}
