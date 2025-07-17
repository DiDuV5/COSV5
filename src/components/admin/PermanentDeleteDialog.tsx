/**
 * @fileoverview 永久删除内容确认对话框
 * @description 管理员永久删除已软删除内容的确认对话框
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  XCircle as _XCircle,
  AlertTriangle,
  FileText,
  MessageSquare,
  Heart,
  User,
  Calendar,
  Skull
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

/**
 * 永久删除表单验证Schema
 */
const permanentDeleteFormSchema = z.object({
  reason: z.string().min(10, '删除原因至少需要10个字符').max(500, '删除原因不能超过500个字符'),
  confirmText: z.literal('永久删除'),
  confirmUnderstand: z.boolean().refine(val => val === true, {
    message: '必须确认理解删除后果',
  }),
});

type PermanentDeleteFormData = z.infer<typeof permanentDeleteFormSchema>;

/**
 * 永久删除对话框属性
 */
interface PermanentDeleteDialogProps {
  /** 要永久删除的内容 */
  post: any;
  /** 对话框开启状态 */
  open: boolean;
  /** 对话框状态变化回调 */
  onOpenChange: (open: boolean) => void;
  /** 删除成功回调 */
  onSuccess: () => void;
}

/**
 * 永久删除内容确认对话框
 */
export function PermanentDeleteDialog({
  post,
  open,
  onOpenChange,
  onSuccess,
}: PermanentDeleteDialogProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<PermanentDeleteFormData>({
    resolver: zodResolver(permanentDeleteFormSchema),
    defaultValues: {
      reason: '',
      confirmText: '永久删除' as const,
      confirmUnderstand: false,
    },
  });

  // 永久删除内容的mutation
  const permanentDeleteMutation = api.post.permanentDelete.useMutation({
    onSuccess: () => {
      setIsDeleting(false);
      toast({
        title: '永久删除成功',
        description: `${post?.contentType === 'MOMENT' ? '动态' : '作品'}已永久删除`,
      });
      onSuccess();
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      setIsDeleting(false);
      toast({
        title: '删除失败',
        description: error.message || '删除过程中发生错误',
        variant: 'destructive',
      });
    },
  });

  /**
   * 处理永久删除提交
   */
  const handlePermanentDelete = async (data: PermanentDeleteFormData) => {
    if (!post) return;

    setIsDeleting(true);
    await permanentDeleteMutation.mutateAsync({
      id: post.id,
      reason: data.reason,
      confirmText: data.confirmText,
    });
  };

  if (!post) return null;

  const contentTypeName = post.contentType === 'MOMENT' ? '动态' : '作品';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Skull className="w-5 h-5" />
            永久删除{contentTypeName}确认
          </DialogTitle>
          <DialogDescription>
            ⚠️ 危险操作：此操作将永久删除{contentTypeName}及其所有数据，无法恢复！
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 内容信息展示 */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                {post.contentType === 'MOMENT' ? (
                  <MessageSquare className="w-5 h-5 text-red-600" />
                ) : (
                  <FileText className="w-5 h-5 text-red-600" />
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
                  {post.media && post.media.length > 0 && (
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {post.media.length} 个媒体文件
                    </span>
                  )}
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

          {/* 危险警告 */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">永久删除将导致以下数据丢失</h4>
                <ul className="text-red-700 mt-1 space-y-1 text-sm">
                  <li>• {contentTypeName}本身及其所有内容</li>
                  <li>• 所有评论数据（{post.commentCount || 0} 条）</li>
                  <li>• 所有点赞数据（{post.likeCount || 0} 个）</li>
                  <li>• 所有媒体文件（{post.media?.length || 0} 个）</li>
                  <li>• 相关的统计数据和历史记录</li>
                  <li>• <strong>此操作无法撤销！</strong></li>
                </ul>
              </div>
            </div>
          </div>

          {/* 永久删除表单 */}
          <form onSubmit={form.handleSubmit(handlePermanentDelete as any)} className="space-y-4">
            <div>
              <Label htmlFor="reason">永久删除原因 *</Label>
              <Textarea
                id="reason"
                placeholder="请详细说明永久删除此内容的原因（至少10个字符）..."
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

            <div>
              <Label htmlFor="confirmText">确认文本 *</Label>
              <Input
                id="confirmText"
                placeholder="请输入：永久删除"
                {...form.register('confirmText')}
                className="mt-1"
              />
              <p className="text-sm text-gray-600 mt-1">
                请输入&quot;永久删除&quot;以确认此操作
              </p>
              {form.formState.errors.confirmText && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.confirmText.message}
                </p>
              )}
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="confirmUnderstand"
                checked={form.watch('confirmUnderstand')}
                onCheckedChange={(checked) => form.setValue('confirmUnderstand', !!checked)}
              />
              <Label htmlFor="confirmUnderstand" className="text-sm leading-5">
                我理解此操作将永久删除{contentTypeName}及其所有数据，且无法恢复。我确认要执行此危险操作。
              </Label>
            </div>
            {form.formState.errors.confirmUnderstand && (
              <p className="text-sm text-red-600">
                {form.formState.errors.confirmUnderstand.message}
              </p>
            )}

            {/* 操作按钮 */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isDeleting}
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    删除中...
                  </>
                ) : (
                  <>
                    <Skull className="w-4 h-4 mr-2" />
                    永久删除
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
