/**
 * @component AdminCommentActions
 * @description 管理员评论操作组件，提供审核、删除等快捷操作
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - comment: Comment - 评论数据
 * - onAction: (action: string, commentId: string) => void - 操作回调
 * - isPending?: boolean - 是否加载中
 *
 * @example
 * <AdminCommentActions
 *   comment={comment}
 *   onAction={handleAdminAction}
 *   isPending={isProcessing}
 * />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - shadcn/ui
 * - lucide-react
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  Check,
  X,
  Trash2,
  Pin,
  Flag,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface Comment {
  id: string;
  content: string;
  status: string;
  isPinned?: boolean;
  guestName?: string;
  author?: {
    id: string;
    username: string;
    displayName?: string;
    userLevel: string;
  };
  createdAt: string;
  rejectionReason?: string;
}

interface AdminCommentActionsProps {
  comment: Comment;
  onAction: (action: string, commentId: string, data?: any) => void;
  isPending?: boolean;
}

export function AdminCommentActions({
  comment,
  onAction,
  isPending: isLoadingProp = false,
}: AdminCommentActionsProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            待审核
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="outline" className="text-green-600 border-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            已通过
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="outline" className="text-red-600 border-red-300">
            <XCircle className="h-3 w-3 mr-1" />
            已拒绝
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleApprove = () => {
    onAction("APPROVE", comment.id);
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      return;
    }
    onAction("REJECT", comment.id, { rejectionReason });
    setShowRejectDialog(false);
    setRejectionReason("");
  };

  const handleDelete = () => {
    onAction("DELETE", comment.id);
    setShowDeleteDialog(false);
  };

  const handleTogglePin = () => {
    onAction("TOGGLE_PIN", comment.id);
  };

  const isPending = comment.status === "PENDING";
  const isApproved = comment.status === "APPROVED";
  const isRejected = comment.status === "REJECTED";

  return (
    <>
      <div className="flex items-center gap-2">
        {/* 状态标识 */}
        {getStatusBadge(comment.status)}

        {/* 游客标识 */}
        {comment.guestName && (
          <Badge variant="secondary" className="text-xs">
            游客
          </Badge>
        )}

        {/* 快捷操作按钮 */}
        {isPending && (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleApprove}
              disabled={isLoadingProp}
              className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <Check className="h-3 w-3 mr-1" />
              通过
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowRejectDialog(true)}
              disabled={isLoadingProp}
              className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-3 w-3 mr-1" />
              拒绝
            </Button>
          </div>
        )}

        {/* 更多操作菜单 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={isLoadingProp}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {isPending && (
              <>
                <DropdownMenuItem onClick={handleApprove}>
                  <Check className="h-4 w-4 mr-2 text-green-600" />
                  审核通过
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowRejectDialog(true)}>
                  <X className="h-4 w-4 mr-2 text-red-600" />
                  拒绝评论
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {isApproved && (
              <>
                <DropdownMenuItem onClick={handleTogglePin}>
                  <Pin className={`h-4 w-4 mr-2 ${comment.isPinned ? 'text-blue-600' : ''}`} />
                  {comment.isPinned ? '取消置顶' : '置顶评论'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              删除评论
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 拒绝评论对话框 */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拒绝评论</DialogTitle>
            <DialogDescription>
              请说明拒绝这条评论的原因，这将帮助用户了解平台规则。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 line-clamp-3">
                {comment.content}
              </p>
              <div className="mt-2 text-xs text-gray-500">
                来自：{comment.guestName || comment.author?.displayName || comment.author?.username}
              </div>
            </div>
            <Textarea
              placeholder="请输入拒绝原因..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[80px]"
              maxLength={200}
            />
            <div className="text-xs text-gray-500 text-right">
              {rejectionReason.length}/200
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleReject}
              disabled={!rejectionReason.trim() || isLoadingProp}
              className="bg-red-600 hover:bg-red-700"
            >
              确认拒绝
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除评论确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除评论</AlertDialogTitle>
            <AlertDialogDescription>
              此操作不可撤销。删除后，评论将永久消失。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
