/**
 * @fileoverview 发布设置标签页组件
 * @description 提供完整的发布设置选项，包括可见性、发布时间等
 */

'use client';

import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Eye, 
  Globe, 
  Users, 
  Lock, 
  Clock,
  Bell,
  Shield,
  Zap,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { CreatePostForm } from '../utils/form-schemas';

interface PublishSettingsSectionProps {
  form: UseFormReturn<CreatePostForm>;
  uploadedFilesCount: number;
  extractedTagsCount: number;
  isPublishing: boolean;
  isDraft: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
}

export function PublishSettingsSection({
  form,
  uploadedFilesCount,
  extractedTagsCount,
  isPublishing,
  isDraft,
  onSaveDraft,
  onPublish,
}: PublishSettingsSectionProps) {
  const { watch, setValue } = form;
  const title = watch('title');
  const visibility = watch('visibility');
  const allowComments = watch('allowComments');
  const allowDownload = watch('allowDownload');

  // 检查发布条件
  const canPublish = title && title.trim().length > 0 && uploadedFilesCount > 0;
  const hasBasicInfo = title && title.trim().length > 0;
  const hasMedia = uploadedFilesCount > 0;
  const hasTags = extractedTagsCount > 0;

  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
            <Settings className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">发布设置</CardTitle>
            <CardDescription className="text-sm">
              配置作品的可见性和发布选项
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 发布状态检查 */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
            <CheckCircle className="w-4 h-4" />
            <span>发布状态检查</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">基本信息</span>
              <div className="flex items-center space-x-1">
                {hasBasicInfo ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                )}
                <span className={hasBasicInfo ? 'text-green-600' : 'text-orange-600'}>
                  {hasBasicInfo ? '已完成' : '需要填写标题'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">媒体文件</span>
              <div className="flex items-center space-x-1">
                {hasMedia ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                )}
                <span className={hasMedia ? 'text-green-600' : 'text-orange-600'}>
                  {hasMedia ? `${uploadedFilesCount} 个文件` : '需要上传媒体文件'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">标签</span>
              <div className="flex items-center space-x-1">
                {hasTags ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Info className="w-4 h-4 text-blue-500" />
                )}
                <span className={hasTags ? 'text-green-600' : 'text-blue-600'}>
                  {hasTags ? `${extractedTagsCount} 个标签` : '建议添加标签'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 可见性设置 */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
            <Eye className="w-4 h-4 text-gray-500" />
            <span>可见范围</span>
          </Label>
          <Select
            value={visibility}
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
                    <div className="text-xs text-gray-500">只有关注您的用户可以查看</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="PRIVATE">
                <div className="flex items-center space-x-3 py-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Lock className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium">私密</div>
                    <div className="text-xs text-gray-500">只有您自己可以查看</div>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <div className="text-xs text-gray-500">
            当前设置：
            <Badge variant="secondary" className="ml-1">
              {visibility === 'PUBLIC' && '公开'}
              {visibility === 'FOLLOWERS_ONLY' && '仅关注者'}
              {visibility === 'PRIVATE' && '私密'}
            </Badge>
          </div>
        </div>

        {/* 互动设置 */}
        <div className="space-y-4">
          <Label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
            <Bell className="w-4 h-4 text-gray-500" />
            <span>互动设置</span>
          </Label>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-900">允许评论</div>
                <div className="text-xs text-gray-500">其他用户可以对您的作品发表评论</div>
              </div>
              <Switch
                checked={allowComments}
                onCheckedChange={(checked) => setValue('allowComments', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-900">允许下载</div>
                <div className="text-xs text-gray-500">允许用户下载您的作品文件</div>
              </div>
              <Switch
                checked={allowDownload}
                onCheckedChange={(checked) => setValue('allowDownload', checked)}
              />
            </div>
          </div>
        </div>

        {/* 发布操作 */}
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <div className="space-y-3">
            <Button
              type="button"
              onClick={onPublish}
              disabled={!canPublish || isPublishing}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-3"
            >
              {isPublishing ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>发布中...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4" />
                  <span>立即发布</span>
                </div>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onSaveDraft}
              disabled={isPublishing || isDraft}
              className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>{isDraft ? '已保存草稿' : '保存草稿'}</span>
              </div>
            </Button>
          </div>

          {!canPublish && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 text-orange-700">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">发布提示</span>
              </div>
              <p className="text-xs text-orange-600 mt-1">
                {!hasBasicInfo && !hasMedia && '需要填写标题并上传媒体文件'}
                {!hasBasicInfo && hasMedia && '需要填写作品标题'}
                {hasBasicInfo && !hasMedia && '需要上传媒体文件'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
