/**
 * @component ApprovalHistoryTab
 * @description 审核历史标签页组件，整合筛选控制和历史列表
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @example
 * <ApprovalHistoryTab />
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";
import { ApprovalHistoryFilters } from "./ApprovalHistoryFilters";
import { ApprovalHistoryList } from "./ApprovalHistoryList";

export function ApprovalHistoryTab() {
  // 筛选状态
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "APPROVED" | "REJECTED">("ALL");
  const [sortBy, setSortBy] = useState<"approvedAt" | "rejectedAt" | "username">("approvedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          审核历史
        </CardTitle>
        <CardDescription>
          查看已审核用户的历史记录，支持搜索和筛选
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 筛选控制 */}
        <ApprovalHistoryFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          dateFrom={dateFrom}
          onDateFromChange={setDateFrom}
          dateTo={dateTo}
          onDateToChange={setDateTo}
        />

        {/* 历史列表 */}
        <ApprovalHistoryList
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          sortBy={sortBy}
          sortOrder={sortOrder}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
      </CardContent>
    </Card>
  );
}
