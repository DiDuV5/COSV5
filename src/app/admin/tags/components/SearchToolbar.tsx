/**
 * @fileoverview 搜索工具栏组件
 * @description 提供搜索、筛选、排序功能
 */

"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  ArrowUpDown,
  Trash2,
} from "lucide-react";
import type { SearchToolbarProps } from "../types";

export function SearchToolbar({
  searchQuery,
  onSearchQueryChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
}: SearchToolbarProps) {
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 搜索框 */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="搜索标签名称..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* 筛选器 */}
          <div className="flex gap-2">
            {/* 状态筛选 */}
            <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as "all" | "active" | "disabled" | "deleted")}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">活跃</SelectItem>
                <SelectItem value="disabled">已禁用</SelectItem>
                <SelectItem value="deleted">
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    回收站
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* 排序方式 */}
            <Select value={sortBy} onValueChange={(value) => onSortByChange(value as "name" | "count" | "created" | "updated")}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="count">使用次数</SelectItem>
                <SelectItem value="name">标签名称</SelectItem>
                <SelectItem value="created">创建时间</SelectItem>
                <SelectItem value="updated">更新时间</SelectItem>
              </SelectContent>
            </Select>

            {/* 排序顺序 */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={sortOrder === 'asc' ? '升序' : '降序'}
            >
              <ArrowUpDown className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
