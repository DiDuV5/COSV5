/**
 * @component GuestPermissionConfig
 * @description 游客权限配置组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - config: UserPermissionConfig - 权限配置对象
 * - onUpdate: (config: Partial<UserPermissionConfig>) => void - 更新回调
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - react-hook-form
 * - zod
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  EyeOff,
  Play,
  Download,
  Search,
  Tag,
  Heart,
  MessageCircle,
  UserPlus,
  Share,
  AlertCircle,
  CheckCircle,
  Settings,
} from "lucide-react";

// 游客权限配置表单验证
const guestPermissionSchema = z.object({
  // 页面访问权限
  canViewPosts: z.boolean(),
  canViewProfiles: z.boolean(),
  canViewComments: z.boolean(),
  canPlayVideos: z.boolean(),
  canDownloadImages: z.boolean(),
  canSearchContent: z.boolean(),
  canViewTags: z.boolean(),

  // 互动权限
  canLikePosts: z.boolean(),
  canComment: z.boolean(),
  canFollow: z.boolean(),
  canShare: z.boolean(),

  // 访问限制
  requireLoginForPosts: z.boolean(),
  requireLoginForProfiles: z.boolean(),
  requireLoginForVideos: z.boolean(),
});

type GuestPermissionFormData = z.infer<typeof guestPermissionSchema>;

interface GuestPermissionConfigProps {
  config?: any;
  onUpdate?: () => void;
}

export function GuestPermissionConfig({ config, onUpdate }: GuestPermissionConfigProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<GuestPermissionFormData>({
    resolver: zodResolver(guestPermissionSchema),
    defaultValues: {
      canViewPosts: config?.canViewPosts ?? true,
      canViewProfiles: config?.canViewProfiles ?? true,
      canViewComments: config?.canViewComments ?? true,
      canPlayVideos: config?.canPlayVideos ?? true,
      canDownloadImages: config?.canDownloadImages ?? true,
      canSearchContent: config?.canSearchContent ?? true,
      canViewTags: config?.canViewTags ?? true,
      canLikePosts: config?.canLikePosts ?? false,
      canComment: config?.canComment ?? false,
      canFollow: config?.canFollow ?? false,
      canShare: config?.canShare ?? true,
      requireLoginForPosts: config?.requireLoginForPosts ?? false,
      requireLoginForProfiles: config?.requireLoginForProfiles ?? false,
      requireLoginForVideos: config?.requireLoginForVideos ?? false,
    },
  });

  // 更新权限配置
  const updatePermission = api.permission.updateConfig.useMutation({
    onSuccess: () => {
      setIsSubmitting(false);
      onUpdate?.();
    },
    onError: (error) => {
      setIsSubmitting(false);
      form.setError("root", {
        type: "manual",
        message: error.message,
      });
    },
  });

  const onSubmit = async (data: GuestPermissionFormData) => {
    setIsSubmitting(true);
    updatePermission.mutate({
      userLevel: "GUEST",
      ...data,
    });
  };

  // 权限配置项
  const accessPermissions = [
    {
      key: "canViewPosts" as const,
      label: "查看内容",
      description: "允许游客查看发布的内容",
      icon: Eye,
      category: "基础访问",
    },
    {
      key: "canViewProfiles" as const,
      label: "查看用户资料",
      description: "允许游客查看用户个人资料页面",
      icon: Eye,
      category: "基础访问",
    },
    {
      key: "canViewComments" as const,
      label: "查看评论",
      description: "允许游客查看内容下的评论",
      icon: MessageCircle,
      category: "基础访问",
    },
    {
      key: "canPlayVideos" as const,
      label: "播放视频",
      description: "允许游客播放视频内容",
      icon: Play,
      category: "媒体访问",
    },
    {
      key: "canDownloadImages" as const,
      label: "下载图片",
      description: "允许游客下载图片",
      icon: Download,
      category: "媒体访问",
    },
    {
      key: "canSearchContent" as const,
      label: "搜索内容",
      description: "允许游客使用搜索功能",
      icon: Search,
      category: "功能访问",
    },
    {
      key: "canViewTags" as const,
      label: "查看标签",
      description: "允许游客查看和点击标签",
      icon: Tag,
      category: "功能访问",
    },
  ];

  const interactionPermissions = [
    {
      key: "canLikePosts" as const,
      label: "点赞内容",
      description: "允许游客为内容点赞",
      icon: Heart,
      category: "互动功能",
    },
    {
      key: "canComment" as const,
      label: "发表评论",
      description: "允许游客发表评论",
      icon: MessageCircle,
      category: "互动功能",
    },
    {
      key: "canFollow" as const,
      label: "关注用户",
      description: "允许游客关注其他用户",
      icon: UserPlus,
      category: "互动功能",
    },
    {
      key: "canShare" as const,
      label: "分享内容",
      description: "允许游客分享内容",
      icon: Share,
      category: "互动功能",
    },
  ];

  const restrictionSettings = [
    {
      key: "requireLoginForPosts" as const,
      label: "内容需要登录",
      description: "查看内容详情需要登录",
      icon: EyeOff,
      category: "访问限制",
    },
    {
      key: "requireLoginForProfiles" as const,
      label: "用户资料需要登录",
      description: "查看用户资料需要登录",
      icon: EyeOff,
      category: "访问限制",
    },
    {
      key: "requireLoginForVideos" as const,
      label: "视频播放需要登录",
      description: "播放视频需要登录",
      icon: EyeOff,
      category: "访问限制",
    },
  ];

  const renderPermissionGroup = (permissions: typeof accessPermissions, title: string) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          {title}
        </CardTitle>
        <CardDescription>
          配置游客在{title.toLowerCase()}方面的权限
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {permissions.map((permission) => {
          const Icon = permission.icon;
          return (
            <FormField
              key={permission.key}
              control={form.control}
              name={permission.key}
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-500" />
                      <FormLabel className="text-base font-medium">
                        {permission.label}
                      </FormLabel>
                      <Badge variant="outline" className="text-xs">
                        {permission.category}
                      </Badge>
                    </div>
                    <FormDescription className="text-sm text-gray-600">
                      {permission.description}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          );
        })}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">游客权限配置</h2>
          <p className="text-gray-600 mt-1">
            配置未登录用户的访问权限和功能限制
          </p>
        </div>
        <Badge variant="outline" className="bg-gray-100">
          用户等级: 游客
        </Badge>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* 错误提示 */}
          {form.formState.errors.root && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {form.formState.errors.root.message}
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="access" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="access">基础访问</TabsTrigger>
              <TabsTrigger value="interaction">互动功能</TabsTrigger>
              <TabsTrigger value="restrictions">访问限制</TabsTrigger>
            </TabsList>

            <TabsContent value="access" className="space-y-6">
              {renderPermissionGroup(accessPermissions, "基础访问权限")}
            </TabsContent>

            <TabsContent value="interaction" className="space-y-6">
              {renderPermissionGroup(interactionPermissions as any, "互动功能权限")}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>注意：</strong>互动功能通常需要用户登录才能使用。
                  如果允许游客使用这些功能，系统会提示用户注册或登录。
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="restrictions" className="space-y-6">
              {renderPermissionGroup(restrictionSettings as any, "访问限制设置")}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>访问限制说明：</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>启用限制后，游客需要登录才能访问相应功能</li>
                    <li>这有助于提高用户注册率和平台活跃度</li>
                    <li>建议根据内容敏感度合理设置限制</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={isSubmitting}
            >
              重置
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                "保存中..."
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  保存配置
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
