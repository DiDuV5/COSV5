/**
 * @fileoverview 恢复内容确认对话框
 * @description 管理员恢复已删除内容的确认对话框
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/trpc/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  RotateCcw, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  MessageSquare,
  Heart,
  User,
  Calendar
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

/**
 * 恢复表单验证Schema
 */
const restoreFormSchema = z.object({
  reason: z.string().min(5, '恢复原因至少需要5个字符').max(500, '恢复原因不能超过500个字符'),
});

type RestoreFormData = z.infer<typeof restoreFormSchema>;

/**
 * 恢复对话框属性
 */
interface RestorePostDialogProps {
  /** 要恢复的内容 */
  post: any;
  /** 对话框开启状态 */
  open: boolean;
  /** 对话框状态变化回调 */
  onOpenChange: (open: boolean) => void;
  /** 恢复成功回调 */
  onSuccess: () => void;
}

/**
 * 恢复内容确认对话框
 */
export function RestorePostDialog({
  post,
  open,
  onOpenChange,
  onSuccess,
}: RestorePostDialogProps) {
  const { toast } = useToast();
  const [isRestoring, setIsRestoring] = useState(false);

  const form = useForm<RestoreFormData>({
    resolver: zodResolver(restoreFormSchema),
    defaultValues: {
      reason: '',
    },
  });

  // 恢复内容的mutation
  const restoreMutation = api.post.restore.useMutation({
    onSuccess: () => {
      setIsRestoring(false);
      toast({
        title: '恢复成功',
        description: `${post?.contentType === 'MOMENT' ? '动态' : '作品'}已成功恢复`,
      });
      onSuccess();
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      setIsRestoring(false);
      toast({
        title: '恢复失败',
        description: error.message || '恢复过程中发生错误',
        variant: 'destructive',
      });
    },
  });

  /**
   * 处理恢复提交
   */
  const handleRestore = async (data: RestoreFormData) => {
    if (!post) return;

    setIsRestoring(true);
    await restoreMutation.mutateAsync({
      id: post.id,
      reason: data.reason,
    });
  };

  if (!post) return null;

  const contentTypeName = post.contentType === 'MOMENT' ? '动态' : '作品';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <RotateCcw className="w-5 h-5" />
            恢复{contentTypeName}确认
          </DialogTitle>
          <DialogDescription>
            确认恢复此{contentTypeName}？恢复后内容将重新在平台上显示。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 内容信息展示 */}
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                {post.contentType === 'MOMENT' ? (
                  <MessageSquare className="w-5 h-5 text-green-600" />
                ) : (
                  <FileText className="w-5 h-5 text-green-600" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{post.title}</h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <Badge variant={post.contentType === 'MOMENT' ? 'secondary' : 'default'}>
                    {contentTypeName}
                  </Badge>
                  {post.publishedAt ? (
                    <Badge variant="outline">已发布</Badge>
                  ) : (
                    <Badge variant="secondary">草稿</Badge>
                  )}
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {post.author?.displayName || post.author?.username}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    {post.likeCount || 0} 个点赞
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    {post.commentCount || 0} 条评论
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    删除于 {post.deletedAt ? formatDistanceToNow(new Date(post.deletedAt), { 
                      addSuffix: true, 
                      locale: zhCN 
                    }) : '未知时间'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 删除原因显示 */}
          {post.deletionReason && (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">原删除原因</h4>
                  <p className="text-yellow-700 mt-1">{post.deletionReason}</p>
                </div>
              </div>
            </div>
          )}

          {/* 恢复原因输入 */}
          <form onSubmit={form.handleSubmit(handleRestore)} className="space-y-4">
            <div>
              <Label htmlFor="reason">恢复原因 *</Label>
              <Textarea
                id="reason"
                placeholder="请说明恢复此内容的原因..."
                {...form.register('reason')}
                className="mt-1"
                rows={3}
              />
              {form.formState.errors.reason && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.reason.message}
                </p>
              )}
            </div>

            {/* 恢复影响说明 */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800">恢复后的影响</h4>
                  <ul className="text-blue-700 mt-1 space-y-1 text-sm">
                    <li>• 内容将重新在平台上显示</li>
                    <li>• 所有评论和点赞数据将保持不变</li>
                    <li>• 媒体文件将重新可访问</li>
                    <li>• 作者将收到内容恢复通知</li>
                    <li>• 此操作将记录在审计日志中</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isRestoring}
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={isRestoring}
                className="bg-green-600 hover:bg-green-700"
              >
                {isRestoring ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    恢复中...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    确认恢复
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
