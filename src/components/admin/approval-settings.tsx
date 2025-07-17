/**
 * @fileoverview 用户审核设置组件
 * @description 管理用户注册审核相关的系统配置
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/react-query: ^10.45.0
 * - react-hook-form: ^7.48.0
 * - @/components/ui: UI组件库
 *
 * @changelog
 * - 2025-06-22: 初始版本创建，用户审核设置组件
 */

"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, CheckCircle, AlertCircle, UserCheck, Mail, Shield } from "lucide-react";
import { toast } from "sonner";

// 审核配置表单Schema
const approvalConfigSchema = z.object({
  registrationApprovalEnabled: z.boolean(),
  notificationEnabled: z.boolean(),
  autoApproveAdmin: z.boolean(),
});

type ApprovalConfigForm = z.infer<typeof approvalConfigSchema>;

export function ApprovalSettings() {
  const [isPending, setIsLoading] = useState(false);

  // 获取当前配置
  const { data: config, isPending: configLoading, refetch } = api.userApproval.getApprovalConfig.useQuery();

  // 更新配置
  const updateConfig = api.userApproval.updateApprovalConfig.useMutation({
    onSuccess: () => {
      toast.success("审核设置已更新");
      refetch();
      setIsLoading(false);
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
      setIsLoading(false);
    },
  });

  // 获取审核统计
  const { data: stats } = api.userApproval.getApprovalStats.useQuery();

  const form = useForm<ApprovalConfigForm>({
    resolver: zodResolver(approvalConfigSchema),
    defaultValues: {
      registrationApprovalEnabled: config?.registrationApprovalEnabled ?? false,
      notificationEnabled: config?.notificationEnabled ?? true,
      autoApproveAdmin: config?.autoApproveAdmin ?? true,
    },
  });

  // 当配置加载完成时更新表单默认值
  React.useEffect(() => {
    if (config) {
      form.reset({
        registrationApprovalEnabled: config.registrationApprovalEnabled,
        notificationEnabled: config.notificationEnabled,
        autoApproveAdmin: config.autoApproveAdmin,
      });
    }
  }, [config, form]);

  const onSubmit = async (data: ApprovalConfigForm) => {
    setIsLoading(true);
    updateConfig.mutate(data);
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">加载配置中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 审核统计概览 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">待审核用户</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingCount}</div>
              <p className="text-xs text-muted-foreground">
                需要管理员审核
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今日审核</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayApprovals}</div>
              <p className="text-xs text-muted-foreground">
                通过 {stats.todayApprovals} / 拒绝 {stats.todayRejections}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">通过率</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalCount > 0
                  ? Math.round((stats.approvedCount / stats.totalCount) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                最近30天
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 配置表单 */}
      <Card>
        <CardHeader>
          <CardTitle>审核功能配置</CardTitle>
          <CardDescription>
            配置用户注册审核功能的各项设置
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 启用注册审核 */}
              <FormField
                control={form.control}
                name="registrationApprovalEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">启用注册审核</FormLabel>
                      <FormDescription>
                        开启后，新用户注册需要管理员审核才能正常使用系统
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* 启用审核通知 */}
              <FormField
                control={form.control}
                name="notificationEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">启用审核通知</FormLabel>
                      <FormDescription>
                        向用户发送审核结果的邮件通知
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* 管理员自动通过 */}
              <FormField
                control={form.control}
                name="autoApproveAdmin"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">管理员自动通过</FormLabel>
                      <FormDescription>
                        管理员和超级管理员注册时自动通过审核
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* 保存按钮 */}
              <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      保存设置
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* 重要提示 */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>重要提示：</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• 启用注册审核后，新用户需要等待管理员审核才能正常使用</li>
            <li>• 现有用户不受影响，仍可正常使用系统</li>
            <li>• 管理员可以在&ldquo;用户审核&rdquo;页面进行批量审核操作</li>
            <li>• 建议启用邮件通知，及时告知用户审核结果</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
