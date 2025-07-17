/**
 * @fileoverview 重构后的管理后台用户管理页面
 * @description 用户列表、搜索、筛选、编辑、删除等功能，采用模块化组件架构
 * @author Augment AI
 * @date 2025-06-29
 * @version 2.0.0
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/trpc/react';
import { useToast } from '@/hooks/use-toast';

// 导入拆分的组件
import UserSearchFilter, { type SearchFormData } from '@/components/admin/users/UserSearchFilter';
import UserTable, { type User } from '@/components/admin/users/UserTable';
import UserStats, { type UserStatsData } from '@/components/admin/users/UserStats';
import BatchOperations, { type BatchOperationType } from '@/components/admin/users/BatchOperations';

// 导入对话框组件（假设已存在）
import { CreateUserDialog } from '@/components/admin/CreateUserDialog';
import { EditUserDialog } from '@/components/admin/EditUserDialog';
import { DeleteUserDialog } from '@/components/admin/DeleteUserDialog';
import { ResetPasswordDialog } from '@/components/admin/ResetPasswordDialog';

/**
 * 重构后的管理员用户页面组件
 */
export default function AdminUsersPageRefactored() {
  const router = useRouter();
  const { toast } = useToast();

  // 状态管理
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchParams, setSearchParams] = useState<SearchFormData>({});

  // 对话框状态
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);

  // 获取用户列表
  const {
    data: usersData,
    isPending: usersLoading,
    refetch: refetchUsers,
  } = api.admin.userManagement.getUsers.useQuery(
    {
      limit: 20,
      search: searchParams.search,
      userLevel: searchParams.userLevel,
      isActive: searchParams.status === 'active' ? true : searchParams.status === 'inactive' ? false : undefined,
      sortBy: (searchParams.sortBy as 'createdAt' | 'lastLoginAt' | 'username' | 'postsCount') || 'createdAt',
      sortOrder: (searchParams.sortOrder as 'asc' | 'desc') || 'desc',
    },
    {
      staleTime: 30000, // 30秒缓存
    }
  );

  // 获取用户统计
  const { data: stats, isPending: statsLoading } = api.admin.getStats.useQuery(
    undefined,
    {
      staleTime: 60000, // 1分钟缓存
      refetchInterval: 300000, // 5分钟自动刷新
    }
  );

  // 获取详细的用户统计（包含usersByLevel）
  const { data: userActivityStats } = api.admin.analytics.getUserActivityStats.useQuery();

  // 批量操作 mutations
  const batchUpdateMutation = api.admin.batchUpdateUserLevel.useMutation({
    onSuccess: () => {
      toast({ title: '批量操作成功', description: '用户信息已更新' });
      refetchUsers();
      setSelectedUsers([]);
    },
    onError: (error) => {
      toast({
        title: '批量操作失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // 处理数据
  const users: User[] = usersData?.users ?? [];
  const totalUsers = users.length; // 使用实际加载的用户数量

  /**
   * 处理搜索
   */
  const handleSearch = useCallback((data: SearchFormData) => {
    setSearchParams(data);
    setSelectedUsers([]); // 清空选择
  }, []);

  /**
   * 处理用户选择
   */
  const handleUserSelect = useCallback((userId: string, selected: boolean) => {
    setSelectedUsers(prev =>
      selected
        ? [...prev, userId]
        : prev.filter(id => id !== userId)
    );
  }, []);

  /**
   * 处理全选
   */
  const handleSelectAll = useCallback((selected: boolean) => {
    setSelectedUsers(selected ? users.map(user => user.id) : []);
  }, [users]);

  /**
   * 处理导出用户
   */
  const handleExportUsers = useCallback(async () => {
    try {
      // 获取所有用户数据
      const allUsers: User[] = [];
      let cursor: string | undefined;

      do {
        const params = new URLSearchParams({
          input: JSON.stringify({
            limit: 100,
            cursor,
            search: searchParams.search,
            userLevel: searchParams.userLevel,
            status: searchParams.status,
          }),
        });

        const response = await fetch(`/api/trpc/admin.getUsers?${params}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || '获取用户数据失败');
        }

        const result = data.result.data;
        allUsers.push(...result.users);
        cursor = result.nextCursor;
      } while (cursor);

      // 生成CSV内容
      const csvHeaders = [
        'ID', '用户名', '显示名称', '邮箱', '用户等级',
        '邮箱验证', '最后登录', '注册时间', '发布数量', '关注者数量'
      ];

      const csvRows = allUsers.map(user => [
        user.id,
        user.username,
        user.displayName || '',
        user.email,
        user.userLevel,
        user.isEmailVerified ? '已验证' : '未验证',
        user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('zh-CN') : '从未',
        new Date(user.createdAt).toLocaleString('zh-CN'),
        user.postsCount || 0,
        user.followersCount || 0,
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      // 下载文件
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `用户数据_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: '导出成功', description: `已导出 ${allUsers.length} 个用户的数据` });
    } catch (error) {
      toast({
        title: '导出失败',
        description: error instanceof Error ? error.message : '导出用户数据时发生错误',
        variant: 'destructive',
      });
    }
  }, [searchParams, toast]);

  /**
   * 处理批量操作
   */
  const handleBatchOperation = useCallback(async (operation: BatchOperationType, params?: any) => {
    // 根据操作类型构建正确的参数
    if (operation === 'updateLevel' && params?.userLevel) {
      await batchUpdateMutation.mutateAsync({
        userIds: selectedUsers,
        userLevel: params.userLevel,
        reason: params.reason,
      });
    }
    // 其他操作类型可以在这里添加
  }, [selectedUsers, batchUpdateMutation]);

  /**
   * 处理用户操作
   */
  const handleEditUser = useCallback((userId: string) => {
    setSelectedUser(userId);
    setShowEditDialog(true);
  }, []);

  const handleDeleteUser = useCallback((userId: string) => {
    setSelectedUser(userId);
    setShowDeleteDialog(true);
  }, []);

  const handleResetPassword = useCallback((userId: string) => {
    setSelectedUser(userId);
    setShowPasswordDialog(true);
  }, []);

  const handleViewUser = useCallback((userId: string) => {
    router.push(`/admin/users/${userId}`);
  }, [router]);

  /**
   * 处理操作成功
   */
  const handleSuccess = useCallback(() => {
    refetchUsers();
    setSelectedUser(null);
    setSelectedUsers([]);
  }, [refetchUsers]);

  // 转换统计数据格式
  const adaptedStats: UserStatsData | null = (stats && userActivityStats) ? {
    totalUsers: stats.totalUsers || 0,
    activeUsers: stats.activeUsers || 0,
    inactiveUsers: (stats.totalUsers || 0) - (stats.activeUsers || 0),
    newUsersToday: 0, // API暂不提供
    newUsersThisWeek: 0, // API暂不提供
    newUsersThisMonth: 0, // API暂不提供
    usersByLevel: {
      GUEST: userActivityStats?.userLevelDistribution?.find((l: any) => l.level === 'GUEST')?.count || 0,
      USER: userActivityStats?.userLevelDistribution?.find((l: any) => l.level === 'USER')?.count || 0,
      VIP: userActivityStats?.userLevelDistribution?.find((l: any) => l.level === 'VIP')?.count || 0,
      CREATOR: userActivityStats?.userLevelDistribution?.find((l: any) => l.level === 'CREATOR')?.count || 0,
      ADMIN: userActivityStats?.userLevelDistribution?.find((l: any) => l.level === 'ADMIN')?.count || 0,
      SUPER_ADMIN: userActivityStats?.userLevelDistribution?.find((l: any) => l.level === 'SUPER_ADMIN')?.count || 0,
    },
    verificationStats: {
      verified: userActivityStats?.totalUsers || 0, // 暂时使用总用户数，实际需要验证用户数
      unverified: 0, // 暂时设为0，实际需要未验证用户数
    },
    loginStats: {
      todayLogins: 0, // API暂不提供
      weeklyLogins: 0, // API暂不提供
      monthlyLogins: 0, // API暂不提供
    },
  } : null;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* 用户统计 */}
      <UserStats stats={adaptedStats} isPending={statsLoading} />

      {/* 搜索过滤 */}
      <UserSearchFilter
        onSearch={handleSearch}
        onExport={handleExportUsers}
        onCreateUser={() => setShowCreateDialog(true)}
        onBatchOperations={() => setShowBatchDialog(true)}
        isPending={usersLoading}
        totalUsers={totalUsers}
      />

      {/* 用户表格 */}
      <UserTable
        users={users}
        selectedUsers={selectedUsers}
        onUserSelect={handleUserSelect}
        onSelectAll={handleSelectAll}
        onEditUser={handleEditUser}
        onDeleteUser={handleDeleteUser}
        onResetPassword={handleResetPassword}
        onViewUser={handleViewUser}
        isPending={usersLoading}
      />

      {/* 分页功能暂时移除，使用普通查询 */}

      {/* 对话框组件 */}
      <CreateUserDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleSuccess}
      />

      <EditUserDialog
        open={showEditDialog}
        userId={selectedUser}
        onOpenChange={setShowEditDialog}
        onSuccess={handleSuccess}
      />

      <DeleteUserDialog
        open={showDeleteDialog}
        userId={selectedUser}
        onOpenChange={setShowDeleteDialog}
        onSuccess={handleSuccess}
      />

      <ResetPasswordDialog
        open={showPasswordDialog}
        userId={selectedUser}
        onOpenChange={setShowPasswordDialog}
        onSuccess={handleSuccess}
      />

      <BatchOperations
        selectedUsers={selectedUsers}
        isOpen={showBatchDialog}
        onClose={() => setShowBatchDialog(false)}
        onExecute={handleBatchOperation}
        isPending={batchUpdateMutation.isPending}
      />
    </div>
  );
}
