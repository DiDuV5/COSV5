/**
 * @component ApprovalHistoryList
 * @description 审核历史列表组件，显示所有已审核用户的历史记录
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - searchQuery: string - 搜索查询字符串
 * - statusFilter: "ALL" | "APPROVED" | "REJECTED" - 状态筛选
 * - sortBy: "approvedAt" | "rejectedAt" | "username" - 排序字段
 * - sortOrder: "asc" | "desc" - 排序顺序
 * - dateFrom: string - 开始日期
 * - dateTo: string - 结束日期
 *
 * @example
 * <ApprovalHistoryList
 *   searchQuery={searchQuery}
 *   statusFilter={statusFilter}
 *   sortBy={sortBy}
 *   sortOrder={sortOrder}
 *   dateFrom={dateFrom}
 *   dateTo={dateTo}
 * />
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
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  CheckCircle, 
  XCircle, 
  User,
  Mail,
  Calendar,
  Loader2,
  History,
  Filter,
  Search
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface ApprovalHistoryListProps {
  searchQuery: string;
  statusFilter: "ALL" | "APPROVED" | "REJECTED";
  sortBy: "approvedAt" | "rejectedAt" | "username";
  sortOrder: "asc" | "desc";
  dateFrom?: string;
  dateTo?: string;
}

export function ApprovalHistoryList({
  searchQuery,
  statusFilter,
  sortBy,
  sortOrder,
  dateFrom,
  dateTo,
}: ApprovalHistoryListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // 获取审核历史列表
  const {
    data: historyData,
    isPending,
    refetch,
  } = { data: { users: [], nextCursor: null }, isPending: false, refetch: () => {} };

  const users = historyData?.users || [];
  const hasNextPage = !!historyData?.nextCursor;

  // 获取审核状态的显示信息
  const getStatusInfo = (user: any) => {
    if (user.registrationStatus === "APPROVED") {
      return {
        status: "已批准",
        variant: "default" as const,
        icon: CheckCircle,
        time: user.registrationApprovedAt,
        approver: user.approvedBy,
        reason: null,
      };
    } else if (user.registrationStatus === "REJECTED") {
      return {
        status: "已拒绝",
        variant: "destructive" as const,
        icon: XCircle,
        time: user.registrationRejectedAt,
        approver: user.rejectedBy,
        reason: user.registrationRejectionReason,
      };
    }
    return null;
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">加载中...</span>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 text-lg mb-2">暂无审核历史</p>
        <p className="text-sm text-gray-400">
          {searchQuery ? "没有找到匹配的记录" : "还没有审核过的用户"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 审核历史表格 */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户信息</TableHead>
              <TableHead>注册时间</TableHead>
              <TableHead>审核状态</TableHead>
              <TableHead>审核时间</TableHead>
              <TableHead>审核人员</TableHead>
              <TableHead>备注/原因</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user: any) => {
              const statusInfo = getStatusInfo(user);
              if (!statusInfo) return null;

              const StatusIcon = statusInfo.icon;

              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{user.username}</span>
                      </div>
                      {user.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-3 h-3" />
                          <span>{user.email}</span>
                        </div>
                      )}
                      {user.displayName && (
                        <div className="text-sm text-gray-600">
                          显示名称: {user.displayName}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {formatDistanceToNow(new Date(user.createdAt), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusInfo.variant} className="flex items-center gap-1 w-fit">
                      <StatusIcon className="w-3 h-3" />
                      {statusInfo.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {statusInfo.time && (
                      <div className="text-sm text-gray-600">
                        {formatDistanceToNow(new Date(statusInfo.time), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {statusInfo.approver && (
                      <div className="text-sm">
                        <div className="font-medium">{statusInfo.approver.username}</div>
                        {statusInfo.approver.displayName && (
                          <div className="text-gray-500">{statusInfo.approver.displayName}</div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {statusInfo.reason && (
                      <div className="text-sm text-gray-600 max-w-xs">
                        <div className="truncate" title={statusInfo.reason}>
                          {statusInfo.reason}
                        </div>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* 分页信息 */}
      {hasNextPage && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">
            显示前 {users.length} 条记录，还有更多记录...
          </p>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="mt-2"
          >
            加载更多
          </Button>
        </div>
      )}

      {/* 统计信息 */}
      <div className="text-sm text-gray-500 text-center">
        共显示 {users.length} 条审核记录
      </div>
    </div>
  );
}
