/**
 * @fileoverview 标签表格组件
 * @description 显示标签列表和操作菜单
 */

"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Edit2,
  Trash2,
  Merge,
  RefreshCw,
  XCircle,
  TagIcon,
  Loader2,
} from "lucide-react";
import type { TagsTableProps } from "../types";
import { formatNumber, formatDate, getTagStatusInfo } from "../utils";

export function TagsTable({
  tags,
  selectedTags,
  isPending,
  onSelectAll,
  onSelectTag,
  onRenameTag,
  onMergeTags,
  onDeleteTags,
  onRestoreTag,
  statusFilter,
}: TagsTableProps) {
  const isAllSelected = tags.length > 0 && selectedTags.length === tags.length;
  const isIndeterminate = selectedTags.length > 0 && selectedTags.length < tags.length;

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>标签列表</CardTitle>
          <CardDescription>加载中...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">加载中...</span>
            </div>
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tags.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>标签列表</CardTitle>
          <CardDescription>暂无数据</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">暂无标签数据</p>
            <p className="text-sm text-gray-500 mt-2">
              尝试调整搜索条件或清空搜索框
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>标签列表</CardTitle>
        <CardDescription>
          共 {tags.length} 个标签
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isIndeterminate;
                      }}
                      onCheckedChange={onSelectAll}
                    />
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">选择</span>
                      <span className="text-xs text-gray-400">
                        {selectedTags.length > 0 ? `已选${selectedTags.length}个` : '全选'}
                      </span>
                    </div>
                  </div>
                </th>
                <th className="text-left py-3 px-4">标签名称</th>
                <th className="text-left py-3 px-4">使用次数</th>
                <th className="text-left py-3 px-4">总浏览量</th>
                <th className="text-left py-3 px-4">总点赞数</th>
                <th className="text-left py-3 px-4">首次使用</th>
                <th className="text-left py-3 px-4">最后使用</th>
                <th className="text-left py-3 px-4">状态</th>
                <th className="text-left py-3 px-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => {
                const statusInfo = getTagStatusInfo(tag.status);
                
                return (
                  <tr key={tag.name} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <Checkbox
                        checked={selectedTags.includes(tag.name)}
                        onCheckedChange={(checked) => onSelectTag(tag.name, !!checked)}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono">
                          {tag.name}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold">{formatNumber(tag.count)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-600">{formatNumber(tag.views)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-600">{formatNumber(tag.likes)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-500">{formatDate(tag.firstUsed)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-500">{formatDate(tag.lastUsed)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.label}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>操作</DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          {tag.status === 'deleted' ? (
                            // 已删除标签的操作
                            <>
                              <DropdownMenuItem
                                onClick={() => onRestoreTag(tag.name)}
                                className="text-green-600"
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                恢复标签
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  // 添加到选择列表并删除
                                  if (!selectedTags.includes(tag.name)) {
                                    onSelectTag(tag.name, true);
                                  }
                                  onDeleteTags();
                                }}
                                className="text-red-600"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                永久删除
                              </DropdownMenuItem>
                            </>
                          ) : (
                            // 正常标签的操作
                            <>
                              <DropdownMenuItem onClick={() => onRenameTag(tag.name)}>
                                <Edit2 className="w-4 h-4 mr-2" />
                                重命名
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  // 添加到选择列表并合并
                                  if (!selectedTags.includes(tag.name)) {
                                    onSelectTag(tag.name, true);
                                  }
                                  onMergeTags();
                                }}
                              >
                                <Merge className="w-4 h-4 mr-2" />
                                合并到其他标签
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  // 添加到选择列表并删除
                                  if (!selectedTags.includes(tag.name)) {
                                    onSelectTag(tag.name, true);
                                  }
                                  onDeleteTags();
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                删除
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
