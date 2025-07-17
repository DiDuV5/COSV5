/**
 * @fileoverview 批量创建用户对话框组件 (重构版)
 * @description 批量创建用户对话框组件，采用模块化架构
 * @author Augment AI
 * @date 2024-01-XX
 * @version 2.0.0
 *
 * @props
 * - open: boolean - 对话框是否打开
 * - onOpenChange: (open: boolean) => void - 对话框状态变化回调
 * - onSuccess: () => void - 创建成功回调
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - react-hook-form
 * - zod
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2025-06-29: v2.0.0 重构为模块化架构
 */

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  FileText,
  CheckCircle,
  X,
  AlertCircle,
} from "lucide-react";

// 导入拆分的组件和Hook
import { BatchCreateForm } from "./batch-create-users/components/BatchCreateForm";
import { DataPreviewTable, DataPreviewCard } from "./batch-create-users/components/DataPreviewTable";
import { CreateProgressDisplay, CreateResultsDisplay } from "./batch-create-users/components/CreateProgressDisplay";
import { useCsvParser } from "./batch-create-users/hooks/use-csv-parser";

// 导入类型和函数
import {
  type BatchCreateUsersDialogProps,
  type BatchCreateFormData,
  type BatchCreateResult,
  type CreateStatus,
  batchCreateFormSchema,
  formatCreateResult,
  exportResultsToCsv,
  downloadCsv,
} from "./batch-create-users/types/batch-create-types";

/**
 * 批量创建用户对话框组件 (重构版)
 */
export function BatchCreateUsersDialog({
  open,
  onOpenChange,
  onSuccess,
}: BatchCreateUsersDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createResults, setCreateResults] = useState<BatchCreateResult | null>(null);
  const [createStatus, setCreateStatus] = useState<CreateStatus>({
    isCreating: false,
    totalUsers: 0,
    processedUsers: 0,
    successfulUsers: 0,
    failedUsers: 0,
  });

  // 使用CSV解析Hook
  const {
    parsedUsers,
    parseErrors,
    parseStatus,
    parseCsvData,
    clearData,
    isValidData,
  } = useCsvParser();

  // 表单处理
  const form = useForm<BatchCreateFormData>({
    resolver: zodResolver(batchCreateFormSchema),
    defaultValues: {
      csvData: "",
      defaultUserLevel: "USER",
      defaultIsVerified: false,
      defaultCanPublish: false,
      sendWelcomeEmail: true,
      generateRandomPassword: true,
    },
  });

  // 批量创建用户API
  const createUsersBatch = api.admin.createUsersBatch.useMutation({
    onMutate: () => {
      setIsSubmitting(true);
      setCreateStatus({
        isCreating: true,
        totalUsers: parsedUsers.length,
        processedUsers: 0,
        successfulUsers: 0,
        failedUsers: 0,
      });
    },
    onSuccess: (data: any) => {
      setCreateResults(data);
      setCreateStatus(prev => ({
        ...prev,
        isCreating: false,
        processedUsers: data.total,
        successfulUsers: data.successful,
        failedUsers: data.failed,
      }));
      setIsSubmitting(false);

      if (data.successful > 0) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      // 统一错误处理，不使用console.error
      let errorMessage = "创建用户失败，请重试";

      // 根据错误类型提供具体的用户友好消息
      if (error?.message) {
        if (error.message.includes('批量操作超出限制')) {
          errorMessage = "批量创建数量超出限制，请减少用户数量后重试";
        } else if (error.message.includes('重复')) {
          errorMessage = "存在重复的用户名或邮箱，请检查数据后重试";
        } else if (error.message.includes('格式')) {
          errorMessage = "数据格式不正确，请检查CSV文件格式";
        } else if (error.message.includes('权限')) {
          errorMessage = "权限不足，请联系管理员";
        } else if (error.message.includes('网络') || error.message.includes('连接')) {
          errorMessage = "网络连接异常，请检查网络后重试";
        } else {
          errorMessage = error.message;
        }
      }

      form.setError("root", {
        type: "manual",
        message: errorMessage,
      });
      setIsSubmitting(false);
      setCreateStatus(prev => ({ ...prev, isCreating: false }));
    },
  });

  /**
   * 处理数据预览
   */
  const handlePreview = (data: BatchCreateFormData) => {
    const defaults = {
      userLevel: data.defaultUserLevel,
      isVerified: data.defaultIsVerified,
      canPublish: data.defaultCanPublish,
      generateRandomPassword: data.generateRandomPassword,
    };
    parseCsvData(data.csvData, defaults);
  };

  /**
   * 提交创建用户
   */
  const onSubmit = async (data: BatchCreateFormData) => {
    if (parsedUsers.length === 0) {
      form.setError("csvData", {
        type: "manual",
        message: "请先预览数据确保格式正确",
      });
      return;
    }

    // 转换ParsedUserData为API期望的格式
    const apiUsers = parsedUsers.map(user => {
      // 映射用户级别：使用CoserEden 6级权限体系
      let mappedUserLevel: 'GUEST' | 'USER' | 'VIP' | 'CREATOR' | 'ADMIN' = 'USER';
      if (user.userLevel === 'VIP') {
        mappedUserLevel = 'VIP';
      } else if (user.userLevel === 'SUPER_ADMIN') {
        mappedUserLevel = 'ADMIN';
      } else if (user.userLevel && ['GUEST', 'USER', 'CREATOR', 'ADMIN'].includes(user.userLevel)) {
        mappedUserLevel = user.userLevel as 'GUEST' | 'USER' | 'CREATOR' | 'ADMIN';
      }

      return {
        username: user.username,
        email: user.email || undefined,
        password: user.password || undefined,
        displayName: user.displayName || undefined,
        userLevel: mappedUserLevel,
        isVerified: user.isVerified || false,
        canPublish: user.canPublish || false,
        bio: user.bio || undefined,
      };
    });

    createUsersBatch.mutate({
      users: apiUsers,
      sendWelcomeEmail: data.sendWelcomeEmail,
    });
  };

  /**
   * 重置表单
   */
  const handleReset = () => {
    form.reset();
    clearData();
    setCreateResults(null);
    setCreateStatus({
      isCreating: false,
      totalUsers: 0,
      processedUsers: 0,
      successfulUsers: 0,
      failedUsers: 0,
    });
  };

  /**
   * 关闭对话框
   */
  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      handleReset();
    }
  };

  /**
   * 导出结果
   */
  const handleExportResults = () => {
    if (createResults) {
      const csvContent = exportResultsToCsv(createResults.results);
      downloadCsv(csvContent, `batch_create_results_${Date.now()}.csv`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>批量创建用户</DialogTitle>
          <DialogDescription>
            通过CSV格式批量导入用户数据。支持最多50个用户同时创建。
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="import" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="import">
              <Upload className="w-4 h-4 mr-2" />
              数据导入
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!isValidData}>
              <FileText className="w-4 h-4 mr-2" />
              数据预览
            </TabsTrigger>
            <TabsTrigger value="results" disabled={!createResults}>
              <CheckCircle className="w-4 h-4 mr-2" />
              创建结果
            </TabsTrigger>
          </TabsList>

          {/* 数据导入页面 */}
          <TabsContent value="import" className="space-y-6">
            <BatchCreateForm
              form={form}
              onPreview={handlePreview}
              parsedUsers={parsedUsers}
              parseErrors={parseErrors}
              isPending={parseStatus.isPending}
            />
          </TabsContent>

          {/* 数据预览页面 */}
          <TabsContent value="preview" className="space-y-6">
            <DataPreviewCard users={parsedUsers} errors={parseErrors} />
            <DataPreviewTable
              users={parsedUsers}
              errors={parseErrors}
              validationErrors={parseStatus.errors}
            />

            {isValidData && (
              <div className="flex gap-3">
                <Button
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? '创建中...' : `创建 ${parsedUsers.length} 个用户`}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isSubmitting}
                >
                  重置
                </Button>
              </div>
            )}
          </TabsContent>

          {/* 创建结果页面 */}
          <TabsContent value="results" className="space-y-6">
            {createStatus.isCreating && (
              <CreateProgressDisplay createStatus={createStatus} />
            )}

            {createResults && (
              <CreateResultsDisplay results={createResults} />
            )}

            <div className="flex gap-3">
              {createResults && (
                <Button
                  variant="outline"
                  onClick={handleExportResults}
                >
                  导出结果
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isSubmitting}
              >
                重新开始
              </Button>
              <Button
                onClick={handleClose}
                disabled={isSubmitting}
                className="ml-auto"
              >
                关闭
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* 全局错误提示 */}
        {form.formState.errors.root && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {form.formState.errors.root.message}
            </AlertDescription>
          </Alert>
        )}

        {/* 对话框底部 */}
        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-500">
              {createResults && formatCreateResult(createResults)}
            </div>
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              <X className="w-4 h-4 mr-1" />
              关闭
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
