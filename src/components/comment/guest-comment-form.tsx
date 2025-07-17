/**
 * @component GuestCommentForm
 * @description 游客评论表单组件，支持匿名评论功能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - onSubmit: (data: GuestCommentData) => void - 提交回调
 * - placeholder?: string - 输入框占位符
 * - isPending?: boolean - 是否加载中
 *
 * @example
 * <GuestCommentForm
 *   onSubmit={handleGuestComment}
 *   placeholder="写下你的评论..."
 *   isPending={isSubmitting}
 * />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - shadcn/ui
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Send, User, Mail, MessageCircle } from "lucide-react";
import { TurnstileFormWrapper, useTurnstileContext } from "@/components/security/turnstile-form-wrapper";

// 游客评论数据验证schema
const guestCommentSchema = z.object({
  content: z.string().min(1, "评论内容不能为空").max(1000, "评论内容最多1000个字符"),
  guestName: z.string().min(1, "昵称不能为空").max(50, "昵称最多50个字符"),
  guestContact: z.string().max(100, "联系方式最多100个字符").optional(),
  turnstileToken: z.string().optional(), // Turnstile验证token
});

export type GuestCommentData = z.infer<typeof guestCommentSchema>;

interface GuestCommentFormProps {
  onSubmit: (data: GuestCommentData & { turnstileToken?: string }) => void;
  placeholder?: string;
  isPending?: boolean;
  onCancel?: () => void;
}

/**
 * 内部游客评论表单组件（使用Turnstile上下文）
 */
function GuestCommentFormInner({
  onSubmit,
  placeholder = "写下你的评论...",
  isPending = false,
  onCancel,
}: Omit<GuestCommentFormProps, 'onSubmit'> & {
  onSubmit: (data: GuestCommentData) => Promise<void>;
}) {
  const [showContactField, setShowContactField] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 使用Turnstile上下文
  const turnstileContext = useTurnstileContext() || {
    isEnabled: false,
    isVerified: false,
    token: null,
    error: null,
    validateSubmission: () => ({ isValid: true })
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isValid },
  } = useForm<GuestCommentData>({
    resolver: zodResolver(guestCommentSchema),
    mode: "onChange",
  });

  const content = watch("content", "");

  // 处理表单提交
  const handleFormSubmit = async (data: GuestCommentData) => {
    if (isSubmitting) return;

    // 如果Turnstile启用但未验证，阻止提交
    if (turnstileContext.isEnabled && !turnstileContext.isVerified) {
      setError('请完成人机验证');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 调用原始的onSubmit回调，传递包含turnstileToken的数据
      await onSubmit({ ...data, turnstileToken: turnstileContext.token || undefined });
      reset();
      setShowContactField(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "评论发布失败";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    reset();
    setShowContactField(false);
    setError(null);
    onCancel?.();
  };

  return (
    <Card className="border-dashed border-2 border-gray-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <MessageCircle className="h-4 w-4" />
          游客评论
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Turnstile错误提示 */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* 评论内容 */}
          <div className="space-y-2">
            <Textarea
              {...register("content")}
              placeholder={placeholder}
              className="min-h-[80px] resize-none"
              maxLength={1000}
            />
            {errors.content && (
              <Alert variant="destructive">
                <AlertDescription>{errors.content.message}</AlertDescription>
              </Alert>
            )}
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>游客评论需要审核后才能显示</span>
              <span>{content.length}/1000</span>
            </div>
          </div>

          {/* 游客信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guestName" className="flex items-center gap-1">
                <User className="h-3 w-3" />
                昵称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="guestName"
                {...register("guestName")}
                placeholder="请输入您的昵称"
                maxLength={50}
              />
              {errors.guestName && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.guestName.message}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="guestContact" className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                联系方式 <span className="text-gray-400">(可选)</span>
              </Label>
              {showContactField ? (
                <Input
                  id="guestContact"
                  {...register("guestContact")}
                  placeholder="邮箱或其他联系方式"
                  maxLength={100}
                />
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowContactField(true)}
                  className="w-full"
                >
                  添加联系方式
                </Button>
              )}
              {errors.guestContact && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.guestContact.message}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-gray-500">
              评论将在审核通过后显示
            </div>
            <div className="flex gap-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  取消
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
                disabled={!isValid || isSubmitting}
                className="min-w-[80px]"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    发布中
                  </div>
                ) : (
                  <>
                    <Send className="h-3 w-3 mr-1" />
                    发布评论
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* 人机验证提示 */}
        <Alert>
          <AlertDescription className="text-xs">
            💡 为防止垃圾评论，游客评论需要通过人工审核。如需即时评论，建议注册账号。
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

export function GuestCommentForm(props: GuestCommentFormProps) {
  return (
    <TurnstileFormWrapper
      featureId="GUEST_COMMENT"
      theme="light"
      className="space-y-4"
    >
      <GuestCommentFormInner {...props} onSubmit={async (data) => await props.onSubmit(data)} />
    </TurnstileFormWrapper>
  );
}
