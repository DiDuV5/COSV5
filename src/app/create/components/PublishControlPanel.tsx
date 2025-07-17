/**
 * @fileoverview 发布控制面板组件
 * @description 控制作品的可见性和发布选项
 */

'use client';

import { useRouter } from 'next/navigation';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings, 
  Eye, 
  Globe, 
  Users, 
  Crown, 
  Lock, 
  Upload, 
  ImageIcon, 
  Star, 
  AlertCircle, 
  Save, 
  X, 
  Send, 
  Heart, 
  Link 
} from 'lucide-react';
import type { CreatePostForm } from '../utils/form-schemas';

interface PublishControlPanelProps {
  form: UseFormReturn<CreatePostForm>;
  uploadedFilesCount: number;
  extractedTagsCount: number;
  isPublishing: boolean;
  isDraft: boolean;
  publishedPostId: string | null;
  onSaveDraft: () => void;
  onPublish: () => void;
  onShowDownloadLinkModal: () => void;
}

export function PublishControlPanel({
  form,
  uploadedFilesCount,
  extractedTagsCount,
  isPublishing,
  isDraft,
  publishedPostId,
  onSaveDraft,
  onPublish,
  onShowDownloadLinkModal,
}: PublishControlPanelProps) {
  const router = useRouter();
  const { watch, setValue, formState } = form;
  const title = watch('title');

  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm sticky top-24">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
            <Settings className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">发布设置</CardTitle>
            <CardDescription className="text-sm">
              控制作品的可见性和发布选项
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 可见性设置 - 重新设计 */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
            <Eye className="w-4 h-4 text-gray-500" />
            <span>可见范围</span>
          </Label>
          <Select
            value={watch('visibility')}
            onValueChange={(value) => setValue('visibility', value as any)}
          >
            <SelectTrigger className="w-full border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 bg-white/80">
              <SelectValue placeholder="选择可见范围" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PUBLIC">
                <div className="flex items-center space-x-3 py-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Globe className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium">公开发布</div>
                    <div className="text-xs text-gray-500">所有人都可以查看</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="FOLLOWERS_ONLY">
                <div className="flex items-center space-x-3 py-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium">仅关注者</div>
                    <div className="text-xs text-gray-500">只有关注您的用户可见</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="PREMIUM_ONLY">
                <div className="flex items-center space-x-3 py-2">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Crown className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <div className="font-medium">付费专享</div>
                    <div className="text-xs text-gray-500">仅付费用户可见</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="PRIVATE">
                <div className="flex items-center space-x-3 py-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Lock className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium">私密保存</div>
                    <div className="text-xs text-gray-500">仅自己可见</div>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 发布状态指示器 */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">发布状态</Label>
          <div className="space-y-2">
            {/* 媒体文件状态 */}
            <div className={`flex items-center space-x-3 p-3 rounded-lg border ${
              uploadedFilesCount === 0
                ? 'bg-amber-50 border-amber-200'
                : 'bg-green-50 border-green-200'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                uploadedFilesCount === 0
                  ? 'bg-amber-100'
                  : 'bg-green-100'
              }`}>
                {uploadedFilesCount === 0 ? (
                  <Upload className="w-3 h-3 text-amber-600" />
                ) : (
                  <ImageIcon className="w-3 h-3 text-green-600" />
                )}
              </div>
              <div className="flex-1">
                <div className={`text-sm font-medium ${
                  uploadedFilesCount === 0
                    ? 'text-amber-700'
                    : 'text-green-700'
                }`}>
                  {uploadedFilesCount === 0
                    ? '等待上传媒体文件'
                    : `已上传 ${uploadedFilesCount} 个文件`
                  }
                </div>
                <div className="text-xs text-gray-500">
                  {uploadedFilesCount === 0
                    ? '至少需要上传一个媒体文件'
                    : '媒体文件准备就绪'
                  }
                </div>
              </div>
            </div>

            {/* 标题状态 */}
            <div className={`flex items-center space-x-3 p-3 rounded-lg border ${
              !title
                ? 'bg-amber-50 border-amber-200'
                : 'bg-green-50 border-green-200'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                !title
                  ? 'bg-amber-100'
                  : 'bg-green-100'
              }`}>
                <Star className={`w-3 h-3 ${
                  !title
                    ? 'text-amber-600'
                    : 'text-green-600'
                }`} />
              </div>
              <div className="flex-1">
                <div className={`text-sm font-medium ${
                  !title
                    ? 'text-amber-700'
                    : 'text-green-700'
                }`}>
                  {!title ? '需要填写标题' : '标题已填写'}
                </div>
                <div className="text-xs text-gray-500">
                  {!title ? '标题是必填项' : '标题准备就绪'}
                </div>
              </div>
            </div>

            {/* 标签状态 */}
            {extractedTagsCount > 0 && (
              <div className="flex items-center space-x-3 p-3 rounded-lg border bg-blue-50 border-blue-200">
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-blue-100">
                  <span className="text-xs font-bold text-blue-600">#</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-blue-700">
                    已提取 {extractedTagsCount} 个标签
                  </div>
                  <div className="text-xs text-gray-500">
                    标签有助于作品被发现
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 错误显示 */}
        {formState.errors.root && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 font-medium text-sm">
                {formState.errors.root.message}
              </p>
            </div>
          </div>
        )}

        {/* 操作按钮区域 */}
        <div className="space-y-4 pt-4 border-t border-gray-200">
          {publishedPostId ? (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <Heart className="w-3 h-3 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-green-700">发布成功！</div>
                    <div className="text-xs text-green-600">您的作品已成功发布</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onShowDownloadLinkModal();
                  }}
                  className="text-sm"
                >
                  <Link className="w-4 h-4 mr-2" />
                  管理链接
                </Button>
                <Button
                  type="button"
                  onClick={() => router.push(`/posts/${publishedPostId}`)}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-sm"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  查看作品
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSaveDraft}
                  disabled={isDraft || isPublishing || !title}
                  className="text-sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isDraft ? '保存中...' : '保存草稿'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.back()}
                  disabled={isPublishing || isDraft}
                  className="text-sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  取消
                </Button>
              </div>

              <Button
                type="button"
                disabled={isPublishing || isDraft || !title || uploadedFilesCount === 0}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3"
                size="lg"
                onClick={onPublish}
              >
                {isPublishing ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>发布中...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Send className="w-4 h-4" />
                    <span>发布作品</span>
                  </div>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
