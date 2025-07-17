/**
 * @fileoverview 认证错误页面组件
 * @description 处理认证过程中的错误显示
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - next: ^14.0.0
 * - next-auth: ^4.24.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const errorMessages: Record<string, string> = {
  Configuration: "服务器配置错误，请联系管理员",
  AccessDenied: "访问被拒绝，您没有权限访问此资源",
  Verification: "验证失败，请检查您的邮箱或重新发送验证链接",
  Default: "认证过程中发生未知错误",
  CredentialsSignin: "用户名或密码错误",
  EmailSignin: "邮箱登录失败",
  OAuthSignin: "第三方登录失败",
  OAuthCallback: "第三方登录回调失败",
  OAuthCreateAccount: "创建第三方账户失败",
  EmailCreateAccount: "创建邮箱账户失败",
  Callback: "回调处理失败",
  OAuthAccountNotLinked: "该邮箱已被其他登录方式使用",
  SessionRequired: "需要登录才能访问",
};

function AuthErrorPageContent() {
  const searchParams = useSearchParams();
  const error = searchParams?.get("error");

  const errorMessage = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default;

  const getErrorIcon = () => {
    return <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />;
  };

  const getErrorTitle = () => {
    switch (error) {
      case "AccessDenied":
        return "访问被拒绝";
      case "Verification":
        return "验证失败";
      case "CredentialsSignin":
        return "登录失败";
      case "SessionRequired":
        return "需要登录";
      default:
        return "认证错误";
    }
  };

  const getSuggestions = () => {
    switch (error) {
      case "CredentialsSignin":
        return [
          "检查用户名和密码是否正确",
          "确认账户是否已激活",
          "尝试重置密码",
        ];
      case "AccessDenied":
        return [
          "联系管理员获取访问权限",
          "确认您的账户状态",
          "检查是否需要验证邮箱",
        ];
      case "Verification":
        return [
          "检查邮箱中的验证链接",
          "重新发送验证邮件",
          "确认邮箱地址是否正确",
        ];
      case "SessionRequired":
        return [
          "请先登录您的账户",
          "检查登录状态是否过期",
          "清除浏览器缓存后重试",
        ];
      default:
        return [
          "刷新页面重试",
          "清除浏览器缓存",
          "联系技术支持",
        ];
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mb-4">
              {getErrorIcon()}
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {getErrorTitle()}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {errorMessage}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 错误详情 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-700">
                  <span className="font-medium">错误代码:</span> {error}
                </p>
              </div>
            )}

            {/* 解决建议 */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900">解决建议:</h3>
              <ul className="space-y-2">
                {getSuggestions().map((suggestion, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 操作按钮 */}
            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/auth/signin">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  返回登录
                </Link>
              </Button>

              <Button variant="outline" asChild className="w-full">
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  返回首页
                </Link>
              </Button>
            </div>

            {/* 帮助信息 */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                如果问题持续存在，请{" "}
                <Link href="/contact" className="text-blue-600 hover:text-blue-500">
                  联系技术支持
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <AuthErrorPageContent />
    </Suspense>
  );
}
