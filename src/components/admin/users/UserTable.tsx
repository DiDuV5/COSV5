/**
 * @fileoverview 用户表格组件
 * @description 展示用户列表和基本操作，从原 admin/users/page.tsx 重构而来
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 */

'use client';

import { useState } from 'react';
import { MoreHorizontal, Edit, Trash2, Key, Eye, Shield, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { USER_LEVEL_OPTIONS } from './UserSearchFilter';

export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string | null;
  userLevel: string;
  avatar?: string | null;
  isEmailVerified: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  postsCount?: number;
  followersCount?: number;
  isActive?: boolean;
}

export interface UserTableProps {
  users: User[];
  selectedUsers: string[];
  onUserSelect: (userId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onEditUser: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
  onResetPassword: (userId: string) => void;
  onViewUser: (userId: string) => void;
  isPending?: boolean;
}

/**
 * 用户表格组件
 * 负责展示用户列表和提供基本操作
 */
export function UserTable({
  users,
  selectedUsers,
  onUserSelect,
  onSelectAll,
  onEditUser,
  onDeleteUser,
  onResetPassword,
  onViewUser,
  isPending = false,
}: UserTableProps) {
  /**
   * 获取用户等级信息
   */
  const getUserLevelInfo = (level: string) => {
    return USER_LEVEL_OPTIONS.find(l => l.value === level) || USER_LEVEL_OPTIONS[1];
  };

  /**
   * 格式化日期
   */
  const formatDate = (date: Date | null) => {
    if (!date) return "从未";
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  /**
   * 获取用户状态
   */
  const getUserStatus = (user: User) => {
    if (!user.isActive) {
      return { label: '已暂停', variant: 'destructive' as const };
    }
    if (!user.isEmailVerified) {
      return { label: '未验证', variant: 'secondary' as const };
    }
    if (user.lastLoginAt) {
      const daysSinceLogin = Math.floor(
        (Date.now() - new Date(user.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLogin > 30) {
        return { label: '非活跃', variant: 'outline' as const };
      }
    }
    return { label: '活跃', variant: 'default' as const };
  };

  /**
   * 处理全选
   */
  const handleSelectAll = (checked: boolean) => {
    onSelectAll(checked);
  };

  /**
   * 处理单个用户选择
   */
  const handleUserSelect = (userId: string, checked: boolean) => {
    onUserSelect(userId, checked);
  };

  // 全选状态
  const isAllSelected = users.length > 0 && selectedUsers.length === users.length;
  const isIndeterminate = selectedUsers.length > 0 && selectedUsers.length < users.length;

  if (isPending) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
            <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">
          <Shield className="w-12 h-12 mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">暂无用户数据</p>
          <p className="text-sm">没有找到符合条件的用户</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                aria-label="选择全部用户"
                {...(isIndeterminate && { 'data-state': 'indeterminate' })}
              />
            </TableHead>
            <TableHead>用户信息</TableHead>
            <TableHead>等级</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>统计</TableHead>
            <TableHead>最后登录</TableHead>
            <TableHead>注册时间</TableHead>
            <TableHead className="w-12">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const levelInfo = getUserLevelInfo(user.userLevel);
            const status = getUserStatus(user);
            const isSelected = selectedUsers.includes(user.id);

            return (
              <TableRow key={user.id} className={isSelected ? 'bg-muted/50' : ''}>
                <TableCell>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleUserSelect(user.id, !!checked)}
                    aria-label={`选择用户 ${user.username}`}
                  />
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback>
                        {user.displayName?.[0] || user.username[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{user.displayName || user.username}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                      <div className="text-xs text-muted-foreground">ID: {user.id}</div>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center space-x-2">
                    <levelInfo.icon className={`w-4 h-4 ${levelInfo.color}`} />
                    <span className="text-sm">{levelInfo.label}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>

                <TableCell>
                  <div className="text-sm space-y-1">
                    <div>发布: {user.postsCount || 0}</div>
                    <div>关注者: {user.followersCount || 0}</div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="text-sm">{formatDate(user.lastLoginAt || null)}</div>
                </TableCell>

                <TableCell>
                  <div className="text-sm">{formatDate(user.createdAt)}</div>
                </TableCell>

                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">打开菜单</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>用户操作</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onViewUser(user.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        查看详情
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEditUser(user.id)}>
                        <Edit className="mr-2 h-4 w-4" />
                        编辑用户
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onResetPassword(user.id)}>
                        <Key className="mr-2 h-4 w-4" />
                        重置密码
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onDeleteUser(user.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        删除用户
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * 导出用户表格组件
 */
export default UserTable;
