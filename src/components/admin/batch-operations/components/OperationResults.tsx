/**
 * @fileoverview 操作结果显示组件
 * @description 专门显示批量操作的结果和错误信息
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Download, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  BatchOperationsService,
  type OperationResult,
  type BatchOperationType,
} from '../services/batch-operations-service';

/**
 * 操作结果属性接口
 */
export interface OperationResultsProps {
  result: OperationResult;
  operation: BatchOperationType;
  totalUsers: number;
  className?: string;
  onRetry?: () => void;
  onExportReport?: () => void;
  onClose?: () => void;
}

/**
 * 操作结果显示组件
 */
export function OperationResults({
  result,
  operation,
  totalUsers,
  className,
  onRetry,
  onExportReport,
  onClose,
}: OperationResultsProps) {
  const { success, failed, errors } = result;
  const total = success + failed;
  const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
  
  const formattedResult = BatchOperationsService.formatOperationResult(result);
  const operationConfig = BatchOperationsService.getOperationConfig(operation);

  /**
   * 获取状态图标
   */
  const getStatusIcon = () => {
    switch (formattedResult.type) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <CheckCircle className="h-6 w-6 text-gray-500" />;
    }
  };

  /**
   * 获取状态颜色
   */
  const getStatusColor = () => {
    switch (formattedResult.type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <Card className={cn('', getStatusColor(), className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <div className="text-lg">{formattedResult.title}</div>
            <div className="text-sm font-normal text-muted-foreground">
              {operationConfig?.label || '批量操作'}
            </div>
          </div>
        </CardTitle>
        <CardDescription>
          {formattedResult.message}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 进度统计 */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>完成进度</span>
            <span>{successRate}%</span>
          </div>
          <Progress value={successRate} className="h-2" />
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{success}</div>
              <div className="text-xs text-muted-foreground">成功</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{failed}</div>
              <div className="text-xs text-muted-foreground">失败</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{total}</div>
              <div className="text-xs text-muted-foreground">总计</div>
            </div>
          </div>
        </div>

        {/* 错误详情 */}
        {errors.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span>查看错误详情 ({errors.length})</span>
                <AlertTriangle className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium">操作失败的用户：</div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {errors.map((error, index) => (
                        <div key={index} className="text-xs bg-white/50 p-2 rounded">
                          <div className="font-medium">{error.username}</div>
                          <div className="text-red-700">{error.error}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* 操作建议 */}
        {failed > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-medium">建议操作：</div>
                <ul className="text-sm space-y-1">
                  <li>• 检查失败用户的具体错误信息</li>
                  <li>• 确认用户状态是否符合操作要求</li>
                  <li>• 可以对失败的用户重新执行操作</li>
                  {onExportReport && <li>• 导出详细报告进行分析</li>}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* 成功提示 */}
        {failed === 0 && success > 0 && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              所有用户操作均已成功完成！
            </AlertDescription>
          </Alert>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-3">
          {onRetry && failed > 0 && (
            <Button variant="outline" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              重试失败项
            </Button>
          )}
          
          {onExportReport && (
            <Button variant="outline" onClick={onExportReport}>
              <Download className="h-4 w-4 mr-2" />
              导出报告
            </Button>
          )}
          
          {onClose && (
            <Button onClick={onClose} className="ml-auto">
              完成
            </Button>
          )}
        </div>

        {/* 详细信息 */}
        {result.details && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium">查看详细信息</summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
              {JSON.stringify(result.details, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 简化版操作结果组件
 */
export function SimpleOperationResults({
  result,
  className,
}: Pick<OperationResultsProps, 'result' | 'className'>) {
  const { success, failed } = result;
  const formattedResult = BatchOperationsService.formatOperationResult(result);

  return (
    <Alert className={cn('', className)}>
      <CheckCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="flex items-center justify-between">
          <span>{formattedResult.message}</span>
          <div className="flex space-x-2">
            <Badge variant="outline" className="text-green-600">
              成功 {success}
            </Badge>
            {failed > 0 && (
              <Badge variant="destructive">
                失败 {failed}
              </Badge>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * 操作进度组件
 */
export function OperationProgress({
  current,
  total,
  currentUser,
  className,
}: {
  current: number;
  total: number;
  currentUser?: string;
  className?: string;
}) {
  const progress = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <Card className={cn('', className)}>
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>操作进度</span>
            <span>{current}/{total} ({progress}%)</span>
          </div>
          <Progress value={progress} className="h-2" />
          {currentUser && (
            <div className="text-xs text-muted-foreground">
              正在处理: {currentUser}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 操作结果骨架组件
 */
export function OperationResultsSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="h-6 w-6 bg-gray-200 rounded-full" />
          <div className="space-y-2">
            <div className="h-5 bg-gray-200 rounded w-32" />
            <div className="h-4 bg-gray-200 rounded w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="h-2 bg-gray-200 rounded" />
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center space-y-1">
              <div className="h-8 bg-gray-200 rounded" />
              <div className="h-3 bg-gray-200 rounded" />
            </div>
            <div className="text-center space-y-1">
              <div className="h-8 bg-gray-200 rounded" />
              <div className="h-3 bg-gray-200 rounded" />
            </div>
            <div className="text-center space-y-1">
              <div className="h-8 bg-gray-200 rounded" />
              <div className="h-3 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          <div className="h-10 bg-gray-200 rounded w-24" />
          <div className="h-10 bg-gray-200 rounded w-24" />
          <div className="h-10 bg-gray-200 rounded w-16 ml-auto" />
        </div>
      </CardContent>
    </Card>
  );
}
