/**
 * @fileoverview 设置页面主页
 * @description 用户设置页面的主入口，提供各种设置选项的导航
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * // 访问路径: /settings
 * // 用户设置主页
 *
 * @dependencies
 * - next: ^14.0.0
 * - next-auth: ^4.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import {
  User,
  Shield,
  Lock,
  Link as LinkIcon,
  Bell,
  Palette,
  HelpCircle,
  ArrowLeft,
  Settings as SettingsIcon,
  ChevronRight
} from "lucide-react";

import { getServerAuthSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/trpc/server";

export default async function SettingsPage() {
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/auth/signin?callbackUrl=/settings");
  }

  // 获取完整的用户信息
  const userInfo = await api.user.getByUsername({ username: session.user.username });

  const settingsItems = [
    {
      title: "编辑资料",
      description: "编辑您的个人信息、头像和简介",
      icon: User,
      href: "/settings/profile",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "隐私设置",
      description: "管理您的隐私和安全设置",
      icon: Shield,
      href: "/settings/privacy",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-900/20",
    },
    {
      title: "密码设置",
      description: "修改您的账户密码",
      icon: Lock,
      href: "/settings/password",
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-900/20",
    },
    {
      title: "社交账号",
      description: "管理您的社交媒体链接",
      icon: LinkIcon,
      href: "/settings/social",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
      title: "通知设置",
      description: "管理通知和消息提醒",
      icon: Bell,
      href: "/settings/notifications",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      disabled: true,
    },
    {
      title: "主题设置",
      description: "自定义界面主题和外观",
      icon: Palette,
      href: "/settings/theme",
      color: "text-pink-600 dark:text-pink-400",
      bgColor: "bg-pink-50 dark:bg-pink-900/20",
      disabled: true,
    },
    {
      title: "帮助中心",
      description: "常见问题和使用指南",
      icon: HelpCircle,
      href: "/help",
      color: "text-gray-600 dark:text-gray-400",
      bgColor: "bg-gray-50 dark:bg-gray-900/20",
      disabled: true,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回个人中心
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <SettingsIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              设置
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              管理您的账户设置和偏好
            </p>
          </div>
        </div>
      </div>

      {/* 设置选项网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingsItems.map((item) => {
          const IconComponent = item.icon;

          if (item.disabled) {
            return (
              <Card key={item.title} className="opacity-50 cursor-not-allowed">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${item.bgColor}`}>
                      <IconComponent className={`h-6 w-6 ${item.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {item.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        即将推出
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            );
          }

          return (
            <Link key={item.title} href={item.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${item.bgColor}`}>
                      <IconComponent className={`h-6 w-6 ${item.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {item.description}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* 账户信息 */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>账户信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">用户名:</span>
              <span className="font-medium">@{session.user.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">邮箱:</span>
              <span className="font-medium">{session.user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">用户等级:</span>
              <span className="font-medium">
                {session.user.userLevel === 'ADMIN' ? '管理员' :
                  session.user.userLevel === 'CREATOR' ? '创作者' :
                    session.user.userLevel === 'VIP' ? '付费用户' : '注册用户'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">注册时间:</span>
              <span className="font-medium">
                {userInfo?.createdAt ? new Date(userInfo.createdAt).toLocaleDateString('zh-CN') : '未知'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
