/**
 * @fileoverview 帖子设置组件
 * @description 处理帖子的可见性、类型等设置，从原 posts/[id]/edit/page.tsx 重构而来
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 */

'use client';

import { Globe, Lock, Users, Crown, FileText, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

export interface PostSettings {
  contentType: string;
  visibility: string;
  isPublic: boolean;
  isPremium: boolean;
}

export interface PostSettingsSectionProps {
  settings: PostSettings;
  onSettingsChange: (settings: Partial<PostSettings>) => void;
  canSetPremium?: boolean;
}

/**
 * 帖子设置组件
 * 负责处理帖子的各种设置选项
 */
export function PostSettingsSection({
  settings,
  onSettingsChange,
  canSetPremium = false,
}: PostSettingsSectionProps) {
  /**
   * 更新设置
   */
  const updateSetting = <K extends keyof PostSettings>(
    key: K,
    value: PostSettings[K]
  ) => {
    onSettingsChange({ [key]: value });
  };

  /**
   * 获取可见性图标
   */
  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'PUBLIC':
        return <Globe className="w-4 h-4" />;
      case 'FOLLOWERS_ONLY':
        return <Users className="w-4 h-4" />;
      case 'PRIVATE':
        return <Lock className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  /**
   * 获取可见性描述
   */
  const getVisibilityDescription = (visibility: string) => {
    switch (visibility) {
      case 'PUBLIC':
        return '所有人都可以查看此内容';
      case 'FOLLOWERS_ONLY':
        return '只有关注者可以查看此内容';
      case 'PRIVATE':
        return '只有您自己可以查看此内容';
      default:
        return '所有人都可以查看此内容';
    }
  };

  /**
   * 获取内容类型图标
   */
  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'POST':
        return <FileText className="w-4 h-4" />;
      case 'MOMENT':
        return <ImageIcon className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>发布设置</CardTitle>
        <CardDescription>
          配置内容的类型、可见性和其他发布选项
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 内容类型 */}
        <div className="space-y-2">
          <Label>内容类型</Label>
          <Select
            value={settings.contentType}
            onValueChange={(value) => updateSetting('contentType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择内容类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="POST">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <div>
                    <div className="font-medium">作品</div>
                    <div className="text-xs text-muted-foreground">
                      完整的作品展示，包含详细描述
                    </div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="MOMENT">
                <div className="flex items-center space-x-2">
                  <ImageIcon className="w-4 h-4" />
                  <div>
                    <div className="font-medium">动态</div>
                    <div className="text-xs text-muted-foreground">
                      简短的动态分享，快速记录
                    </div>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {settings.contentType === 'POST' 
              ? '作品类型适合展示完整的cosplay作品，包含详细的制作过程和说明'
              : '动态类型适合分享日常的cosplay片段、制作进度或简短想法'
            }
          </p>
        </div>

        <Separator />

        {/* 可见性设置 */}
        <div className="space-y-2">
          <Label>可见性</Label>
          <Select
            value={settings.visibility}
            onValueChange={(value) => updateSetting('visibility', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择可见性" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PUBLIC">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4" />
                  <div>
                    <div className="font-medium">公开</div>
                    <div className="text-xs text-muted-foreground">
                      所有人都可以查看
                    </div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="FOLLOWERS_ONLY">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <div>
                    <div className="font-medium">仅关注者</div>
                    <div className="text-xs text-muted-foreground">
                      只有关注者可以查看
                    </div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="PRIVATE">
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4" />
                  <div>
                    <div className="font-medium">私密</div>
                    <div className="text-xs text-muted-foreground">
                      只有您自己可以查看
                    </div>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            {getVisibilityIcon(settings.visibility)}
            <span>{getVisibilityDescription(settings.visibility)}</span>
          </div>
        </div>

        <Separator />

        {/* 公开设置 */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>公开发布</Label>
            <p className="text-xs text-muted-foreground">
              是否在公开时间线中显示此内容
            </p>
          </div>
          <Switch
            checked={settings.isPublic}
            onCheckedChange={(checked) => updateSetting('isPublic', checked)}
          />
        </div>

        {/* 高级会员内容 */}
        {canSetPremium && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <Label>高级会员内容</Label>
                  <Crown className="w-4 h-4 text-yellow-500" />
                </div>
                <p className="text-xs text-muted-foreground">
                  只有高级会员才能查看此内容
                </p>
              </div>
              <Switch
                checked={settings.isPremium}
                onCheckedChange={(checked) => updateSetting('isPremium', checked)}
              />
            </div>
          </>
        )}

        {/* 设置说明 */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p>• 公开内容会出现在发现页面和搜索结果中</p>
          <p>• 仅关注者内容只对您的关注者可见</p>
          <p>• 私密内容只有您自己可以查看</p>
          {canSetPremium && (
            <p>• 高级会员内容可以获得更多曝光和收益</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 帖子设置组件的默认导出
 */
export default PostSettingsSection;
