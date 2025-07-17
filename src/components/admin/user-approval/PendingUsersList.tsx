/**
 * @component PendingUsersList
 * @description 待审核用户列表组件，显示所有等待审核的用户
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - searchQuery: string - 搜索查询字符串
 * - sortBy: "createdAt" | "username" - 排序字段
 * - sortOrder: "asc" | "desc" - 排序顺序
 * - onRefresh: () => void - 刷新回调函数
 *
 * @example
 * <PendingUsersList
 *   searchQuery={searchQuery}
 *   sortBy={sortBy}
 *   sortOrder={sortOrder}
 *   onRefresh={handleRefresh}
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
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Clock, 
  MoreHorizontal, 
  CheckCircle, 
  XCircle, 
  User,
  Mail,
  Calendar,
  Loader2,
  Users
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";
import { UserApprovalDialog } from "./UserApprovalDialog";

interface PendingUsersListProps {
  searchQuery: string;
  sortBy: "createdAt" | "username";
  sortOrder: "asc" | "desc";
  onRefresh: () => void;
}

export function PendingUsersList({
  searchQuery,
  sortBy,
  sortOrder,
  onRefresh,
}: PendingUsersListProps) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchAction, setBatchAction] = useState<"approve" | "reject">("approve");
  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean;
    userId: string;
    action: "approve" | "reject";
  }>({
    open: false,
    userId: "",
    action: "approve",
  });

  // 获取待审核用户列表
  const {
    data: usersData,
    isPending,
    refetch,
  } = api.userApproval.getPendingUsers.useQuery({
    search: searchQuery || undefined,
    sortBy,
    sortOrder,
    limit: 50,
  });

  // 批量审核 mutations
  const batchApproveMutation = api.userApproval.batchApproveUsers.useMutation({
    onSuccess: () => {
      toast.success("批量审核操作成功");
      setSelectedUsers([]);
      setShowBatchDialog(false);
      refetch();
      onRefresh();
    },
    onError: (error) => {
      toast.error(`批量审核失败: ${error.message}`);
    },
  });

  const batchRejectMutation = api.userApproval.batchApproveUsers.useMutation({
    onSuccess: () => {
      toast.success("批量拒绝操作成功");
      setSelectedUsers([]);
      setShowBatchDialog(false);
      refetch();
      onRefresh();
    },
    onError: (error) => {
      toast.error(`批量拒绝失败: ${error.message}`);
    },
  });

  const users = usersData?.users || [];
  const hasNextPage = !!usersData?.nextCursor;

  // 处理单个用户选择
  const handleUserSelect = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  // 处理全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  // 处理批量操作
  const handleBatchAction = (action: "approve" | "reject") => {
    if (selectedUsers.length === 0) {
      toast.error("请先选择要操作的用户");
      return;
    }
    setBatchAction(action);
    setShowBatchDialog(true);
  };

  // 确认批量操作
  const confirmBatchAction = () => {
    if (batchAction === "approve") {
      batchApproveMutation.mutate({
        userIds: selectedUsers,
        action: "APPROVE",
        notifyUsers: true,
      });
    } else {
      batchRejectMutation.mutate({
        userIds: selectedUsers,
        action: "REJECT",
        reason: "批量拒绝操作",
        notifyUsers: true,
      });
    }
  };

  // 处理单个用户操作
  const handleUserAction = (userId: string, action: "approve" | "reject") => {
    setApprovalDialog({
      open: true,
      userId,
      action,
    });
  };

  // 审核成功回调
  const handleApprovalSuccess = () => {
    setApprovalDialog({ open: false, userId: "", action: "approve" });
    refetch();
    onRefresh();
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
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 text-lg mb-2">暂无待审核用户</p>
        <p className="text-sm text-gray-400">
          {searchQuery ? "没有找到匹配的用户" : "所有用户都已审核完成"}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* 批量操作工具栏 */}
        {selectedUsers.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-sm text-blue-800">
              已选择 {selectedUsers.length} 个用户
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBatchAction("approve")}
                disabled={batchApproveMutation.isPending || batchRejectMutation.isPending}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                批量批准
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBatchAction("reject")}
                disabled={batchApproveMutation.isPending || batchRejectMutation.isPending}
              >
                <XCircle className="w-4 h-4 mr-1" />
                批量拒绝
              </Button>
            </div>
          </div>
        )}

        {/* 用户列表表格 */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>用户信息</TableHead>
                <TableHead>注册时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => 
                        handleUserSelect(user.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{(user as any).username || 'N/A'}</span>
                      </div>
                      {(user as any).email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-3 h-3" />
                          <span>{(user as any).email}</span>
                        </div>
                      )}
                      {(user as any).displayName && (
                        <div className="text-sm text-gray-600">
                          显示名称: {(user as any).displayName}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {formatDistanceToNow(new Date((user as any).createdAt || new Date()), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      待审核
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleUserAction(user.id, "approve")}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          批准
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleUserAction(user.id, "reject")}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          拒绝
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* 分页信息 */}
        {hasNextPage && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">
              显示前 {users.length} 个用户，还有更多用户...
            </p>
          </div>
        )}
      </div>

      {/* 批量操作确认对话框 */}
      <AlertDialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              确认{batchAction === "approve" ? "批准" : "拒绝"}用户
            </AlertDialogTitle>
            <AlertDialogDescription>
              您确定要{batchAction === "approve" ? "批准" : "拒绝"} {selectedUsers.length} 个用户吗？
              此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBatchAction}
              disabled={batchApproveMutation.isPending || batchRejectMutation.isPending}
            >
              {(batchApproveMutation.isPending || batchRejectMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              确认{batchAction === "approve" ? "批准" : "拒绝"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 单个用户审核对话框 */}
      <UserApprovalDialog
        open={approvalDialog.open}
        onOpenChange={(open) => 
          setApprovalDialog(prev => ({ ...prev, open }))
        }
        userId={approvalDialog.userId}
        action={approvalDialog.action}
        onSuccess={handleApprovalSuccess}
      />
    </>
  );
}
