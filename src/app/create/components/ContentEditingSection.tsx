/**
 * @fileoverview 内容编辑区域组件
 * @description 作品信息编辑表单，包含标题、描述、内容等字段
 */

'use client';

import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EnhancedMentionInput } from '@/components/ui/enhanced-mention-input';
import {
  Star,
  MessageSquare,
  Layout,
  Link,
  Palette,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import type { CreatePostForm } from '../utils/form-schemas';

interface ContentEditingSectionProps {
  form: UseFormReturn<CreatePostForm>;
  extractedTags: string[];
  downloadLinksCount: number;
  currentUserId?: string;
  isPublishing: boolean;
  isDraft: boolean;
  onTabChange: (tab: string) => void;
}

export function ContentEditingSection({
  form,
  extractedTags,
  downloadLinksCount,
  currentUserId,
  isPublishing,
  isDraft,
  onTabChange,
}: ContentEditingSectionProps) {
  const { watch, register, setValue, formState } = form;
  const title = watch('title');
  const description = watch('description');
  const content = watch('content');

  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center">
            <Palette className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">作品信息</CardTitle>
            <CardDescription className="text-sm">
              填写作品标题、描述和详细内容
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 标题输入 - 增强设计 */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <span>作品标题 *</span>
          </Label>
          <Input
            id="title"
            placeholder="为您的精彩作品起一个吸引人的标题..."
            className="text-lg font-medium border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white/80"
            {...register('title')}
          />
          <div className="flex items-center justify-between text-xs">
            {formState.errors.title ? (
              <p className="text-red-600 flex items-center space-x-1">
                <AlertCircle className="w-3 h-3" />
                <span>{formState.errors.title.message}</span>
              </p>
            ) : (
              <p className="text-gray-500">一个好标题能吸引更多关注</p>
            )}
            <span className="text-gray-400">{title?.length || 0}/200</span>
          </div>
        </div>

        {/* 简介输入 - 增强设计 */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <span>作品简介</span>
          </Label>
          <Textarea
            id="description"
            placeholder="简单介绍一下这个作品的特色、创作背景或亮点..."
            rows={3}
            className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white/80 resize-none"
            {...register('description')}
          />
          <div className="flex items-center justify-between text-xs">
            <p className="text-gray-500">简介会显示在作品卡片上，帮助用户快速了解作品</p>
            <span className="text-gray-400">{description?.length || 0}/1000</span>
          </div>
        </div>

        {/* 详细内容输入 - 专业级编辑器 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="content" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
              <Layout className="w-4 h-4 text-purple-500" />
              <span>详细内容</span>
            </Label>
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTabChange('downloads');
                }}
                className="text-xs"
                disabled={isPublishing || isDraft}
              >
                <Link className="w-3 h-3 mr-1" />
                资源下载 ({downloadLinksCount})
              </Button>
            </div>
          </div>

          <div className="relative">
            <EnhancedMentionInput
              value={content || ''}
              onChange={(value) => setValue('content', value)}
              placeholder="分享您的创作过程、心得体会、技巧经验... 支持@用户提及和#标签"
              maxLength={5000}
              rows={8}
              currentUserId={currentUserId}
              showStats={true}
              className="border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 bg-white/80"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-4 text-gray-500">
              <div className="flex items-center space-x-1">
                <span>💡</span>
                <span>支持Markdown格式</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>@</span>
                <span>提及用户</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>#</span>
                <span>添加标签</span>
              </div>
            </div>
          </div>
        </div>

        {/* 实时标签预览 - 增强设计 */}
        {extractedTags.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
              <span className="text-lg">#</span>
              <span>自动提取的标签</span>
              <Badge variant="secondary" className="text-xs">
                {extractedTags.length}
              </Badge>
            </Label>
            <div className="flex flex-wrap gap-2">
              {extractedTags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-xs bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200 hover:from-blue-100 hover:to-purple-100 transition-colors"
                >
                  #{tag}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              标签将帮助其他用户发现您的作品
            </p>
          </div>
        )}

        {/* 内容编辑提示 */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-4 h-4 text-white" />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">创作小贴士</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• 详细描述创作过程能获得更多关注和互动</li>
                <li>• 使用 #标签 让作品更容易被发现</li>
                <li>• @提及 其他创作者可以增加互动</li>
                <li>• 分享创作技巧和心得会受到社区欢迎</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
