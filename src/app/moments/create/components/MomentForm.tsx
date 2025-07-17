/**
 * @fileoverview 动态表单组件
 * @description 动态发布的主要表单组件
 */

'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Hash, Send, Image, Lock, CheckCircle, XCircle } from 'lucide-react';

import { EnhancedMentionInput } from '@/components/ui/enhanced-mention-input';
import { FileUploader } from '@/components/upload/FileUploader';
import { MediaPreview } from '@/components/upload/MediaPreview';

import type { MomentFormProps, CreateMomentForm, PublishConditionCheck } from '../types';
import { PublishConditionCheckComponent } from './PublishConditionCheck';
import {
  getVisibilityOptions,
  getContentLengthStatusClass,
  calculateMaxUploadFiles,
  getMediaUploadPermission
} from '../utils';

// 表单验证模式
const createMomentSchema = z.object({
  content: z.string().min(1, '动态内容不能为空').max(2000, '动态内容不能超过2000字符'),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'FOLLOWERS_ONLY']),
});

/**
 * @component MomentForm
 * @description 动态发布表单组件
 */
export function MomentForm({
  permissionInfo,
  dailyLimit,
  onSubmit,
  isPublishing,
  session
}: MomentFormProps) {
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [extractedTags, setExtractedTags] = useState<string[]>([]);
  const [publishCondition, setPublishCondition] = useState<PublishConditionCheck>({
    contentLengthValid: false,
    hasRemainingPublishes: true,
    hasContent: false,
    canPublish: false,
    errors: [],
  });

  // 表单处理
  const form = useForm<CreateMomentForm>({
    resolver: zodResolver(createMomentSchema),
    defaultValues: {
      content: '',
      visibility: 'PUBLIC',
    },
  });

  const { watch, setValue } = form;
  const content = watch('content');
  const visibility = watch('visibility');

  const visibilityOptions = getVisibilityOptions();
  const mediaPermission = getMediaUploadPermission(permissionInfo);
  const maxFiles = calculateMaxUploadFiles(permissionInfo);

  // 处理文件上传完成
  const handleUploadComplete = (files: any[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
  };

  // 处理文件删除
  const handleFileRemove = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  // 处理表单提交
  const handleSubmit = async (data: CreateMomentForm) => {
    await onSubmit(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="w-5 h-5" />
          发布动态
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* 动态内容 */}
          <ContentSection
            content={content}
            permissionInfo={permissionInfo}
            session={session}
            extractedTags={extractedTags}
            onContentChange={(value: string) => setValue('content', value)}
            onTagsChange={setExtractedTags}
            formError={form.formState.errors.content}
          />

          {/* 媒体上传 */}
          <MediaUploadSection
            permissionInfo={permissionInfo}
            uploadedFiles={uploadedFiles}
            maxFiles={maxFiles}
            mediaPermission={mediaPermission}
            onUploadComplete={handleUploadComplete}
            onFileRemove={handleFileRemove}
            onFileReorder={setUploadedFiles}
          />

          {/* 可见性设置 */}
          <VisibilitySection
            visibility={visibility}
            visibilityOptions={visibilityOptions}
            onVisibilityChange={(value: string) => setValue('visibility', value as any)}
          />

          {/* 发布条件检查 */}
          <PublishConditionCheckComponent
            permissionInfo={permissionInfo}
            dailyLimit={dailyLimit}
            content={content}
            onCheckResult={setPublishCondition}
          />

          {/* 发布按钮 */}
          <PublishButton
            isPublishing={isPublishing}
            canPublish={publishCondition.canPublish}
            hasContent={!!content.trim()}
          />
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * @component ContentSection
 * @description 内容输入部分
 */
function ContentSection({
  content,
  permissionInfo,
  session,
  extractedTags,
  onContentChange,
  onTagsChange,
  formError
}: any) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">
          动态内容
        </label>
        <span className="text-xs text-gray-500">
          {permissionInfo.momentMinLength}-{permissionInfo.momentMaxLength} 字符
        </span>
      </div>

      <EnhancedMentionInput
        value={content || ''}
        onChange={onContentChange}
        placeholder="分享你的想法... 支持@用户提及和#标签"
        maxLength={permissionInfo.momentMaxLength}
        rows={5}
        currentUserId={session?.user?.id}
        showStats={false}
      />

      <div className="flex justify-between items-center mt-2">
        <div className="text-xs text-gray-500">
          支持 #标签 和 @用户 提及
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-xs ${getContentLengthStatusClass(
            content.length,
            permissionInfo.momentMinLength,
            permissionInfo.momentMaxLength
          )}`}>
            {content.length}/{permissionInfo.momentMaxLength}
            {content.length < permissionInfo.momentMinLength && (
              <span className="ml-1">(至少{permissionInfo.momentMinLength}字符)</span>
            )}
          </div>
          {formError && (
            <p className="text-xs text-red-600">
              {formError.message}
            </p>
          )}
        </div>
      </div>

      {/* 提取的标签 */}
      {extractedTags.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">标签</h4>
          <div className="flex flex-wrap gap-2">
            {extractedTags.map((tag: string, index: number) => (
              <Badge key={index} variant="secondary">
                #{tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * @component MediaUploadSection
 * @description 媒体上传部分
 */
function MediaUploadSection({
  permissionInfo,
  uploadedFiles,
  maxFiles,
  mediaPermission,
  onUploadComplete,
  onFileRemove,
  onFileReorder
}: any) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Image className="w-4 h-4" />
          添加媒体
        </h4>
      </div>

      {/* 媒体上传权限状态 */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">图片上传:</span>
            {mediaPermission.canUploadImages ? (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-3 h-3" />
                <span className="text-xs">
                  {mediaPermission.imageLimit === -1 ? '无限制' : `最多${mediaPermission.imageLimit}张`}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-600">
                <XCircle className="w-3 h-3" />
                <span className="text-xs">不允许</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-600">视频上传:</span>
            {mediaPermission.canUploadVideos ? (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-3 h-3" />
                <span className="text-xs">
                  {mediaPermission.videoLimit === -1 ? '无限制' : `最多${mediaPermission.videoLimit}个`}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-600">
                <XCircle className="w-3 h-3" />
                <span className="text-xs">不允许</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 上传区域或权限限制提示 */}
      {!mediaPermission.hasAnyUploadPermission ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
          <Lock className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <h5 className="text-sm font-medium text-red-800 mb-1">媒体上传受限</h5>
          <p className="text-xs text-red-600">
            您当前的用户等级不支持上传图片或视频文件
          </p>
          <p className="text-xs text-red-500 mt-1">
            如需上传媒体文件，请联系管理员升级用户等级
          </p>
        </div>
      ) : (
        <FileUploader
          onUploadComplete={onUploadComplete}
          maxFiles={maxFiles}
          maxFileSize={1000 * 1024 * 1024} // 1000MB for moments
          className="mb-4"
        />
      )}

      {uploadedFiles.length > 0 && (
        <MediaPreview
          files={uploadedFiles.map((file: any) => ({
            id: file.id,
            filename: file.filename,
            originalName: file.originalName,
            url: file.url,
            thumbnailUrl: file.thumbnailUrl,
            mediaType: file.mediaType,
            type: file.mediaType.toLowerCase() as 'image' | 'video' | 'gif',
            name: file.filename,
            size: file.fileSize,
            fileSize: file.fileSize,
            width: file.width,
            height: file.height,
            duration: file.duration,
            order: 0,
          }))}
          onDelete={onFileRemove}
          onReorder={(files: any[]) => {
            const reorderedFiles = files.map((file: any) =>
              uploadedFiles.find((uf: any) => uf.id === file.id)!
            );
            onFileReorder(reorderedFiles);
          }}
        />
      )}
    </div>
  );
}

/**
 * @component VisibilitySection
 * @description 可见性设置部分
 */
function VisibilitySection({ visibility, visibilityOptions, onVisibilityChange }: any) {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-2">可见性</h4>
      <Select
        value={visibility}
        onValueChange={onVisibilityChange}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {visibilityOptions.map((option: any, index: number) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <option.icon className="w-4 h-4" />
                {option.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * @component PublishButton
 * @description 发布按钮
 */
function PublishButton({ isPublishing, canPublish, hasContent }: any) {
  return (
    <div className="flex justify-end">
      <Button
        type="submit"
        disabled={isPublishing || !canPublish || !hasContent}
        className="min-w-[120px]"
        size="lg"
      >
        {isPublishing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            发布中...
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            发布动态
          </>
        )}
      </Button>
    </div>
  );
}
