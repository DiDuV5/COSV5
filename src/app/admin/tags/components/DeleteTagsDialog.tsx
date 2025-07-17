/**
 * @fileoverview 删除标签对话框组件
 * @description 处理标签删除操作
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, AlertTriangle, XCircle } from "lucide-react";
import type { DeleteTagsDialogProps } from "../types";

export function DeleteTagsDialog({
  open,
  onOpenChange,
  selectedTags,
  softDelete,
  onSoftDeleteChange,
  operationReason,
  onOperationReasonChange,
  onConfirm,
  isPending,
}: DeleteTagsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {softDelete ? (
              <Trash2 className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            {softDelete ? "删除标签" : "永久删除标签"}
          </DialogTitle>
          <DialogDescription>
            {softDelete 
              ? "将标签移动到回收站，可以稍后恢复。"
              : "永久删除标签，此操作不可撤销。"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 警告提示 */}
          <Alert variant={softDelete ? "default" : "destructive"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {softDelete 
                ? "软删除的标签将从内容中隐藏，但可以从回收站恢复。"
                : "永久删除将完全移除标签及其所有使用记录，无法恢复。"
              }
            </AlertDescription>
          </Alert>

          {/* 要删除的标签列表 */}
          <div>
            <Label className="text-sm font-medium">
              要删除的标签 ({selectedTags.length} 个)
            </Label>
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedTags.map(tag => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* 删除类型选择 */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="softDelete"
              checked={softDelete}
              onCheckedChange={onSoftDeleteChange}
            />
            <Label htmlFor="softDelete" className="text-sm">
              软删除（可恢复）
            </Label>
          </div>

          {/* 操作原因 */}
          <div>
            <Label htmlFor="operationReason" className="text-sm font-medium">
              操作原因 *
            </Label>
            <Textarea
              id="operationReason"
              value={operationReason}
              onChange={(e) => onOperationReasonChange(e.target.value)}
              placeholder="请说明删除这些标签的原因..."
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
            variant={softDelete ? "default" : "destructive"}
            onClick={onConfirm}
            disabled={isPending || !operationReason.trim()}
          >
            {isPending 
              ? "删除中..." 
              : softDelete 
                ? "确认删除" 
                : "永久删除"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
