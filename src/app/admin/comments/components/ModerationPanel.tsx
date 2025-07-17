/**
 * @fileoverview 评论审核管理组件
 * @description 处理评论审核、批量操作等功能
 */

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
// import { Input } from "@/components/ui/input"; // 暂时未使用
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  UserCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { AdminComment } from "../types";
import { getUserLevelName, getContentTypeName, getBatchActionMessage } from "../utils";

interface ModerationPanelProps {
  selectedStatus: "PENDING" | "APPROVED" | "REJECTED";
  onSelectedStatusChange: (status: "PENDING" | "APPROVED" | "REJECTED") => void;
  pendingCommentsData?: {
    comments: AdminComment[];
    total: number;
  };
  isLoadingPending: boolean;
  selectedComments: string[];
  onCommentSelect: (commentId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onBatchAction: (action: "APPROVE" | "REJECT") => void;
  onCommentAction: (action: string, commentId: string, data?: any) => void;
  isBatchProcessing: boolean;
}

export function ModerationPanel({
  selectedStatus,
  onSelectedStatusChange,
  pendingCommentsData,
  isLoadingPending,
  selectedComments,
  onCommentSelect,
  onSelectAll,
  onBatchAction,
  onCommentAction,
  isBatchProcessing,
}: ModerationPanelProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [currentCommentId, setCurrentCommentId] = useState<string | null>(null);

  const handleReject = (commentId: string) => {
    setCurrentCommentId(commentId);
    setIsRejectDialogOpen(true);
  };

  const confirmReject = () => {
    if (currentCommentId) {
      onCommentAction("REJECT", currentCommentId, { rejectionReason });
      setIsRejectDialogOpen(false);
      setRejectionReason("");
      setCurrentCommentId(null);
    }
  };

  const handleBatchApprove = () => {
    if (selectedComments.length === 0) return;

    const confirmed = window.confirm(getBatchActionMessage("APPROVE", selectedComments.length));
    if (confirmed) {
      onBatchAction("APPROVE");
    }
  };

  const handleBatchReject = () => {
    if (selectedComments.length === 0) return;

    const confirmed = window.confirm(getBatchActionMessage("REJECT", selectedComments.length));
    if (confirmed) {
      onBatchAction("REJECT");
    }
  };

  const allSelected = (pendingCommentsData?.comments?.length || 0) > 0 &&
    selectedComments.length === (pendingCommentsData?.comments?.length || 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            评论审核管理
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedStatus} onValueChange={(value) => onSelectedStatusChange(value as "PENDING" | "APPROVED" | "REJECTED")}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">待审核</SelectItem>
                <SelectItem value="APPROVED">已通过</SelectItem>
                <SelectItem value="REJECTED">已拒绝</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline">
              {pendingCommentsData?.total || 0} 条
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 批量操作栏 */}
        {selectedStatus === "PENDING" && (
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onSelectAll}
              />
              <span className="text-sm">
                已选择 {selectedComments.length} 条评论
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleBatchApprove}
                disabled={selectedComments.length === 0 || isBatchProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isBatchProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                批量通过
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBatchReject}
                disabled={selectedComments.length === 0 || isBatchProcessing}
              >
                {isBatchProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                批量拒绝
              </Button>
            </div>
          </div>
        )}

        {/* 评论列表 */}
        {isLoadingPending ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">加载评论中...</span>
          </div>
        ) : pendingCommentsData?.comments && pendingCommentsData.comments.length > 0 ? (
          <div className="space-y-4">
            {pendingCommentsData.comments.map((comment) => (
              <div key={comment.id} className="p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  {selectedStatus === "PENDING" && (
                    <Checkbox
                      checked={selectedComments.includes(comment.id)}
                      onCheckedChange={(checked) => onCommentSelect(comment.id, checked as boolean)}
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {comment.author ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {getUserLevelName(comment.author.userLevel)}
                            </Badge>
                            <span className="font-medium">
                              {comment.author.displayName || comment.author.username}
                            </span>
                            {comment.author.isVerified && (
                              <UserCheck className="h-4 w-4 text-blue-500" />
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">游客</Badge>
                            <span className="font-medium">{comment.guestName}</span>
                          </div>
                        )}
                        <Badge
                          variant={
                            comment.status === "APPROVED" ? "default" :
                            comment.status === "PENDING" ? "secondary" :
                            "destructive"
                          }
                        >
                          {comment.status === "APPROVED" ? "已通过" :
                           comment.status === "PENDING" ? "待审核" :
                           "已拒绝"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>
                          {formatDistanceToNow(new Date(comment.createdAt), {
                            addSuffix: true,
                            locale: zhCN
                          })}
                        </span>
                        {comment.post && (
                          <Link
                            href={`/posts/${comment.post.id}`}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="h-3 w-3" />
                            查看原文
                          </Link>
                        )}
                      </div>
                    </div>

                    <p className="text-gray-700 mb-2">{comment.content}</p>

                    {comment.post && (
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded mb-2">
                        来自{getContentTypeName(comment.post.contentType)}：{comment.post.title} -
                        作者：{comment.post.author.displayName || comment.post.author.username}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>👍 {comment.likeCount}</span>
                        <span>💬 {comment.replyCount}</span>
                        {comment.dislikeCount > 0 && (
                          <span className="text-red-600">👎 {comment.dislikeCount}</span>
                        )}
                      </div>

                      {/* 单个评论操作按钮 */}
                      {selectedStatus === "PENDING" && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => onCommentAction("APPROVE", comment.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            通过
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(comment.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            拒绝
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* 显示拒绝原因 */}
                    {comment.status === "REJECTED" && comment.rejectionReason && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                        <span className="font-medium text-red-800">拒绝原因：</span>
                        <span className="text-red-700">{comment.rejectionReason}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            暂无{selectedStatus === "PENDING" ? "待审核" : selectedStatus === "APPROVED" ? "已通过" : "已拒绝"}的评论
          </div>
        )}

        {/* 拒绝原因对话框 */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>拒绝评论</DialogTitle>
              <DialogDescription>
                请输入拒绝原因，这将帮助用户了解评论被拒绝的原因。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="请输入拒绝原因..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                取消
              </Button>
              <Button variant="destructive" onClick={confirmReject}>
                确认拒绝
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
