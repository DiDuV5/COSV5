/**
 * @component DeleteUserDialog
 * @description 删除用户确认对话框组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - userId: string | null - 要删除的用户ID
 * - open: boolean - 对话框是否打开
 * - onOpenChange: (open: boolean) => void - 对话框状态变化回调
 * - onSuccess: () => void - 删除成功回调
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - react-hook-form
 * - zod
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { UnifiedAvatar } from "@/components/ui/unified-avatar";
import { AlertTriangle, Trash2, AlertCircle } from "lucide-react";

// 删除确认表单验证模式
const deleteUserSchema = z.object({
  confirmUsername: z.string().min(1, "请输入用户名确认删除"),
  reason: z.string().optional(),
});

type DeleteUserFormData = z.infer<typeof deleteUserSchema>;

interface DeleteUserDialogProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteUserDialog({
  userId,
  open,
  onOpenChange,
  onSuccess,
}: DeleteUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 获取用户详情
  const { data: user, isPending } = api.admin.getUserById.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  );

  const form = useForm<DeleteUserFormData>({
    resolver: zodResolver(deleteUserSchema),
    defaultValues: {
      confirmUsername: "",
      reason: "",
    },
  });

  // 删除用户 mutation
  const deleteUser = api.admin.deleteUser.useMutation({
    onSuccess: () => {
      setIsSubmitting(false);
      onSuccess();
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      setIsSubmitting(false);
      form.setError("root", {
        type: "manual",
        message: error.message,
      });
    },
  });

  const onSubmit = async (data: DeleteUserFormData) => {
    if (!userId || !user) return;

    // 验证用户名确认
    if (data.confirmUsername !== user.username) {
      form.setError("confirmUsername", {
        type: "manual",
        message: "用户名不匹配，请重新输入",
      });
      return;
    }

    setIsSubmitting(true);
    deleteUser.mutate({
      userId,
      reason: data.reason || undefined,
    });
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      form.reset();
    }
  };

  const getUserLevelInfo = (level: string) => {
    const levels = [
      { value: "GUEST", label: "游客", color: "bg-gray-100 text-gray-800" },
      { value: "USER", label: "注册用户", color: "bg-blue-100 text-blue-800" },
      { value: "VIP", label: "付费用户", color: "bg-green-100 text-green-800" },
      { value: "CREATOR", label: "创建者", color: "bg-purple-100 text-purple-800" },
      { value: "ADMIN", label: "管理员", color: "bg-red-100 text-red-800" },
    ];
    return levels.find(l => l.value === level) || levels[1];
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "从未";
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            删除用户确认
          </DialogTitle>
          <DialogDescription>
            此操作不可撤销。删除用户将永久移除其所有数据，包括发布的内容、评论等。
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : user ? (
          <div className="space-y-6">
            {/* 用户信息预览 */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4 mb-4">
                <UnifiedAvatar
                  user={{
                    username: user.username,
                    displayName: user.displayName,
                    avatarUrl: user.avatarUrl,
                    isVerified: user.isVerified,
                    userLevel: user.userLevel,
                  }}
                  size="md"
                  showVerifiedBadge={false}
                  fallbackType="initials"
                />
                <div>
                  <h3 className="font-medium">{user.displayName || user.username}</h3>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getUserLevelInfo(user.userLevel).color}>
                      {getUserLevelInfo(user.userLevel).label}
                    </Badge>
                    {user.isVerified && (
                      <Badge variant="outline" className="text-green-600">已验证</Badge>
                    )}
                    {user.canPublish && (
                      <Badge variant="outline" className="text-blue-600">可发布</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">发布内容:</span>
                  <span className="ml-1 font-medium">{user._count.posts}</span>
                </div>
                <div>
                  <span className="text-gray-500">评论数:</span>
                  <span className="ml-1 font-medium">{user._count.comments}</span>
                </div>
                <div>
                  <span className="text-gray-500">粉丝数:</span>
                  <span className="ml-1 font-medium">{user._count.followers}</span>
                </div>
                <div>
                  <span className="text-gray-500">注册时间:</span>
                  <span className="ml-1 font-medium">{formatDate(user.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* 警告信息 */}
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">删除此用户将会：</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>永久删除用户账户和个人资料</li>
                    <li>删除用户发布的所有内容 ({user._count.posts} 个)</li>
                    <li>删除用户的所有评论 ({user._count.comments} 个)</li>
                    <li>删除用户的关注关系和社交链接</li>
                    <li>删除用户的所有活动记录</li>
                  </ul>
                  <p className="text-sm font-medium text-red-600 mt-2">
                    此操作无法撤销，请谨慎操作！
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            {/* 特殊限制检查 */}
            {user.userLevel === "ADMIN" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>无法删除管理员账户</strong>
                  <br />
                  为了系统安全，不允许删除管理员账户。如需删除，请先将用户等级降级。
                </AlertDescription>
              </Alert>
            )}

            {/* 删除确认表单 */}
            {user.userLevel !== "ADMIN" && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* 错误提示 */}
                  {form.formState.errors.root && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {form.formState.errors.root.message}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* 用户名确认 */}
                  <FormField
                    control={form.control}
                    name="confirmUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          确认删除：请输入用户名 <code className="bg-gray-100 px-1 rounded">{user.username}</code>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={`输入 ${user.username} 确认删除`}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          为了防止误操作，请输入完整的用户名确认删除
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 删除原因 */}
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>删除原因（可选）</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="请说明删除此用户的原因..."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          删除原因将记录在审计日志中
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      disabled={isSubmitting}
                    >
                      取消
                    </Button>
                    <Button
                      type="submit"
                      variant="destructive"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        "删除中..."
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          确认删除
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            )}

            {/* 管理员账户的关闭按钮 */}
            {user.userLevel === "ADMIN" && (
              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  关闭
                </Button>
              </DialogFooter>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
