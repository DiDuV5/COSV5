/**
 * @component UserApprovalDialog
 * @description 用户审核对话框组件，用于批准或拒绝单个用户
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - open: boolean - 对话框是否打开
 * - onOpenChange: (open: boolean) => void - 对话框状态变更回调
 * - userId: string - 要审核的用户ID
 * - action: "approve" | "reject" - 审核操作类型
 * - onSuccess: () => void - 审核成功回调
 *
 * @example
 * <UserApprovalDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   userId={userId}
 *   action="approve"
 *   onSuccess={handleSuccess}
 * />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - tRPC
 * - shadcn/ui
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  User, 
  Mail, 
  Calendar, 
  Loader2 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";

// 表单验证模式
const approvalSchema = z.object({
  reason: z.string().optional(),
});

const rejectionSchema = z.object({
  reason: z.string().min(1, "请提供拒绝原因"),
});

type ApprovalFormData = z.infer<typeof approvalSchema>;
type RejectionFormData = z.infer<typeof rejectionSchema>;

interface UserApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  action: "approve" | "reject";
  onSuccess: () => void;
}

export function UserApprovalDialog({
  open,
  onOpenChange,
  userId,
  action,
  onSuccess,
}: UserApprovalDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 根据操作类型选择验证模式
  const schema = action === "approve" ? approvalSchema : rejectionSchema;
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ApprovalFormData | RejectionFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      reason: "",
    },
  });

  // 获取用户详情 - 使用通用的用户查询
  const { data: user, isPending } = api.user.queries.getById.useQuery(
    { id: userId },
    { enabled: open && !!userId }
  );

  // 审核用户 mutation - 统一使用一个API
  const approveUserMutation = api.userApproval.approveUser.useMutation({
    onSuccess: (result) => {
      toast.success(result.message || "用户审核操作成功");
      onSuccess();
      reset();
    },
    onError: (error) => {
      toast.error(`审核失败: ${error.message}`);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // 处理表单提交
  const onSubmit = async (data: ApprovalFormData | RejectionFormData) => {
    setIsSubmitting(true);

    try {
      await approveUserMutation.mutateAsync({
        userId,
        action: action === "approve" ? "APPROVE" : "REJECT",
        reason: data.reason || undefined,
        notifyUser: true,
      });
    } catch (error) {
      // 错误已在 mutation 回调中处理
    }
  };

  // 处理对话框关闭
  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      reset();
    }
  };

  if (isPending) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">加载用户信息...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-8">
            <p className="text-gray-500">用户信息加载失败</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === "approve" ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                批准用户注册
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-600" />
                拒绝用户注册
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {action === "approve" 
              ? "批准后用户将能够正常登录和使用系统"
              : "拒绝后用户将无法登录，请提供拒绝原因"
            }
          </DialogDescription>
        </DialogHeader>

        {/* 用户信息 */}
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-gray-900">用户信息</h4>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{user.username}</span>
                <Badge variant="secondary">
                  {user.userLevel}
                </Badge>
              </div>
              
              {(user as any).email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{(user as any).email}</span>
                </div>
              )}
              
              {user.displayName && (
                <div className="text-sm text-gray-600">
                  显示名称: {user.displayName}
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>
                  注册于 {formatDistanceToNow(new Date(user.createdAt), {
                    addSuffix: true,
                    locale: zhCN,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* 审核表单 */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">
                {action === "approve" ? "备注 (可选)" : "拒绝原因 *"}
              </Label>
              <Textarea
                id="reason"
                placeholder={
                  action === "approve" 
                    ? "可以添加审核备注..." 
                    : "请说明拒绝原因，这将帮助用户了解问题所在"
                }
                {...register("reason")}
                className={errors.reason ? "border-red-500" : ""}
                rows={3}
              />
              {errors.reason && (
                <p className="text-sm text-red-600">{errors.reason.message}</p>
              )}
            </div>

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
                variant={action === "approve" ? "default" : "destructive"}
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {action === "approve" ? "确认批准" : "确认拒绝"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
