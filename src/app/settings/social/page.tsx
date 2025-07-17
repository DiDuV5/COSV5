/**
 * @fileoverview 社交账号管理页面
 * @description 用户社交账号链接管理界面
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * // 访问社交账号管理页面
 * /settings/social
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
import { ArrowLeft, Globe } from "lucide-react";

import { getServerAuthSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { SocialLinksManager } from "@/components/profile/social-links-manager";

export const metadata: Metadata = {
  title: "社交账号管理 - Tu",
  description: "管理您的社交媒体账号链接",
};

export default async function SocialSettingsPage() {
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/settings/profile">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回个人设置
            </Button>
          </Link>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <Globe className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              社交账号管理
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              添加和管理您的社交媒体账号链接
            </p>
          </div>
        </div>
      </div>

      {/* 社交账号管理组件 */}
      <div className="space-y-6">
        <SocialLinksManager />

        {/* 使用说明 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
            使用说明
          </h3>
          <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <p>
              <strong>支持的平台：</strong>Telegram、微博、Twitter/X、Instagram、TikTok、YouTube、哔哩哔哩、GitHub、知乎，以及自定义链接。
            </p>
            <p>
              <strong>链接格式：</strong>请输入完整的URL链接，系统会自动验证链接的有效性。
            </p>
            <p>
              <strong>显示顺序：</strong>您可以通过拖拽来调整社交账号在个人资料中的显示顺序。
            </p>
            <p>
              <strong>隐私控制：</strong>您可以设置某些社交账号为私密，这样只有您自己能看到。
            </p>
            <p>
              <strong>安全提示：</strong>点击社交链接时会弹出确认对话框，确保您的浏览安全。
            </p>
          </div>
        </div>

        {/* 平台说明 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
          <h3 className="font-semibold text-lg mb-4">支持的社交平台</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  T
                </div>
                <span className="font-medium">Telegram</span>
              </div>
              <p className="text-sm text-gray-500">
                格式：https://t.me/username
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  微
                </div>
                <span className="font-medium">微博</span>
              </div>
              <p className="text-sm text-gray-500">
                格式：https://weibo.com/username
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  X
                </div>
                <span className="font-medium">Twitter</span>
              </div>
              <p className="text-sm text-gray-500">
                格式：https://twitter.com/username
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  I
                </div>
                <span className="font-medium">Instagram</span>
              </div>
              <p className="text-sm text-gray-500">
                格式：https://instagram.com/username
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white text-sm font-bold">
                  T
                </div>
                <span className="font-medium">TikTok</span>
              </div>
              <p className="text-sm text-gray-500">
                格式：https://tiktok.com/@username
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  Y
                </div>
                <span className="font-medium">YouTube</span>
              </div>
              <p className="text-sm text-gray-500">
                格式：https://youtube.com/@username
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  B
                </div>
                <span className="font-medium">哔哩哔哩</span>
              </div>
              <p className="text-sm text-gray-500">
                格式：https://space.bilibili.com/uid
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  G
                </div>
                <span className="font-medium">GitHub</span>
              </div>
              <p className="text-sm text-gray-500">
                格式：https://github.com/username
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  知
                </div>
                <span className="font-medium">知乎</span>
              </div>
              <p className="text-sm text-gray-500">
                格式：https://zhihu.com/people/username
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  链
                </div>
                <span className="font-medium">自定义链接</span>
              </div>
              <p className="text-sm text-gray-500">
                格式：任何有效的URL链接
              </p>
            </div>
          </div>
        </div>

        {/* 预览效果 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
          <h3 className="font-semibold text-lg mb-4">预览效果</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            您的社交账号链接将在个人资料中以以下方式显示：
          </p>
          <Link href={`/users/${session.user.username}`} target="_blank">
            <Button variant="outline">
              查看我的个人主页
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
