/**
 * @fileoverview 邮箱验证页面
 * @description 处理用户邮箱验证流程
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - Next.js 14+
 * - React 18+
 * - Lucide React (图标)
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/auth/auth-layout";
import { api } from "@/trpc/react";

type VerificationStatus = "loading" | "success" | "error" | "expired" | "not_found";

interface VerificationResult {
  status: VerificationStatus;
  message: string;
  details?: string;
}

function VerifyEmailPageContent() {
  const [result, setResult] = useState<VerificationResult>({
    status: "loading",
    message: "正在验证邮箱...",
  });

  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get("token");

  // 使用tRPC mutation
  const verifyEmailMutation = api.emailVerification.verify.useMutation();

  useEffect(() => {
    const verifyEmail = async () => {
      // 🔍 前端Token解析日志
      console.log('🔍 前端Token解析:', {
        token,
        tokenLength: token?.length,
        tokenFormat: token ? /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token) : false,
        url: window.location.href,
        searchParams: window.location.search
      });

      if (!token) {
        console.error('❌ 缺少验证令牌:', { url: window.location.href });
        setResult({
          status: "error",
          message: "验证链接无效",
          details: "缺少验证令牌，请检查邮件中的链接是否完整。",
        });
        return;
      }

      try {
        // 使用tRPC调用验证API
        console.log('🚀 开始验证Token:', { token });
        const result = await verifyEmailMutation.mutateAsync({ token });

        // ✅ 验证结果日志
        console.log('✅ Token验证结果:', {
          success: result.success,
          message: result.message,
          token,
          user: result.success ? result.user : null
        });

        if (result.success) {
          setResult({
            status: "success",
            message: result.message,
            details: "您的账户已激活，现在可以正常使用所有功能。",
          });

          // 如果有重定向URL，延迟跳转
          if ('redirectUrl' in result && result.redirectUrl) {
            setTimeout(() => {
              router.push((result as any).redirectUrl);
            }, 2000);
          }
        } else {
          // 根据返回的消息判断错误类型
          if (result.message.includes('无效的验证令牌')) {
            setResult({
              status: "not_found",
              message: "验证令牌不存在",
              details: "验证链接可能已过期或无效，请重新注册或联系客服。",
            });
          } else if (result.message.includes('已过期')) {
            setResult({
              status: "expired",
              message: "验证链接已过期",
              details: "验证链接有效期为24小时，请重新注册获取新的验证邮件。",
            });
          } else {
            setResult({
              status: "error",
              message: result.message,
              details: "请稍后重试或联系客服。",
            });
          }
        }
      } catch (error) {
        console.error("邮箱验证错误:", error);

        // 处理tRPC错误
        if (error && typeof error === 'object' && 'message' in error) {
          setResult({
            status: "error",
            message: "验证失败",
            details: (error as any).message || "服务器错误，请稍后重试或联系客服。",
          });
        } else {
          setResult({
            status: "error",
            message: "网络错误",
            details: "无法连接到服务器，请检查网络连接后重试。",
          });
        }
      }
    };

    verifyEmail();
  }, [token]);

  const getStatusIcon = () => {
    switch (result.status) {
      case "loading":
        return <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />;
      case "success":
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case "error":
      case "expired":
      case "not_found":
        return <XCircle className="h-16 w-16 text-red-500" />;
      default:
        return <Mail className="h-16 w-16 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (result.status) {
      case "loading":
        return "text-blue-600";
      case "success":
        return "text-green-600";
      case "error":
      case "expired":
      case "not_found":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getActionButtons = () => {
    switch (result.status) {
      case "success":
        return (
          <div className="space-y-3">
            <Button
              onClick={() => router.push("/auth/signin")}
              className="w-full"
              size="lg"
            >
              立即登录
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="w-full"
            >
              返回首页
            </Button>
          </div>
        );
      case "expired":
      case "not_found":
        return (
          <div className="space-y-3">
            <Button
              onClick={() => router.push("/auth/signup")}
              className="w-full"
              size="lg"
            >
              重新注册
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/auth/signin")}
              className="w-full"
            >
              尝试登录
            </Button>
          </div>
        );
      case "error":
        return (
          <div className="space-y-3">
            <Button
              onClick={() => window.location.reload()}
              className="w-full"
              size="lg"
            >
              重试验证
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/auth/signup")}
              className="w-full"
            >
              重新注册
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AuthLayout
      title="邮箱验证"
      subtitle="验证您的邮箱地址"
    >
      <div className="text-center space-y-6">
        {/* 状态图标 */}
        <div className="flex justify-center">
          {getStatusIcon()}
        </div>

        {/* 状态信息 */}
        <div className="space-y-2">
          <h2 className={`text-xl font-semibold ${getStatusColor()}`}>
            {result.message}
          </h2>
          {result.details && (
            <p className="text-gray-600 text-sm leading-relaxed">
              {result.details}
            </p>
          )}
        </div>

        {/* 操作按钮 */}
        {getActionButtons()}

        {/* 帮助信息 */}
        <div className="pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-500 space-y-2">
            <p>遇到问题？</p>
            <div className="space-x-4">
              <Link
                href="/help/email-verification"
                className="text-blue-600 hover:text-blue-500 underline"
              >
                查看帮助
              </Link>
              <Link
                href="/contact"
                className="text-blue-600 hover:text-blue-500 underline"
              >
                联系客服
              </Link>
            </div>
          </div>
        </div>

        {/* 返回链接 */}
        <div className="pt-4">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← 返回首页
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <VerifyEmailPageContent />
    </Suspense>
  );
}
