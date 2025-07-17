/**
 * @component ApprovalHistoryFilters
 * @description 审核历史筛选控制组件，提供搜索、状态筛选、排序等功能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - searchQuery: string - 搜索查询字符串
 * - onSearchChange: (value: string) => void - 搜索变更回调
 * - statusFilter: "ALL" | "APPROVED" | "REJECTED" - 状态筛选
 * - onStatusFilterChange: (value: "ALL" | "APPROVED" | "REJECTED") => void - 状态筛选变更回调
 * - sortBy: "approvedAt" | "rejectedAt" | "username" - 排序字段
 * - onSortByChange: (value: "approvedAt" | "rejectedAt" | "username") => void - 排序字段变更回调
 * - sortOrder: "asc" | "desc" - 排序顺序
 * - onSortOrderChange: (value: "asc" | "desc") => void - 排序顺序变更回调
 * - dateFrom: string - 开始日期
 * - onDateFromChange: (value: string) => void - 开始日期变更回调
 * - dateTo: string - 结束日期
 * - onDateToChange: (value: string) => void - 结束日期变更回调
 *
 * @example
 * <ApprovalHistoryFilters
 *   searchQuery={searchQuery}
 *   onSearchChange={setSearchQuery}
 *   statusFilter={statusFilter}
 *   onStatusFilterChange={setStatusFilter}
 *   sortBy={sortBy}
 *   onSortByChange={setSortBy}
 *   sortOrder={sortOrder}
 *   onSortOrderChange={setSortOrder}
 *   dateFrom={dateFrom}
 *   onDateFromChange={setDateFrom}
 *   dateTo={dateTo}
 *   onDateToChange={setDateTo}
 * />
 *
 * @dependencies
 * - React 18+
 * - shadcn/ui
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Filter,
  Calendar,
  RotateCcw
} from "lucide-react";

interface ApprovalHistoryFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: "ALL" | "APPROVED" | "REJECTED";
  onStatusFilterChange: (value: "ALL" | "APPROVED" | "REJECTED") => void;
  sortBy: "approvedAt" | "rejectedAt" | "username";
  onSortByChange: (value: "approvedAt" | "rejectedAt" | "username") => void;
  sortOrder: "asc" | "desc";
  onSortOrderChange: (value: "asc" | "desc") => void;
  dateFrom?: string;
  onDateFromChange: (value: string) => void;
  dateTo?: string;
  onDateToChange: (value: string) => void;
}

export function ApprovalHistoryFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
}: ApprovalHistoryFiltersProps) {
  
  // 重置所有筛选条件
  const handleReset = () => {
    onSearchChange("");
    onStatusFilterChange("ALL");
    onSortByChange("approvedAt");
    onSortOrderChange("desc");
    onDateFromChange("");
    onDateToChange("");
  };

  // 检查是否有活动的筛选条件
  const hasActiveFilters = searchQuery || statusFilter !== "ALL" || dateFrom || dateTo;

  return (
    <div className="space-y-4">
      {/* 搜索和状态筛选 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="search">搜索用户</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              id="search"
              placeholder="搜索用户名、邮箱、显示名称..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">审核状态</Label>
          <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as "APPROVED" | "REJECTED" | "ALL")}>
            <SelectTrigger>
              <SelectValue placeholder="选择状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部状态</SelectItem>
              <SelectItem value="APPROVED">已批准</SelectItem>
              <SelectItem value="REJECTED">已拒绝</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sort">排序方式</Label>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={(value) => onSortByChange(value as "username" | "approvedAt" | "rejectedAt")}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="排序字段" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approvedAt">审核时间</SelectItem>
                <SelectItem value="username">用户名</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(value) => onSortOrderChange(value as "asc" | "desc")}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder="顺序" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">降序</SelectItem>
                <SelectItem value="asc">升序</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 日期范围筛选 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dateFrom">开始日期</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom || ""}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateTo">结束日期</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              id="dateTo"
              type="date"
              value={dateTo || ""}
              onChange={(e) => onDateToChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>&nbsp;</Label>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                重置筛选
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 活动筛选条件提示 */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
          <Filter className="w-4 h-4" />
          <span>
            当前筛选条件：
            {searchQuery && ` 搜索"${searchQuery}"`}
            {statusFilter !== "ALL" && ` 状态"${statusFilter === "APPROVED" ? "已批准" : "已拒绝"}"`}
            {dateFrom && ` 开始日期"${dateFrom}"`}
            {dateTo && ` 结束日期"${dateTo}"`}
          </span>
        </div>
      )}
    </div>
  );
}
