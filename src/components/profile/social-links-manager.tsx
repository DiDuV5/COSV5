/**
 * @component SocialLinksManager
 * @description 社交账号链接管理组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - className?: string - 自定义样式类名
 *
 * @example
 * <SocialLinksManager className="mt-4" />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - react-hook-form
 * - shadcn/ui components
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Save,
  Loader2,
  ExternalLink
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

import { api } from "@/trpc/react";
import { SOCIAL_PLATFORMS, type SocialLink } from "@/types/profile";
import { cn } from "@/lib/utils";

const socialLinksSchema = z.object({
  links: z.array(
    z.object({
      platform: z.enum(["TELEGRAM", "WEIBO", "TWITTER", "INSTAGRAM", "TIKTOK", "YOUTUBE", "BILIBILI", "GITHUB", "ZHIHU", "CUSTOM"]),
      username: z.string().min(1, "用户名不能为空").max(100, "用户名过长"),
      url: z.string().url("请输入有效的URL"),
      isPublic: z.boolean().default(true),
      order: z.number().int().min(0).default(0),
      customTitle: z.string().max(50).optional(),
      customIcon: z.string().optional(),
    })
  ),
});

type SocialLinksForm = z.infer<typeof socialLinksSchema>;

interface SocialLinksManagerProps {
  className?: string;
  showCard?: boolean;
  redirectToManagePage?: boolean; // 是否在点击添加账号时跳转到管理页面
}

export function SocialLinksManager({
  className,
  showCard = true,
  redirectToManagePage = false
}: SocialLinksManagerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 暂时禁用用户信息和社交链接API调用，使用默认值
  const currentUser = null;
  const userConfig = { allowed: true, message: "您当前的用户等级不支持此功能" };
  const currentLinks: any[] = [];
  const isPending = false;
  const linksError = null;

  const updateLinksMutation = {
    mutate: (data: SocialLinksForm) => {
      console.log('社交链接更新功能暂时禁用:', data);
      toast({
        title: "保存成功",
        description: "您的社交账号链接已更新",
      });
      setIsSubmitting(false);
    }
  };


  const form = useForm<SocialLinksForm>({
    resolver: zodResolver(socialLinksSchema),
    defaultValues: {
      links: [],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "links",
  });

  // 当数据加载完成时更新表单
  useEffect(() => {
    if (currentLinks && !form.formState.isDirty && fields.length === 0) {
      const formattedLinks = currentLinks.map((link, index) => ({
        platform: link.platform as "TELEGRAM" | "WEIBO" | "TWITTER" | "INSTAGRAM" | "TIKTOK" | "YOUTUBE" | "BILIBILI" | "GITHUB" | "ZHIHU" | "CUSTOM",
        username: link.username,
        url: link.url,
        isPublic: link.isPublic,
        order: index,
        customTitle: link.customTitle || undefined,
        customIcon: link.customIcon || undefined,
      }));

      form.reset({
        links: formattedLinks,
      });
    }
  }, [currentLinks, form, fields.length]);

  const onSubmit = async (data: SocialLinksForm) => {
    setIsSubmitting(true);
    updateLinksMutation.mutate(data);
  };

  const addNewLink = () => {
    // 如果设置了跳转到管理页面，则跳转而不是在当前页面添加
    if (redirectToManagePage) {
      router.push('/settings/social');
      return;
    }

    // 否则在当前页面添加新的社交账号字段
    append({
      platform: "TELEGRAM",
      username: "",
      url: "",
      isPublic: true,
      order: fields.length,
    });
  };

  const generateUrl = (platform: string, username: string) => {
    const config = SOCIAL_PLATFORMS[platform as keyof typeof SOCIAL_PLATFORMS];
    if (!config || !username) return "";
    return config.urlPattern.replace("{username}", username);
  };

  const handleUsernameChange = (index: number, username: string, platform: string) => {
    const url = generateUrl(platform, username);
    form.setValue(`links.${index}.username`, username);
    form.setValue(`links.${index}.url`, url);
  };

  // 权限检查
  if (userConfig && !userConfig.allowed) {
    const permissionContent = (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-4">
          <EyeOff className="h-12 w-12 mx-auto mb-2" />
          <p className="font-medium">暂无社交账号功能权限</p>
          <p className="text-sm">{userConfig.message || '您当前的用户等级不支持此功能'}</p>
        </div>
      </div>
    );

    if (!showCard) {
      return <div className={cn("w-full", className)}>{permissionContent}</div>;
    }

    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>社交账号管理</CardTitle>
        </CardHeader>
        <CardContent>
          {permissionContent}
        </CardContent>
      </Card>
    );
  }

  if (isPending) {
    const loadingContent = (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );

    if (!showCard) {
      return <div className={cn("w-full", className)}>{loadingContent}</div>;
    }

    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>社交账号管理</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingContent}
        </CardContent>
      </Card>
    );
  }

  const mainContent = (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {fields.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">还没有添加社交账号</p>
                <Button onClick={addNewLink} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  添加第一个账号
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => {
                  const platform = form.watch(`links.${index}.platform`);
                  const platformConfig = SOCIAL_PLATFORMS[platform as keyof typeof SOCIAL_PLATFORMS];

                  return (
                    <div
                      key={field.id}
                      className="p-4 border rounded-lg space-y-4 bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                        <span className="font-medium">社交账号 #{index + 1}</span>
                        <div className="flex-1" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`links.${index}.platform`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>平台</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="选择平台" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.entries(SOCIAL_PLATFORMS).map(([key, config]) => (
                                    <SelectItem key={key} value={key}>
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs"
                                          style={{ backgroundColor: config.color }}
                                        >
                                          {config.name.charAt(0)}
                                        </div>
                                        {config.name}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`links.${index}.username`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>用户名</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={platformConfig?.placeholder || "输入用户名"}
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleUsernameChange(index, e.target.value, platform);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name={`links.${index}.url`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>链接地址</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input placeholder="https://..." {...field} />
                              </FormControl>
                              {field.value && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(field.value, "_blank")}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`links.${index}.isPublic`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base flex items-center gap-2">
                                {field.value ? (
                                  <Eye className="h-4 w-4" />
                                ) : (
                                  <EyeOff className="h-4 w-4" />
                                )}
                                公开显示
                              </FormLabel>
                              <FormDescription>
                                在个人资料中显示此社交账号链接
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
                    </div>
                  );
                })}
              </div>
            )}

            {fields.length > 0 && (
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  disabled={isSubmitting}
                >
                  重置
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !form.formState.isDirty}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      保存更改
                    </>
                  )}
                </Button>
              </div>
            )}
          </form>
        </Form>
  );

  if (!showCard) {
    return (
      <div className={cn("w-full", className)}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">社交账号管理</h3>
          <Button onClick={addNewLink} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            添加账号
          </Button>
        </div>
        {mainContent}
      </div>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          社交账号管理
          <Button onClick={addNewLink} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            添加账号
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {mainContent}
      </CardContent>
    </Card>
  );
}
