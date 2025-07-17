/**
 * @component ProfileSettingsClient
 * @description 用户资料设置客户端组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @example
 * <ProfileSettingsClient />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - tRPC
 * - shadcn/ui components
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UnifiedAvatar } from "@/components/ui/unified-avatar";
import { AvatarUpload } from "@/components/settings/avatar-upload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/trpc/react";
import { Upload, Save, User, Link as LinkIcon } from "lucide-react";
import { SocialLinksManager } from "@/components/profile/social-links-manager";
import { SOCIAL_PLATFORMS } from "@/types/profile";

// 社交账号预览组件
function SocialLinksPreview({ userId }: { userId: string }) {
  const router = useRouter();
  const { data: socialLinks, isPending } = api.user.getSocialLinks.useQuery({ userId });

  if (isPending) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          当前社交账号 ({socialLinks?.length || 0})
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push('/settings/social')}
        >
          <LinkIcon className="h-4 w-4 mr-2" />
          管理社交账号
        </Button>
      </div>

      {socialLinks && socialLinks.length > 0 ? (
        <div className="space-y-2">
          {socialLinks.slice(0, 3).map((link) => {
            const platformConfig = SOCIAL_PLATFORMS[link.platform as keyof typeof SOCIAL_PLATFORMS];
            return (
              <div
                key={link.id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: platformConfig?.color || '#6b7280' }}
                >
                  {platformConfig?.name.charAt(0) || 'L'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">
                    {link.customTitle || platformConfig?.name || "自定义链接"}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    @{link.username}
                  </div>
                </div>
                {!link.isPublic && (
                  <div className="text-xs text-gray-400">私密</div>
                )}
              </div>
            );
          })}
          {socialLinks.length > 3 && (
            <div className="text-center text-sm text-gray-500">
              还有 {socialLinks.length - 3} 个社交账号...
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500">
          <LinkIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">还没有添加社交账号</p>
          <p className="text-xs text-gray-400 mt-1">
            点击上方按钮开始添加
          </p>
        </div>
      )}
    </div>
  );
}

export function ProfileSettingsClient() {
  const router = useRouter();
  const [isPending, setIsLoading] = useState(false);

  // 获取当前用户信息
  const utils = api.useUtils();
  const { data: currentUser, isPending: userLoading } = api.auth.getCurrentUser.useQuery();

  // 表单状态
  const [formData, setFormData] = useState({
    displayName: currentUser?.displayName || "",
    bio: currentUser?.bio || "",
    location: currentUser?.location || "",
    website: currentUser?.website || "",
    profileVisibility: currentUser?.profileVisibility || "PUBLIC",
    showVisitorHistory: currentUser?.showVisitorHistory || false,
    showSocialLinks: currentUser?.showSocialLinks || true,
    allowDirectMessages: currentUser?.allowDirectMessages || "FOLLOWING",
  });

  // 暂时禁用用户资料更新API调用，使用模拟实现
  const updateProfileMutation = {
    mutate: (data: any) => {
      console.log('用户资料更新功能暂时禁用:', data);
      setTimeout(() => {
        setIsLoading(false);
        // 跳转到用户自己的资料页面
        router.push(`/users/${currentUser?.username}`);
      }, 1000);
    },
    isPending: false
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    updateProfileMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">无法加载用户信息</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            基本信息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 头像 */}
          <AvatarUpload
            currentUser={{
              id: currentUser?.id,
              username: currentUser?.username || 'user',
              displayName: currentUser?.displayName,
              avatarUrl: currentUser?.avatarUrl,
              isVerified: currentUser?.isVerified || false,
              userLevel: currentUser?.userLevel || 'USER',
            }}
            onUploadSuccess={async (avatarUrl) => {
              // 刷新用户数据
              await utils.auth.getCurrentUser.invalidate();
              // 强制重新获取数据
              await utils.auth.getCurrentUser.refetch();

              // 刷新NextAuth session
              if (typeof window !== 'undefined') {
                const { getSession } = await import('next-auth/react');
                // 强制刷新session以获取最新的用户数据
                await getSession({ event: 'storage' });
              }

              console.log('头像上传成功:', avatarUrl);
            }}
          />

          {/* 用户名 */}
          <div>
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              value={currentUser.username}
              disabled
              className="bg-gray-50"
            />
            <p className="text-sm text-gray-500 mt-1">
              用户名无法修改
            </p>
          </div>

          {/* 显示名称 */}
          <div>
            <Label htmlFor="displayName">显示名称</Label>
            <Input
              id="displayName"
              value={formData.displayName}
              onChange={(e) => handleInputChange("displayName", e.target.value)}
              placeholder="输入您的显示名称"
              maxLength={50}
            />
          </div>

          {/* 个人简介 */}
          <div>
            <Label htmlFor="bio">个人简介</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange("bio", e.target.value)}
              placeholder="介绍一下自己..."
              maxLength={500}
              rows={4}
            />
            <p className="text-sm text-gray-500 mt-1">
              {formData.bio.length}/500 字符
            </p>
          </div>

          {/* 位置 */}
          <div>
            <Label htmlFor="location">位置</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
              placeholder="您的所在地"
              maxLength={100}
            />
          </div>

          {/* 网站 */}
          <div>
            <Label htmlFor="website">个人网站</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => handleInputChange("website", e.target.value)}
              placeholder="https://example.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* 隐私设置 */}
      <Card>
        <CardHeader>
          <CardTitle>隐私设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 资料可见性 */}
          <div>
            <Label htmlFor="profileVisibility">资料可见性</Label>
            <Select
              value={formData.profileVisibility}
              onValueChange={(value) => handleInputChange("profileVisibility", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLIC">公开</SelectItem>
                <SelectItem value="FOLLOWERS">仅关注者</SelectItem>
                <SelectItem value="FOLLOWING">仅互相关注</SelectItem>
                <SelectItem value="PRIVATE">私密</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 显示访客记录 */}
          <div className="flex items-center justify-between">
            <div>
              <Label>显示访客记录</Label>
              <p className="text-sm text-gray-500">
                允许其他用户看到谁访问了您的主页
              </p>
            </div>
            <Switch
              checked={formData.showVisitorHistory}
              onCheckedChange={(checked) => handleInputChange("showVisitorHistory", checked)}
            />
          </div>

          {/* 显示社交链接 */}
          <div className="flex items-center justify-between">
            <div>
              <Label>显示社交链接</Label>
              <p className="text-sm text-gray-500">
                在您的主页上显示社交媒体链接
              </p>
            </div>
            <Switch
              checked={formData.showSocialLinks}
              onCheckedChange={(checked) => handleInputChange("showSocialLinks", checked)}
            />
          </div>

          {/* 私信权限 */}
          <div>
            <Label htmlFor="allowDirectMessages">私信权限</Label>
            <Select
              value={formData.allowDirectMessages}
              onValueChange={(value) => handleInputChange("allowDirectMessages", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EVERYONE">所有人</SelectItem>
                <SelectItem value="FOLLOWING">仅关注的人</SelectItem>
                <SelectItem value="FOLLOWERS">仅关注者</SelectItem>
                <SelectItem value="NONE">不允许</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 社交账号管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            社交账号
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SocialLinksPreview userId={currentUser.id} />
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          取消
        </Button>
        <Button
          type="submit"
          disabled={isPending || updateProfileMutation.isPending}
        >
          {isPending ? (
            "保存中..."
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              保存更改
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
