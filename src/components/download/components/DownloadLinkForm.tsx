/**
 * @fileoverview 下载链接表单组件
 * @description 专门处理单个下载链接的编辑表单
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import React from 'react';
import { Trash2, HelpCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DOWNLOAD_PLATFORMS, getPlatformById, getPlatformSubTypeById } from '@/lib/download-platforms';
import type { DownloadLink } from '../services/download-link-service';

/**
 * 下载链接表单属性接口
 */
export interface DownloadLinkFormProps {
  link: DownloadLink;
  index: number;
  error?: string;
  showRemoveButton?: boolean;
  className?: string;
  onUpdate: (field: keyof DownloadLink, value: any) => void;
  onRemove?: () => void;
}

/**
 * 下载链接表单组件
 */
export function DownloadLinkForm({
  link,
  index,
  error,
  showRemoveButton = true,
  className,
  onUpdate,
  onRemove,
}: DownloadLinkFormProps) {
  const platform = getPlatformById(link.platform);

  /**
   * 获取平台颜色
   */
  const getPlatformColor = (platformId: string) => {
    const colorMap: Record<string, string> = {
      baidu: 'bg-blue-500',
      aliyun: 'bg-orange-500',
      lanzou: 'bg-green-500',
      quark: 'bg-purple-500',
      '123pan': 'bg-red-500',
    };
    return colorMap[platformId] || 'bg-gray-500';
  };

  return (
    <div className={cn(
      'space-y-4 p-4 border rounded-lg',
      error ? 'border-red-300 bg-red-50' : 'border-gray-200',
      className
    )}>
      {/* 表单头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            链接 {index + 1}
          </Badge>
          {platform && (
            <Badge className={cn('text-white text-xs', getPlatformColor(link.platform))}>
              {platform.name}
            </Badge>
          )}
        </div>

        {showRemoveButton && onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* 表单字段 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 平台选择 */}
        <div className="space-y-2">
          <Label htmlFor={`platform-${index}`} className="text-sm font-medium">
            下载平台 <span className="text-red-500">*</span>
          </Label>
          <Select
            value={link.platform}
            onValueChange={(value) => onUpdate('platform', value)}
          >
            <SelectTrigger id={`platform-${index}`}>
              <SelectValue placeholder="选择平台" />
            </SelectTrigger>
            <SelectContent>
              {DOWNLOAD_PLATFORMS.map((platform) => (
                <SelectItem key={platform.id} value={platform.id}>
                  <div className="flex items-center space-x-2">
                    <div className={cn('w-3 h-3 rounded', getPlatformColor(platform.id))} />
                    <span>{platform.name}</span>
                    {platform.needsExtractCode && (
                      <Badge variant="outline" className="text-xs">需要提取码</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 子类型选择 - 仅在平台支持子类型时显示 */}
        {(() => {
          const selectedPlatform = getPlatformById(link.platform);
          return selectedPlatform?.subTypes && selectedPlatform.subTypes.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor={`subtype-${index}`} className="text-sm font-medium">
                类型 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={link.platformSubType || ''}
                onValueChange={(value) => onUpdate('platformSubType', value)}
              >
                <SelectTrigger id={`subtype-${index}`}>
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent>
                  {selectedPlatform.subTypes.map((subType) => (
                    <SelectItem key={subType.id} value={subType.id}>
                      <div className="flex items-center space-x-2">
                        <div className={cn('w-3 h-3 rounded', subType.color || 'bg-gray-300')} />
                        <span>{subType.name}</span>
                        {subType.badge && (
                          <Badge variant="outline" className="text-xs">{subType.badge}</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null;
        })()}

        {/* 价格设置 */}
        <div className="space-y-2">
          <Label htmlFor={`price-${index}`} className="text-sm font-medium">
            价格 (罐头)
          </Label>
          <Input
            id={`price-${index}`}
            type="number"
            min="0"
            step="1"
            value={link.cansPrice}
            onChange={(e) => onUpdate('cansPrice', parseInt(e.target.value) || 0)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
            placeholder="0"
          />
        </div>
      </div>

      {/* 标题 */}
      <div className="space-y-2">
        <Label htmlFor={`title-${index}`} className="text-sm font-medium">
          链接标题 <span className="text-red-500">*</span>
        </Label>
        <Input
          id={`title-${index}`}
          value={link.title || ''}
          onChange={(e) => onUpdate('title', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
            }
          }}
          placeholder="例如：百度网盘下载"
        />
      </div>

      {/* URL */}
      <div className="space-y-2">
        <Label htmlFor={`url-${index}`} className="text-sm font-medium">
          下载链接 <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Input
            id={`url-${index}`}
            type="url"
            value={link.url?.includes('***已保存的下载链接***') ? '' : (link.url || '')}
            onChange={(e) => onUpdate('url', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
            placeholder={link.url?.includes('***已保存的下载链接***') ? '输入新链接以更新，或保持空白以保留现有链接' : 'https://...'}
            className={link.url?.includes('***已保存的下载链接***') ? 'bg-blue-50 border-blue-200' : ''}
          />
          {link.url?.includes('***已保存的下载链接***') && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                已保存
              </div>
            </div>
          )}
        </div>
        {link.url?.includes('***已保存的下载链接***') && (
          <p className="text-xs text-blue-600">
            💡 此链接已安全保存。如需更新，请输入新的下载链接；如需保持不变，请留空。
          </p>
        )}
      </div>

      {/* 提取码 */}
      {platform?.needsExtractCode && (
        <div className="space-y-2">
          <Label htmlFor={`extract-code-${index}`} className="text-sm font-medium">
            提取码 <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              id={`extract-code-${index}`}
              value={link.extractCode?.includes('***已保存的提取码***') ? '' : (link.extractCode || '')}
              onChange={(e) => onUpdate('extractCode', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
              placeholder={link.extractCode?.includes('***已保存的提取码***') ? '输入新提取码以更新，或保持空白以保留现有提取码' : '请输入提取码'}
              className={link.extractCode?.includes('***已保存的提取码***') ? 'bg-blue-50 border-blue-200' : ''}
            />
            {link.extractCode?.includes('***已保存的提取码***') && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  已保存
                </div>
              </div>
            )}
          </div>
          {link.extractCode?.includes('***已保存的提取码***') && (
            <p className="text-xs text-blue-600">
              💡 提取码已安全保存。如需更新，请输入新的提取码；如需保持不变，请留空。
            </p>
          )}
        </div>
      )}

      {/* 描述 */}
      <div className="space-y-2">
        <Label htmlFor={`description-${index}`} className="text-sm font-medium">
          描述 (可选)
        </Label>
        <Textarea
          id={`description-${index}`}
          value={link.description || ''}
          onChange={(e) => onUpdate('description', e.target.value)}
          placeholder="添加链接描述或说明..."
          rows={2}
        />
      </div>

      {/* Telegram私密群组特殊提示 */}
      {link.platform === 'telegram' && link.platformSubType === 'telegram-private' && (
        <div className="flex items-start space-x-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
          <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-orange-700">
            <p className="font-medium mb-1">私密群组资源</p>
            <p className="text-xs">此资源需要在专属社群中兑换，请联系管理员获取访问权限。用户兑换后将收到详细的获取指引。</p>
          </div>
        </div>
      )}

      {/* 平台提示 */}
      {platform && (
        <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-md">
          <HelpCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">{platform.name} 平台说明：</p>
            <ul className="mt-1 space-y-1 text-xs">
              {platform.needsExtractCode && (
                <li>• 需要提供提取码</li>
              )}
              <li>• 请确保链接有效且可访问</li>
              <li>• 建议设置合理的价格</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 紧凑版下载链接表单
 */
export function CompactDownloadLinkForm(props: Omit<DownloadLinkFormProps, 'className'>) {
  return (
    <div className="space-y-3 p-3 border rounded-md">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">
          链接 {props.index + 1}
        </Badge>
        {props.showRemoveButton && props.onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={props.onRemove}
            className="h-6 w-6 p-0 text-red-500"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      {props.error && (
        <div className="text-red-600 text-xs">{props.error}</div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Select
          value={props.link.platform}
          onValueChange={(value) => props.onUpdate('platform', value)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="平台" />
          </SelectTrigger>
          <SelectContent>
            {DOWNLOAD_PLATFORMS.map((platform) => (
              <SelectItem key={platform.id} value={platform.id} className="text-xs">
                {platform.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          min="0"
          value={props.link.cansPrice}
          onChange={(e) => props.onUpdate('cansPrice', parseInt(e.target.value) || 0)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
            }
          }}
          placeholder="价格"
          className="h-8 text-xs"
        />
      </div>

      {/* 子类型选择 - 简化版 */}
      {(() => {
        const selectedPlatform = getPlatformById(props.link.platform);
        return selectedPlatform?.subTypes && selectedPlatform.subTypes.length > 0 ? (
          <Select
            value={props.link.platformSubType || ''}
            onValueChange={(value) => props.onUpdate('platformSubType', value)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="选择类型" />
            </SelectTrigger>
            <SelectContent>
              {selectedPlatform.subTypes.map((subType) => (
                <SelectItem key={subType.id} value={subType.id} className="text-xs">
                  {subType.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null;
      })()}

      <Input
        value={props.link.title || ''}
        onChange={(e) => props.onUpdate('title', e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
          }
        }}
        placeholder="链接标题"
        className="h-8 text-xs"
      />

      <Input
        type="url"
        value={props.link.url?.includes('***已保存的下载链接***') ? '' : (props.link.url || '')}
        onChange={(e) => props.onUpdate('url', e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
          }
        }}
        placeholder={props.link.url?.includes('***已保存的下载链接***') ? '输入新链接或留空保持现有' : '下载链接'}
        className={`h-8 text-xs ${props.link.url?.includes('***已保存的下载链接***') ? 'bg-blue-50 border-blue-200' : ''}`}
      />
    </div>
  );
}

/**
 * 下载链接表单骨架组件
 */
export function DownloadLinkFormSkeleton() {
  return (
    <div className="space-y-4 p-4 border rounded-lg animate-pulse">
      <div className="flex justify-between">
        <div className="h-5 bg-gray-200 rounded w-20" />
        <div className="h-8 bg-gray-200 rounded w-8" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-10 bg-gray-200 rounded" />
        <div className="h-10 bg-gray-200 rounded" />
      </div>
      <div className="h-10 bg-gray-200 rounded" />
      <div className="h-10 bg-gray-200 rounded" />
      <div className="h-16 bg-gray-200 rounded" />
    </div>
  );
}
