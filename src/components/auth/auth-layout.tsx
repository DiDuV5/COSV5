/**
 * @component AuthLayout
 * @description 认证页面统一布局组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - title: string - 页面标题
 * - subtitle: string - 页面副标题
 * - children: ReactNode - 子组件内容
 * - showDemoAccount?: boolean - 是否显示演示账户信息
 *
 * @example
 * <AuthLayout
 *   title="用户登录"
 *   subtitle="欢迎回到 Cosplay Platform"
 * >
 *   <LoginForm />
 * </AuthLayout>
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  showDemoAccount?: boolean;
}

export function AuthLayout({ 
  title, 
  subtitle, 
  children, 
  showDemoAccount = false 
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* 主要内容卡片 */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold">{title}</CardTitle>
            <CardDescription className="text-center text-base">
              {subtitle}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {children}
          </CardContent>
        </Card>

        {/* 页脚信息 */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            © 2025 兔图
          </p>
        </div>
      </div>
    </div>
  );
}
