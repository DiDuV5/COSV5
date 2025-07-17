/**
 * @fileoverview 作品操作组件
 * @description 提供编辑、删除等作品操作功能，支持权限控制
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConditionalPermission } from '@/components/auth/PermissionGuard';
import { DeletePostDialog } from '@/components/post/DeletePostDialog';
import { useToast } from '@/hooks/use-toast';

/**
 * 作品信息接口
 */
interface PostInfo {
  id: string;
  title: string;
  contentType: 'POST' | 'MOMENT';
  authorId: string;
  mediaCount?: number;
  commentCount?: number;
  likeCount?: number;
  publishedAt?: Date | null;
}

/**
 * 作品操作组件属性
 */
interface PostActionsProps {
  /** 作品信息 */
  post: PostInfo;
  /** 显示模式 */
  variant?: 'dropdown' | 'buttons';
  /** 按钮大小 */
  size?: 'sm' | 'lg' | 'default';
  /** 操作成功回调 */
  onActionSuccess?: () => void;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 作品操作组件
 */
export function PostActions({
  post,
  variant = 'dropdown',
  size = 'sm',
  onActionSuccess,
  className = '',
}: PostActionsProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // 检查是否为作品作者
  const isAuthor = session?.user?.id === post.authorId;

  // 检查是否为管理员
  const isAdmin = session?.user?.userLevel === 'ADMIN' || session?.user?.userLevel === 'SUPER_ADMIN';

  // 是否有编辑权限（作者或管理员）
  const canEdit = isAuthor || isAdmin;

  // 是否有删除权限（作者或管理员）
  const canDelete = isAuthor || isAdmin;

  // 如果没有任何权限，不显示操作按钮
  if (!canEdit && !canDelete) {
    return null;
  }

  /**
   * 处理编辑操作
   */
  const handleEdit = () => {
    router.push(`/create?edit=${post.id}`);
  };

  /**
   * 处理删除操作
   */
  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  /**
   * 删除成功回调
   */
  const handleDeleteSuccess = () => {
    toast({
      title: '删除成功',
      description: `${post.contentType === 'MOMENT' ? '动态' : '作品'}已成功删除`,
    });

    if (onActionSuccess) {
      onActionSuccess();
    } else {
      // 默认跳转到作品列表页面
      router.push('/posts');
    }
  };

  // 按钮模式
  if (variant === 'buttons') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {canEdit && (
          <Button
            variant="outline"
            size={size}
            onClick={handleEdit}
            className="flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            编辑
          </Button>
        )}

        {canDelete && (
          <Button
            variant="outline"
            size={size}
            onClick={handleDelete}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:border-red-300"
          >
            <Trash2 className="w-4 h-4" />
            删除
          </Button>
        )}

        {/* 删除确认对话框 */}
        <DeletePostDialog
          post={post}
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onSuccess={handleDeleteSuccess}
          isAdminDelete={isAdmin && !isAuthor}
        />
      </div>
    );
  }

  // 下拉菜单模式
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size={size} className={className}>
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {canEdit && (
            <DropdownMenuItem onClick={handleEdit}>
              <Edit className="w-4 h-4 mr-2" />
              编辑{post.contentType === 'MOMENT' ? '动态' : '作品'}
            </DropdownMenuItem>
          )}

          {canEdit && canDelete && <DropdownMenuSeparator />}

          {canDelete && (
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-red-600 focus:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              删除{post.contentType === 'MOMENT' ? '动态' : '作品'}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 删除确认对话框 */}
      <DeletePostDialog
        post={post}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onSuccess={handleDeleteSuccess}
        isAdminDelete={isAdmin && !isAuthor}
      />
    </>
  );
}

/**
 * 权限控制的作品操作组件
 * 只有登录用户才能看到操作按钮
 */
export function ProtectedPostActions(props: PostActionsProps) {
  return (
    <ConditionalPermission requiredLevel="USER">
      <PostActions {...props} />
    </ConditionalPermission>
  );
}

/**
 * 作品操作工具函数
 */
export const PostActionUtils = {
  /**
   * 检查用户是否可以编辑作品
   */
  canEditPost(userId: string | undefined, postAuthorId: string, userLevel?: string): boolean {
    if (!userId) return false;

    // 作者可以编辑
    if (userId === postAuthorId) return true;

    // 管理员可以编辑所有作品
    if (userLevel === 'ADMIN' || userLevel === 'SUPER_ADMIN') return true;

    return false;
  },

  /**
   * 检查用户是否可以删除作品
   */
  canDeletePost(userId: string | undefined, postAuthorId: string, userLevel?: string): boolean {
    if (!userId) return false;

    // 作者可以删除
    if (userId === postAuthorId) return true;

    // 管理员可以删除所有作品
    if (userLevel === 'ADMIN' || userLevel === 'SUPER_ADMIN') return true;

    return false;
  },

  /**
   * 获取操作权限描述
   */
  getPermissionDescription(userId: string | undefined, postAuthorId: string, userLevel?: string): string {
    if (!userId) return '请登录后操作';

    if (userId === postAuthorId) return '作者权限';

    if (userLevel === 'ADMIN' || userLevel === 'SUPER_ADMIN') return '管理员权限';

    return '无操作权限';
  },
};
