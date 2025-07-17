/**
 * @fileoverview 存储配置面板组件
 * @description 处理存储相关设置UI
 */

'use client';

import React from 'react';
import { HardDrive, Hash, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUploadSettingsForm, type UploadSettingsForm } from './upload-settings-form';
import { UseFormReturn } from 'react-hook-form';

interface StorageSettingsPanelProps {
  form: UseFormReturn<UploadSettingsForm>;
  cleanupHashes?: {
    mutate: () => void;
    isPending: boolean;
  };
}

export function StorageSettingsPanel({ form, cleanupHashes }: StorageSettingsPanelProps) {
  const { getStorageProviderName, validateCdnUrl } = useUploadSettingsForm();

  const storageProviders = [
    { value: 'local', label: '本地存储', description: '文件存储在服务器本地磁盘' },
    { value: 'cloudflare-r2', label: 'Cloudflare R2', description: '推荐：高性能、低成本的对象存储' },
    { value: 's3', label: 'Amazon S3', description: '业界标准的云存储服务' },
  ];

  const handleCdnUrlChange = (url: string) => {
    form.setValue('cdnUrl', url, { shouldDirty: true });
    
    // 实时验证CDN URL
    if (url && !validateCdnUrl(url)) {
      form.setError('cdnUrl', {
        type: 'manual',
        message: 'CDN URL必须是有效的HTTPS地址',
      });
    } else {
      form.clearErrors('cdnUrl');
    }
  };

  return (
    <div className="space-y-6">
      {/* 存储服务配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            存储服务
          </CardTitle>
          <CardDescription>
            配置文件存储服务和 CDN 加速
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="storageProvider">存储提供商</Label>
            <select
              id="storageProvider"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...form.register('storageProvider')}
            >
              {storageProviders.map((provider) => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </select>
            <div className="mt-2">
              {storageProviders.map((provider) => (
                form.watch('storageProvider') === provider.value && (
                  <p key={provider.value} className="text-sm text-gray-500">
                    {provider.description}
                  </p>
                )
              ))}
            </div>
            {form.formState.errors.storageProvider && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.storageProvider.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="cdnUrl">CDN 加速域名</Label>
            <Input
              id="cdnUrl"
              type="url"
              placeholder="https://cdn.example.com"
              {...form.register('cdnUrl')}
              onChange={(e) => handleCdnUrlChange(e.target.value)}
            />
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                可选：配置 CDN 域名以加速文件访问，提升用户体验
              </p>
              {form.watch('cdnUrl') && (
                <div className="mt-1">
                  {validateCdnUrl(form.watch('cdnUrl') || '') ? (
                    <p className="text-sm text-green-600">✓ CDN URL 格式正确</p>
                  ) : (
                    <p className="text-sm text-red-600">✗ CDN URL 必须是有效的HTTPS地址</p>
                  )}
                </div>
              )}
            </div>
            {form.formState.errors.cdnUrl && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.cdnUrl.message}
              </p>
            )}
          </div>

          {/* 存储提供商特定配置提示 */}
          {form.watch('storageProvider') === 'cloudflare-r2' && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Cloudflare R2 配置提示</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 需要配置 R2 存储桶和 API 密钥</li>
                <li>• 支持自定义域名和 CDN 加速</li>
                <li>• 推荐用于专业cosplay平台的高性能需求</li>
                <li>• 成本效益高，适合大量图片和视频存储</li>
              </ul>
            </div>
          )}

          {form.watch('storageProvider') === 's3' && (
            <div className="p-4 bg-orange-50 rounded-lg">
              <h4 className="font-medium text-orange-900 mb-2">Amazon S3 配置提示</h4>
              <ul className="text-sm text-orange-800 space-y-1">
                <li>• 需要配置 AWS 访问密钥和存储桶</li>
                <li>• 支持多区域部署和 CloudFront CDN</li>
                <li>• 企业级可靠性和安全性</li>
                <li>• 适合大规模专业cosplay平台</li>
              </ul>
            </div>
          )}

          {form.watch('storageProvider') === 'local' && (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">本地存储配置提示</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• 文件存储在服务器本地磁盘</li>
                <li>• 适合小规模部署和测试环境</li>
                <li>• 需要定期备份以防数据丢失</li>
                <li>• 建议配置 CDN 以提升访问速度</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 文件去重设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5" />
            文件去重设置
          </CardTitle>
          <CardDescription>
            通过文件哈希值避免重复存储，节省存储空间
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableDeduplication">启用文件去重</Label>
              <p className="text-sm text-gray-500">
                计算文件 SHA-256 哈希值，避免重复文件上传
              </p>
            </div>
            <Switch
              id="enableDeduplication"
              checked={form.watch('enableDeduplication')}
              onCheckedChange={(checked) => form.setValue('enableDeduplication', checked, { shouldDirty: true })}
            />
          </div>

          {form.watch('enableDeduplication') && (
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">文件去重优势</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• 自动检测重复文件，节省存储空间</li>
                <li>• 提升上传速度，重复文件秒传</li>
                <li>• 降低存储成本，特别适合cosplay作品集</li>
                <li>• 保持文件完整性，使用SHA-256算法</li>
              </ul>
            </div>
          )}

          {cleanupHashes && (
            <div className="pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => cleanupHashes.mutate()}
                disabled={cleanupHashes.isPending}
                className="w-full"
              >
                {cleanupHashes.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Hash className="w-4 h-4 mr-2" />
                )}
                清理未使用的哈希记录
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                清理不再使用的文件哈希记录，释放数据库空间
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 性能优化建议 */}
      <Card>
        <CardHeader>
          <CardTitle>性能优化建议</CardTitle>
          <CardDescription>
            基于当前配置的性能优化建议
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {!form.watch('cdnUrl') && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-blue-900">建议配置CDN</p>
                  <p className="text-sm text-blue-700">
                    配置CDN可以显著提升图片和视频的加载速度，改善用户体验
                  </p>
                </div>
              </div>
            )}

            {!form.watch('enableDeduplication') && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-yellow-900">建议启用文件去重</p>
                  <p className="text-sm text-yellow-700">
                    文件去重可以节省存储空间，特别适合cosplay作品集的重复文件管理
                  </p>
                </div>
              </div>
            )}

            {form.watch('storageProvider') === 'local' && (
              <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-orange-900">考虑云存储</p>
                  <p className="text-sm text-orange-700">
                    对于专业cosplay平台，建议使用Cloudflare R2或Amazon S3以获得更好的性能和可靠性
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
