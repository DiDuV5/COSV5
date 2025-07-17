/**
 * @component CreateUserDialog
 * @description 创建用户对话框组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - open: boolean - 对话框是否打开
 * - onOpenChange: (open: boolean) => void - 对话框状态变化回调
 * - onSuccess: () => void - 创建成功回调
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

import { USER_LEVEL_OPTIONS } from "@/lib/constants/user-levels";

// 用户等级选项（排除访客）
const USER_LEVELS = USER_LEVEL_OPTIONS.filter(level => level.value !== "GUEST");

// 表单验证模式
const createUserSchema = z.object({
  username: z
    .string()
    .min(3, "用户名至少3个字符")
    .max(20, "用户名最多20个字符")
    .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线"),
  email: z.string().email("请输入有效的邮箱地址").optional().or(z.literal("")),
  password: z.string().min(6, "密码至少6个字符").optional().or(z.literal("")),
  displayName: z.string().max(50, "显示名称最多50个字符").optional().or(z.literal("")),
  bio: z.string().max(500, "个人简介最多500个字符").optional().or(z.literal("")),
  userLevel: z.enum(["USER", "VIP", "CREATOR", "ADMIN"]),
  isVerified: z.boolean(),
  canPublish: z.boolean(),
  avatarUrl: z.string().url("请输入有效的URL").optional().or(z.literal("")),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateUserDialogProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      displayName: "",
      bio: "",
      userLevel: "USER",
      isVerified: false,
      canPublish: false,
      avatarUrl: "",
    },
  });

  // 创建用户 mutation
  const createUser = api.admin.createUser.useMutation({
    onSuccess: (data) => {
      setIsSubmitting(false);
      onSuccess();
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      setIsSubmitting(false);
      form.setError("root", {
        type: "manual",
        message: error.message,
      });
    },
  });

  const onSubmit = async (data: CreateUserFormData) => {
    setIsSubmitting(true);

    // 清理空字符串字段
    const cleanData = {
      ...data,
      email: data.email || undefined,
      password: data.password || undefined,
      displayName: data.displayName || undefined,
      bio: data.bio || undefined,
      avatarUrl: data.avatarUrl || undefined,
    };

    createUser.mutate(cleanData);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>创建新用户</DialogTitle>
          <DialogDescription>
            填写用户信息创建新账户。标有 * 的字段为必填项。
          </DialogDescription>
        </DialogHeader>

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 用户名 */}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>用户名 *</FormLabel>
                    <FormControl>
                      <Input placeholder="输入用户名" {...field} />
                    </FormControl>
                    <FormDescription>
                      3-20个字符，只能包含字母、数字和下划线
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 邮箱 */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>邮箱地址</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="输入邮箱地址" {...field} />
                    </FormControl>
                    <FormDescription>
                      可选，用于邮箱验证和找回密码
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 密码 */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>密码</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="输入密码"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      可选，如果不设置密码，用户只能通过Telegram登录
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 显示名称 */}
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>显示名称</FormLabel>
                    <FormControl>
                      <Input placeholder="输入显示名称" {...field} />
                    </FormControl>
                    <FormDescription>
                      用户的公开显示名称
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 用户等级 */}
              <FormField
                control={form.control}
                name="userLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>用户等级 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择用户等级" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {USER_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      用户的权限等级
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 头像URL */}
              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>头像URL</FormLabel>
                    <FormControl>
                      <Input placeholder="输入头像图片URL" {...field} />
                    </FormControl>
                    <FormDescription>
                      用户头像的图片链接
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 个人简介 */}
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>个人简介</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="输入个人简介"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    用户的个人简介，最多500个字符
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 权限设置 */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">权限设置</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isVerified"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>已验证用户</FormLabel>
                        <FormDescription>
                          标记为已验证的用户
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="canPublish"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>可发布内容</FormLabel>
                        <FormDescription>
                          允许用户发布内容
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "创建中..." : "创建用户"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
