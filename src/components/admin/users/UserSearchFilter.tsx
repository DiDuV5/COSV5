/**
 * @fileoverview 用户搜索过滤组件
 * @description 处理用户搜索和筛选功能，从原 admin/users/page.tsx 重构而来
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, Filter, Download, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// 用户等级选项
export const USER_LEVEL_OPTIONS = [
  { value: '', label: '全部等级', icon: Users, color: 'text-gray-500' },
  { value: 'GUEST', label: '游客', icon: Users, color: 'text-gray-500' },
  { value: 'USER', label: '用户', icon: Users, color: 'text-blue-500' },
  { value: 'VIP', label: 'VIP会员', icon: Users, color: 'text-yellow-500' },
  { value: 'CREATOR', label: '创作者', icon: Users, color: 'text-purple-500' },
  { value: 'ADMIN', label: '管理员', icon: Users, color: 'text-red-500' },
  { value: 'SUPER_ADMIN', label: '超级管理员', icon: Users, color: 'text-red-600' },
];

// 搜索表单验证
const searchSchema = z.object({
  search: z.string().optional(),
  userLevel: z.string().optional(),
  status: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.string().optional(),
});

export type SearchFormData = z.infer<typeof searchSchema>;

export interface UserSearchFilterProps {
  onSearch: (data: SearchFormData) => void;
  onExport: () => void;
  onCreateUser: () => void;
  onBatchOperations: () => void;
  isPending?: boolean;
  totalUsers?: number;
}

/**
 * 用户搜索过滤组件
 * 负责处理用户搜索、筛选和批量操作
 */
export function UserSearchFilter({
  onSearch,
  onExport,
  onCreateUser,
  onBatchOperations,
  isPending = false,
  totalUsers = 0,
}: UserSearchFilterProps) {
  // 搜索表单
  const form = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      search: '',
      userLevel: '',
      status: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
  });

  /**
   * 处理搜索提交
   */
  const handleSubmit = (data: SearchFormData) => {
    onSearch(data);
  };

  /**
   * 重置搜索条件
   */
  const handleReset = () => {
    form.reset();
    onSearch({});
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>用户管理</CardTitle>
            <CardDescription>
              管理系统中的所有用户账户，共 {totalUsers} 个用户
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button onClick={onExport} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              导出
            </Button>
            <Button onClick={onBatchOperations} variant="outline" size="sm">
              <Users className="w-4 h-4 mr-2" />
              批量操作
            </Button>
            <Button onClick={onCreateUser} size="sm">
              <UserPlus className="w-4 h-4 mr-2" />
              新建用户
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 搜索关键词 */}
              <FormField
                control={form.control}
                name="search"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>搜索用户</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          {...field}
                          placeholder="用户名、邮箱或ID"
                          className="pl-10"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 用户等级筛选 */}
              <FormField
                control={form.control}
                name="userLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>用户等级</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择等级" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {USER_LEVEL_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center space-x-2">
                              <option.icon className={`w-4 h-4 ${option.color}`} />
                              <span>{option.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 状态筛选 */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>账户状态</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择状态" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">全部状态</SelectItem>
                        <SelectItem value="active">活跃</SelectItem>
                        <SelectItem value="inactive">非活跃</SelectItem>
                        <SelectItem value="suspended">已暂停</SelectItem>
                        <SelectItem value="pending">待审核</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 排序方式 */}
              <FormField
                control={form.control}
                name="sortBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>排序方式</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择排序" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="createdAt">注册时间</SelectItem>
                        <SelectItem value="lastLoginAt">最后登录</SelectItem>
                        <SelectItem value="username">用户名</SelectItem>
                        <SelectItem value="userLevel">用户等级</SelectItem>
                        <SelectItem value="postsCount">发布数量</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 排序顺序 */}
            <div className="flex items-center space-x-4">
              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>排序顺序</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="desc">降序</SelectItem>
                        <SelectItem value="asc">升序</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                使用搜索和筛选条件来查找特定用户
              </div>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={isPending}
                >
                  重置
                </Button>
                <Button type="submit" disabled={isPending}>
                  <Filter className="w-4 h-4 mr-2" />
                  {isPending ? '搜索中...' : '搜索'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/**
 * 导出用户搜索过滤组件
 */
export default UserSearchFilter;
