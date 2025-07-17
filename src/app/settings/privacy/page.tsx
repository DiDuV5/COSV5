/**
 * @fileoverview 用户隐私设置页面
 * @description 用户隐私设置管理界面
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * // 访问隐私设置页面
 * /settings/privacy
 *
 * @dependencies
 * - next: ^14.0.0
 * - react: ^18.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

import { getServerAuthSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { PrivacySettings } from "@/components/profile/privacy-settings";

export const metadata: Metadata = {
  title: "隐私设置 - Tu",
  description: "管理您的隐私设置，控制个人信息的可见性",
};

export default async function PrivacySettingsPage() {
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/settings">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回设置
            </Button>
          </Link>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              隐私设置
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              控制您的个人信息和内容的可见性
            </p>
          </div>
        </div>
      </div>

      {/* 隐私设置组件 */}
      <div className="space-y-6">
        <PrivacySettings />

        {/* 隐私说明 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
            隐私设置说明
          </h3>
          <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <p>
              <strong>个人资料可见性：</strong>控制谁可以查看您的个人资料信息，包括头像、简介、统计数据等。
            </p>
            <p>
              <strong>访客记录：</strong>当开启时，其他用户可以看到谁访问过您的主页（您自己始终可以查看完整的访客记录）。
            </p>
            <p>
              <strong>社交链接：</strong>控制是否在个人资料中显示您的社交媒体账号链接。
            </p>
            <p>
              <strong>私信权限：</strong>控制谁可以给您发送私信（功能开发中）。
            </p>
          </div>
        </div>

        {/* 数据管理 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
          <h3 className="font-semibold text-lg mb-4">数据管理</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">导出个人数据</h4>
                <p className="text-sm text-gray-500">下载您在平台上的所有数据</p>
              </div>
              <Button variant="outline" disabled>
                导出数据
                <span className="ml-2 text-xs text-gray-400">(开发中)</span>
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">清除访客记录</h4>
                <p className="text-sm text-gray-500">删除所有访客访问记录</p>
              </div>
              <Link href={`/users/${session.user.username}`}>
                <Button variant="outline">
                  管理访客记录
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
              <div>
                <h4 className="font-medium text-red-900 dark:text-red-100">删除账户</h4>
                <p className="text-sm text-red-700 dark:text-red-300">永久删除您的账户和所有数据</p>
              </div>
              <Button variant="destructive" disabled>
                删除账户
                <span className="ml-2 text-xs">(开发中)</span>
              </Button>
            </div>
          </div>
        </div>

        {/* 相关链接 */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-4">相关设置</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/settings/profile">
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer">
                <h4 className="font-medium">个人资料设置</h4>
                <p className="text-sm text-gray-500">编辑您的个人信息和头像</p>
              </div>
            </Link>

            <Link href="/settings/social">
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer">
                <h4 className="font-medium">社交账号管理</h4>
                <p className="text-sm text-gray-500">管理您的社交媒体链接</p>
              </div>
            </Link>

            <Link href="/settings/notifications">
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer">
                <h4 className="font-medium">通知设置</h4>
                <p className="text-sm text-gray-500">管理通知偏好设置</p>
              </div>
            </Link>

            <Link href="/settings/security">
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer">
                <h4 className="font-medium">账户安全</h4>
                <p className="text-sm text-gray-500">密码和安全设置</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
