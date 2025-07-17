/**
 * @fileoverview 草稿列表组件
 * @description 显示用户的所有草稿，支持选择、编辑和删除
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FileText,
  Edit,
  Trash2,
  Calendar,
  Image,
  Tag,
  Plus,
  Loader2
} from 'lucide-react';
import { api } from '@/trpc/react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface DraftListProps {
  onSelectDraft?: (draftId: string) => void;
}

export function DraftList({ onSelectDraft }: DraftListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);

  // 获取用户草稿列表
  const {
    data: drafts,
    isLoading,
    refetch
  } = api.draft.getUserDrafts.useQuery(undefined, {
    enabled: isOpen, // 只有在对话框打开时才加载数据
  });

  // 删除草稿
  const deleteDraftMutation = api.draft.deleteDraft.useMutation({
    onSuccess: () => {
      toast({
        title: '删除成功',
        description: '草稿已成功删除',
      });
      refetch(); // 刷新草稿列表
      setDeletingDraftId(null);
    },
    onError: (error) => {
      toast({
        title: '删除失败',
        description: error.message,
        variant: 'destructive',
      });
      setDeletingDraftId(null);
    },
  });

  const handleSelectDraft = (draftId: string) => {
    setIsOpen(false);
    if (onSelectDraft) {
      onSelectDraft(draftId);
    } else {
      // 默认行为：跳转到创建页面并加载草稿
      router.push(`/create?draft=${draftId}`);
    }
  };

  const handleDeleteDraft = (draftId: string) => {
    setDeletingDraftId(draftId);
  };

  const confirmDeleteDraft = () => {
    if (deletingDraftId) {
      deleteDraftMutation.mutate({ draftId: deletingDraftId });
    }
  };

  const formatDate = (date: Date) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: zhCN,
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>草稿列表</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>我的草稿</span>
              <Badge variant="secondary">{drafts?.length || 0}/5</Badge>
            </DialogTitle>
            <DialogDescription>
              选择一个草稿继续编辑，或删除不需要的草稿。最多可保存5个草稿。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>加载中...</span>
              </div>
            ) : drafts && drafts.length > 0 ? (
              <div className="grid gap-4">
                {drafts.map((draft: any) => (
                  <Card
                    key={draft.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleSelectDraft(draft.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-1">
                            {draft.title || '无标题草稿'}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {draft.contentPreview || '暂无内容'}
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {draft.isEditing && (
                            <Badge variant="outline" className="text-blue-600 border-blue-200">
                              <Edit className="w-3 h-3 mr-1" />
                              编辑中
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDraft(draft.id);
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(draft.updatedAt)}</span>
                          </div>
                          {draft.mediaCount > 0 && (
                            <div className="flex items-center space-x-1">
                              <Image className="w-4 h-4" />
                              <span>{draft.mediaCount}个文件</span>
                            </div>
                          )}
                          {draft.tagCount > 0 && (
                            <div className="flex items-center space-x-1">
                              <Tag className="w-4 h-4" />
                              <span>{draft.tagCount}个标签</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无草稿</h3>
                <p className="text-gray-500 mb-4">
                  开始创作您的第一个草稿吧！
                </p>
                <Button
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>开始创作</span>
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deletingDraftId} onOpenChange={() => setDeletingDraftId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除草稿</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。确定要删除这个草稿吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteDraft}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteDraftMutation.isPending}
            >
              {deleteDraftMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  删除中...
                </>
              ) : (
                '确认删除'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
