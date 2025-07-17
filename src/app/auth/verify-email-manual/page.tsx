/**
 * @fileoverview 手动邮箱验证页面
 * @description 为无法点击邮件链接的用户提供手动输入验证码的方式
 * @author Augment AI
 * @date 2025-07-17
 * @version 1.0.0
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth/auth-layout";
import { api } from "@/trpc/react";

export default function ManualEmailVerificationPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // 邮箱验证mutation
  const verifyEmailMutation = api.emailVerification.verify.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token.trim()) {
      setError("请输入验证码");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const result = await verifyEmailMutation.mutateAsync({ token: token.trim() });

      if (result.success) {
        setSuccess("邮箱验证成功！正在跳转...");

        // 2秒后跳转到登录页面
        setTimeout(() => {
          router.push("/auth/signin?message=email_verified");
        }, 2000);
      } else {
        setError(result.message || "验证失败，请检查验证码是否正确");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "验证失败，请稍后重试";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="手动邮箱验证"
      subtitle="输入邮件中的验证码"
    >
      <div className="space-y-6">
        {/* 说明信息 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            📧 无法点击邮件链接？
          </h3>
          <p className="text-sm text-blue-700">
            如果您的邮件客户端无法正常打开验证链接，请从邮件中复制验证码并在下方输入。
          </p>
        </div>

        {/* 验证表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* 成功提示 */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* 验证码输入 */}
          <div className="space-y-2">
            <Label htmlFor="token">验证码</Label>
            <Input
              id="token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="请输入邮件中的验证码"
              className="font-mono"
              disabled={isSubmitting}
            />
            <p className="text-sm text-gray-600">
              验证码格式类似：a1b2c3d4-e5f6-7890-abcd-ef1234567890
            </p>
          </div>

          {/* 提交按钮 */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !token.trim()}
          >
            {isSubmitting ? "验证中..." : "验证邮箱"}
          </Button>
        </form>

        {/* 帮助信息 */}
        <div className="space-y-4">
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              💡 如何找到验证码？
            </h3>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>打开您收到的验证邮件</li>
              <li>找到验证链接（通常在蓝色按钮下方）</li>
              <li>复制链接中"token="后面的长字符串</li>
              <li>将该字符串粘贴到上方输入框中</li>
            </ol>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              🔄 没有收到邮件？
            </h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                请检查垃圾邮件文件夹，或者
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/auth/resend-verification")}
              >
                重新发送验证邮件
              </Button>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              ❓ 需要帮助？
            </h3>
            <p className="text-sm text-gray-600">
              如果您在验证过程中遇到问题，请联系客服获取帮助。
            </p>
          </div>
        </div>

        {/* 返回链接 */}
        <div className="text-center pt-4 border-t">
          <Button
            variant="ghost"
            onClick={() => router.push("/auth/signin")}
          >
            返回登录页面
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
