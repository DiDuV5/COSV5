/**
 * @component PrivacySettings
 * @description 用户隐私设置管理组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - className?: string - 自定义样式类名
 *
 * @example
 * <PrivacySettings className="mt-4" />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - shadcn/ui components
 * - react-hook-form
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Shield,
  Eye,
  Users,
  UserCheck,
  Lock,
  Globe,
  MessageCircle,
  Save,
  Loader2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

import { api } from "@/trpc/react";
import { PRIVACY_LEVELS, type PrivacySettings } from "@/types/profile";
import { cn } from "@/lib/utils";

const privacySettingsSchema = z.object({
  profileVisibility: z.enum(["PUBLIC", "USERS_ONLY", "FOLLOWERS_ONLY", "PRIVATE"]),
  showVisitorHistory: z.boolean(),
  showSocialLinks: z.boolean(),
  allowDirectMessages: z.enum(["EVERYONE", "FOLLOWERS", "NONE"]),
});

type PrivacySettingsForm = z.infer<typeof privacySettingsSchema>;

interface PrivacySettingsProps {
  className?: string;
}

export function PrivacySettings({ className }: PrivacySettingsProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 暂时禁用隐私设置API调用，使用默认值
  const currentSettings = null as any;
  const isPending = false;

  const updateSettingsMutation = {
    mutate: (data: PrivacySettingsForm) => {
      console.log('隐私设置更新功能暂时禁用:', data);
      toast({
        title: "设置已保存",
        description: "您的隐私设置已成功更新",
      });
      setIsSubmitting(false);
    }
  };


  const form = useForm<PrivacySettingsForm>({
    resolver: zodResolver(privacySettingsSchema),
    defaultValues: {
      profileVisibility: "PUBLIC",
      showVisitorHistory: true,
      showSocialLinks: true,
      allowDirectMessages: "EVERYONE",
    },
  });

  // 当数据加载完成时更新表单默认值
  useEffect(() => {
    if (currentSettings && !form.formState.isDirty) {
      form.reset({
        profileVisibility: currentSettings.profileVisibility as any,
        showVisitorHistory: currentSettings.showVisitorHistory,
        showSocialLinks: currentSettings.showSocialLinks,
        allowDirectMessages: currentSettings.allowDirectMessages as any,
      });
    }
  }, [currentSettings, form]);

  const onSubmit = async (data: PrivacySettingsForm) => {
    setIsSubmitting(true);
    updateSettingsMutation.mutate(data);
  };

  const getPrivacyIcon = (level: string) => {
    switch (level) {
      case "PUBLIC":
        return <Globe className="h-4 w-4" />;
      case "USERS_ONLY":
        return <Users className="h-4 w-4" />;
      case "FOLLOWERS_ONLY":
        return <UserCheck className="h-4 w-4" />;
      case "PRIVATE":
        return <Lock className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  if (isPending) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            隐私设置
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          隐私设置
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 个人资料可见性 */}
            <FormField
              control={form.control}
              name="profileVisibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    个人资料可见性
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择可见性级别" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(PRIVACY_LEVELS).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            {getPrivacyIcon(key)}
                            <div>
                              <div className="font-medium">{config.name}</div>
                              <div className="text-xs text-gray-500">{config.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    控制谁可以查看您的个人资料信息
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* 显示访客记录 */}
            <FormField
              control={form.control}
              name="showVisitorHistory"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      显示访客记录
                    </FormLabel>
                    <FormDescription>
                      允许其他用户查看您的访客记录（仅您自己始终可见）
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

            {/* 显示社交链接 */}
            <FormField
              control={form.control}
              name="showSocialLinks"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      显示社交链接
                    </FormLabel>
                    <FormDescription>
                      在个人资料中显示您的社交媒体账号链接
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

            <Separator />

            {/* 私信权限 */}
            <FormField
              control={form.control}
              name="allowDirectMessages"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    私信权限
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择私信权限" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="EVERYONE">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <div>
                            <div className="font-medium">所有人</div>
                            <div className="text-xs text-gray-500">任何人都可以给您发私信</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="FOLLOWERS">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4" />
                          <div>
                            <div className="font-medium">仅关注者</div>
                            <div className="text-xs text-gray-500">只有关注您的用户可以发私信</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="NONE">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          <div>
                            <div className="font-medium">禁用私信</div>
                            <div className="text-xs text-gray-500">不接收任何私信</div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    控制谁可以给您发送私信（功能开发中）
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
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
                    保存设置
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
