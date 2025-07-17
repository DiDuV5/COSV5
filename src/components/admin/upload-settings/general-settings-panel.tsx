/**
 * @fileoverview 基础设置面板组件
 * @description 处理上传的基础设置UI
 */

'use client';

import React, { useState } from 'react';
import { Upload, Image, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUploadSettingsForm, type UploadSettingsForm } from './upload-settings-form';
import { UseFormReturn } from 'react-hook-form';

interface GeneralSettingsPanelProps {
  form: UseFormReturn<UploadSettingsForm>;
}

export function GeneralSettingsPanel({ form }: GeneralSettingsPanelProps) {
  const [customFileType, setCustomFileType] = useState('');
  const {
    setFileSizePreset,
    setFilesPerPostPreset,
    setImageQualityPreset,
    setFileTypePreset,
    removeFileType,
    addCustomFileType,
    formatFileSize,
    fileTypePresets,
    fileSizePresets,
    filesPerPostPresets,
    imageQualityPresets,
  } = useUploadSettingsForm();

  const handleAddCustomFileType = () => {
    if (customFileType.trim()) {
      addCustomFileType(customFileType.trim());
      form.setValue('allowedTypes', [...form.getValues('allowedTypes'), customFileType.trim()], { shouldDirty: true });
      setCustomFileType('');
    }
  };

  const handleRemoveFileType = (typeToRemove: string) => {
    const currentTypes = form.getValues('allowedTypes');
    const filteredTypes = currentTypes.filter(type => type !== typeToRemove);
    form.setValue('allowedTypes', filteredTypes, { shouldDirty: true });
  };

  const handleAddFileTypePreset = (preset: keyof typeof fileTypePresets) => {
    const currentTypes = form.getValues('allowedTypes');
    const presetTypes = fileTypePresets[preset];
    const mergedTypes = Array.from(new Set([...currentTypes, ...presetTypes]));
    form.setValue('allowedTypes', mergedTypes, { shouldDirty: true });
  };

  return (
    <div className="space-y-6">
      {/* 上传限制 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            上传限制
          </CardTitle>
          <CardDescription>
            配置文件上传的基本限制和规则
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maxFileSize">最大文件大小 (MB)</Label>
              <Input
                id="maxFileSize"
                type="number"
                min="1"
                max="50000"
                {...form.register('maxFileSize', { valueAsNumber: true })}
              />
              <div className="mt-2 space-y-2">
                <p className="text-sm text-gray-500">
                  专业cosplay平台建议：图片1-5GB，4K视频5-20GB，根据服务器配置调整
                </p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(fileSizePresets).map(([key, value]) => (
                    <Button
                      key={key}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFileSizePreset(key as keyof typeof fileSizePresets);
                        form.setValue('maxFileSize', value, { shouldDirty: true });
                      }}
                    >
                      {key === 'standard' && '标准'}
                      {key === 'professional' && '专业'}
                      {key === 'premium' && '高端'}
                      {key === 'extreme' && '极限'}
                      ({formatFileSize(value)})
                    </Button>
                  ))}
                </div>
              </div>
              {form.formState.errors.maxFileSize && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.maxFileSize.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="maxFilesPerPost">每个帖子最多文件数</Label>
              <Input
                id="maxFilesPerPost"
                type="number"
                min="1"
                max="10000"
                {...form.register('maxFilesPerPost', { valueAsNumber: true })}
              />
              <div className="mt-2 space-y-2">
                <p className="text-sm text-gray-500">
                  专业cosplay作品集建议：标准50-100个，大型作品集500-1000个
                </p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(filesPerPostPresets).map(([key, value]) => (
                    <Button
                      key={key}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFilesPerPostPreset(key as keyof typeof filesPerPostPresets);
                        form.setValue('maxFilesPerPost', value, { shouldDirty: true });
                      }}
                    >
                      {key === 'basic' && '基础'}
                      {key === 'standard' && '标准'}
                      {key === 'professional' && '专业'}
                      {key === 'portfolio' && '作品集'}
                      {key === 'exhibition' && '展览'}
                      ({value})
                    </Button>
                  ))}
                </div>
              </div>
              {form.formState.errors.maxFilesPerPost && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.maxFilesPerPost.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 允许的文件类型 */}
      <Card>
        <CardHeader>
          <CardTitle>允许的文件类型</CardTitle>
          <CardDescription>
            配置允许上传的文件格式，支持专业cosplay创作需求
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 快速添加预设 */}
          <div>
            <Label>快速添加类型</Label>
            <div className="flex gap-2 flex-wrap mt-2">
              {Object.entries(fileTypePresets).map(([key, types]) => (
                <Button
                  key={key}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddFileTypePreset(key as keyof typeof fileTypePresets)}
                >
                  {key === 'images' && '图片'}
                  {key === 'videos' && '视频'}
                  {key === 'documents' && '文档'}
                  {key === 'archives' && '压缩包'}
                  (+{types.length})
                </Button>
              ))}
            </div>
          </div>

          {/* 自定义添加 */}
          <div>
            <Label htmlFor="customFileType">添加自定义类型</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="customFileType"
                placeholder="例如: application/x-custom"
                value={customFileType}
                onChange={(e) => setCustomFileType(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomFileType();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleAddCustomFileType}
                disabled={!customFileType.trim()}
              >
                添加
              </Button>
            </div>
          </div>

          {/* 当前允许的类型 */}
          <div>
            <Label>当前允许的类型 ({form.watch('allowedTypes').length})</Label>
            <div className="flex flex-wrap gap-2 mt-2 max-h-40 overflow-y-auto">
              {form.watch('allowedTypes').map((type) => (
                <Badge key={type} variant="secondary" className="flex items-center gap-1">
                  {type}
                  <button
                    type="button"
                    onClick={() => handleRemoveFileType(type)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {form.formState.errors.allowedTypes && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.allowedTypes.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 图片处理 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            图片处理
          </CardTitle>
          <CardDescription>
            配置图片压缩和缩略图生成
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="imageQuality">图片质量 (%)</Label>
              <Input
                id="imageQuality"
                type="number"
                min="1"
                max="100"
                {...form.register('imageQuality', { valueAsNumber: true })}
              />
              <div className="mt-2 space-y-2">
                <p className="text-sm text-gray-500">
                  专业cosplay摄影建议：预览75%，作品展示85-95%
                </p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(imageQualityPresets).map(([key, value]) => (
                    <Button
                      key={key}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setImageQualityPreset(key as keyof typeof imageQualityPresets);
                        form.setValue('imageQuality', value, { shouldDirty: true });
                      }}
                    >
                      {key === 'low' && '低'}
                      {key === 'medium' && '中'}
                      {key === 'high' && '高'}
                      {key === 'maximum' && '最高'}
                      ({value}%)
                    </Button>
                  ))}
                </div>
              </div>
              {form.formState.errors.imageQuality && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.imageQuality.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enableThumbnails">自动生成缩略图</Label>
                <p className="text-sm text-gray-500">
                  自动生成多种尺寸的缩略图以优化加载速度
                </p>
              </div>
              <Switch
                id="enableThumbnails"
                checked={form.watch('enableThumbnails')}
                onCheckedChange={(checked) => form.setValue('enableThumbnails', checked, { shouldDirty: true })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
