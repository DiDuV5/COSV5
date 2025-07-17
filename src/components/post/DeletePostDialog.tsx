/**
 * @fileoverview 作品删除确认对话框
 * @description 提供完善的删除确认机制，确保数据一致性和用户体验
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Trash2, FileText, Image, Video, MessageSquare, Heart } from 'lucide-react';
import { api } from '@/trpc/react';
import { useToast } from '@/hooks/use-toast';

/**
 * 删除确认表单验证模式
 */
const deletePostSchema = z.object({
  confirmTitle: z.string().min(1, '请输入作品标题确认删除'),
  reason: z.string().min(5, '请说明删除原因（至少5个字符）'),
  confirmUnderstand: z.boolean().refine(val => val === true, {
    message: '请确认您理解删除的后果',
  }),
});

type DeletePostFormData = z.infer<typeof deletePostSchema>;

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
 * 删除对话框属性
 */
interface DeletePostDialogProps {
  /** 作品信息 */
  post: PostInfo | null;
  /** 对话框开启状态 */
  open: boolean;
  /** 对话框状态变更回调 */
  onOpenChange: (open: boolean) => void;
  /** 删除成功回调 */
  onSuccess: () => void;
  /** 是否为管理员删除 */
  isAdminDelete?: boolean;
}

/**
 * 作品删除确认对话框组件
 */
export function DeletePostDialog({
  post,
  open,
  onOpenChange,
  onSuccess,
  isAdminDelete = false,
}: DeletePostDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const form = useForm<DeletePostFormData>({
    resolver: zodResolver(deletePostSchema),
    defaultValues: {
      confirmTitle: '',
      reason: '',
      confirmUnderstand: false,
    },
  });

  // 删除作品 mutation
  const deletePostMutation = api.post.deleteMyPost.useMutation({
    onSuccess: () => {
      setIsDeleting(false);
      toast({
        title: '删除成功',
        description: `${post?.contentType === 'MOMENT' ? '动态' : '作品'}已成功删除`,
      });
      onSuccess();
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      setIsDeleting(false);
      toast({
        title: '删除失败',
        description: error.message,
        variant: 'destructive',
      });
      form.setError('root', {
        type: 'manual',
        message: error.message,
      });
    },
  });

  // 管理员删除作品 mutation
  const adminDeletePostMutation = api.post.delete.useMutation({
    onSuccess: () => {
      setIsDeleting(false);
      toast({
        title: '删除成功',
        description: `${post?.contentType === 'MOMENT' ? '动态' : '作品'}已软删除，管理员可在后台恢复`,
      });
      onSuccess();
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      setIsDeleting(false);
      toast({
        title: '删除失败',
        description: error.message,
        variant: 'destructive',
      });
      form.setError('root', {
        type: 'manual',
        message: error.message,
      });
    },
  });

  // 处理表单提交
  const onSubmit = async (data: DeletePostFormData) => {
    if (!post) return;

    // 验证标题确认
    if (data.confirmTitle !== post.title) {
      form.setError('confirmTitle', {
        type: 'manual',
        message: '输入的标题与作品标题不匹配',
      });
      return;
    }

    setIsDeleting(true);

    try {
      if (isAdminDelete) {
        await adminDeletePostMutation.mutateAsync({ id: post.id });
      } else {
        await deletePostMutation.mutateAsync({ id: post.id });
      }
    } catch (error) {
      // 错误处理已在mutation的onError中处理
    }
  };

  // 关闭对话框
  const handleClose = () => {
    if (!isDeleting) {
      onOpenChange(false);
      form.reset();
    }
  };

  if (!post) return null;

  const contentTypeName = post.contentType === 'MOMENT' ? '动态' : '作品';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            删除{contentTypeName}确认
          </DialogTitle>
          <DialogDescription>
            {contentTypeName}将被软删除，不会立即删除数据。管理员可在后台恢复或永久删除。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 作品信息展示 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                {post.contentType === 'MOMENT' ? (
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                ) : (
                  <FileText className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{post.title}</h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <Badge variant="outline">
                    {post.publishedAt ? '已发布' : '草稿'}
                  </Badge>
                  {post.mediaCount && post.mediaCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Image className="w-4 h-4" />
                      {post.mediaCount} 个媒体文件
                    </span>
                  )}
                  {post.commentCount && post.commentCount > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      {post.commentCount} 条评论
                    </span>
                  )}
                  {post.likeCount && post.likeCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {post.likeCount} 个点赞
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 警告信息 */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">删除此{contentTypeName}将会：</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>永久删除{contentTypeName}内容和描述</li>
                  {post.mediaCount && post.mediaCount > 0 && (
                    <li>删除 {post.mediaCount} 个关联的媒体文件</li>
                  )}
                  {post.commentCount && post.commentCount > 0 && (
                    <li>删除 {post.commentCount} 条评论</li>
                  )}
                  {post.likeCount && post.likeCount > 0 && (
                    <li>删除 {post.likeCount} 个点赞记录</li>
                  )}
                  <li>删除所有相关的统计数据</li>
                </ul>
                <p className="text-sm font-medium text-red-600 mt-2">
                  此操作无法撤销，请谨慎操作！
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* 删除确认表单 */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* 错误提示 */}
              {form.formState.errors.root && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {form.formState.errors.root.message}
                  </AlertDescription>
                </Alert>
              )}

              {/* 标题确认 */}
              <FormField
                control={form.control}
                name="confirmTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      确认删除：请输入{contentTypeName}标题 <code className="bg-gray-100 px-1 rounded">{post.title}</code>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={`输入 ${post.title} 确认删除`}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      为了防止误操作，请输入完整的{contentTypeName}标题确认删除
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 删除原因 */}
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>删除原因 *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`请说明删除此${contentTypeName}的原因...`}
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      请详细说明删除原因，此信息将记录在审计日志中
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 确认理解 */}
              <FormField
                control={form.control}
                name="confirmUnderstand"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        我理解删除操作的后果，确认要删除此{contentTypeName}
                      </FormLabel>
                      <FormDescription>
                        请确认您已阅读并理解上述警告信息
                      </FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isDeleting}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      删除中...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      确认删除
                    </div>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
