/**
 * @fileoverview 批量操作对话框组件
 * @description 用户批量操作的对话框组件
 */

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  UserCheck,
  Trash,
  Download,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import {
  batchOperationSchema,
  BATCH_OPERATION_OPTIONS,
  USER_LEVEL_CONFIG,
  validateBatchOperation,
  exportUsersToCSV,
  downloadCSV,
  type BatchOperationFormData,
  type BatchOperationType,
  type UserLevel,
} from "../types/user-groups-types";

interface BatchOperationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUserIds: string[];
  selectedUsers?: any[];
  onOperation: (operation: BatchOperationFormData) => void;
  isProcessing?: boolean;
  currentUserLevel?: UserLevel;
}

/**
 * 批量操作对话框组件
 */
export function BatchOperationDialog({
  open,
  onOpenChange,
  selectedUserIds,
  selectedUsers = [],
  onOperation,
  isProcessing = false,
  currentUserLevel = "ADMIN",
}: BatchOperationDialogProps) {
  const [selectedOperation, setSelectedOperation] = useState<BatchOperationType | null>(null);
  const [progress, setProgress] = useState(0);

  const form = useForm<BatchOperationFormData>({
    resolver: zodResolver(batchOperationSchema),
    defaultValues: {
      operation: "updateLevel",
      reason: "",
      sendNotification: false,
    },
  });

  /**
   * 处理操作提交
   */
  const onSubmit = async (data: BatchOperationFormData) => {
    // 验证操作权限
    const validation = validateBatchOperation(data.operation, currentUserLevel, selectedUserIds.length);
    if (!validation.isValid) {
      form.setError("root", {
        type: "manual",
        message: validation.message,
      });
      return;
    }

    // 特殊处理导出操作
    if (data.operation === "export") {
      handleExport();
      return;
    }

    // 执行其他操作
    onOperation(data);
  };

  /**
   * 处理导出操作
   */
  const handleExport = () => {
    if (selectedUsers.length === 0) {
      form.setError("root", {
        type: "manual",
        message: "没有可导出的用户数据",
      });
      return;
    }

    try {
      const csvContent = exportUsersToCSV(selectedUsers);
      downloadCSV(csvContent, `users_export_${Date.now()}.csv`);
      onOpenChange(false);
    } catch (error) {
      form.setError("root", {
        type: "manual",
        message: "导出失败，请重试",
      });
    }
  };

  /**
   * 获取操作图标
   */
  const getOperationIcon = (operation: BatchOperationType) => {
    const icons = {
      updateLevel: Shield,
      updateStatus: UserCheck,
      delete: Trash,
      export: Download,
    };
    return icons[operation];
  };

  /**
   * 获取操作颜色
   */
  const getOperationColor = (operation: BatchOperationType) => {
    const colors = {
      updateLevel: "text-blue-500",
      updateStatus: "text-green-500",
      delete: "text-red-500",
      export: "text-purple-500",
    };
    return colors[operation];
  };

  /**
   * 重置表单
   */
  const handleReset = () => {
    form.reset();
    setSelectedOperation(null);
    setProgress(0);
  };

  /**
   * 关闭对话框
   */
  const handleClose = () => {
    if (!isProcessing) {
      onOpenChange(false);
      handleReset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>批量操作</DialogTitle>
          <DialogDescription>
            对选中的 {selectedUserIds.length} 个用户执行批量操作
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 操作类型选择 */}
            <FormField
              control={form.control}
              name="operation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>操作类型</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedOperation(value as BatchOperationType);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择要执行的操作" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BATCH_OPERATION_OPTIONS.map((option) => {
                        const Icon = getOperationIcon(option.value);
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <Icon className={`w-4 h-4 ${getOperationColor(option.value)}`} />
                              <div>
                                <div className="font-medium">{option.label}</div>
                                <div className="text-xs text-gray-500">{option.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 目标用户等级选择 */}
            {selectedOperation === "updateLevel" && (
              <FormField
                control={form.control}
                name="targetLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>目标用户等级</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择目标用户等级" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(USER_LEVEL_CONFIG).map(([level, config]) => (
                          <SelectItem key={level} value={level}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: config.color }}
                              />
                              <div>
                                <div className="font-medium">{config.label}</div>
                                <div className="text-xs text-gray-500">{config.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* 用户状态选择 */}
            {selectedOperation === "updateStatus" && (
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>目标状态</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "true")}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择目标状态" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>启用用户</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="false">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <span>禁用用户</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* 操作原因 */}
            {selectedOperation !== "export" && (
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>操作原因</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="请输入执行此操作的原因..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      操作原因将记录在系统日志中，便于后续审计
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* 发送通知选项 */}
            {selectedOperation !== "export" && selectedOperation !== "delete" && (
              <FormField
                control={form.control}
                name="sendNotification"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>发送通知</FormLabel>
                      <FormDescription>
                        向受影响的用户发送操作通知邮件
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            )}

            {/* 删除操作警告 */}
            {selectedOperation === "delete" && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-1">危险操作警告</div>
                  <div>删除用户操作不可撤销，将永久删除用户账户及其所有相关数据。请确认您真的要执行此操作。</div>
                </AlertDescription>
              </Alert>
            )}

            {/* 进度显示 */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">正在处理...</span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="text-xs text-gray-500">
                  已处理 {Math.round((progress / 100) * selectedUserIds.length)} / {selectedUserIds.length} 个用户
                </div>
              </div>
            )}

            {/* 错误提示 */}
            {form.formState.errors.root && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {form.formState.errors.root.message}
                </AlertDescription>
              </Alert>
            )}

            {/* 操作确认信息 */}
            {selectedOperation && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <h5 className="text-sm font-medium mb-2">操作确认</h5>
                <div className="text-sm text-gray-600">
                  将对 <strong>{selectedUserIds.length}</strong> 个用户执行
                  <strong className="mx-1">
                    {BATCH_OPERATION_OPTIONS.find(op => op.value === selectedOperation)?.label}
                  </strong>
                  操作
                </div>
              </div>
            )}
          </form>
        </Form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
          >
            取消
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={!selectedOperation || isProcessing}
            variant={selectedOperation === "delete" ? "destructive" : "default"}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                {selectedOperation && (
                  <>
                    {(() => {
                      const Icon = getOperationIcon(selectedOperation);
                      return <Icon className="w-4 h-4 mr-2" />;
                    })()}
                  </>
                )}
                确认执行
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
