/**
 * @fileoverview 批量操作栏组件
 * @description 显示批量操作按钮和选中的标签
 */

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Merge,
  Trash2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import type { BatchOperationBarProps } from "../types";

export function BatchOperationBar({
  selectedTags,
  statusFilter,
  onMergeTags,
  onDeleteTags,
  onBatchRestore,
  onClearSelection,
}: BatchOperationBarProps) {
  if (selectedTags.length === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">
            已选择 {selectedTags.length} 个标签
          </span>
        </div>
        
        <div className="flex gap-2">
          {statusFilter === 'deleted' ? (
            // 回收站中的批量操作
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onBatchRestore}
                disabled={selectedTags.length === 0}
                className="border-green-300 text-green-700 hover:bg-green-100"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                批量恢复
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onDeleteTags}
                disabled={selectedTags.length === 0}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <XCircle className="w-4 h-4 mr-2" />
                永久删除
              </Button>
            </>
          ) : (
            // 正常标签的批量操作
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onMergeTags}
                disabled={selectedTags.length < 2}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <Merge className="w-4 h-4 mr-2" />
                合并标签
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onDeleteTags}
                disabled={selectedTags.length === 0}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                删除标签
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-gray-600 hover:bg-gray-100"
          >
            <XCircle className="w-4 h-4 mr-2" />
            取消选择
          </Button>
        </div>
      </div>

      {/* 显示选中的标签 */}
      <div className="mt-2 flex flex-wrap gap-1">
        {selectedTags.map(tag => (
          <Badge key={tag} variant="secondary" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
}
