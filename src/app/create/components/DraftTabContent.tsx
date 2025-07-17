/**
 * @fileoverview 草稿标签页内容组件
 * @description 在标签页中显示用户的所有草稿，支持选择、编辑和删除
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
  Loader2,
  FolderOpen
} from 'lucide-react';
import { api } from '@/trpc/react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface DraftTabContentProps {
  onSelectDraft?: (draftId: string) => void;
}

export function DraftTabContent({ onSelectDraft }: DraftTabContentProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);

  // 获取用户草稿列表
  const {
    data: drafts,
    isLoading,
    refetch
  } = api.draft.getUserDrafts.useQuery();

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
      <div className="space-y-6">
        {/* 草稿列表头部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
                我的草稿
              </h2>
              <p className="text-sm text-gray-500 flex items-center space-x-2">
                <span>管理您的创作草稿</span>
                <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                  {drafts?.length || 0}/5
                </Badge>
              </p>
            </div>
          </div>
        </div>

        {/* 草稿列表内容 */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mr-3 text-amber-600" />
              <span className="text-gray-600">加载草稿中...</span>
            </div>
          ) : drafts && drafts.length > 0 ? (
            <div className="grid gap-4">
              {drafts.map((draft: any) => (
                <Card
                  key={draft.id}
                  className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-amber-400 hover:border-l-amber-500"
                  onClick={() => handleSelectDraft(draft.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-1 text-gray-900">
                          {draft.title || '无标题草稿'}
                        </CardTitle>
                        <CardDescription className="mt-1 line-clamp-2">
                          {draft.contentPreview || '暂无内容'}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        {draft.isEditing && (
                          <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
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
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-amber-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">暂无草稿</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                还没有保存任何草稿。开始在&quot;作品信息&quot;标签页中创作，系统会自动为您保存草稿。
              </p>
              <Button
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                开始创作
              </Button>
            </div>
          )}
        </div>
      </div>

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
