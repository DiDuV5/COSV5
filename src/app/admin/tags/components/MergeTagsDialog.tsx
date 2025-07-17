/**
 * @fileoverview 合并标签对话框组件
 * @description 处理标签合并操作
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Merge, AlertTriangle } from "lucide-react";
import type { MergeTagsDialogProps } from "../types";

export function MergeTagsDialog({
  open,
  onOpenChange,
  selectedTags,
  targetTagName,
  onTargetTagNameChange,
  operationReason,
  onOperationReasonChange,
  onConfirm,
  isPending,
}: MergeTagsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="w-5 h-5" />
            合并标签
          </DialogTitle>
          <DialogDescription>
            将选中的标签合并为一个新标签。此操作不可撤销。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 警告提示 */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              合并操作将把所有选中标签的使用记录转移到目标标签，原标签将被删除。
            </AlertDescription>
          </Alert>

          {/* 源标签列表 */}
          <div>
            <Label className="text-sm font-medium">
              要合并的标签 ({selectedTags.length} 个)
            </Label>
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedTags.map(tag => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* 目标标签名称 */}
          <div>
            <Label htmlFor="targetTagName" className="text-sm font-medium">
              目标标签名称 *
            </Label>
            <Input
              id="targetTagName"
              value={targetTagName}
              onChange={(e) => onTargetTagNameChange(e.target.value)}
              placeholder="输入合并后的标签名称"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              如果目标标签已存在，将合并到该标签；否则创建新标签
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
              placeholder="请说明合并这些标签的原因..."
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
            disabled={isPending || !targetTagName.trim()}
          >
            {isPending ? "合并中..." : "确认合并"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
