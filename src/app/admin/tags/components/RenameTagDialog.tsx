/**
 * @fileoverview 重命名标签对话框组件
 * @description 处理标签重命名操作
 */

"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Edit2, AlertTriangle } from "lucide-react";
import type { RenameTagDialogProps } from "../types";

export function RenameTagDialog({
  open,
  onOpenChange,
  selectedTagForRename,
  newTagName,
  onNewTagNameChange,
  operationReason,
  onOperationReasonChange,
  onConfirm,
  isPending,
}: RenameTagDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="w-5 h-5" />
            重命名标签
          </DialogTitle>
          <DialogDescription>
            修改标签名称，所有使用该标签的内容都会更新。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 警告提示 */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              重命名操作会影响所有使用该标签的帖子和动态。
            </AlertDescription>
          </Alert>

          {/* 原标签名称 */}
          <div>
            <Label className="text-sm font-medium">原标签名称</Label>
            <Input
              value={selectedTagForRename}
              disabled
              className="mt-1 bg-gray-50"
            />
          </div>

          {/* 新标签名称 */}
          <div>
            <Label htmlFor="newTagName" className="text-sm font-medium">
              新标签名称 *
            </Label>
            <Input
              id="newTagName"
              value={newTagName}
              onChange={(e) => onNewTagNameChange(e.target.value)}
              placeholder="输入新的标签名称"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              标签名称长度应在1-50个字符之间
            </p>
          </div>

          {/* 操作原因 */}
          <div>
            <Label htmlFor="operationReason" className="text-sm font-medium">
              操作原因
            </Label>
            <Textarea
              id="operationReason"
              value={operationReason}
              onChange={(e) => onOperationReasonChange(e.target.value)}
              placeholder="请说明重命名的原因..."
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            取消
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending || !newTagName.trim() || newTagName === selectedTagForRename}
          >
            {isPending ? "重命名中..." : "确认重命名"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
